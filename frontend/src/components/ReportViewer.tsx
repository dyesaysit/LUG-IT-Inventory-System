import { useMemo } from 'react';
import type { ReportFormat, ReportResult, ReportType } from 'shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFormatCurrency, useFormatDate, useFormatDateTime } from '../utils/formatting';
interface Props {
  report: ReportResult | null;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  onSort: (column: string) => void;
  onExport?: (format: Exclude<ReportFormat, 'JSON'>) => void;
  onRetry?: () => void;
}
const human = (v: string) => v.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const chartTypes: ReportType[] = [
  'ASSETS_BY_STATUS',
  'ASSETS_BY_CATEGORY',
  'ASSIGNMENT_HISTORY',
  'MAINTENANCE_COST',
  'REPAIR_COST',
  'WARRANTY_EXPIRY',
];
const currencyColumnPattern = /(cost|amount|price)/i;
const dateColumnPattern = /(date|expiry)/i;
const singleDatePattern = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/;
const internalFilterKeys = new Set(['reportType', 'format', 'page', 'pageSize', 'sortBy', 'sortOrder']);
const displayValue = (value: unknown) => String(value).replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
/** Reusable report metadata, chart, table, paging, and export viewer. */
export function ReportViewer({
  report,
  loading,
  error,
  page,
  pageSize,
  onPage,
  onSort,
  onExport,
  onRetry,
}: Props) {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const formatDateTime = useFormatDateTime();
  const records = useMemo(
    () => (report?.rows ?? []) as Record<string, string | number | boolean | null>[],
    [report],
  );
  const headers = useMemo(() => (records[0] ? Object.keys(records[0]) : []), [records]);
  const chart = useMemo(() => {
    if (!report || !chartTypes.includes(report.reportType)) return [];
    const grouped = new Map<string, number>();
    for (const row of records) {
      const label = String(
        row.status ?? row.category ?? row.month ?? row.warrantyStatus ?? 'Other',
      );
      const numeric = Object.values(row).find((value) => typeof value === 'number') as
        number | undefined;
      grouped.set(label, (grouped.get(label) ?? 0) + (numeric ?? 1));
    }
    return [...grouped].map(([name, value]) => ({ name, value }));
  }, [records, report]);
  const criteria = useMemo(() => {
    if (!report) return [];
    const visible = Object.entries(report.filters)
      .filter(([key, value]) => !internalFilterKeys.has(key) && value !== undefined && value !== '')
      .map(([key, value]) => `${human(key)}: ${displayValue(value)}`);
    const sortBy = report.filters.sortBy;
    if (sortBy) visible.push(`Sort: ${human(sortBy)}, ${report.filters.sortOrder ?? 'ascending'}`);
    return visible;
  }, [report]);
  const renderCellValue = (column: string, value: string | number | boolean | null) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number' && currencyColumnPattern.test(column)) {
      return formatCurrency(value);
    }
    // Format single-value date columns per the org date format; leave multi-value
    // fields (e.g. comma-joined date lists) and non-dates untouched.
    if (typeof value === 'string' && dateColumnPattern.test(column) && singleDatePattern.test(value)) {
      return formatDate(value);
    }
    return value ?? '—';
  };
  return (
    <section className="min-w-0 rounded border bg-white">
      <header className="border-b p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{report?.title ?? 'Report viewer'}</h2>
            <p className="text-sm text-lug-gray">
              {report?.description ?? 'Select a report from the catalog.'}
            </p>
            {report && (
              <p className="mt-1 text-xs text-lug-gray">
                Generated {formatDateTime(report.generatedAt)} · {report.total} records
              </p>
            )}
          </div>
          {report && onExport && (
            <div className="flex gap-2">
              <button onClick={() => onExport('CSV')} className="rounded border px-3 py-2 text-sm">
                CSV
              </button>
              <button onClick={() => onExport('XLSX')} className="rounded border px-3 py-2 text-sm">
                Excel
              </button>
              <button
                onClick={() => onExport('PDF_PRINT')}
                className="rounded bg-lug-red px-3 py-2 text-sm text-white"
              >
                Print / PDF
              </button>
            </div>
          )}
        </div>
        {report && (
          <p className="mt-2 text-xs text-lug-gray">
            Report criteria: {criteria.join(' · ') || 'All records'}
          </p>
        )}
      </header>
      {loading ? (
        <p className="p-14 text-center text-sm text-lug-gray">Generating report…</p>
      ) : error ? (
        <div className="m-4 rounded bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p>{error}</p>
          {onRetry && <button type="button" onClick={onRetry} className="mt-3 rounded border border-red-300 bg-white px-3 py-1.5 font-medium">Try again</button>}
        </div>
      ) : !report ? (
        <p className="p-14 text-center text-sm text-lug-gray">Choose a report to begin.</p>
      ) : records.length === 0 ? (
        <p className="p-14 text-center text-sm text-lug-gray">
          No records match the active filters.
        </p>
      ) : (
        <>
          {chart.length > 0 && (
            <div className="h-64 border-b p-4" aria-label={`${report.title} chart`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Records" fill="#b5121b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-lug-gray">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-3">
                      <button onClick={() => onSort(h)}>{human(h)}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((row, index) => (
                  <tr key={index}>
                    {headers.map((h) => (
                      <td key={h} className="whitespace-nowrap px-3 py-3">
                        {renderCellValue(h, row[h] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="flex justify-between border-t p-3 text-sm">
            <span>
              Page {page} · {report.total} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => onPage(page - 1)}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page * pageSize >= report.total}
                onClick={() => onPage(page + 1)}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}
