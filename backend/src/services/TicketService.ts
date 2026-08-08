import {
  AssignTicketInputSchema,
  CompleteTicketInputSchema,
  ConvertTicketInputSchema,
  CreateTicketInputSchema,
  TicketListQuerySchema,
} from 'shared';
import type {
  AssignTicketInput,
  CompleteTicketInput,
  ConvertTicketInput,
  CreateTicketInput,
  Ticket,
  TicketListQuery,
  TicketSummary,
} from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { ITicketRepository } from '../repositories/TicketRepository';
import type { IMaintenanceService } from './MaintenanceService';
import type { IRepairService } from './RepairService';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Ticket workflow: New -> Assigned -> In progress -> (spawn Maintenance or Repair) -> Completed -> Closed.
 * The maintenance/repair work reuses those services; tickets only orchestrate and link.
 */
export class TicketService {
  constructor(
    private readonly repo: ITicketRepository,
    private readonly maintenance: IMaintenanceService,
    private readonly repairs: IRepairService,
  ) {}

  list(query: TicketListQuery): Promise<Ticket[]> {
    return this.repo.list(TicketListQuerySchema.parse(query));
  }

  summary(): Promise<TicketSummary> {
    return this.repo.summary();
  }

  async get(id: number): Promise<Ticket> {
    const ticket = await this.repo.getById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);
    return ticket;
  }

  create(input: CreateTicketInput, reportedByUserId: number | null, reportedByPersonId: number | null): Promise<Ticket> {
    return this.repo.create(CreateTicketInputSchema.parse(input), reportedByUserId, reportedByPersonId);
  }

  async assign(id: number, input: AssignTicketInput): Promise<Ticket> {
    const parsed = AssignTicketInputSchema.parse(input);
    const ticket = await this.get(id);
    if (!['NEW', 'ASSIGNED'].includes(ticket.status)) {
      throw new AppError('This ticket can no longer be reassigned.', 400);
    }
    return this.repo.assign(id, parsed.assignedTo);
  }

  async start(id: number): Promise<Ticket> {
    const ticket = await this.get(id);
    if (ticket.status !== 'ASSIGNED') {
      throw new AppError('Assign the ticket to someone before starting it.', 400);
    }
    return this.repo.start(id);
  }

  async convert(id: number, input: ConvertTicketInput): Promise<Ticket> {
    const parsed = ConvertTicketInputSchema.parse(input);
    const ticket = await this.get(id);
    if (ticket.status !== 'IN_PROGRESS') {
      throw new AppError('Start the ticket before creating a maintenance or repair job.', 400);
    }
    if (!ticket.assetId) {
      throw new AppError('Link an asset to the ticket first — maintenance and repair jobs are asset-based.', 400);
    }
    const fault = ticket.description?.trim() || ticket.title;
    if (parsed.kind === 'MAINTENANCE') {
      const record = await this.maintenance.create({
        assetId: ticket.assetId,
        maintenanceType: parsed.maintenanceType ?? 'CORRECTIVE',
        priority: ticket.priority,
        reportedDate: today(),
        reportedByPersonId: ticket.reportedByPersonId,
        faultDescription: fault,
      });
      return this.repo.linkMaintenance(id, record.id);
    }
    const repair = await this.repairs.create({
      assetId: ticket.assetId,
      repairType: parsed.repairType ?? 'INTERNAL',
      priority: ticket.priority,
      reportedDate: today(),
      faultDescription: fault,
    });
    return this.repo.linkRepair(id, repair.id);
  }

  async complete(id: number, input: CompleteTicketInput): Promise<Ticket> {
    const parsed = CompleteTicketInputSchema.parse(input);
    const ticket = await this.get(id);
    if (ticket.status !== 'IN_PROGRESS') {
      throw new AppError('Only in-progress tickets can be completed.', 400);
    }
    return this.repo.complete(id, parsed.resolution);
  }

  async close(id: number): Promise<Ticket> {
    const ticket = await this.get(id);
    if (ticket.status !== 'COMPLETED') {
      throw new AppError('Only completed tickets can be closed.', 400);
    }
    return this.repo.close(id);
  }

  async cancel(id: number): Promise<Ticket> {
    const ticket = await this.get(id);
    if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(ticket.status)) {
      throw new AppError('This ticket can no longer be cancelled.', 400);
    }
    return this.repo.cancel(id);
  }
}
