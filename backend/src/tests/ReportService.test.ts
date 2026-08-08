import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import type { ReportType } from 'shared';
import { runMigrations } from '../database/migrate';
import { ReportRepository } from '../repositories/report-repository';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { ReportService } from '../services/ReportService';
import { SettingsService } from '../services/SettingsService';

const reportTypes: ReportType[] = [
  'ASSET_REGISTER',
  'ASSETS_BY_STATUS',
  'ASSETS_BY_CATEGORY',
  'ASSIGNED_ASSETS',
  'ASSIGNMENT_HISTORY',
  'OVERDUE_RETURNS',
  'MAINTENANCE_SUMMARY',
  'MAINTENANCE_COST',
  'REPAIR_SUMMARY',
  'REPAIR_COST',
  'WARRANTY_EXPIRY',
  'DEPARTMENT_INVENTORY',
  'LOCATION_INVENTORY',
  'PERSON_ASSET_HOLDINGS',
  'AUDIT_ACTIVITY',
];

const setup = () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const migrations = path.resolve(__dirname, '../database/migrations');
  runMigrations(db, migrations);
  const repository = new ReportRepository(db);
  const settings = new SettingsService(new SettingsRepository(db));
  return { db, repository, service: new ReportService(repository, settings) };
};

describe('ReportService', () => {
  it('returns a valid empty result for every report type', async () => {
    const test = setup();
    for (const type of reportTypes) {
      const result = await test.service.generate(type, { page: 1, pageSize: 20 });
      assert.equal(result.reportType, type);
      assert.ok(Array.isArray(result.rows));
      assert.equal(typeof result.total, 'number');
    }
    test.db.close();
  });

  it('maps populated asset rows, filters, sorts, paginates, and excludes archived assets', async () => {
    const test = setup();
    test.db
      .prepare(
        "INSERT INTO assets(asset_tag,category_id,manufacturer,model,status) VALUES('Z-2',1,'Dell','Latitude','IN_STOCK'),('A-1',1,'Lenovo','ThinkPad','IN_STOCK'),('OLD',1,'HP','EliteBook','RETIRED')",
      )
      .run();
    test.db.prepare("UPDATE assets SET archived_at=datetime('now') WHERE asset_tag='OLD'").run();
    const result = await test.service.generate('ASSET_REGISTER', {
      search: 'i',
      assetStatus: 'IN_STOCK',
      page: 1,
      pageSize: 1,
      sortBy: 'assetTag',
      sortOrder: 'desc',
    });
    assert.equal(result.total, 2);
    assert.equal(result.rows.length, 1);
    assert.equal((result.rows[0] as Record<string, unknown>).assetTag, 'Z-2');
    test.db.close();
  });

  it('maps SQLite audit success values to booleans', async () => {
    const test = setup();
    test.db
      .prepare(
        "INSERT INTO audit_logs(entity_type,action,summary,success) VALUES('ASSET','CREATE','Created',1)",
      )
      .run();
    const result = await test.service.generate('AUDIT_ACTIVITY', {});
    assert.equal((result.rows[0] as Record<string, unknown>).success, true);
    test.db.close();
  });

  it('rejects invalid report filters', async () => {
    const test = setup();
    await assert.rejects(test.service.generate('ASSET_REGISTER', { pageSize: 101 }));
    test.db.close();
  });

  it('exports valid UTF-8 CSV, XLSX, and branded print HTML', async () => {
    const test = setup();
    const insertAsset = test.db.prepare(
      'INSERT INTO assets(asset_tag,category_id,manufacturer,model,purchase_cost) VALUES(?,1,\'Lenovo\',\'ThinkPad\',1200)',
    );
    test.db.transaction(() => {
      for (let index = 1; index <= 101; index += 1) insertAsset.run(index === 101 ? 'A-101 <QA>' : `A-${index}`);
    })();
    const csv = await test.service.export('ASSET_REGISTER', {}, 'CSV');
    assert.match(String(csv.body), /^\uFEFFAsset Tag,/);
    assert.match(String(csv.body), /A-1/);
    assert.match(String(csv.body), /A-101 <QA>/);
    const xlsx = await test.service.export('ASSET_REGISTER', {}, 'XLSX');
    const workbook = new ExcelJS.Workbook();
    const bytes = xlsx.body as Buffer;
    const arrayBuffer = new ArrayBuffer(bytes.length);
    new Uint8Array(arrayBuffer).set(bytes);
    await workbook.xlsx.load(arrayBuffer);
    assert.equal(workbook.worksheets.length, 1);
    assert.match(workbook.worksheets[0]!.name, /Asset register/i);
    const print = await test.service.export('ASSET_REGISTER', {}, 'PDF_PRINT', 'tester');
    assert.match(String(print.body), /Lancaster University Ghana/);
    assert.match(String(print.body), /A-101 &lt;QA&gt;/);
    assert.doesNotMatch(String(print.body), /A-101 <QA>/);
    assert.match(String(print.body), /@media print/);
    assert.doesNotMatch(String(print.body), /\{"reportType"/);
    test.db.close();
  });
});
