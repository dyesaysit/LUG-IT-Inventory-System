import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { TicketRepository } from '../repositories/TicketRepository';

const setup = () => {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT);
    CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE people (id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, department_id INTEGER);
    CREATE TABLE assets (id INTEGER PRIMARY KEY, asset_tag TEXT, manufacturer TEXT, model TEXT);
    CREATE TABLE maintenance_records (id INTEGER PRIMARY KEY, maintenance_number TEXT);
    CREATE TABLE repair_jobs (id INTEGER PRIMARY KEY, repair_number TEXT);
    CREATE TABLE tickets (
      id INTEGER PRIMARY KEY, ticket_number TEXT, title TEXT, description TEXT, asset_id INTEGER,
      priority TEXT, category TEXT, status TEXT, assigned_to TEXT, reported_by_user_id INTEGER,
      reported_by_person_id INTEGER, maintenance_record_id INTEGER, repair_job_id INTEGER,
      resolution TEXT, created_at TEXT, updated_at TEXT, closed_at TEXT
    );
    INSERT INTO users VALUES (10, 'staff-one'), (20, 'staff-two');
    INSERT INTO departments VALUES (1, 'Teaching');
    INSERT INTO people VALUES (100, 'Staff', 'One', 1), (200, 'Staff', 'Two', 1);
    INSERT INTO assets VALUES (1, 'LAP-001', 'Dell', 'Latitude');
  `);
  const insert = db.prepare(`INSERT INTO tickets VALUES
    (@id, @number, @title, NULL, @assetId, 'MEDIUM', @category, @status, @assignedTo,
     @userId, @personId, NULL, NULL, @resolution, datetime('now'), datetime('now'), @closedAt)`);
  insert.run({ id: 1, number: 'TKT-1', title: 'General', assetId: null, category: 'NETWORK', status: 'NEW', assignedTo: null, userId: 10, personId: 100, resolution: null, closedAt: null });
  insert.run({ id: 2, number: 'TKT-2', title: 'Asset', assetId: 1, category: 'DEVICE', status: 'IN_PROGRESS', assignedTo: 'IT Officer', userId: null, personId: 100, resolution: null, closedAt: null });
  insert.run({ id: 3, number: 'TKT-3', title: 'Completed', assetId: null, category: 'OTHER', status: 'COMPLETED', assignedTo: 'IT Officer', userId: 10, personId: 100, resolution: 'Fixed', closedAt: null });
  insert.run({ id: 4, number: 'TKT-4', title: 'Closed', assetId: null, category: 'ACCOUNT', status: 'CLOSED', assignedTo: 'IT Officer', userId: 10, personId: 100, resolution: 'Reset', closedAt: '2026-08-09' });
  insert.run({ id: 5, number: 'TKT-5', title: 'Other staff', assetId: null, category: 'OTHER', status: 'NEW', assignedTo: null, userId: 20, personId: 200, resolution: null, closedAt: null });
  return { db, repository: new TicketRepository(db) };
};

/** Regression coverage for Staff Portal ticket ownership and lifecycle visibility. */
describe('TicketRepository staff ownership', () => {
  it('includes staff-created general and asset tickets through user or linked Person ownership', async () => {
    const { db, repository } = setup();
    const tickets = await repository.listByOwner(10, 100);
    assert.deepEqual(tickets.map(({ id }) => id).sort(), [1, 2, 3, 4]);
    assert.equal(tickets.find(({ id }) => id === 1)?.assetId, null);
    assert.equal(tickets.find(({ id }) => id === 2)?.assetId, 1);
    db.close();
  });

  it('keeps IT-updated, completed, and closed tickets visible', async () => {
    const { db, repository } = setup();
    db.prepare("UPDATE tickets SET assigned_to='Different IT Officer', status='IN_PROGRESS' WHERE id=1").run();
    const tickets = await repository.listByOwner(10, 100);
    assert.deepEqual(tickets.filter(({ id }) => [1, 3, 4].includes(id)).map(({ status }) => status).sort(), ['CLOSED', 'COMPLETED', 'IN_PROGRESS']);
    db.close();
  });

  it("excludes another staff user's tickets", async () => {
    const { db, repository } = setup();
    const tickets = await repository.listByOwner(10, 100);
    assert.equal(tickets.some(({ id }) => id === 5), false);
    db.close();
  });
});
