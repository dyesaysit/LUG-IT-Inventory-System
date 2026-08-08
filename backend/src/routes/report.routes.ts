import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ReportFilterSchema, ReportFormatSchema, ReportTypeSchema } from 'shared';
import type { ReportType } from 'shared';
import type { ReportController } from '../controllers/ReportController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';
import { ZodError } from 'zod';
import { AppError } from '../middleware/errorHandler';

const defaults: Record<string, ReportType> = {
  assets: 'ASSET_REGISTER',
  assignments: 'ASSIGNMENT_HISTORY',
  maintenance: 'MAINTENANCE_SUMMARY',
  repairs: 'REPAIR_SUMMARY',
  departments: 'DEPARTMENT_INVENTORY',
  locations: 'LOCATION_INVENTORY',
  people: 'PERSON_ASSET_HOLDINGS',
  audit: 'AUDIT_ACTIVITY',
};

const reportError = (error: unknown, next: NextFunction): void => {
  if (error instanceof ZodError) {
    next(new AppError('The selected report filters are invalid.', 400, true, 'REPORT_FILTER_INVALID'));
    return;
  }
  if (error instanceof AppError) {
    next(error);
    return;
  }
  console.error('Report generation failed:', error);
  next(new AppError('Unable to generate the selected report.', 500, true, 'REPORT_GENERATION_FAILED'));
};

export function createReportRouter(c: ReportController, authService: AuthService) {
  const r = Router();
  r.use(requireAuthentication(authService));

  r.get('/', requirePermission('reports.view'), (_req, res) => res.json(c.catalog()));

  r.get('/summary', requirePermission('reports.view'), async (_req, res, next) => {
    try {
      res.json(await c.summary());
    } catch (e) {
      reportError(e, next);
    }
  });

  for (const [path, fallback] of Object.entries(defaults)) {
    r.get(`/${path}`, requirePermission('reports.view'), async (req, res, next) => {
      try {
        const f = ReportFilterSchema.parse(req.query);
        const type = ReportTypeSchema.parse(f.reportType ?? fallback);
        res.json(await c.generate(type, f));
      } catch (e) {
        reportError(e, next);
      }
    });
  }

  r.get('/export', requirePermission('reports.export'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const f = ReportFilterSchema.parse(req.query);
      const type = ReportTypeSchema.parse(f.reportType);
      const format = ReportFormatSchema.parse(f.format);

      if (format === 'JSON') {
        res.json(await c.generate(type, f));
        return;
      }

      const username = req.auth?.username;

      const out = await c.export(type, f, format, username);
      res.setHeader('Content-Type', out.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${out.filename}"`,
      );
      res.send(out.body);
    } catch (e) {
      reportError(e, next);
    }
  });

  return r;
}
