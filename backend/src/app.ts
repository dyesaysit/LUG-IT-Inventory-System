import express from 'express';
import type { Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { EnvConfig } from './config';
import { createAssetController } from './controllers/AssetController';
import { createErrorHandler, notFound, requestLogger } from './middleware';
import { createAssetRepository } from './repositories/AssetRepository';
import { createAssetCategoryRouter, createAssetRouter } from './routes/asset.routes';
import { createHealthRouter } from './routes/health.routes';
import { createAssetService } from './services/AssetService';
import { DepartmentController } from './controllers/DepartmentController';
import { createDepartmentRepository } from './repositories/DepartmentRepository';
import { createDepartmentRouter } from './routes/department.routes';
import { DepartmentService } from './services/DepartmentService';
import { PersonController } from './controllers/PersonController';
import { createPersonRepository } from './repositories/PersonRepository';
import { createPersonRouter } from './routes/person.routes';
import { PersonService } from './services/PersonService';
import { LocationController } from './controllers/LocationController';
import { createLocationRepository } from './repositories/LocationRepository';
import { createLocationRouter } from './routes/location.routes';
import { LocationService } from './services/LocationService';
import { AssignmentController } from './controllers/AssignmentController';
import { createAssignmentRepository } from './repositories/AssignmentRepository';
import { createAssetAssignmentHistoryRouter, createAssignmentRouter } from './routes/assignment.routes';
import { AssignmentService } from './services/AssignmentService';
import { MaintenanceController } from './controllers/MaintenanceController';
import { createMaintenanceRepository } from './repositories/MaintenanceRepository';
import { createAssetMaintenanceHistoryRouter,createMaintenanceRouter } from './routes/maintenance.routes';
import { MaintenanceService } from './services/MaintenanceService';
import { RepairController } from './controllers/RepairController';
import { createRepairRepository } from './repositories/RepairRepository';
import { createAssetRepairHistoryRouter,createRepairRouter } from './routes/repair.routes';
import { RepairService } from './services/RepairService';
import { AuditController } from './controllers/AuditController';
import { createAuditRepository } from './repositories/AuditRepository';
import { createAuditRouter } from './routes/audit-secure.routes';
import { AuditService } from './services/AuditService';
import { configureAudit } from './services/audit-event';
import { ReportController } from './controllers/ReportController';
import { createReportRepository } from './repositories/report-repository';
import { createReportRouter } from './routes/report.routes';
import { ReportService } from './services/ReportService';
import { createUserRepository } from './repositories/UserRepository';
import { createRoleRepository } from './repositories/RoleRepository';
import { createPermissionRepository } from './repositories/PermissionRepository';
import { createSessionRepository } from './repositories/SessionRepository';
import { PasswordService } from './services/PasswordService';
import { AuthService } from './services/AuthService';
import { AuthController } from './controllers/AuthController';
import { createAuthRouter } from './routes/auth.routes';
import { UserService } from './services/UserService';
import { UserController } from './controllers/UserController';
import { createRolePermissionRouter, createUserRouter } from './routes/user.routes';
import { createSettingsRepository } from './repositories/SettingsRepository';
import { createBackupRepository } from './repositories/BackupRepository';
import { createSettingsService } from './services/SettingsService';
import { createSafeBackupService } from './services/SafeBackupService';
import { createDatabaseMaintenanceService } from './services/DatabaseMaintenanceService';
import { createSystemInfoService } from './services/SystemInfoService';
import { SettingsController, BackupController } from './controllers/SettingsController';
import { createBackupRouter, createSettingsRouter } from './routes/settings.routes';
import { createPublicRouter } from './routes/public.routes';
import { createBrandingRouter } from './routes/branding.routes';
import { createEquipmentRequestRepository } from './repositories/EquipmentRequestRepository';
import { PortalService } from './services/PortalService';
import { PortalController } from './controllers/PortalController';
import { createPortalRouter } from './routes/portal.routes';
import { createTicketRepository } from './repositories/TicketRepository';
import { TicketService } from './services/TicketService';
import { TicketController } from './controllers/TicketController';
import { createTicketRouter } from './routes/ticket.routes';
import { RequestReviewService } from './services/RequestReviewService';
import { RequestReviewController } from './controllers/RequestReviewController';
import { createEquipmentRequestRouter } from './routes/equipment-request.routes';

/**
 * Creates the configured Express application.
 *
 * @param config - Validated application configuration.
 * @returns The configured Express application.
 */
export function createApp(config: EnvConfig): Express {
  const app = express();
  const isProduction = config.NODE_ENV === 'production';
  const auditService=new AuditService(createAuditRepository());
  configureAudit(auditService);
  const passwordService = new PasswordService();
  const userRepository = createUserRepository();
  const roleRepository = createRoleRepository();
  const permissionRepository = createPermissionRepository();
  const sessionRepository = createSessionRepository();
  const authService = new AuthService(userRepository, roleRepository, sessionRepository, passwordService, auditService);
  const authController = new AuthController(authService);
  const userService = new UserService(userRepository, roleRepository, permissionRepository, passwordService, authService, auditService);
  const userController = new UserController(userService);
  const auditController=new AuditController(auditService);
  const settingsService = createSettingsService(createSettingsRepository());
  const reportController=new ReportController(new ReportService(createReportRepository(), settingsService));
  const assetRepository = createAssetRepository();
  const assetService = createAssetService(assetRepository);
  const assetController = createAssetController(assetService);
  const departmentRepository = createDepartmentRepository();
  const departmentService = new DepartmentService(departmentRepository);
  const departmentController = new DepartmentController(departmentService);
  const personRepository = createPersonRepository();
  const personService = new PersonService(personRepository);
  const personController = new PersonController(personService);
  const locationRepository = createLocationRepository();
  const locationService = new LocationService(locationRepository);
  const locationController = new LocationController(locationService);
  const assignmentRepository = createAssignmentRepository();
  const assignmentService = new AssignmentService(assignmentRepository);
  const assignmentController = new AssignmentController(assignmentService);
  const maintenanceRepository=createMaintenanceRepository();
  const maintenanceService=new MaintenanceService(maintenanceRepository);
  const maintenanceController=new MaintenanceController(maintenanceService);
  const repairService = new RepairService(createRepairRepository());
  const repairController = new RepairController(repairService);
  const backupService = createSafeBackupService(config, createBackupRepository());
  const databaseMaintenanceService = createDatabaseMaintenanceService(config);
  const systemInfoService = createSystemInfoService(config, backupService, settingsService);
  const settingsController = new SettingsController(settingsService, systemInfoService, databaseMaintenanceService);
  const backupController = new BackupController(backupService);
  const equipmentRequestRepository = createEquipmentRequestRepository();
  const ticketRepository = createTicketRepository();
  const portalController = new PortalController(
    new PortalService(userRepository, assignmentService, ticketRepository, equipmentRequestRepository),
  );
  const requestReviewController = new RequestReviewController(
    new RequestReviewService(equipmentRequestRepository, assignmentService, auditService),
  );
  const ticketController = new TicketController(
    new TicketService(ticketRepository, maintenanceService, repairService),
  );

// Body parsing
  app.use(helmet({
    crossOriginResourcePolicy: false,
  }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(requestLogger);

// Public (unauthenticated) routes
  app.use('/api', createPublicRouter(settingsService));

// API routes
  app.use('/api/health', createHealthRouter(config));
  app.use('/api/auth', createAuthRouter(authController, authService, isProduction));
  app.use('/api/users', createUserRouter(userController, authService));
  app.use('/api', createRolePermissionRouter(userController, authService));
  app.use('/api/assets', createAssetRouter(assetController, authService));
  app.use('/api/asset-categories', createAssetCategoryRouter(assetController, authService));
  app.use('/api/departments', createDepartmentRouter(departmentController, authService));
  app.use('/api/people', createPersonRouter(personController, authService));
  app.use('/api/locations', createLocationRouter(locationController, authService));
  app.use('/api/assignments', createAssignmentRouter(assignmentController, authService));
  app.use('/api/assets', createAssetAssignmentHistoryRouter(assignmentController, authService));
  app.use('/api/maintenance',createMaintenanceRouter(maintenanceController, authService));
  app.use('/api/assets',createAssetMaintenanceHistoryRouter(maintenanceController, authService));
  app.use('/api/repairs',createRepairRouter(repairController, authService));
  app.use('/api/assets',createAssetRepairHistoryRouter(repairController, authService));
  app.use('/api/audit',createAuditRouter(auditController, authService));
  app.use('/api/reports',createReportRouter(reportController, authService));
  app.use('/api/settings/branding', createBrandingRouter(settingsService, authService));
  app.use('/api/settings/backups', createBackupRouter(backupController, authService));
  app.use('/api/settings', createSettingsRouter(settingsController, authService));
  app.use('/api/portal', createPortalRouter(portalController, authService));
  app.use('/api/equipment-requests', createEquipmentRequestRouter(requestReviewController, authService));
  app.use('/api/tickets', createTicketRouter(ticketController, authService));

// Serve frontend static files in production
  if (config.NODE_ENV === 'production') {
  const frontendDist = './frontend/dist';
    app.use(express.static(frontendDist));
  // SPA fallback — serve index.html for any non-API route
    app.get('*', (_req, res) => {
      res.sendFile(`${frontendDist}/index.html`);
    });
  }

// Error handling (must be last)
  app.use(notFound);
  app.use(createErrorHandler(config));

  return app;
}
