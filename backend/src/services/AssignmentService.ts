import {
  AssignmentListQuerySchema, CreateAssignmentInputSchema,
  ReturnAssignmentInputSchema, UpdateAssignmentInputSchema,
} from 'shared';
import type {
  AssetAssignment, AssignmentListQuery, CreateAssignmentInput,
  ReturnAssignmentInput, UpdateAssignmentInput,
} from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { AssignmentTargetState, IAssignmentRepository } from '../repositories/AssignmentRepository';

const clean = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined || value === null) return value;
  return value.trim() || null;
};

/** Business operations for the assignment lifecycle. */
export interface IAssignmentService {
  list(query: AssignmentListQuery): Promise<AssetAssignment[]>;
  getById(id: number): Promise<AssetAssignment>;
  create(input: CreateAssignmentInput): Promise<AssetAssignment>;
  update(id: number, input: UpdateAssignmentInput): Promise<AssetAssignment>;
  returnAssignment(id: number, input: ReturnAssignmentInput): Promise<AssetAssignment>;
  cancelAssignment(id: number): Promise<AssetAssignment>;
  getAssetHistory(assetId: number): Promise<AssetAssignment[]>;
}

/** Validates targets, conflicts, dates, and state transitions. */
export class AssignmentService implements IAssignmentService {
  constructor(private readonly repository: IAssignmentRepository) {}

  async list(query: AssignmentListQuery): Promise<AssetAssignment[]> {
    return this.repository.listAssignments(AssignmentListQuerySchema.parse(query));
  }
  async getById(id: number): Promise<AssetAssignment> {
    const assignment = await this.repository.getAssignmentById(id);
    if (!assignment) throw new AppError('Assignment not found', 404);
    return assignment;
  }

  async create(input: CreateAssignmentInput): Promise<AssetAssignment> {
    const parsed = CreateAssignmentInputSchema.parse(input);
    const asset = await this.repository.getAssetState(parsed.assetId);
    if (!asset || asset.archivedAt) throw new AppError('Asset not found', 404);
    if (['RETIRED', 'DISPOSED', 'LOST', 'UNDER_REPAIR'].includes(asset.status)) {
      throw new AppError(`Assets with status ${asset.status} cannot be assigned`, 400);
    }
    if (await this.repository.getActiveAssignmentForAsset(parsed.assetId)) {
      throw new AppError('Asset already has an active assignment', 409);
    }
    await this.validateTarget(parsed);
    const normalized = {
      ...parsed, purpose: clean(parsed.purpose), notes: clean(parsed.notes),
      assignedBy: clean(parsed.assignedBy),
    };
    return this.repository.createAssignment(
      normalized, parsed.assignmentType === 'LOCATION' ? 'DEPLOYED' : 'ASSIGNED',
    );
  }

  async update(id: number, input: UpdateAssignmentInput): Promise<AssetAssignment> {
    const current = await this.getById(id);
    if (current.status !== 'ACTIVE') throw new AppError('Only active assignments can be edited', 400);
    const parsed = UpdateAssignmentInputSchema.parse(input);
    if (Object.keys(parsed).length === 0) throw new AppError('At least one usable field is required', 400);
    if (parsed.expectedReturnDate && parsed.expectedReturnDate < current.assignedDate) {
      throw new AppError('Expected return date cannot be before assigned date', 400);
    }
    return this.repository.updateAssignment(id, {
      ...parsed, purpose: clean(parsed.purpose), notes: clean(parsed.notes),
    });
  }

  async returnAssignment(id: number, input: ReturnAssignmentInput): Promise<AssetAssignment> {
    const current = await this.getById(id);
    if (current.status === 'RETURNED') throw new AppError('Assignment has already been returned', 409);
    if (current.status === 'CANCELLED') throw new AppError('Cancelled assignments cannot be returned', 400);
    if (current.status !== 'ACTIVE' && current.status !== 'OVERDUE') {
      throw new AppError('Assignment cannot be returned in its current state', 400);
    }
    const parsed = ReturnAssignmentInputSchema.parse(input);
    if (parsed.returnedDate < current.assignedDate) {
      throw new AppError('Return date cannot be before assigned date', 400);
    }
    if (parsed.returnLocationId) {
      await this.ensureActiveTarget(await this.repository.getLocationState(parsed.returnLocationId), 'Location');
    }
    return this.repository.returnAssignment(id, {
      ...parsed, returnNotes: clean(parsed.returnNotes), returnedBy: clean(parsed.returnedBy),
    });
  }

  async cancelAssignment(id: number): Promise<AssetAssignment> {
    const current = await this.getById(id);
    if (current.status !== 'ACTIVE') throw new AppError('Only active assignments can be cancelled', 400);
    return this.repository.cancelAssignment(id);
  }

  async getAssetHistory(assetId: number): Promise<AssetAssignment[]> {
    const asset = await this.repository.getAssetState(assetId);
    if (!asset || asset.archivedAt) throw new AppError('Asset not found', 404);
    return this.repository.listAssignmentHistoryForAsset(assetId);
  }

  private async validateTarget(input: CreateAssignmentInput): Promise<void> {
    if (input.assignmentType === 'PERSON' && input.personId) {
      await this.ensureActiveTarget(await this.repository.getPersonState(input.personId), 'Person');
    } else if (input.assignmentType === 'DEPARTMENT' && input.departmentId) {
      await this.ensureActiveTarget(await this.repository.getDepartmentState(input.departmentId), 'Department');
    } else if (input.assignmentType === 'LOCATION' && input.locationId) {
      await this.ensureActiveTarget(await this.repository.getLocationState(input.locationId), 'Location');
    } else {
      throw new AppError('Assignment target must match assignment type', 400);
    }
  }

  private async ensureActiveTarget(target: AssignmentTargetState | null, label: string): Promise<void> {
    if (!target || target.archivedAt) throw new AppError(`${label} not found`, 404);
    if (!target.isActive) throw new AppError(`${label} is inactive`, 400);
  }
}
