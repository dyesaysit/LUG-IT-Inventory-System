import {
  CreateDepartmentInputSchema,
  DepartmentListQuerySchema,
  UpdateDepartmentInputSchema,
} from 'shared';
import type {
  CreateDepartmentInput,
  Department,
  DepartmentListQuery,
  UpdateDepartmentInput,
} from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { IDepartmentRepository } from '../repositories/DepartmentRepository';

const cleanOptional = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined || value === null) return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Business operations exposed by the Departments module. */
export interface IDepartmentService {
  list(query: DepartmentListQuery): Promise<Department[]>;
  getById(id: number): Promise<Department>;
  create(input: CreateDepartmentInput): Promise<Department>;
  update(id: number, input: UpdateDepartmentInput): Promise<Department>;
  archive(id: number): Promise<void>;
}

/** Department validation and business-rule service. */
export class DepartmentService implements IDepartmentService {
  constructor(private readonly repository: IDepartmentRepository) {}

  async list(query: DepartmentListQuery): Promise<Department[]> {
    return this.repository.list(DepartmentListQuerySchema.parse(query));
  }

  async getById(id: number): Promise<Department> {
    const department = await this.repository.getById(id);
    if (!department) throw new AppError('Department not found', 404);
    return department;
  }

  async create(input: CreateDepartmentInput): Promise<Department> {
    const parsed = CreateDepartmentInputSchema.parse(input);
    const normalized: CreateDepartmentInput = {
      ...parsed,
      code: parsed.code.trim().toUpperCase(),
      name: parsed.name.trim(),
      description: cleanOptional(parsed.description),
      headOfDepartment: cleanOptional(parsed.headOfDepartment),
      email: cleanOptional(parsed.email)?.toLowerCase() ?? null,
      phone: cleanOptional(parsed.phone),
    };
    await this.ensureUnique(normalized.code, normalized.name);
    return this.repository.create(normalized);
  }

  async update(id: number, input: UpdateDepartmentInput): Promise<Department> {
    await this.getById(id);
    const parsed = UpdateDepartmentInputSchema.parse(input);
    if (Object.keys(parsed).length === 0) {
      throw new AppError('At least one usable field is required', 400);
    }
    const normalized: UpdateDepartmentInput = { ...parsed };
    if (parsed.code !== undefined) normalized.code = parsed.code.trim().toUpperCase();
    if (parsed.name !== undefined) normalized.name = parsed.name.trim();
    for (const key of ['description', 'headOfDepartment', 'email', 'phone'] as const) {
      if (parsed[key] !== undefined) normalized[key] = cleanOptional(parsed[key]);
    }
    if (normalized.email) normalized.email = normalized.email.toLowerCase();
    await this.ensureUnique(normalized.code, normalized.name, id);
    return this.repository.update(id, normalized);
  }

  async archive(id: number): Promise<void> {
    await this.getById(id);
    await this.repository.archive(id);
  }

  private async ensureUnique(code?: string, name?: string, excludeId?: number): Promise<void> {
    if (code && await this.repository.hasCode(code, excludeId)) {
      throw new AppError('Department code already exists', 409);
    }
    if (name && await this.repository.hasName(name, excludeId)) {
      throw new AppError('Department name already exists', 409);
    }
  }
}
