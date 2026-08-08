/** A physical IT location. */
export interface Location {
  id: number;
  code: string;
  name: string;
  building: string;
  floor: string | null;
  room: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

/** Fields required to create a location. */
export interface CreateLocationInput {
  code: string;
  name: string;
  building: string;
  floor?: string | null;
  room?: string | null;
  description?: string | null;
  isActive?: boolean;
}

/** Fields supported by a partial location update. */
export interface UpdateLocationInput {
  code?: string;
  name?: string;
  building?: string;
  floor?: string | null;
  room?: string | null;
  description?: string | null;
  isActive?: boolean;
}

/** Filters, sorting, and pagination for location lists. */
export interface LocationListQuery {
  search?: string;
  building?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'code' | 'name' | 'building' | 'floor' | 'room' | 'isActive' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
