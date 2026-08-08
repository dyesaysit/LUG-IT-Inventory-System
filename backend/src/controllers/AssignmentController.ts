import type {
  AssignmentListQuery, CreateAssignmentInput, ReturnAssignmentInput, UpdateAssignmentInput,
} from 'shared';
import type { IAssignmentService } from '../services/AssignmentService';
import { recordAudit } from '../services/audit-event';

/** HTTP-facing assignment lifecycle actions. */
export class AssignmentController {
  constructor(private readonly service: IAssignmentService) {}
  /** Lists assignments. */
  list(query: AssignmentListQuery) { return this.service.list(query); }
  /** Gets an assignment. */
  getById(id: number) { return this.service.getById(id); }
  /** Creates an assignment. */
  async create(input: CreateAssignmentInput) { const row=await this.service.create(input);await recordAudit('ASSIGNMENT',row.id,'ASSIGN',`Assigned asset ${row.assetTag}`,null,row);return row; }
  /** Updates an assignment. */
  async update(id: number, input: UpdateAssignmentInput) { const before=await this.service.getById(id);const row=await this.service.update(id,input);await recordAudit('ASSIGNMENT',id,'UPDATE',`Updated assignment for ${row.assetTag}`,before,row);return row; }
  /** Returns an assigned asset. */
  async returnAssignment(id: number, input: ReturnAssignmentInput) {
    const before=await this.service.getById(id);const row=await this.service.returnAssignment(id,input);await recordAudit('ASSIGNMENT',id,'RETURN',`Returned asset ${row.assetTag}`,before,row);return row;
  }
  /** Cancels an active assignment. */
  async cancelAssignment(id: number) { const before=await this.service.getById(id);const row=await this.service.cancelAssignment(id);await recordAudit('ASSIGNMENT',id,'CANCEL',`Cancelled assignment for ${row.assetTag}`,before,row);return row; }
  /** Gets all assignment history for an asset. */
  getAssetHistory(assetId: number) { return this.service.getAssetHistory(assetId); }
}
