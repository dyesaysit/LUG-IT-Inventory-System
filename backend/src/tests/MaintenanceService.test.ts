import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler';
import { MaintenanceRepository } from '../repositories/MaintenanceRepository';
import { MaintenanceService } from '../services/MaintenanceService';

const sql = (name:string) => fs.readFileSync(path.resolve(__dirname,`../database/migrations/${name}`),'utf8');
const setup = () => { const db=new Database(':memory:');db.pragma('foreign_keys = ON');for(const migration of ['002_assets.sql','003_departments.sql','004_people.sql','005_locations.sql','006_assignments.sql','007_maintenance.sql'])db.exec(sql(migration));const assetId=Number(db.prepare("INSERT INTO assets(asset_tag,category_id,manufacturer,model)VALUES('A001',1,'Dell','Latitude')").run().lastInsertRowid);const repository=new MaintenanceRepository(db);return{db,assetId,repository,service:new MaintenanceService(repository)}; };
const input=(assetId:number,type:'CORRECTIVE'|'PREVENTIVE'='CORRECTIVE')=>({assetId,maintenanceType:type,priority:'HIGH' as const,reportedDate:'2026-08-01',faultDescription:type==='CORRECTIVE'?'No power':null});
const asset=(db:Database.Database,id:number)=>(db.prepare('SELECT status,condition FROM assets WHERE id=?').get(id) as {status:string;condition:string});

/** Maintenance lifecycle integration tests using isolated in-memory databases. */
describe('MaintenanceService',()=>{
  it('creates corrective maintenance',async()=>{const x=setup();assert.equal((await x.service.create(input(x.assetId))).maintenanceType,'CORRECTIVE');x.db.close();});
  it('creates preventive maintenance',async()=>{const x=setup();assert.equal((await x.service.create(input(x.assetId,'PREVENTIVE'))).maintenanceType,'PREVENTIVE');x.db.close();});
  it('generates sequential unique numbers',async()=>{const x=setup();const a=await x.service.create(input(x.assetId));const b=await x.service.create(input(x.assetId));assert.notEqual(a.maintenanceNumber,b.maintenanceNumber);x.db.close();});
  it('rejects unknown asset',async()=>{const x=setup();await assert.rejects(x.service.create(input(999)),(e:unknown)=>e instanceof AppError&&e.statusCode===404);x.db.close();});
  it('rejects archived asset',async()=>{const x=setup();x.db.prepare("UPDATE assets SET archived_at=datetime('now') WHERE id=?").run(x.assetId);await assert.rejects(x.service.create(input(x.assetId)));x.db.close();});
  it('rejects disposed asset',async()=>{const x=setup();x.db.prepare("UPDATE assets SET status='DISPOSED' WHERE id=?").run(x.assetId);await assert.rejects(x.service.create(input(x.assetId)));x.db.close();});
  it('requires corrective fault description',async()=>{const x=setup();await assert.rejects(x.service.create({...input(x.assetId),faultDescription:null}));x.db.close();});
  it('rejects scheduled date before report',async()=>{const x=setup();await assert.rejects(x.service.create({...input(x.assetId),scheduledDate:'2026-07-01'}));x.db.close();});
  it('starts maintenance',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));assert.equal((await x.service.start(r.id,{startedDate:'2026-08-02'})).status,'IN_PROGRESS');x.db.close();});
  it('sets asset under repair',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});assert.equal(asset(x.db,x.assetId).status,'UNDER_REPAIR');x.db.close();});
  it('marks waiting for parts',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});assert.equal((await x.service.waiting(r.id,{partsUsed:'Battery'})).status,'WAITING_FOR_PARTS');x.db.close();});
  it('completes maintenance',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});assert.equal((await x.service.complete(r.id,{completedDate:'2026-08-03',workPerformed:'Repaired',conditionAfter:'GOOD',resolution:'Resolved'})).status,'COMPLETED');x.db.close();});
  it('rejects completion before start',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-03'});await assert.rejects(x.service.complete(r.id,{completedDate:'2026-08-02',workPerformed:'Repair',conditionAfter:'GOOD',resolution:'Done'}));x.db.close();});
  it('rejects double completion',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});const done={completedDate:'2026-08-03',workPerformed:'Repair',conditionAfter:'GOOD' as const,resolution:'Done'};await x.service.complete(r.id,done);await assert.rejects(x.service.complete(r.id,done),(e:unknown)=>e instanceof AppError&&e.statusCode===409);x.db.close();});
  it('cancels maintenance',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));assert.equal((await x.service.cancel(r.id)).status,'CANCELLED');x.db.close();});
  it('marks beyond repair',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});assert.equal((await x.service.beyondRepair(r.id,{resolution:'Uneconomical'})).status,'BEYOND_REPAIR');x.db.close();});
  it('retires beyond-repair asset',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});await x.service.beyondRepair(r.id,{});assert.equal(asset(x.db,x.assetId).status,'RETIRED');x.db.close();});
  it('damages beyond-repair asset',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});await x.service.beyondRepair(r.id,{});assert.equal(asset(x.db,x.assetId).condition,'DAMAGED');x.db.close();});
  it('restores unassigned asset in stock',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});await x.service.complete(r.id,{completedDate:'2026-08-03',workPerformed:'Repair',conditionAfter:'FAIR',resolution:'Done'});assert.deepEqual(asset(x.db,x.assetId),{status:'IN_STOCK',condition:'FAIR'});x.db.close();});
  it('restores active person assignment',async()=>{const x=setup();x.db.prepare("INSERT INTO departments(code,name)VALUES('IT','IT')").run();x.db.prepare("INSERT INTO people(staff_id,first_name,last_name,department_id)VALUES('S1','A','B',1)").run();x.db.prepare("INSERT INTO asset_assignments(asset_id,assignment_type,person_id,assigned_date)VALUES(?,'PERSON',1,'2026-01-01')").run(x.assetId);const r=await x.service.create(input(x.assetId));await x.service.start(r.id,{startedDate:'2026-08-02'});await x.service.complete(r.id,{completedDate:'2026-08-03',workPerformed:'Repair',conditionAfter:'GOOD',resolution:'Done'});assert.equal(asset(x.db,x.assetId).status,'ASSIGNED');x.db.close();});
  it('filters search',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));assert.equal((await x.service.list({search:r.maintenanceNumber})).length,1);x.db.close();});
  it('filters type',async()=>{const x=setup();await x.service.create(input(x.assetId));assert.equal((await x.service.list({maintenanceType:'CORRECTIVE'})).length,1);x.db.close();});
  it('filters priority',async()=>{const x=setup();await x.service.create(input(x.assetId));assert.equal((await x.service.list({priority:'HIGH'})).length,1);x.db.close();});
  it('filters status',async()=>{const x=setup();await x.service.create(input(x.assetId));assert.equal((await x.service.list({status:'REPORTED'})).length,1);x.db.close();});
  it('filters overdue scheduled work',async()=>{const x=setup();await x.service.create({...input(x.assetId),reportedDate:'2020-01-01',scheduledDate:'2020-01-02'});assert.equal((await x.service.list({overdueOnly:true})).length,1);x.db.close();});
  it('returns asset history',async()=>{const x=setup();await x.service.create(input(x.assetId));await x.service.create(input(x.assetId,'PREVENTIVE'));assert.equal((await x.service.history(x.assetId)).length,2);x.db.close();});
  it('excludes archived maintenance',async()=>{const x=setup();const r=await x.service.create(input(x.assetId));await x.repository.archiveMaintenance(r.id);assert.equal((await x.service.list({})).length,0);x.db.close();});
  it('returns 404 for missing record',async()=>{const x=setup();await assert.rejects(x.service.get(999),(e:unknown)=>e instanceof AppError&&e.statusCode===404);x.db.close();});
});
