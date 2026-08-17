import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { SettingsService } from '../services/SettingsService';

const sql = (name: string) => fs.readFileSync(path.resolve(__dirname, `../database/migrations/${name}`), 'utf8');

const setup = () => {
  const db = new Database(':memory:');
  for (const name of ['010_authentication.sql', '011_settings_and_backups.sql', '012_settings_refinements.sql']) {
    db.exec(sql(name));
  }
  return { db, service: new SettingsService(new SettingsRepository(db)) };
};

describe('SettingsService', () => {
  it('lists all default settings grouped by category', async () => {
    const { db, service } = setup();
    const grouped = await service.getAll();
    assert.ok(grouped.ORGANIZATION && grouped.ORGANIZATION.length > 0);
    assert.ok(grouped.SECURITY && grouped.SECURITY.length > 0);
    assert.ok(grouped.INVENTORY && grouped.INVENTORY.length > 0);
    assert.ok(grouped.ASSIGNMENTS && grouped.ASSIGNMENTS.length > 0);
    assert.ok(grouped.MAINTENANCE && grouped.MAINTENANCE.length > 0);
    assert.ok(grouped.REPORTS && grouped.REPORTS.length > 0);
    db.close();
  });

  it('lists settings scoped to a single category', async () => {
    const { db, service } = setup();
    const settings = await service.getByCategory('MAINTENANCE');
    assert.ok(settings.every((setting) => setting.category === 'MAINTENANCE'));
    assert.ok(settings.some((setting) => setting.key === 'maintenance_number_prefix'));
    db.close();
  });

  it('updates a STRING setting', async () => {
    const { db, service } = setup();
    const updated = await service.updateSetting('ORGANIZATION', 'country', 'Nigeria', null);
    assert.equal(updated.value, 'Nigeria');
    db.close();
  });

  it('normalizes prefix settings to trimmed upper-case', async () => {
    const { db, service } = setup();
    const updated = await service.updateSetting('INVENTORY', 'asset_tag_prefix', '  lug2 ', null);
    assert.equal(updated.value, 'LUG2');
    db.close();
  });

  it('rejects a non-numeric value for a NUMBER setting', async () => {
    const { db, service } = setup();
    await assert.rejects(
      service.updateSetting('SECURITY', 'session_timeout_minutes', 'not-a-number', null),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    db.close();
  });

  it('accepts a valid BOOLEAN setting value', async () => {
    const { db, service } = setup();
    const updated = await service.updateSetting('SECURITY', 'allow_concurrent_sessions', 'false', null);
    assert.equal(updated.value, 'false');
    db.close();
  });

  it('rejects an invalid BOOLEAN value', async () => {
    const { db, service } = setup();
    await assert.rejects(
      service.updateSetting('SECURITY', 'allow_concurrent_sessions', 'yes', null),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    db.close();
  });

  it('rejects a max failed login attempts value outside the allowed range', async () => {
    const { db, service } = setup();
    await assert.rejects(
      service.updateSetting('SECURITY', 'max_failed_login_attempts', '0', null),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    await assert.rejects(
      service.updateSetting('SECURITY', 'max_failed_login_attempts', '100', null),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    db.close();
  });

  it('refuses to change the fixed system currency and currency symbol', async () => {
    const { db, service } = setup();
    await assert.rejects(
      service.updateSetting('ORGANIZATION', 'currency', 'USD', null),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    await assert.rejects(
      service.updateSetting('ORGANIZATION', 'currency_symbol', '$', null),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    db.close();
  });

  it('rejects updating an unknown setting', async () => {
    const { db, service } = setup();
    await assert.rejects(
      service.updateSetting('ORGANIZATION', 'doesNotExist', 'value', null),
      (error: unknown) => error instanceof AppError && error.statusCode === 404,
    );
    db.close();
  });

  it('applies a batch of updates transactionally', async () => {
    const { db, service } = setup();
    const updated = await service.updateSettingsBatch(
      [
        { category: 'ORGANIZATION', key: 'country', value: 'Nigeria' },
        { category: 'ORGANIZATION', key: 'timezone', value: 'Africa/Lagos' },
      ],
      null,
    );
    assert.equal(updated.length, 2);
    const settings = await service.getByCategory('ORGANIZATION');
    assert.equal(settings.find((setting) => setting.key === 'country')?.value, 'Nigeria');
    assert.equal(settings.find((setting) => setting.key === 'timezone')?.value, 'Africa/Lagos');
    db.close();
  });

  it('rejects the entire batch when any single update is invalid', async () => {
    const { db, service } = setup();
    await assert.rejects(
      service.updateSettingsBatch(
        [
          { category: 'ORGANIZATION', key: 'country', value: 'Nigeria' },
          { category: 'ORGANIZATION', key: 'currency', value: 'USD' },
        ],
        null,
      ),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    const settings = await service.getByCategory('ORGANIZATION');
    assert.equal(settings.find((setting) => setting.key === 'country')?.value, '');
    db.close();
  });
});

