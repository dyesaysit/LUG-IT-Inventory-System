import { EquipmentRequestListQuerySchema, FulfilRequestInputSchema, ReviewRequestInputSchema } from 'shared';
import type {
  EquipmentRequest,
  EquipmentRequestListQuery,
  FulfilRequestInput,
  ReviewRequestInput,
} from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { IEquipmentRequestRepository } from '../repositories/EquipmentRequestRepository';
import type { IAssignmentService } from './AssignmentService';
import type { IAuditService } from './AuditService';

/** Identifies the administrator performing a review action, for audit trails. */
export interface Reviewer {
  userId: number;
  username: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const clean = (value: string | null | undefined): string | null => value?.trim() || null;

/**
 * Admin-side review of staff equipment requests. Reuses the existing
 * AssignmentService for fulfilment (no duplicate assignment logic) and records
 * an audit entry for every state change.
 */
export class RequestReviewService {
  constructor(
    private readonly requests: IEquipmentRequestRepository,
    private readonly assignments: IAssignmentService,
    private readonly audit: IAuditService,
  ) {}

  async list(query: EquipmentRequestListQuery): Promise<EquipmentRequest[]> {
    return this.requests.listAll(EquipmentRequestListQuerySchema.parse(query));
  }

  async getById(id: number): Promise<EquipmentRequest> {
    const request = await this.requests.getById(id);
    if (!request) throw new AppError('Request not found', 404);
    return request;
  }

  async approve(id: number, input: ReviewRequestInput, reviewer: Reviewer): Promise<EquipmentRequest> {
    const request = await this.getById(id);
    if (request.status !== 'PENDING') {
      throw new AppError('Only pending requests can be approved.', 400);
    }
    const notes = clean(ReviewRequestInputSchema.parse(input).notes);
    const updated = await this.requests.review(id, 'APPROVED', notes, reviewer.username);
    await this.recordAudit(updated, 'APPROVE', `Approved equipment request "${request.itemName}"`, request, reviewer);
    return updated;
  }

  async reject(id: number, input: ReviewRequestInput, reviewer: Reviewer): Promise<EquipmentRequest> {
    const request = await this.getById(id);
    if (!['PENDING', 'APPROVED'].includes(request.status)) {
      throw new AppError('Only pending or approved requests can be rejected.', 400);
    }
    const notes = clean(ReviewRequestInputSchema.parse(input).notes);
    const updated = await this.requests.review(id, 'REJECTED', notes, reviewer.username);
    await this.recordAudit(updated, 'REJECT', `Rejected equipment request "${request.itemName}"`, request, reviewer);
    return updated;
  }

  async requestMoreInformation(id: number, input: ReviewRequestInput, reviewer: Reviewer): Promise<EquipmentRequest> {
    const request = await this.getById(id);
    if (request.status !== 'PENDING') {
      throw new AppError('More information can only be requested on pending requests.', 400);
    }
    const notes = clean(ReviewRequestInputSchema.parse(input).notes);
    if (!notes) {
      throw new AppError('Please describe what additional information is required.', 400);
    }
    const updated = await this.requests.review(id, 'PENDING', notes, reviewer.username);
    await this.recordAudit(
      updated,
      'UPDATE',
      `Requested more information on equipment request "${request.itemName}"`,
      request,
      reviewer,
    );
    return updated;
  }

  async fulfil(id: number, input: FulfilRequestInput, reviewer: Reviewer): Promise<EquipmentRequest> {
    const request = await this.getById(id);
    if (request.status !== 'APPROVED') {
      throw new AppError('Only approved requests can be fulfilled.', 400);
    }
    if (!request.requestedByPersonId) {
      throw new AppError('This request is not linked to a staff record, so an asset cannot be assigned.', 400);
    }
    const parsed = FulfilRequestInputSchema.parse(input);

    // Reuse the existing assignment lifecycle to assign the chosen asset to the requester.
    const assignment = await this.assignments.create({
      assetId: parsed.assetId,
      assignmentType: 'PERSON',
      personId: request.requestedByPersonId,
      assignedDate: today(),
      purpose: `Equipment request #${request.id}: ${request.itemName}`,
      notes: clean(parsed.notes),
      assignedBy: reviewer.username,
    });

    const updated = await this.requests.fulfil(id, assignment.id, reviewer.username, clean(parsed.notes));
    await this.recordAudit(
      updated,
      'ASSIGN',
      `Fulfilled equipment request "${request.itemName}" via assignment #${assignment.id}`,
      request,
      reviewer,
    );
    return updated;
  }

  private async recordAudit(
    request: EquipmentRequest,
    action: 'APPROVE' | 'REJECT' | 'UPDATE' | 'ASSIGN',
    summary: string,
    previous: EquipmentRequest,
    reviewer: Reviewer,
  ): Promise<void> {
    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: request.id,
      action,
      performedBy: String(reviewer.userId),
      performedByName: reviewer.username,
      previousValues: { status: previous.status },
      newValues: { status: request.status, reviewNotes: request.reviewNotes },
      summary,
    });
  }
}
