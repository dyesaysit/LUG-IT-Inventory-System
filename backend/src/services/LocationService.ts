import {
  CreateLocationInputSchema,
  LocationListQuerySchema,
  UpdateLocationInputSchema,
} from 'shared';
import type { CreateLocationInput, Location, LocationListQuery, UpdateLocationInput } from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { ILocationRepository } from '../repositories/LocationRepository';

const cleanOptional = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined || value === null) return value;
  return value.trim() || null;
};

/** Business operations exposed by Locations. */
export interface ILocationService {
  listLocations(query: LocationListQuery): Promise<Location[]>;
  getLocation(id: number): Promise<Location>;
  createLocation(input: CreateLocationInput): Promise<Location>;
  updateLocation(id: number, input: UpdateLocationInput): Promise<Location>;
  archiveLocation(id: number): Promise<void>;
}

/** Validation and business rules for locations. */
export class LocationService implements ILocationService {
  constructor(private readonly repository: ILocationRepository) {}

  async listLocations(query: LocationListQuery): Promise<Location[]> {
    return this.repository.listLocations(LocationListQuerySchema.parse(query));
  }

  async getLocation(id: number): Promise<Location> {
    const location = await this.repository.getLocation(id);
    if (!location) throw new AppError('Location not found', 404);
    return location;
  }

  async createLocation(input: CreateLocationInput): Promise<Location> {
    const parsed = CreateLocationInputSchema.parse(input);
    const normalized: CreateLocationInput = {
      ...parsed, code: parsed.code.trim().toUpperCase(), name: parsed.name.trim(),
      building: parsed.building.trim(), floor: cleanOptional(parsed.floor),
      room: cleanOptional(parsed.room), description: cleanOptional(parsed.description),
    };
    await this.ensureUnique(normalized.code, normalized.name);
    return this.repository.createLocation(normalized);
  }

  async updateLocation(id: number, input: UpdateLocationInput): Promise<Location> {
    await this.getLocation(id);
    const parsed = UpdateLocationInputSchema.parse(input);
    if (Object.keys(parsed).length === 0) throw new AppError('At least one usable field is required', 400);
    const normalized: UpdateLocationInput = { ...parsed };
    if (parsed.code !== undefined) normalized.code = parsed.code.trim().toUpperCase();
    if (parsed.name !== undefined) normalized.name = parsed.name.trim();
    if (parsed.building !== undefined) normalized.building = parsed.building.trim();
    for (const key of ['floor', 'room', 'description'] as const) {
      if (parsed[key] !== undefined) normalized[key] = cleanOptional(parsed[key]);
    }
    await this.ensureUnique(normalized.code, normalized.name, id);
    return this.repository.updateLocation(id, normalized);
  }

  async archiveLocation(id: number): Promise<void> {
    await this.getLocation(id);
    const assetsHere = await this.repository.countActiveAssetsAtLocation(id);
    if (assetsHere > 0) {
      throw new AppError(
        `Cannot archive this location: ${assetsHere} active asset(s) are still located here. Reassign them to another location first.`,
        409,
      );
    }
    await this.repository.archiveLocation(id);
  }

  private async ensureUnique(code?: string, name?: string, excludeId?: number): Promise<void> {
    if (code && await this.repository.existsByCode(code, excludeId)) {
      throw new AppError('Location code already exists', 409);
    }
    if (name && await this.repository.existsByName(name, excludeId)) {
      throw new AppError('Location name already exists', 409);
    }
  }
}
