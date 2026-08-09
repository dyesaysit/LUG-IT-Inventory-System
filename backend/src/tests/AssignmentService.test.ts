import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler';
import { AssignmentRepository } from '../repositories/AssignmentRepository';
import { AssignmentService } from '../services/AssignmentService';

const sql = (name: string) => fs.readFileSync(path.resolve(__dirname, `../database/migrations/${name}`), 'utf8');
const setup = () => {
  const db = new Database(':memory:'); db.pragma('foreign_keys = ON');
  for (const migration of ['002_assets.sql','003_departments.sql','004_people.sql','005_locations.sql','006_assignments.sql','016_asset_location_fk.sql']) db.exec(sql(migration));
  const departmentId = Number(db.prepare("INSERT INTO departments (code,name) VALUES ('IT','Information Technology')").run().lastInsertRowid);
  const personId = Number(db.prepare("INSERT INTO people (staff_id,first_name,last_name,department_id) VALUES ('S001','Ama','Mensah',?)").run(departmentId).lastInsertRowid);
  const locationId = Number(db.prepare("INSERT INTO locations (code,name,building) VALUES ('ADM-1','IT Office','Admin')").run().lastInsertRowid);
  const assetId = Number(db.prepare("INSERT INTO assets (asset_tag,category_id,manufacturer,model) VALUES ('A001',1,'Dell','Latitude')").run().lastInsertRowid);
  const repository = new AssignmentRepository(db);
  return { db, departmentId, personId, locationId, assetId, repository, service: new AssignmentService(repository) };
};
const personInput = (assetId: number, personId: number) => ({ assetId, assignmentType: 'PERSON' as const, personId, assignedDate: '2026-08-01', expectedReturnDate: '2026-08-20' });
const status = (db: Database.Database, assetId: number) => (db.prepare('SELECT status FROM assets WHERE id=?').get(assetId) as { status: string }).status;

/** Assignment lifecycle integration tests using a fresh in-memory database per test. */
describe('AssignmentService', () => {
  it('creates PERSON assignment', async () => { const x=setup(); assert.equal((await x.service.create(personInput(x.assetId,x.personId))).personId,x.personId); x.db.close(); });
  it('creates DEPARTMENT assignment', async () => { const x=setup(); const a=await x.service.create({assetId:x.assetId,assignmentType:'DEPARTMENT',departmentId:x.departmentId,assignedDate:'2026-08-01'}); assert.equal(a.departmentId,x.departmentId); x.db.close(); });
  it('creates LOCATION assignment', async () => { const x=setup(); const a=await x.service.create({assetId:x.assetId,assignmentType:'LOCATION',locationId:x.locationId,assignedDate:'2026-08-01'}); assert.equal(a.locationId,x.locationId); x.db.close(); });
  it('rejects missing target', async () => { const x=setup(); await assert.rejects(x.service.create({assetId:x.assetId,assignmentType:'PERSON',assignedDate:'2026-08-01'})); x.db.close(); });
  it('rejects mismatched target', async () => { const x=setup(); await assert.rejects(x.service.create({assetId:x.assetId,assignmentType:'PERSON',departmentId:x.departmentId,assignedDate:'2026-08-01'})); x.db.close(); });
  it('rejects unknown asset', async () => { const x=setup(); await assert.rejects(x.service.create(personInput(999,x.personId)), (e:unknown)=>e instanceof AppError&&e.statusCode===404); x.db.close(); });
  it('rejects unknown person', async () => { const x=setup(); await assert.rejects(x.service.create(personInput(x.assetId,999)), (e:unknown)=>e instanceof AppError&&e.statusCode===404); x.db.close(); });
  it('rejects unknown department', async () => { const x=setup(); await assert.rejects(x.service.create({assetId:x.assetId,assignmentType:'DEPARTMENT',departmentId:999,assignedDate:'2026-08-01'}), (e:unknown)=>e instanceof AppError&&e.statusCode===404); x.db.close(); });
  it('rejects unknown location', async () => { const x=setup(); await assert.rejects(x.service.create({assetId:x.assetId,assignmentType:'LOCATION',locationId:999,assignedDate:'2026-08-01'}), (e:unknown)=>e instanceof AppError&&e.statusCode===404); x.db.close(); });
  it('rejects inactive target', async () => { const x=setup(); x.db.prepare('UPDATE people SET is_active=0 WHERE id=?').run(x.personId); await assert.rejects(x.service.create(personInput(x.assetId,x.personId)), (e:unknown)=>e instanceof AppError&&e.statusCode===400); x.db.close(); });
  it('rejects existing active assignment', async () => { const x=setup(); await x.service.create(personInput(x.assetId,x.personId)); await assert.rejects(x.service.create(personInput(x.assetId,x.personId)), (e:unknown)=>e instanceof AppError&&e.statusCode===409); x.db.close(); });
  it('rejects unassignable asset status', async () => { const x=setup(); x.db.prepare("UPDATE assets SET status='UNDER_REPAIR' WHERE id=?").run(x.assetId); await assert.rejects(x.service.create(personInput(x.assetId,x.personId)), (e:unknown)=>e instanceof AppError&&e.statusCode===400); x.db.close(); });
  it('rejects expected return before assigned date', async () => { const x=setup(); await assert.rejects(x.service.create({...personInput(x.assetId,x.personId),expectedReturnDate:'2026-07-01'})); x.db.close(); });
  it('returns active assignment', async () => { const x=setup(); const a=await x.service.create(personInput(x.assetId,x.personId)); assert.equal((await x.service.returnAssignment(a.id,{returnedDate:'2026-08-02'})).status,'RETURNED'); x.db.close(); });
  it('recalls an asset after the assigned person becomes inactive', async () => { const x=setup(); const a=await x.service.create(personInput(x.assetId,x.personId)); x.db.prepare('UPDATE people SET is_active=0 WHERE id=?').run(x.personId); const returned=await x.service.returnAssignment(a.id,{returnedDate:'2026-08-02'}); assert.equal(returned.status,'RETURNED'); assert.equal(status(x.db,x.assetId),'IN_STOCK'); x.db.close(); });
  it('rejects double return', async () => { const x=setup(); const a=await x.service.create(personInput(x.assetId,x.personId)); await x.service.returnAssignment(a.id,{returnedDate:'2026-08-02'}); await assert.rejects(x.service.returnAssignment(a.id,{returnedDate:'2026-08-03'}), (e:unknown)=>e instanceof AppError&&e.statusCode===409); x.db.close(); });
  it('cancels active assignment', async () => { const x=setup(); const a=await x.service.create(personInput(x.assetId,x.personId)); assert.equal((await x.service.cancelAssignment(a.id)).status,'CANCELLED'); x.db.close(); });
  it('sets asset ASSIGNED for person', async () => { const x=setup(); await x.service.create(personInput(x.assetId,x.personId)); assert.equal(status(x.db,x.assetId),'ASSIGNED'); x.db.close(); });
  it('sets asset DEPLOYED for location', async () => { const x=setup(); await x.service.create({assetId:x.assetId,assignmentType:'LOCATION',locationId:x.locationId,assignedDate:'2026-08-01'}); assert.equal(status(x.db,x.assetId),'DEPLOYED'); x.db.close(); });
  it('returns asset to IN_STOCK', async () => { const x=setup(); const a=await x.service.create(personInput(x.assetId,x.personId)); await x.service.returnAssignment(a.id,{returnedDate:'2026-08-02'}); assert.equal(status(x.db,x.assetId),'IN_STOCK'); x.db.close(); });
  it('preserves assignment history', async () => { const x=setup(); const a=await x.service.create(personInput(x.assetId,x.personId)); await x.service.returnAssignment(a.id,{returnedDate:'2026-08-02'}); await x.service.create({assetId:x.assetId,assignmentType:'LOCATION',locationId:x.locationId,assignedDate:'2026-08-03'}); assert.equal((await x.service.getAssetHistory(x.assetId)).length,2); x.db.close(); });
  it('filters by person', async () => { const x=setup(); await x.service.create(personInput(x.assetId,x.personId)); assert.equal((await x.service.list({personId:x.personId})).length,1); x.db.close(); });
  it('filters by department', async () => { const x=setup(); await x.service.create({assetId:x.assetId,assignmentType:'DEPARTMENT',departmentId:x.departmentId,assignedDate:'2026-08-01'}); assert.equal((await x.service.list({departmentId:x.departmentId})).length,1); x.db.close(); });
  it('filters by location', async () => { const x=setup(); await x.service.create({assetId:x.assetId,assignmentType:'LOCATION',locationId:x.locationId,assignedDate:'2026-08-01'}); assert.equal((await x.service.list({locationId:x.locationId})).length,1); x.db.close(); });
  it('filters by status', async () => { const x=setup(); await x.service.create(personInput(x.assetId,x.personId)); assert.equal((await x.service.list({status:'ACTIVE'})).length,1); x.db.close(); });
  it('filters overdue assignments', async () => { const x=setup(); await x.service.create({...personInput(x.assetId,x.personId),assignedDate:'2020-01-01',expectedReturnDate:'2020-01-02'}); assert.equal((await x.service.list({overdueOnly:true})).length,1); x.db.close(); });
  it('excludes archived assignments', async () => { const x=setup(); const a=await x.service.create(personInput(x.assetId,x.personId)); await x.repository.archiveAssignment(a.id); assert.equal((await x.service.list({})).length,0); x.db.close(); });
  it('returns 404 for missing assignment', async () => { const x=setup(); await assert.rejects(x.service.getById(999), (e:unknown)=>e instanceof AppError&&e.statusCode===404); x.db.close(); });
});
