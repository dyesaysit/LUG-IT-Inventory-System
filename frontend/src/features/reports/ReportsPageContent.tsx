import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ReportCatalogItem,
  ReportFilter,
  ReportResult,
  ReportSummary,
  ReportType,
} from 'shared';
import { ReportFilterPanel } from '../../components/ReportFilterPanel';
import { ReportViewer } from '../../components/ReportViewer';
import { useAuth } from '../../context/AuthContext';
import {
  exportReport,
  fetchAssetReport,
  fetchAssignmentReport,
  fetchAuditReport,
  fetchDepartmentReport,
  fetchLocationReport,
  fetchMaintenanceReport,
  fetchPeopleReport,
  fetchRepairReport,
  fetchReportCatalog,
  fetchReportSummary,
} from '../../services/api';

const fetchers: Record<ReportType, (filter: ReportFilter) => Promise<ReportResult>> = {
  ASSET_REGISTER: fetchAssetReport,
  ASSETS_BY_STATUS: fetchAssetReport,
  ASSETS_BY_CATEGORY: fetchAssetReport,
  ASSETS_BY_DEPARTMENT: fetchDepartmentReport,
  ASSETS_BY_LOCATION: fetchLocationReport,
  ASSIGNED_ASSETS: fetchAssetReport,
  UNASSIGNED_ASSETS: fetchAssetReport,
  ASSIGNMENT_HISTORY: fetchAssignmentReport,
  OVERDUE_RETURNS: fetchAssignmentReport,
  MAINTENANCE_SUMMARY: fetchMaintenanceReport,
  MAINTENANCE_COST: fetchMaintenanceReport,
  REPAIR_SUMMARY: fetchRepairReport,
  REPAIR_COST: fetchRepairReport,
  WARRANTY_EXPIRY: fetchAssetReport,
  DEPARTMENT_INVENTORY: fetchDepartmentReport,
  LOCATION_INVENTORY: fetchLocationReport,
  PERSON_ASSET_HOLDINGS: fetchPeopleReport,
  AUDIT_ACTIVITY: fetchAuditReport,
};
const groups = ['Inventory', 'Assignments', 'Maintenance and repairs', 'Administration'] as const;
const reportErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError<{ error?: string; code?: string }>(error)) return fallback;
  const safeMessage = error.response?.data?.error;
  return safeMessage && error.response?.data?.code ? safeMessage : fallback;
};

/** Stable report catalog, result states, permissions, and stale-request protection. */
export function ReportsPageContent() {
  const { hasPermission } = useAuth();
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [selected, setSelected] = useState<ReportType>('ASSET_REGISTER');
  const [filter, setFilter] = useState<ReportFilter>({ page: 1, pageSize: 20 });
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const requestNumber = useRef(0);

  useEffect(() => {
    let active = true;
    Promise.all([fetchReportCatalog(), fetchReportSummary()])
      .then(([items, totals]) => {
        if (active) {
          setCatalog(items);
          setSummary(totals);
        }
      })
      .catch((requestError) => {
        if (active)
          setShellError(
            reportErrorMessage(requestError, 'We could not load report options. Please try again.'),
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await fetchers[selected]({ ...filter, reportType: selected });
      if (currentRequest === requestNumber.current) setReport(result);
    } catch (requestError) {
      if (currentRequest === requestNumber.current)
        setError(
          reportErrorMessage(requestError, 'We could not generate this report. Please try again.'),
        );
    } finally {
      if (currentRequest === requestNumber.current) setLoading(false);
    }
  }, [filter, selected]);
  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    ['Total assets', summary?.totalAssets ?? 0],
    ['Assigned', summary?.assignedAssets ?? 0],
    ['Available', summary?.availableAssets ?? 0],
    ['Under repair', summary?.assetsUnderRepair ?? 0],
    ['Overdue returns', summary?.overdueAssignments ?? 0],
    ['Open maintenance', summary?.openMaintenance ?? 0],
    ['Open repairs', summary?.openRepairs ?? 0],
    ['Warranty expiring', summary?.warrantyExpiring30Days ?? 0],
  ] as const;
  const selectReport = (type: ReportType) => {
    setError(null);
    setReport(null);
    setSelected(type);
    setFilter({ page: 1, pageSize: 20 });
  };
  const runExport = async (format: 'CSV' | 'XLSX' | 'PDF_PRINT') => {
    setError(null);
    try {
      await exportReport(selected, format, filter);
    } catch (requestError) {
      setError(
        reportErrorMessage(requestError, 'We could not export this report. Please try again.'),
      );
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-lug-gray">Review and export IT inventory information</p>
      </header>
      {shellError && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {shellError}
        </div>
      )}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {cards.map(([title, value]) => (
          <div key={title} className="rounded border bg-white p-3">
            <p className="text-xs text-lug-gray">{title}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded border bg-white p-3">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-lug-gray">
                {group}
              </h2>
              {catalog
                .filter((item) => item.category === group)
                .map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => selectReport(item.type)}
                    className={`block w-full rounded px-2 py-2 text-left text-sm ${selected === item.type ? 'bg-red-50 font-medium text-lug-red' : 'hover:bg-gray-50'}`}
                  >
                    {item.title}
                  </button>
                ))}
            </div>
          ))}
        </aside>
        <main className="min-w-0 space-y-4">
          <ReportFilterPanel key={selected} type={selected} value={filter} onApply={setFilter} />
          <ReportViewer
            report={report}
            loading={loading}
            error={error}
            page={filter.page ?? 1}
            pageSize={filter.pageSize ?? 20}
            onRetry={() => void load()}
            onPage={(page) => setFilter((current) => ({ ...current, page }))}
            onSort={(sortBy) =>
              setFilter((current) => ({
                ...current,
                page: 1,
                sortBy,
                sortOrder:
                  current.sortBy === sortBy && current.sortOrder === 'asc' ? 'desc' : 'asc',
              }))
            }
            onExport={
              hasPermission('reports.export') ? (format) => void runExport(format) : undefined
            }
          />
        </main>
      </div>
    </div>
  );
}
