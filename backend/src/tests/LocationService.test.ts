import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler';
import { LocationRepository } from '../repositories/LocationRepository';
import { LocationService } from '../services/LocationService';

const migration = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, `../database/migrations/${name}`), 'utf8');
const createService = () => {
  const database = new Database(':memory:');
  database.pragma('foreign_keys = ON');
  // Assets + locations + the location FK are needed for archive-protection checks.
  for (const name of ['002_assets.sql', '005_locations.sql', '016_asset_location_fk.sql']) {
    database.exec(migration(name));
  }
  return { database, service: new LocationService(new LocationRepository(database)) };
};
const validLocation = {
  code: 'adm-101', name: 'IT Office', building: 'Administration Block',
  floor: '1', room: '101', description: 'Main IT office', isActive: true,
};

/** Location service and persistence integration tests. */
describe('LocationService', () => {
  it('creates a valid location and normalizes code', async () => {
    const { database, service } = createService(); const location = await service.createLocation(validLocation);
    assert.equal(location.code, 'ADM-101'); assert.equal(location.building, 'Administration Block'); database.close();
  });
  it('rejects duplicate code', async () => {
    const { database, service } = createService(); await service.createLocation(validLocation);
    await assert.rejects(service.createLocation({ ...validLocation, name: 'Other Office' }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409); database.close();
  });
  it('rejects duplicate name', async () => {
    const { database, service } = createService(); await service.createLocation(validLocation);
    await assert.rejects(service.createLocation({ ...validLocation, code: 'ADM-102' }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409); database.close();
  });
  it('searches locations', async () => {
    const { database, service } = createService(); await service.createLocation(validLocation);
    assert.equal((await service.listLocations({ search: 'Main IT' })).length, 1);
    assert.equal((await service.listLocations({ search: 'missing' })).length, 0); database.close();
  });
  it('filters by building', async () => {
    const { database, service } = createService(); await service.createLocation(validLocation);
    assert.equal((await service.listLocations({ building: 'Administration Block' })).length, 1);
    assert.equal((await service.listLocations({ building: 'Library' })).length, 0); database.close();
  });
  it('paginates location lists', async () => {
    const { database, service } = createService();
    await service.createLocation(validLocation);
    await service.createLocation({ ...validLocation, code: 'LIB-201', name: 'Library Lab' });
    const secondPage = await service.listLocations({ page: 2, pageSize: 1, sortBy: 'code' });
    assert.equal(secondPage.length, 1); assert.equal(secondPage[0]?.code, 'LIB-201'); database.close();
  });
  it('updates a location and preserves unchanged fields', async () => {
    const { database, service } = createService(); const location = await service.createLocation(validLocation);
    const updated = await service.updateLocation(location.id, { room: '102' });
    assert.equal(updated.room, '102'); assert.equal(updated.code, 'ADM-101'); database.close();
  });
  it('archives and excludes a location', async () => {
    const { database, service } = createService(); const location = await service.createLocation(validLocation);
    await service.archiveLocation(location.id); assert.equal((await service.listLocations({})).length, 0); database.close();
  });
  it('blocks archiving a location that active assets reference', async () => {
    const { database, service } = createService(); const location = await service.createLocation(validLocation);
    database.prepare("INSERT INTO assets (asset_tag,category_id,manufacturer,model,current_location_id) VALUES ('A100',1,'Dell','Latitude',?)").run(location.id);
    await assert.rejects(service.archiveLocation(location.id),
      (error: unknown) => error instanceof AppError && error.statusCode === 409);
    assert.equal((await service.listLocations({})).length, 1); database.close();
  });
  it('returns 404 for a missing location', async () => {
    const { database, service } = createService();
    await assert.rejects(service.getLocation(999),
      (error: unknown) => error instanceof AppError && error.statusCode === 404); database.close();
  });
  it('rejects invalid location input', async () => {
    const { database, service } = createService();
    await assert.rejects(service.createLocation({ ...validLocation, building: '' })); database.close();
  });
});
