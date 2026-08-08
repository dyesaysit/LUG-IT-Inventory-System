import type {
  CreateDepartmentInput,
  Department,
  DepartmentListQuery,
  UpdateDepartmentInput,
} from 'shared';
import type { IDepartmentService } from '../services/DepartmentService';
import { recordAudit } from '../services/audit-event';

/** HTTP-facing operations for departments. */
export class DepartmentController {
  constructor(private readonly service: IDepartmentService) {}

  /** Lists departments using validated query options. */
  list(query: DepartmentListQuery): Promise<Department[]> {
    return this.service.list(query);
  }

  /** Loads one department. */
  getById(id: number): Promise<Department> {
    return this.service.getById(id);
  }

  /** Creates a department. */
  async create(input: CreateDepartmentInput): Promise<Department> {
    const row=await this.service.create(input);await recordAudit('DEPARTMENT',row.id,'CREATE',`Created department ${row.code}`,null,row);return row;
  }

  /** Applies a partial department update. */
  async update(id: number, input: UpdateDepartmentInput): Promise<Department> {
    const before=await this.service.getById(id);const row=await this.service.update(id,input);await recordAudit('DEPARTMENT',id,'UPDATE',`Updated department ${row.code}`,before,row);return row;
  }

  /** Soft-deletes a department. */
  async archive(id: number): Promise<void> {
    const before=await this.service.getById(id);await this.service.archive(id);await recordAudit('DEPARTMENT',id,'ARCHIVE',`Archived department ${before.code}`,before);
  }
}
