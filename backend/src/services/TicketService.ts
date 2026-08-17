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
  TicketMessage,
} from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { ITicketRepository } from '../repositories/TicketRepository';
import type { IMaintenanceService } from './MaintenanceService';
import type { IRepairService } from './RepairService';
import { recordAudit } from './audit-event';
import type { NotificationService } from './NotificationService';
import type { EmailService } from './EmailService';

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
    private readonly notifications: NotificationService,
    private readonly email?: EmailService,
  ) {}

  list(query: TicketListQuery): Promise<Ticket[]> {
    return this.repo.list(TicketListQuerySchema.parse(query));
  }

  listByOwner(userId: number, personId: number | null): Promise<Ticket[]> {
    return this.repo.listByOwner(userId, personId);
  }

  summary(): Promise<TicketSummary> {
    return this.repo.summary();
  }

  async get(id: number): Promise<Ticket> {
    const ticket = await this.repo.getById(id);
    if (!ticket) throw new AppError('Ticket not found', 404);
    return ticket;
  }

  async create(input: CreateTicketInput, reportedByUserId: number | null, reportedByPersonId: number | null): Promise<Ticket> {
    const created = await this.repo.create(CreateTicketInputSchema.parse(input), reportedByUserId, reportedByPersonId);
    await recordAudit('SYSTEM', created.id, 'CREATE', `Ticket ${created.ticketNumber} created`);
    this.notifications.notifyPermission('tickets.update', { type:'TICKET_CREATED', title:'New IT Ticket', message:`${created.requesterName || created.requesterUsername || 'A staff member'} reported: ${created.title}`, entityType:'TICKET', entityId:created.id });
    await this.email?.queuePermission('tickets.update', `New ticket ${created.ticketNumber}: ${created.title}`, `${created.requesterName || created.requesterUsername || 'A staff member'} raised a ${created.priority.toLowerCase()} priority ticket: ${created.title}`, created.id);
    return created;
  }

  async assign(id: number, input: AssignTicketInput): Promise<Ticket> {
    const parsed = AssignTicketInputSchema.parse(input);
    const ticket = await this.get(id);
    if (!['NEW', 'ASSIGNED'].includes(ticket.status)) {
      throw new AppError('This ticket can no longer be reassigned.', 400);
    }
    const updated = await this.repo.assign(id, parsed.assignedTo);
    await recordAudit('SYSTEM', id, 'ASSIGN', `Ticket ${updated.ticketNumber} assigned to ${parsed.assignedTo}`);
    this.notifyRequester(updated,'TICKET_ASSIGNED','Ticket assigned',`Your ticket ${updated.ticketNumber} has been assigned to IT.`);
    await this.emailRequester(updated, 'Ticket assigned', `Your ticket ${updated.ticketNumber} has been assigned to IT.`);
    return updated;
  }

  async start(id: number): Promise<Ticket> {
    const ticket = await this.get(id);
    if (ticket.status !== 'ASSIGNED') {
      throw new AppError('Assign the ticket to someone before starting it.', 400);
    }
    const updated = await this.repo.start(id);
    await recordAudit('SYSTEM', id, 'START', `Ticket ${updated.ticketNumber} started`);
    this.notifyRequester(updated,'TICKET_UPDATED','Ticket updated',`IT has started work on ticket ${updated.ticketNumber}.`);
    await this.emailRequester(updated, 'IT started work on your ticket', `IT has started work on ticket ${updated.ticketNumber}.`);
    return updated;
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
    if (ticket.category !== 'DEVICE') {
      throw new AppError('Only device issue tickets can create maintenance or repair work.', 400);
    }
    if (ticket.maintenanceRecordId || ticket.repairJobId) {
      throw new AppError('This ticket is already linked to a maintenance or repair job.', 409);
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
      const updated = await this.repo.linkMaintenance(id, record.id);
      await recordAudit('SYSTEM', id, 'CREATE', `Ticket ${updated.ticketNumber} converted to maintenance ${record.maintenanceNumber}`);
      this.notifyRequester(updated,'TICKET_UPDATED','Ticket updated',`IT is continuing work on ticket ${updated.ticketNumber}.`);
      return updated;
    }
    const repair = await this.repairs.create({
      assetId: ticket.assetId,
      repairType: parsed.repairType ?? 'INTERNAL',
      priority: ticket.priority,
      reportedDate: today(),
      faultDescription: fault,
    });
    const updated = await this.repo.linkRepair(id, repair.id);
    await recordAudit('SYSTEM', id, 'CREATE', `Ticket ${updated.ticketNumber} converted to repair ${repair.repairNumber}`);
    this.notifyRequester(updated,'TICKET_UPDATED','Ticket updated',`IT is continuing work on ticket ${updated.ticketNumber}.`);
    return updated;
  }

  async complete(id: number, input: CompleteTicketInput): Promise<Ticket> {
    const parsed = CompleteTicketInputSchema.parse(input);
    const ticket = await this.get(id);
    if (ticket.status !== 'IN_PROGRESS') {
      throw new AppError('Only in-progress tickets can be completed.', 400);
    }
    const updated = await this.repo.complete(id, parsed.resolution);
    await recordAudit('SYSTEM', id, 'COMPLETE', `Ticket ${updated.ticketNumber} completed`);
    this.notifyRequester(updated, 'TICKET_COMPLETED', 'Ticket resolved', `Your ticket ${updated.ticketNumber} has been resolved.\n\nIT message: ${parsed.resolution}`);
    await this.emailRequester(updated, 'Ticket resolved', `Your ticket ${updated.ticketNumber} has been resolved.\n\nIT message: ${parsed.resolution}`);
    return updated;
  }

  async close(id: number): Promise<Ticket> {
    const ticket = await this.get(id);
    if (ticket.status !== 'COMPLETED') {
      throw new AppError('Only completed tickets can be closed.', 400);
    }
    const updated = await this.repo.close(id);
    await recordAudit('SYSTEM', id, 'UPDATE', `Ticket ${updated.ticketNumber} closed`);
    this.notifyRequester(updated,'TICKET_CLOSED','Ticket closed',`Your ticket ${updated.ticketNumber} has been closed.`);
    await this.emailRequester(updated, 'Ticket closed', `Your ticket ${updated.ticketNumber} has been closed.`);
    return updated;
  }

  async cancel(id: number): Promise<Ticket> {
    const ticket = await this.get(id);
    if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(ticket.status)) {
      throw new AppError('This ticket can no longer be cancelled.', 400);
    }
    const updated = await this.repo.cancel(id);
    await recordAudit('SYSTEM', id, 'CANCEL', `Ticket ${updated.ticketNumber} cancelled`);
    await this.emailRequester(updated,'Ticket cancelled',`Ticket ${updated.ticketNumber} has been cancelled by IT.`);
    return updated;
  }

  async messages(id:number):Promise<TicketMessage[]>{await this.get(id);return this.repo.listMessages(id)}
  async requestInformation(id:number,userId:number,message:string):Promise<TicketMessage>{const ticket=await this.get(id);if(['COMPLETED','CLOSED','CANCELLED'].includes(ticket.status))throw new AppError('Additional information cannot be requested for a finished ticket.',400);const row=await this.repo.addMessage(id,userId,'IT',message);await recordAudit('SYSTEM',id,'UPDATE',`Requested additional information for ${ticket.ticketNumber}`);this.notifyRequester(ticket,'TICKET_INFO_REQUIRED','Additional information required',`IT requested more information for ${ticket.ticketNumber}: ${message}`);await this.emailRequester(ticket,'Additional information required',`IT requested more information for ${ticket.ticketNumber}:\n\n${message}`);return row}
  async respond(id:number,userId:number,message:string):Promise<TicketMessage>{const ticket=await this.get(id);if(!await this.repo.isOwnedBy(id,userId))throw new AppError('Ticket not found',404);if(['CLOSED','CANCELLED'].includes(ticket.status))throw new AppError('This ticket no longer accepts responses.',400);const row=await this.repo.addMessage(id,userId,'REQUESTER',message);await recordAudit('SYSTEM',id,'UPDATE',`Requester responded to ${ticket.ticketNumber}`);this.notifications.notifyPermission('tickets.update',{type:'TICKET_REQUESTER_RESPONSE',title:'Ticket requester responded',message:`The requester responded on ${ticket.ticketNumber}: ${message}`,entityType:'TICKET',entityId:id});await this.email?.queuePermission('tickets.update',`Requester responded: ${ticket.ticketNumber}`,`The requester provided additional information for ${ticket.ticketNumber}:\n\n${message}`,id);return row}

  private notifyRequester(ticket:Ticket,type:string,title:string,message:string):void{this.notifications.notifyUser(ticket.reportedByUserId,{type,title,message,entityType:'TICKET',entityId:ticket.id})}
  private async emailRequester(ticket:Ticket, title:string, message:string):Promise<void>{await this.email?.queueRequester(ticket.reportedByUserId,ticket.reportedByPersonId,`${title}: ${ticket.ticketNumber}`,message,ticket.id)}
}
