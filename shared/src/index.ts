// Barrel export for the shared package

export * from './types/index';
export * from './schemas/index';
export * from './constants/index';

// Explicit runtime exports keep CommonJS consumers and Vite's static analyser aligned.
export {
  DepartmentSchema,
  CreateDepartmentInputSchema,
  UpdateDepartmentInputSchema,
  DepartmentListQuerySchema,
} from './schemas/Department';
