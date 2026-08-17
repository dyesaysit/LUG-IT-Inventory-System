import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler';
import { PersonRepository } from '../repositories/PersonRepository';
import { PersonService } from '../services/PersonService';
import ExcelJS from 'exceljs';
import { DepartmentRepository } from '../repositories/DepartmentRepository';
import { createPeopleImportTemplate, importPeopleWorkbook } from '../services/PeopleImportService';

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
  staffId: 'staff-001', firstName: 'Ama', lastName: 'Mensah',
  email: 'ama@example.com', phone: '+220 100 2000', jobTitle: 'Technician',
  employmentStatus: 'ACTIVE' as const, notes: 'Test record', isActive: true,
};

/** Person service and persistence integration tests. */
describe('PersonService', () => {
  it('creates a valid person and normalizes staff ID', async () => {
    const { database, departmentId, service } = createService();
    const person = await service.create({ ...validPerson, departmentId });
    assert.equal(person.staffId, 'STAFF-001'); assert.equal(person.departmentId, departmentId);
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
    await assert.rejects(service.create({ ...validPerson, staffId: 'STAFF-002' }),
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
    assert.equal(updated.jobTitle, 'Senior Technician'); assert.equal(updated.staffId, 'STAFF-001');
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

describe('PeopleImportService', () => {
  it('creates a template with clearly marked required columns', async () => {
    const { database } = createService();
    const departments = await new DepartmentRepository(database).list({ isActive: true, pageSize: 100 });
    const template = await createPeopleImportTemplate(departments);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(template as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet('People Import');
    assert.ok(sheet);
    assert.deepEqual([sheet.getCell('A1').text, sheet.getCell('B1').text, sheet.getCell('C1').text],
      ['Staff ID *', 'First name *', 'Last name *']);
    assert.equal(sheet.getCell('G1').text, 'Department');
    assert.equal(sheet.getCell('G2').dataValidation.type, 'list');
    assert.ok(workbook.getWorksheet('Instructions'));
    database.close();
  });

  it('imports valid rows and reports invalid rows without hiding failures', async () => {
    const { database, service } = createService();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('People Import');
    sheet.addRow(['Staff ID *', 'First name *', 'Last name *', 'Email', 'Phone', 'Job title', 'Department code', 'Employment status', 'Notes', 'Active person']);
    sheet.addRow(['STAFF-100', 'Akosua', 'Owusu', 'akosua@example.com', '', 'Lecturer', 'IT', 'ACTIVE', '', 'Yes']);
    sheet.addRow(['STAFF-101', '', 'Boateng', '', '', '', '', 'UNKNOWN', '', 'Yes']);
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await importPeopleWorkbook(bytes, service, new DepartmentRepository(database));
    assert.equal(result.imported, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.errors[0]?.row, 3);
    assert.equal((await service.list({ search: 'STAFF-100' })).length, 1);
    database.close();
  });

  it('reports an actionable error when the import sheet has no people rows', async () => {
    const { database, service } = createService();
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('People Import').addRow(['Staff ID *', 'First name *', 'Last name *']);
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await importPeopleWorkbook(bytes, service, new DepartmentRepository(database));
    assert.equal(result.imported, 0);
    assert.equal(result.failed, 1);
    assert.match(result.errors[0]?.message ?? '', /No people data was found/);
    database.close();
  });

  it('finds populated data on another sheet and maps reordered headers', async () => {
    const { database, service } = createService();
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('People Import').addRow(['Staff ID *', 'First name *', 'Last name *']);
    const populated = workbook.addWorksheet('Completed staff list');
    populated.addRow(['Email', 'Last name *', 'Staff ID *', 'Job title', 'First name *']);
    populated.addRow(['omar@example.com', 'Ceesay', 'STAFF-9000223', 'Admission Officer', 'Omar Dye']);
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await importPeopleWorkbook(bytes, service, new DepartmentRepository(database));
    assert.equal(result.imported, 1);
    assert.equal(result.failed, 0);
    assert.equal((await service.list({ search: 'STAFF-9000223' }))[0]?.firstName, 'Omar Dye');
    database.close();
  });

  it('accepts either a department name or code from existing workbooks', async () => {
    const { database, service, departmentId } = createService();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('People');
    sheet.addRow(['Staff ID', 'First name', 'Last name', 'Department code']);
    sheet.addRow(['STAFF-201', 'Fatou', 'Jallow', 'Information Technology']);
    sheet.addRow(['STAFF-202', 'Lamin', 'Saine', 'IT']);
    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await importPeopleWorkbook(bytes, service, new DepartmentRepository(database));
    assert.equal(result.imported, 2);
    assert.equal(result.failed, 0);
    assert.ok((await service.list({})).every((person) => person.departmentId === departmentId));
    database.close();
  });
});
