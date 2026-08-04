import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler';
import { DepartmentRepository } from '../repositories/DepartmentRepository';
import { DepartmentService } from '../services/DepartmentService';

const migrationPath = path.resolve(__dirname, '../database/migrations/003_departments.sql');

const createService = () => {
  const database = new Database(':memory:');
  database.exec(fs.readFileSync(migrationPath, 'utf8'));
  return { database, service: new DepartmentService(new DepartmentRepository(database)) };
};

const validDepartment = {
  code: 'cs',
  name: 'Computer Science',
  description: 'Computing programmes',
  headOfDepartment: 'Dr Test',
  email: 'cs@lancaster.edu.gh',
  phone: '+220 123 4567',
  isActive: true,
};

/** Department service and persistence integration tests. */
describe('DepartmentService', () => {
  it('creates a valid department and normalizes its code', async () => {
    const { database, service } = createService();
    const department = await service.create(validDepartment);
    assert.equal(department.code, 'CS');
    assert.equal(department.name, 'Computer Science');
    database.close();
  });

  it('rejects a duplicate code', async () => {
    const { database, service } = createService();
    await service.create(validDepartment);
    await assert.rejects(
      service.create({ ...validDepartment, name: 'Engineering' }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
    database.close();
  });

  it('rejects a duplicate name', async () => {
    const { database, service } = createService();
    await service.create(validDepartment);
    await assert.rejects(
      service.create({ ...validDepartment, code: 'ENG' }),
      (error: unknown) => error instanceof AppError && error.statusCode === 409,
    );
    database.close();
  });

  it('rejects an invalid email', async () => {
    const { database, service } = createService();
    await assert.rejects(service.create({ ...validDepartment, email: 'invalid' }));
    database.close();
  });

  it('lists departments', async () => {
    const { database, service } = createService();
    await service.create(validDepartment);
    const departments = await service.list({});
    assert.equal(departments.length, 1);
    database.close();
  });

  it('searches by code, name, and head of department', async () => {
    const { database, service } = createService();
    await service.create(validDepartment);
    assert.equal((await service.list({ search: 'Dr Test' })).length, 1);
    assert.equal((await service.list({ search: 'missing' })).length, 0);
    database.close();
  });

  it('filters by active status', async () => {
    const { database, service } = createService();
    await service.create(validDepartment);
    await service.create({ ...validDepartment, code: 'ENG', name: 'Engineering', isActive: false });
    const inactive = await service.list({ isActive: false });
    assert.deepEqual(inactive.map((department) => department.code), ['ENG']);
    database.close();
  });

  it('updates a department while preserving unchanged fields', async () => {
    const { database, service } = createService();
    const department = await service.create(validDepartment);
    const updated = await service.update(department.id, { name: 'Computing' });
    assert.equal(updated.name, 'Computing');
    assert.equal(updated.code, 'CS');
    database.close();
  });

  it('archives a department', async () => {
    const { database, service } = createService();
    const department = await service.create(validDepartment);
    await service.archive(department.id);
    await assert.rejects(
      service.getById(department.id),
      (error: unknown) => error instanceof AppError && error.statusCode === 404,
    );
    database.close();
  });

  it('excludes archived departments from lists', async () => {
    const { database, service } = createService();
    const department = await service.create(validDepartment);
    await service.archive(department.id);
    assert.equal((await service.list({})).length, 0);
    database.close();
  });

  it('returns 404 for a missing department', async () => {
    const { database, service } = createService();
    await assert.rejects(
      service.getById(999),
      (error: unknown) => error instanceof AppError && error.statusCode === 404,
    );
    database.close();
  });
});
