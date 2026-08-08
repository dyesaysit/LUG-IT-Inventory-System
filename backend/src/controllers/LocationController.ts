import type { CreateLocationInput, Location, LocationListQuery, UpdateLocationInput } from 'shared';
import type { ILocationService } from '../services/LocationService';
import { recordAudit } from '../services/audit-event';

/** HTTP-facing operations for Locations. */
export class LocationController {
  constructor(private readonly service: ILocationService) {}

  /** Lists locations using validated filters. */
  list(query: LocationListQuery): Promise<Location[]> { return this.service.listLocations(query); }
  /** Loads one location. */
  get(id: number): Promise<Location> { return this.service.getLocation(id); }
  /** Creates a location. */
  async create(input: CreateLocationInput): Promise<Location> { const row=await this.service.createLocation(input);await recordAudit('LOCATION',row.id,'CREATE',`Created location ${row.code}`,null,row);return row; }
  /** Applies a partial location update. */
  async update(id: number, input: UpdateLocationInput): Promise<Location> {
    const before=await this.service.getLocation(id);const row=await this.service.updateLocation(id,input);await recordAudit('LOCATION',id,'UPDATE',`Updated location ${row.code}`,before,row);return row;
  }
  /** Soft-archives a location. */
  async archive(id: number): Promise<void> { const before=await this.service.getLocation(id);await this.service.archiveLocation(id);await recordAudit('LOCATION',id,'ARCHIVE',`Archived location ${before.code}`,before); }
}
