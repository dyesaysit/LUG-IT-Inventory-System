/** A Lancaster University Ghana department. */
export interface Department {
  id: number;
  code: string;
  name: string;
  description: string | null;
  headOfDepartment: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

/** Fields required to create a department. */
export interface CreateDepartmentInput {
  code: string;
  name: string;
  description?: string | null;
  headOfDepartment?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

/** Fields that may be changed on a department. */
export interface UpdateDepartmentInput {
  code?: string;
  name?: string;
  description?: string | null;
  headOfDepartment?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

/** Supported department list filters and pagination. */
export interface DepartmentListQuery {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'code' | 'name' | 'headOfDepartment' | 'isActive' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
