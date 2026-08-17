/** Ticket lifecycle status. */
export type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

/** Ticket priority. */
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketCategory = 'DEVICE' | 'NETWORK' | 'ACCOUNT' | 'SOFTWARE' | 'ACCESS' | 'OTHER';

/** An IT support ticket. Work is carried out via linked maintenance/repair jobs. */
export interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string | null;
  assetId: number | null;
  priority: TicketPriority;
  category: TicketCategory;
  status: TicketStatus;
  assignedTo: string | null;
  reportedByUserId: number | null;
  reportedByPersonId: number | null;
  maintenanceRecordId: number | null;
  repairJobId: number | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  // Joined display fields
  assetTag: string | null;
  assetManufacturer: string | null;
  assetModel: string | null;
  maintenanceNumber: string | null;
  repairNumber: string | null;
  requesterName: string | null;
  requesterUsername: string | null;
  departmentName: string | null;
}

export interface CreateTicketInput {
  title: string;
  description?: string | null;
  assetId?: number | null;
  priority?: TicketPriority;
  category: TicketCategory;
}

export interface AssignTicketInput {
  assignedTo: string;
}

export interface CompleteTicketInput {
  resolution: string;
}

/** Spawns a maintenance record or repair job from a ticket (reusing those modules). */
export interface ConvertTicketInput {
  kind: 'MAINTENANCE' | 'REPAIR';
  maintenanceType?: 'CORRECTIVE' | 'PREVENTIVE' | 'INSPECTION' | 'UPGRADE' | 'WARRANTY_SERVICE' | 'OTHER';
  repairType?: 'INTERNAL' | 'EXTERNAL' | 'WARRANTY' | 'EMERGENCY' | 'OTHER';
}

export interface TicketListQuery {
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assetId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'status' | 'priority' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TicketSummary {
  open: number;
  unassigned: number;
  inProgress: number;
  closedThisMonth: number;
}

/** A request-for-information conversation entry attached to a ticket. */
export interface TicketMessage { id:number;ticketId:number;authorUserId:number|null;authorKind:'IT'|'REQUESTER';message:string;createdAt:string }
export interface RequestTicketInfoInput { message:string }
export interface RespondTicketInfoInput { message:string }
