import type {
  CreateDepartmentInput,
  Department,
  DepartmentListQuery,
  UpdateDepartmentInput,
} from 'shared';
import type { IDepartmentService } from '../services/DepartmentService';

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
  create(input: CreateDepartmentInput): Promise<Department> {
    return this.service.create(input);
  }

  /** Applies a partial department update. */
  update(id: number, input: UpdateDepartmentInput): Promise<Department> {
    return this.service.update(id, input);
  }

  /** Soft-deletes a department. */
  archive(id: number): Promise<void> {
    return this.service.archive(id);
  }
}
