import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { PersonListQuerySchema } from 'shared';
import type { PersonController } from '../controllers/PersonController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';
import multer from 'multer';
import type { IDepartmentRepository } from '../repositories/DepartmentRepository';
import { createPeopleImportTemplate, importPeopleWorkbook } from '../services/PeopleImportService';

const parseId = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Creates the REST router for People. */
export function createPersonRouter(controller: PersonController, authService: AuthService, departments: IDepartmentRepository): Router {
  const router = Router();
  const upload = multer({
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => callback(null, /\.(xlsx|xlsm)$/i.test(file.originalname)),
  });
  router.use(requireAuthentication(authService));
  router.get('/import-template', requirePermission('people.create'), async (_req, res, next) => {
    try {
      const departmentRows = await departments.list({ isActive: true, pageSize: 100, sortBy: 'code' });
      const file = await createPeopleImportTemplate(departmentRows);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="people-import-template.xlsx"');
      res.send(file);
    } catch (error) { next(error); }
  });
  router.post('/import', requirePermission('people.create'), upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) { res.status(400).json({ success: false, error: 'Choose an Excel workbook to import.' }); return; }
      const result = await importPeopleWorkbook(req.file.buffer, controller, departments);
      res.status(result.imported > 0 ? 200 : 400).json({
        ...result,
        ...(result.imported === 0 ? { error: 'No people were imported. Review the row errors below.' } : {}),
      });
    } catch (error) { next(error); }
  });
  router.get('/', requirePermission('people.view'), async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await controller.list(PersonListQuerySchema.parse(req.query))); }
    catch (error) { next(error); }
  });
  router.get('/:id', requirePermission('people.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid person ID' }); return; }
      res.json(await controller.getById(id));
    } catch (error) { next(error); }
  });
  router.post('/', requirePermission('people.create'), async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await controller.create(req.body)); }
    catch (error) { next(error); }
  });
  router.patch('/:id', requirePermission('people.update'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid person ID' }); return; }
      res.json(await controller.update(id, req.body));
    } catch (error) { next(error); }
  });
  router.delete('/:id', requirePermission('people.archive'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid person ID' }); return; }
      await controller.archive(id);
      res.status(204).send();
    } catch (error) { next(error); }
  });
  return router;
}
