import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';
import type { ISettingsService } from '../services/SettingsService';
import { AppError } from '../middleware/errorHandler';
import { recordAudit } from '../services/audit-event';

// Static/persistent branding storage directory
const BRANDING_DIR = path.resolve(
  process.env.APPLICATION_DATA_DIR ?? path.join(process.env.PROGRAMDATA ?? process.env.LOCALAPPDATA ?? os.homedir(), 'IT-Inventory-Server'),
  'branding',
);

// Allowed MIME types and extensions maps
const ALLOWED_MIMES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg'
};

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];

/**
 * Super safe filename sanitization to prevent directory traversal and injection.
 */
function sanitizeFilename(filename: string): string {
  // Remove non-alphanumeric, dots, dashes, and underscores
  const ext = path.extname(filename).toLowerCase();
  const name = path.basename(filename, ext);
  const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${cleanName}${ext}`;
}

/**
 * Creates the router for branding and logo operations.
 * Mounted at `/api/settings/branding` or included via settings router.
 */
export function createBrandingRouter(settingsService: ISettingsService, authService: AuthService): Router {
  const router = Router();

  // Multiparts/form-data processor
  const upload = multer({
    limits: {
      fileSize: 2 * 1024 * 1024 // 2 Megabytes
    },
    fileFilter: (_req, file, cb) => {
      const mime = file.mimetype.toLowerCase();
      if (!Object.keys(ALLOWED_MIMES).includes(mime)) {
        cb(new AppError('Forbidden MIME-type. Supported: PNG, JPG/JPEG, WebP, SVG.', 400));
        return;
      }
      cb(null, true);
    }
  });

  // Ensure directories exist
  fs.mkdirSync(BRANDING_DIR, { recursive: true });

  /**
   * Safe logo serving route: GET /api/public/branding/logo/:filename (or via general routes)
   * This endpoint is public (unauthenticated) because it is used before logging in (login screen).
   */
  router.get('/logo/:filename', (req: Request, res: Response, next: NextFunction) => {
    try {
      const filenameParam = req.params.filename;
      if (typeof filenameParam !== 'string') {
        res.status(400).json({ success: false, error: 'Invalid filename parameter.' });
        return;
      }
      const filename = path.basename(filenameParam); // prevent traversal
      const finalPath = path.join(BRANDING_DIR, filename);

      // Verify path stays within directory
      const relative = path.relative(BRANDING_DIR, finalPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        res.status(400).json({ success: false, error: 'Path traversal forbidden.' });
        return;
      }

      if (!fs.existsSync(finalPath)) {
        res.status(404).json({ success: false, error: 'Logo not found.' });
        return;
      }

      // Serve the file safely
      res.sendFile(finalPath);
    } catch (error) {
      next(error);
    }
  });

  // Authenticated endpoints below
  router.use(requireAuthentication(authService));

  /**
   * POST /logo - upload or replace the custom logo
   */
  router.post('/logo', requirePermission('settings.branding'), upload.single('logo'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded.' });
        return;
      }

      const file = req.file;

      // Double-validate extension and MIME type alignment
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        res.status(400).json({ success: false, error: 'Invalid extension.' });
        return;
      }

      const expectedExt = ALLOWED_MIMES[file.mimetype as keyof typeof ALLOWED_MIMES];
      if (!expectedExt || (ext !== expectedExt && !(ext === '.jpeg' && expectedExt === '.jpg'))) {
        res.status(400).json({ success: false, error: 'MIME type and file extension mismatch.' });
        return;
      }

      // Basic PNG/JPG integrity confirmation by parsing headers
      if (ext === '.png' && file.buffer.length > 8) {
        const pngHeader = file.buffer.toString('hex', 0, 8);
        if (pngHeader !== '89504e470d0a1a0a') {
          res.status(400).json({ success: false, error: 'Corrupt or fake PNG file.' });
          return;
        }
      } else if ((ext === '.jpg' || ext === '.jpeg') && file.buffer.length > 4) {
        const jpgHeader = file.buffer.toString('hex', 0, 4);
        if (!jpgHeader.startsWith('ffd8ff')) {
          res.status(400).json({ success: false, error: 'Corrupt or fake JPEG file.' });
          return;
        }
      }

      // Optional SVG validation: scan for script tags or dangerous XML elements
      if (ext === '.svg') {
        const svgContent = file.buffer.toString('utf8');
        if (svgContent.includes('<script') || svgContent.includes('javascript:') || svgContent.includes('onload')) {
          res.status(400).json({ success: false, error: 'Malicious SVG payload blocked.' });
          return;
        }
      }

      // Generate neat unique filename
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      sanitizeFilename(file.originalname);
      const uniqueFilename = `logo-${timestamp}-${random}${ext}`;
      const destinationPath = path.join(BRANDING_DIR, uniqueFilename);

      // Save logo buffers
      fs.writeFileSync(destinationPath, file.buffer);

      // Clean up previous logo file if it exists and is custom
      const currentProfile = await settingsService.getOrganizationProfile();
      const previousLogo = currentProfile.logoUrl;

      if (previousLogo && previousLogo.startsWith('/api/settings/branding/logo/')) {
        const prevFilename = previousLogo.split('/').pop();
        if (prevFilename) {
          const prevPath = path.join(BRANDING_DIR, prevFilename);
          if (fs.existsSync(prevPath)) {
            try {
              fs.unlinkSync(prevPath);
            } catch (err) {
              console.error('Failed to unlink replaced logo: ', err);
            }
          }
        }
      }

      // Build safe URL prefix for serving
      const publicUrl = `/api/settings/branding/logo/${uniqueFilename}`;

      // Persist path in settings
      const updatedSetting = await settingsService.updateSetting('ORGANIZATION', 'logo_path', publicUrl, req.auth!.userId);

      // Record Audit
      await recordAudit('SYSTEM', null, 'UPDATE', 'Uploaded custom organization logo', { logo_path: previousLogo }, { logo_path: publicUrl });

      res.status(200).json({
        success: true,
        logoUrl: publicUrl,
        setting: updatedSetting
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /logo - remove custom logo and revert to default
   */
  router.delete('/logo', requirePermission('settings.branding'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentProfile = await settingsService.getOrganizationProfile();
      const previousLogo = currentProfile.logoUrl;

      if (previousLogo && previousLogo.startsWith('/api/settings/branding/logo/')) {
        const prevFilename = previousLogo.split('/').pop();
        if (prevFilename) {
          const prevPath = path.join(BRANDING_DIR, prevFilename);
          if (fs.existsSync(prevPath)) {
            try {
              fs.unlinkSync(prevPath);
            } catch (err) {
              console.error('Failed to unlink logo on deletion: ', err);
            }
          }
        }
      }

      // Revert to empty or default.
      const defaultLogo = '';
      const updatedSetting = await settingsService.updateSetting('ORGANIZATION', 'logo_path', defaultLogo, req.auth!.userId);

      await recordAudit('SYSTEM', null, 'UPDATE', 'Removed custom organization logo', { logo_path: previousLogo }, { logo_path: defaultLogo });

      res.status(200).json({
        success: true,
        logoUrl: null,
        setting: updatedSetting
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
