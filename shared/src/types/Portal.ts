/** Lifecycle status of a staff equipment request. */
export type EquipmentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';

/** A request raised by a staff member for new equipment. */
export interface EquipmentRequest {
  id: number;
  requestedByUserId: number;
  requestedByPersonId: number | null;
  itemName: string;
  category: string | null;
  quantity: number;
  justification: string | null;
  status: EquipmentRequestStatus;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  fulfilmentAssignmentId: number | null;
  createdAt: string;
  updatedAt: string;
  // Joined display fields (populated on the admin queue).
  requestedByName: string | null;
  requestedByUsername: string | null;
}

/** Notes supplied when approving, rejecting, or requesting more information. */
export interface ReviewRequestInput {
  notes?: string | null;
}

/** Payload for fulfilling an approved request by assigning an available asset. */
export interface FulfilRequestInput {
  assetId: number;
  notes?: string | null;
}

export interface EquipmentRequestListQuery {
  search?: string;
  status?: EquipmentRequestStatus;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'status' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/** Fields a staff member supplies when requesting equipment. */
export interface CreateEquipmentRequestInput {
  itemName: string;
  category?: string | null;
  quantity: number;
  justification?: string | null;
}

/** Payload for reporting a fault on an assigned asset (creates a support ticket). */
export interface ReportProblemInput {
  assetId: number;
  faultDescription: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/** The signed-in staff member's portal profile. */
export interface PortalProfile {
  userId: number;
  username: string;
  email: string | null;
  personId: number | null;
  personName: string | null;
}
