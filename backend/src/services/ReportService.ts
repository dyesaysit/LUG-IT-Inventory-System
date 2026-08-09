import ExcelJS from 'exceljs';
import { ReportFilterSchema, ReportTypeSchema } from 'shared';
import type {
  OrganizationProfile,
  ReportCatalogItem,
  ReportFilter,
  ReportResult,
  ReportRow,
  ReportSummary,
  ReportType,
} from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { IReportRepository } from '../repositories/ReportRepository';
import type { ISettingsService } from './SettingsService';

export const reportCatalog: ReportCatalogItem[] = [
  ['ASSET_REGISTER', 'Asset register', 'Complete inventory register', 'Inventory'],
  ['ASSETS_BY_STATUS', 'Assets by status', 'Inventory grouped by lifecycle status', 'Inventory'],
  ['ASSETS_BY_CATEGORY', 'Assets by category', 'Category inventory totals', 'Inventory'],
  ['DEPARTMENT_INVENTORY', 'Department inventory', 'Department holdings and activity', 'Inventory'],
  ['LOCATION_INVENTORY', 'Location inventory', 'Assets deployed by location', 'Inventory'],
  ['ASSIGNED_ASSETS', 'Active assignments', 'Currently assigned inventory', 'Assignments'],
  ['ASSIGNMENT_HISTORY', 'Assignment history', 'Historical assignments and returns', 'Assignments'],
  ['OVERDUE_RETURNS', 'Overdue returns', 'Active assignments past return date', 'Assignments'],
  [
    'PERSON_ASSET_HOLDINGS',
    'Person asset holdings',
    'Active holdings by staff member',
    'Assignments',
  ],
  [
    'MAINTENANCE_SUMMARY',
    'Maintenance summary',
    'Maintenance activity register',
    'Maintenance and repairs',
  ],
  [
    'MAINTENANCE_COST',
    'Maintenance cost',
    'Monthly maintenance expenditure',
    'Maintenance and repairs',
  ],
  ['REPAIR_SUMMARY', 'Repair summary', 'Formal repair activity', 'Maintenance and repairs'],
  [
    'REPAIR_COST',
    'Repair cost',
    'Monthly vendor and internal repair expenditure',
    'Maintenance and repairs',
  ],
  [
    'WARRANTY_EXPIRY',
    'Warranty expiry',
    'Expired and upcoming warranties',
    'Maintenance and repairs',
  ],
  ['AUDIT_ACTIVITY', 'Audit activity', 'System change history', 'Administration'],
].map(([type, title, description, category]) => ({
  type: type as ReportType,
  title,
  description,
  category: category as ReportCatalogItem['category'],
}));

export interface ExportResult {
  body: Buffer | string;
  contentType: string;
  filename: string;
}

/** Keys in ReportFilter that are internal and should not appear in the human-readable filters section. */
const INTERNAL_FILTER_KEYS = new Set([
  'reportType',
  'format',
  'page',
  'pageSize',
  'sortBy',
  'sortOrder',
]);

/** Map filter keys to human-readable labels for report display. */
const FILTER_LABELS: Record<string, string> = {
  startDate: 'Start date',
  endDate: 'End date',
  departmentId: 'Department',
  locationId: 'Location',
  categoryId: 'Category',
  status: 'Status',
  condition: 'Condition',
  search: 'Search',
  personId: 'Person',
  manufacturer: 'Manufacturer',
  model: 'Model',
  minValue: 'Min value',
  maxValue: 'Max value',
  maintenanceType: 'Maintenance type',
  repairType: 'Repair type',
  priority: 'Priority',
  entityId: 'Entity ID',
  userId: 'User',
  entityType: 'Entity type',
  action: 'Action',
};

/** Converts raw ReportFilter into a human-readable criteria string. */
function renderFilterCriteria(filter: ReportFilter, _profile: OrganizationProfile): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(filter)) {
    if (INTERNAL_FILTER_KEYS.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    const label = FILTER_LABELS[key] || key;
    const display = Array.isArray(value) ? value.join(', ') : String(value);
    lines.push(
      `<span class="filter-item"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(display || 'All')}</span>`,
    );
  }
  return lines.length > 0
    ? `<div class="filters">${lines.join(' ')}</div>`
    : '<div class="filters"><span class="filter-item">All records</span></div>';
}

/** Simple HTML entity escaping. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const currencyColumnPattern = /(cost|amount|price)/i;

export class ReportService {
  constructor(
    private readonly repo: IReportRepository,
    private readonly settingsService: ISettingsService,
  ) {}

  catalog() {
    return reportCatalog;
  }

  summary(): Promise<ReportSummary> {
    return this.repo.summary();
  }

  async generate(type: ReportType, input: ReportFilter): Promise<ReportResult> {
    const parsed = ReportFilterSchema.parse({ ...input, reportType: type });
    const valid = ReportTypeSchema.parse(type);
    const item = reportCatalog.find((r) => r.type === valid);
    if (!item) throw new AppError('Unsupported report type', 400);
    const data = await this.repo.run(valid, parsed);
    return {
      reportType: valid,
      title: item.title,
      description: item.description,
      generatedAt: new Date().toISOString(),
      filters: parsed,
      total: data.total,
      rows: data.rows,
    };
  }

  async export(
    type: ReportType,
    input: ReportFilter,
    format: 'CSV' | 'XLSX' | 'PDF_PRINT',
    username?: string,
  ): Promise<ExportResult> {
    const pageSize = 100;
    const firstPage = await this.generate(type, { ...input, page: 1, pageSize });
    const rows = [...firstPage.rows];
    const pageCount = Math.ceil(firstPage.total / pageSize);
    for (let page = 2; page <= pageCount; page += 1) {
      const nextPage = await this.generate(type, { ...input, page, pageSize });
      rows.push(...nextPage.rows);
    }
    const report: ReportResult = { ...firstPage, rows };
    const profile = await this.settingsService.getOrganizationProfile();
    const dateStr = new Date().toISOString().slice(0, 10);
    const shortName = profile.organizationShortName || 'report';
    const base = `${shortName}-${type.toLowerCase()}-${dateStr}`;

    if (format === 'CSV')
      return {
        body: this.csv(report, profile),
        contentType: 'text/csv; charset=utf-8',
        filename: `${base}.csv`,
      };
    if (format === 'XLSX')
      return {
        body: await this.xlsx(report, profile),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${base}.xlsx`,
      };
    return {
      body: this.html(report, profile, username),
      contentType: 'text/html; charset=utf-8',
      filename: `${base}.html`,
    };
  }

  private records(rows: ReportRow[]) {
    return rows as Record<string, string | number | boolean | null>[];
  }

  private formatCell(column: string, value: unknown, profile: OrganizationProfile): string {
    if (typeof value === 'number' && currencyColumnPattern.test(column)) {
      const formatted = new Intl.NumberFormat(profile.locale, {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      return `${profile.currencySymbol} ${formatted}`;
    }
    return String(value ?? '');
  }

  private csv(report: ReportResult, profile: OrganizationProfile) {
    const records = this.records(report.rows);
    if (!records.length) return '\uFEFF';
    const headers = Object.keys(records[0]);
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    };
    return (
      '\uFEFF' +
      headers.map(this.human).join(',') +
      '\n' +
      records
        .map((r) => headers.map((h) => escape(this.formatCell(h, r[h], profile))).join(','))
        .join('\n')
    );
  }

  private async xlsx(report: ReportResult, profile: OrganizationProfile) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = profile.organizationName;
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(report.title.slice(0, 31));
    const records = this.records(report.rows);
    const headers = records[0] ? Object.keys(records[0]) : ['message'];

    // Info rows
    const infoRows: [string, string][] = [
      ['Organization', profile.organizationName],
      ['Department', profile.departmentName],
      ['Report', report.title],
      ['Generated', new Date().toLocaleString(profile.locale, { timeZone: profile.timezone })],
      ['Total records', String(report.total)],
    ];
    infoRows.forEach(([label, value], idx) => {
      const row = sheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      if (idx === 0) {
        row.getCell(1).font = { bold: true, size: 14 };
        row.getCell(2).font = { size: 14 };
      }
    });
    sheet.addRow([]); // spacer

    // Data table
    sheet.columns = headers.map((h) => ({
      header: this.human(h),
      key: h,
      width: Math.min(40, Math.max(14, this.human(h).length + 3)),
    }));

    for (const row of records) {
      const formatted = Object.fromEntries(
        headers.map((header) => [header, this.formatCell(header, row[header], profile)]),
      );
      sheet.addRow(formatted);
    }

    const headerRowIdx = infoRows.length + 2; // data header row
    sheet.getRow(headerRowIdx).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: headerRowIdx }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Builds the professional, white-label HTML print template. */
  private html(report: ReportResult, profile: OrganizationProfile, username?: string) {
    const records = this.records(report.rows);
    const headers = records[0] ? Object.keys(records[0]) : [];
    const now = new Date();
    const generatedStr = now.toLocaleString(profile.locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: profile.timeFormat === '12_HOUR',
      timeZone: profile.timezone,
    });
    const genBy = username || 'System';
    const filterHtml = renderFilterCriteria(report.filters, profile);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(report.title)} — ${escapeHtml(profile.systemName)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    body {
      font: 12px 'Segoe UI', Arial, sans-serif;
      color: #222;
      margin: 0;
      padding: 0;
    }
    .print-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #003153;
      padding-bottom: 12px;
      margin-bottom: 16px;
      gap: 16px;
    }
    .print-header .org-info { flex: 1; }
    .print-header .org-name {
      font-size: 16px;
      font-weight: 700;
      color: #003153;
    }
    .print-header .org-dept {
      font-size: 13px;
      color: #555;
    }
    .print-header .sys-name {
      font-size: 12px;
      color: #777;
      text-align: right;
    }
    .print-header .logo-cell img {
      max-height: 52px;
      max-width: 180px;
      object-fit: contain;
    }
    .report-meta {
      margin-bottom: 14px;
    }
    .report-meta h1 {
      font-size: 18px;
      margin: 0 0 4px 0;
      color: #003153;
    }
    .report-meta .subtitle {
      font-size: 13px;
      color: #555;
      margin-bottom: 6px;
    }
    .report-meta .meta-line {
      font-size: 12px;
      color: #666;
    }
    .filters {
      font-size: 11px;
      color: #555;
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
    }
    .filter-item { white-space: nowrap; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tbody { display: table-row-group; }
    tr { page-break-inside: avoid; }
    th {
      background-color: #f2f2f2;
      border: 1px solid #ccc;
      padding: 6px 7px;
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
    }
    td {
      border: 1px solid #ddd;
      padding: 5px 7px;
      text-align: left;
      word-wrap: break-word;
    }
    td.num, th.num { text-align: right; }
    .print-footer {
      margin-top: 24px;
      border-top: 1px solid #ccc;
      padding-top: 8px;
      font-size: 10px;
      color: #888;
      display: flex;
      justify-content: space-between;
    }
    .no-records {
      text-align: center;
      padding: 32px;
      color: #888;
      font-size: 14px;
    }
    /* Screen-only controls */
    .screen-controls {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1000;
      display: flex;
      gap: 8px;
    }
    .screen-controls button {
      padding: 8px 16px;
      border: 1px solid #003153;
      background: #003153;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .screen-controls button:hover { opacity: 0.85; }
    .screen-controls button.secondary {
      background: #fff;
      color: #003153;
      border-color: #003153;
    }
    @media print {
      .screen-controls { display: none !important; }
    }
  </style>
</head>
<body>

<div class="screen-controls">
  <button onclick="window.print()">Print / Save as PDF</button>
  <button class="secondary" onclick="window.location.href='__REPORTS_URL__'">← Back to Reports</button>
</div>

<header class="print-header">
  <div class="logo-cell">
    <img src="${escapeHtml(profile.logoUrl || '/LUG-logo-200x84-transparent.png')}" alt="${escapeHtml(profile.organizationName)} logo">
  </div>
  <div class="org-info">
    <div class="org-name">${escapeHtml(profile.organizationName)}</div>
    <div class="org-dept">${escapeHtml(profile.departmentName)}</div>
  </div>
  <div class="sys-name">${escapeHtml(profile.systemName)}</div>
</header>

<div class="report-meta">
  <h1>${escapeHtml(report.title)}</h1>
  ${report.description ? `<div class="subtitle">${escapeHtml(report.description)}</div>` : ''}
  <div class="meta-line">Generated: ${generatedStr}</div>
  <div class="meta-line">Generated by: ${escapeHtml(genBy)}</div>
  <div class="meta-line">Total records: ${report.total}</div>
  <div class="meta-line">Report criteria</div>
  ${filterHtml}
</div>

${
  records.length === 0
    ? '<div class="no-records">No records found for the selected criteria.</div>'
    : `<table>
<thead><tr>${headers.map((h) => `<th${currencyColumnPattern.test(h) ? ' class="num"' : ''}>${escapeHtml(this.human(h))}</th>`).join('')}</tr></thead>
<tbody>
${records
  .map(
    (r) =>
      `<tr>${headers
        .map((h) => {
          const raw = this.formatCell(h, r[h], profile);
          const cls = currencyColumnPattern.test(h) ? ' class="num"' : '';
          return `<td${cls}>${escapeHtml(raw)}</td>`;
        })
        .join('')}</tr>`,
  )
  .join('\n')}
</tbody>
</table>`
}

<footer class="print-footer">
  <span>${escapeHtml(profile.organizationName)} · ${escapeHtml(profile.systemName)}</span>
  <span>${escapeHtml(profile.confidentialityText)}</span>
</footer>

</body>
</html>`;
  }

  private human(value: string) {
    return value
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }
}
