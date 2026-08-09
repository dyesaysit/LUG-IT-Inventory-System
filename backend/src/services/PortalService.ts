import { CreateEquipmentRequestInputSchema, ReportProblemInputSchema } from 'shared';
import type {
  AssetAssignment,
  CreateEquipmentRequestInput,
  EquipmentRequest,
  Ticket,
  PortalProfile,
  ReportProblemInput,
  CreateTicketInput,
} from 'shared';
import { CreateTicketInputSchema } from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { IEquipmentRequestRepository } from '../repositories/EquipmentRequestRepository';
import type { IUserRepository } from '../repositories/UserRepository';
import type { IAssignmentService } from './AssignmentService';
import type { TicketService } from './TicketService';
import { recordAudit } from './audit-event';
import type { NotificationService } from './NotificationService';

/**
 * Staff Portal service. Everything is scoped to the signed-in user: staff can
 * only see their own assigned assets, tickets, and requests, and can only report
 * problems on assets currently assigned to them. Problem reports enter the
 * existing Ticket workflow for IT triage and optional maintenance/repair conversion.
 */
export class PortalService {
  constructor(
    private readonly users: IUserRepository,
    private readonly assignments: IAssignmentService,
    private readonly tickets: TicketService,
    private readonly requests: IEquipmentRequestRepository,
    private readonly notifications: NotificationService,
  ) {}

  async getProfile(userId: number): Promise<PortalProfile> {
    const user = await this.users.getUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      personId: user.personId,
      personName: user.personName,
    };
  }

  async getMyAssets(userId: number): Promise<AssetAssignment[]> {
    const user = await this.users.getUserById(userId);
    if (!user?.personId) return [];
    return this.assignments.list({ personId: user.personId, status: 'ACTIVE', pageSize: 100 });
  }

  async reportProblem(userId: number, input: ReportProblemInput): Promise<Ticket> {
    const parsed = ReportProblemInputSchema.parse(input);
    const user = await this.users.getUserById(userId);
    if (!user?.personId) {
      throw new AppError('Your account is not linked to a staff record. Please contact IT.', 400);
    }
    const active = await this.assignments.list({
      personId: user.personId,
      assetId: parsed.assetId,
      status: 'ACTIVE',
      pageSize: 1,
    });
    if (active.length === 0) {
      throw new AppError('You can only report problems on assets currently assigned to you.', 403);
    }
    return this.tickets.create({
      assetId: parsed.assetId,
      title: `Issue with asset ${active[0].assetTag}`,
      priority: parsed.priority,
      description: parsed.faultDescription,
      category: 'DEVICE',
    }, userId, user.personId);
  }

  async createTicket(userId: number, input: CreateTicketInput): Promise<Ticket> {
    const parsed = CreateTicketInputSchema.parse(input);
    const user = await this.users.getUserById(userId);
    if (!user?.personId) {
      throw new AppError('Your account is not linked to a staff record. Please contact IT.', 400);
    }
    if (parsed.assetId) {
      const assignments = await this.assignments.list({
        personId: user.personId,
        assetId: parsed.assetId,
        status: 'ACTIVE',
        pageSize: 1,
      });
      if (assignments.length === 0) {
        throw new AppError('You can only submit tickets for assets currently assigned to you.', 403);
      }
    }
    return this.tickets.create(parsed, userId, user.personId);
  }

  async getMyTickets(userId: number): Promise<Ticket[]> {
    const user = await this.users.getUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    return this.tickets.listByOwner(userId, user.personId);
  }

  async createRequest(userId: number, input: CreateEquipmentRequestInput): Promise<EquipmentRequest> {
    const parsed = CreateEquipmentRequestInputSchema.parse(input);
    const user = await this.users.getUserById(userId);
    const created = await this.requests.create(userId, user?.personId ?? null, parsed);
    await recordAudit('SYSTEM', created.id, 'CREATE', `Equipment request #${created.id} created`);
    this.notifications.notifyPermission('requests.review',{type:'EQUIPMENT_REQUEST_CREATED',title:'New Equipment Request',message:`${created.requestedByName || created.requestedByUsername || 'A staff member'} requested ${created.itemName}`,entityType:'EQUIPMENT_REQUEST',entityId:created.id});
    return created;
  }

  async getMyRequests(userId: number): Promise<EquipmentRequest[]> {
    return this.requests.listByUser(userId);
  }

  async cancelRequest(userId: number, id: number): Promise<EquipmentRequest> {
    const request = await this.requests.getById(id);
    if (!request || request.requestedByUserId !== userId) {
      throw new AppError('Request not found', 404);
    }
    if (request.status !== 'PENDING') {
      throw new AppError('Only pending requests can be cancelled.', 400);
    }
    return this.requests.setStatus(id, 'CANCELLED');
  }
}
