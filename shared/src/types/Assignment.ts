import type { Asset } from './Asset';

/** Supported assignment targets. */
export type AssignmentType = 'PERSON' | 'DEPARTMENT' | 'LOCATION';
/** Assignment lifecycle states. */
export type AssignmentStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'CANCELLED';

/** An asset assignment including useful joined display information. */
export interface AssetAssignment {
  id: number; assetId: number; assignmentType: AssignmentType;
  personId: number | null; departmentId: number | null; locationId: number | null;
  assignedDate: string; expectedReturnDate: string | null; returnedDate: string | null;
  status: AssignmentStatus; purpose: string | null; notes: string | null;
  assignedBy: string | null; returnedBy: string | null;
  createdAt: string; updatedAt: string; archivedAt: string | null;
  assetTag: string; assetManufacturer: string; assetModel: string;
  personName: string | null; departmentName: string | null;
  locationName: string | null; locationCode: string | null;
}

/** Input for assigning an asset. */
export interface CreateAssignmentInput {
  assetId: number; assignmentType: AssignmentType;
  personId?: number | null; departmentId?: number | null; locationId?: number | null;
  assignedDate: string; expectedReturnDate?: string | null;
  purpose?: string | null; notes?: string | null; assignedBy?: string | null;
}

/** Editable fields on an active assignment. */
export interface UpdateAssignmentInput {
  expectedReturnDate?: string | null; purpose?: string | null; notes?: string | null;
}

/** Input recorded when an asset is returned. */
export interface ReturnAssignmentInput {
  returnedDate: string; returnLocationId?: number | null;
  conditionOnReturn?: Asset['condition']; returnNotes?: string | null; returnedBy?: string | null;
}

/** Supported assignment list filters. */
export interface AssignmentListQuery {
  search?: string; assetId?: number; assignmentType?: AssignmentType; status?: AssignmentStatus;
  personId?: number; departmentId?: number; locationId?: number;
  assignedFrom?: string; assignedTo?: string; overdueOnly?: boolean;
  page?: number; pageSize?: number;
  sortBy?: 'assignedDate' | 'expectedReturnDate' | 'status' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
