/** Controlled employment states for personnel. */
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'LEFT';

/** A staff or personnel record. */
export interface Person {
  id: number;
  staffId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  departmentId: number | null;
  employmentStatus: EmploymentStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

/** Fields required to register a person. */
export interface CreatePersonInput {
  staffId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  departmentId?: number | null;
  employmentStatus?: EmploymentStatus;
  notes?: string | null;
  isActive?: boolean;
}

/** Fields supported by a partial person update. */
export interface UpdatePersonInput {
  staffId?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  departmentId?: number | null;
  employmentStatus?: EmploymentStatus;
  notes?: string | null;
  isActive?: boolean;
}

/** Filters, sorting, and pagination for People lists. */
export interface PersonListQuery {
  search?: string;
  departmentId?: number;
  employmentStatus?: EmploymentStatus;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'staffId' | 'firstName' | 'lastName' | 'jobTitle' | 'employmentStatus' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
