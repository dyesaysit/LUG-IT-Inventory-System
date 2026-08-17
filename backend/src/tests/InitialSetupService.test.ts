import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { InitialSetupService } from '../services/InitialSetupService';
import { PasswordService } from '../services/PasswordService';

const migration = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, `../database/migrations/${name}`), 'utf8');
const setup = () => {
  const db = new Database(':memory:');
  for (const name of [
    '002_assets.sql',
    '003_departments.sql',
    '004_people.sql',
    '009_audit_logs.sql',
    '010_authentication.sql',
    '011_settings_and_backups.sql',
    '012_settings_refinements.sql',
    '013_white_label_organization.sql',
  ])
    db.exec(migration(name));
  return { db, service: new InitialSetupService(db, new PasswordService()) };
};
const setupInput = (username: string, password: string) => ({
  username,
  password,
  confirmPassword: password,
  systemName: 'Acme Asset Hub',
  institutionName: 'Acme Corporation',
  institutionShortName: 'ACME',
});

describe('InitialSetupService', () => {
  it('creates a normally hashed System Administrator and completes setup', async () => {
    const { db, service } = setup();
    assert.equal(service.getStatus().setupRequired, true);
    await service.complete(setupInput('initial.admin', 'Secure@1'));
    const row = db
      .prepare(
        `SELECT u.username, u.password_hash, r.code FROM users u JOIN roles r ON r.id=u.role_id`,
      )
      .get() as { username: string; password_hash: string; code: string };
    assert.equal(row.username, 'initial.admin');
    assert.equal(row.code, 'SYSTEM_ADMINISTRATOR');
    assert.notEqual(row.password_hash, 'Secure@1');
    assert.equal(service.getStatus().setupRequired, false);
    assert.equal(
      (
        db
          .prepare(
            "SELECT value FROM system_settings WHERE category='ORGANIZATION' AND key='organization_name'",
          )
          .get() as { value: string }
      ).value,
      'Acme Corporation',
    );
    assert.equal(
      (
        db
          .prepare(
            "SELECT value FROM system_settings WHERE category='ORGANIZATION' AND key='organization_short_name'",
          )
          .get() as { value: string }
      ).value,
      'ACME',
    );
    assert.equal(
      (
        db
          .prepare(
            "SELECT value FROM system_settings WHERE category='ORGANIZATION' AND key='system_name'",
          )
          .get() as { value: string }
      ).value,
      'Acme Asset Hub',
    );
    assert.equal(
      (
        db
          .prepare(
            "SELECT value FROM system_settings WHERE category='REPORTS' AND key='report_organization_name'",
          )
          .get() as { value: string }
      ).value,
      'Acme Corporation',
    );
    db.close();
  });

  it('enforces the existing password policy', async () => {
    const { db, service } = setup();
    await assert.rejects(service.complete(setupInput('admin', 'weak')));
    assert.equal(service.getStatus().setupRequired, true);
    db.close();
  });

  it('refuses a second bootstrap administrator', async () => {
    const { db, service } = setup();
    await service.complete(setupInput('admin.one', 'Secure@1'));
    await assert.rejects(
      service.complete(setupInput('admin.two', 'Secure@2')),
      /already been completed/,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count,
      1,
    );
    db.close();
  });
});
