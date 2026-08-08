import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler';
import { PersonRepository } from '../repositories/PersonRepository';
import { PersonService } from '../services/PersonService';

const migration = (name: string) => fs.readFileSync(
  path.resolve(__dirname, `../database/migrations/${name}`), 'utf8',
);

const createService = () => {
  const database = new Database(':memory:');
  database.pragma('foreign_keys = ON');
  database.exec(migration('003_departments.sql'));
  database.exec(migration('004_people.sql'));
  const departmentId = Number(database.prepare(
    "INSERT INTO departments (code, name) VALUES ('IT', 'Information Technology')",
  ).run().lastInsertRowid);
  return { database, departmentId, service: new PersonService(new PersonRepository(database)) };
};

const validPerson = {
  staffId: 'lug-001', firstName: 'Ama', lastName: 'Mensah',
  email: 'ama@example.com', phone: '+220 100 2000', jobTitle: 'Technician',
  employmentStatus: 'ACTIVE' as const, notes: 'Test record', isActive: true,
};

/** Person service and persistence integration tests. */
describe('PersonService', () => {
  it('creates a valid person and normalizes staff ID', async () => {
    const { database, departmentId, service } = createService();
    const person = await service.create({ ...validPerson, departmentId });
    assert.equal(person.staffId, 'LUG-001'); assert.equal(person.departmentId, departmentId);
    database.close();
  });
  it('rejects duplicate staff ID', async () => {
    const { database, service } = createService(); await service.create(validPerson);
    await assert.rejects(service.create({ ...validPerson, email: 'other@example.com' }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409);
    database.close();
  });
  it('rejects duplicate email', async () => {
    const { database, service } = createService(); await service.create(validPerson);
    await assert.rejects(service.create({ ...validPerson, staffId: 'LUG-002' }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409);
    database.close();
  });
  it('rejects invalid email', async () => {
    const { database, service } = createService();
    await assert.rejects(service.create({ ...validPerson, email: 'invalid' })); database.close();
  });
  it('rejects an unknown department', async () => {
    const { database, service } = createService();
    await assert.rejects(service.create({ ...validPerson, departmentId: 999 }),
      (error: unknown) => error instanceof AppError && error.statusCode === 400);
    database.close();
  });
  it('lists people', async () => {
    const { database, service } = createService(); await service.create(validPerson);
    assert.equal((await service.list({})).length, 1); database.close();
  });
  it('searches people', async () => {
    const { database, service } = createService(); await service.create(validPerson);
    assert.equal((await service.list({ search: 'Technician' })).length, 1);
    assert.equal((await service.list({ search: 'missing' })).length, 0); database.close();
  });
  it('filters by department', async () => {
    const { database, departmentId, service } = createService();
    await service.create({ ...validPerson, departmentId });
    assert.equal((await service.list({ departmentId })).length, 1);
    assert.equal((await service.list({ departmentId: departmentId + 1 })).length, 0); database.close();
  });
  it('filters by employment status', async () => {
    const { database, service } = createService();
    await service.create({ ...validPerson, employmentStatus: 'ON_LEAVE' });
    assert.equal((await service.list({ employmentStatus: 'ON_LEAVE' })).length, 1);
    assert.equal((await service.list({ employmentStatus: 'ACTIVE' })).length, 0); database.close();
  });
  it('updates a person and preserves unchanged fields', async () => {
    const { database, service } = createService(); const person = await service.create(validPerson);
    const updated = await service.update(person.id, { jobTitle: 'Senior Technician' });
    assert.equal(updated.jobTitle, 'Senior Technician'); assert.equal(updated.staffId, 'LUG-001');
    database.close();
  });
  it('archives a person', async () => {
    const { database, service } = createService(); const person = await service.create(validPerson);
    await service.archive(person.id);
    await assert.rejects(service.getById(person.id),
      (error: unknown) => error instanceof AppError && error.statusCode === 404); database.close();
  });
  it('excludes archived people from lists', async () => {
    const { database, service } = createService(); const person = await service.create(validPerson);
    await service.archive(person.id); assert.equal((await service.list({})).length, 0); database.close();
  });
  it('returns 404 for a missing person', async () => {
    const { database, service } = createService();
    await assert.rejects(service.getById(999),
      (error: unknown) => error instanceof AppError && error.statusCode === 404); database.close();
  });
});
