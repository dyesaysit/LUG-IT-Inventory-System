import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type {
  AssetAssignment,
  AuditLog,
  InventoryAsset as Asset,
  MaintenanceRecord,
  MaintenanceSummary,
  RepairJob,
  RepairSummary,
  ReportSummary,
} from 'shared';
import { DashboardCard } from '../components/DashboardCard';
import { RecentActivityTable } from '../components/RecentActivityTable';
import {
  fetchAssets,
  fetchAssignments,
  fetchAuditLogs,
  fetchMaintenanceRecords,
  fetchMaintenanceSummary,
  fetchRepairs,
  fetchRepairSummary,
  fetchReportSummary,
} from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { useFormatCurrency, useFormatDate, useFormatDateLong, useFormatDateTime } from '../utils/formatting';

const MAINTENANCE_TERMINAL = ['COMPLETED', 'CANCELLED', 'BEYOND_REPAIR'];
const REPAIR_TERMINAL = ['COMPLETED', 'RETURNED', 'CANCELLED', 'BEYOND_REPAIR'];
const DAY_MS = 24 * 60 * 60 * 1000;

const labelize = (value: string) =>
  value.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());

const parseDate = (value?: string | null): number | null => {
  if (!value) return null;
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const ICONS = {
  assets: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  assigned:
    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  available: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  repair:
    'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
  maintenance:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  warranty:
    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  overdue: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
} as const;

const Icon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

/** A simple bordered panel with a heading and a "view all" link. */
function ListPanel({
  title,
  href,
  linkLabel,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded border border-lug-light-gray bg-white">
      <div className="flex items-center justify-between border-b border-lug-light-gray px-5 py-3">
        <h2 className="text-sm font-semibold text-lug-charcoal">{title}</h2>
        <Link to={href} className="text-xs font-medium text-lug-red hover:underline">
          {linkLabel}
        </Link>
      </div>
      {isEmpty ? (
        <p className="px-5 py-8 text-center text-sm text-lug-gray">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-lug-light-gray">{children}</ul>
      )}
    </section>
  );
}

/**
 * Dashboard: colour-coded stat cards plus panels for latest assignments,
 * upcoming warranty expirations, open maintenance, open repairs, and recent activity.
 */
export function DashboardPage() {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();
  const formatDateLong = useFormatDateLong();
  const formatDateTime = useFormatDateTime();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [maintenanceSummary, setMaintenanceSummary] = useState<MaintenanceSummary | null>(null);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [repairSummary, setRepairSummary] = useState<RepairSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const report = (fallback: string) => (err: unknown) => {
      if (active) setError(apiErrorMessage(err, fallback));
    };
    void fetchReportSummary().then((s) => active && setReportSummary(s)).catch(report('Some dashboard statistics are unavailable.'));
    void fetchAssets().then((a) => active && setAssets(a)).catch(report('Unable to load assets.'));
    void fetchAssignments({ pageSize: 100 }).then((a) => active && setAssignments(a)).catch(report('Unable to load assignments.'));
    void fetchMaintenanceRecords({ pageSize: 100 }).then((m) => active && setMaintenance(m)).catch(report('Unable to load maintenance.'));
    void fetchMaintenanceSummary().then((s) => active && setMaintenanceSummary(s)).catch(report('Unable to load maintenance summary.'));
    void fetchRepairs({ pageSize: 100 }).then((r) => active && setRepairs(r)).catch(report('Unable to load repairs.'));
    void fetchRepairSummary().then((s) => active && setRepairSummary(s)).catch(report('Unable to load repair summary.'));
    void fetchAuditLogs({ pageSize: 20 }).then((l) => active && setAuditLogs(l)).catch(report('Unable to load recent activity.'));
    return () => {
      active = false;
    };
  }, []);

  const openMaintenance = useMemo(
    () => maintenance.filter((record) => !MAINTENANCE_TERMINAL.includes(record.status)),
    [maintenance],
  );
  const openRepairs = useMemo(
    () => repairs.filter((record) => !REPAIR_TERMINAL.includes(record.status)),
    [repairs],
  );
  const latestAssignments = useMemo(
    () => [...assignments].sort((a, b) => (parseDate(b.assignedDate) ?? 0) - (parseDate(a.assignedDate) ?? 0)).slice(0, 5),
    [assignments],
  );
  const warrantyUpcoming = useMemo(() => {
    const now = Date.now();
    const horizon = now + 90 * DAY_MS;
    return assets
      .map((asset) => ({ asset, expiry: parseDate(asset.warrantyExpiryDate) }))
      .filter((entry): entry is { asset: Asset; expiry: number } => entry.expiry !== null && entry.expiry >= now && entry.expiry <= horizon)
      .sort((a, b) => a.expiry - b.expiry)
      .slice(0, 5);
  }, [assets]);

  const num = (value: number | undefined, fallback: number) => String(value ?? fallback);
  const rs = reportSummary;
  const assignedFallback = assets.filter((a) => ['ASSIGNED', 'DEPLOYED'].includes(a.status)).length;
  const availableFallback = assets.filter((a) => a.status === 'IN_STOCK').length;
  const underRepairFallback = assets.filter((a) => a.status === 'UNDER_REPAIR').length;
  const overdueFallback = assignments.filter(
    (a) => a.status === 'ACTIVE' && a.expectedReturnDate && (parseDate(a.expectedReturnDate) ?? Infinity) < Date.now(),
  ).length;

  const statCards: {
    title: string;
    value: string;
    subtitle: string;
    icon: string;
    indicator?: 'green' | 'amber' | 'red';
  }[] = [
    { title: 'Total assets', value: num(rs?.totalAssets, assets.length), subtitle: 'Registered inventory', icon: ICONS.assets },
    { title: 'Assigned assets', value: num(rs?.assignedAssets, assignedFallback), subtitle: 'In use or deployed', icon: ICONS.assigned },
    { title: 'Available', value: num(rs?.availableAssets, availableFallback), subtitle: 'Ready for assignment', icon: ICONS.available, indicator: 'green' },
    { title: 'Under repair', value: num(rs?.assetsUnderRepair, underRepairFallback), subtitle: 'Out of service', icon: ICONS.repair, indicator: (rs?.assetsUnderRepair ?? underRepairFallback) > 0 ? 'amber' : undefined },
    { title: 'Open maintenance', value: num(rs?.openMaintenance, openMaintenance.length), subtitle: `${maintenanceSummary?.waitingForParts ?? 0} waiting for parts`, icon: ICONS.maintenance, indicator: (rs?.openMaintenance ?? openMaintenance.length) > 0 ? 'amber' : undefined },
    { title: 'Open repairs', value: num(rs?.openRepairs, openRepairs.length), subtitle: `${repairSummary?.awaitingApproval ?? 0} awaiting approval`, icon: ICONS.repair, indicator: (rs?.openRepairs ?? openRepairs.length) > 0 ? 'amber' : undefined },
    { title: 'Warranty expiring', value: num(rs?.warrantyExpiring30Days, warrantyUpcoming.length), subtitle: 'Within 30 days', icon: ICONS.warranty, indicator: (rs?.warrantyExpiring30Days ?? warrantyUpcoming.length) > 0 ? 'amber' : undefined },
    { title: 'Overdue returns', value: num(rs?.overdueAssignments, overdueFallback), subtitle: 'Past expected return', icon: ICONS.overdue, indicator: (rs?.overdueAssignments ?? overdueFallback) > 0 ? 'red' : undefined },
  ];

  const recentActivity = useMemo(
    () =>
      auditLogs.slice(0, 8).map((event) => ({
        id: event.id,
        asset: `${labelize(event.entityType)} ${event.entityId ?? ''}`.trim(),
        detail: event.summary,
        assignedTo: labelize(event.entityType),
        user: event.performedByName ?? 'System',
        time: formatDateTime(event.performedAt),
        status:
          event.action === 'COMPLETE'
            ? ('completed' as const)
            : event.entityType === 'REPAIR' || event.entityType === 'MAINTENANCE'
              ? ('repair' as const)
              : event.action === 'RETURN'
                ? ('returned' as const)
                : ('assigned' as const),
      })),
    [auditLogs, formatDateTime],
  );

  const assignmentTarget = (a: AssetAssignment) =>
    a.personName ?? a.departmentName ?? a.locationName ?? '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-lug-charcoal">Dashboard</h1>
        <p className="mt-0.5 text-xs text-lug-gray">IT inventory overview · {formatDateLong(new Date())}</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Colour-coded stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <DashboardCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            indicator={card.indicator}
            icon={<Icon path={card.icon} />}
          />
        ))}
      </div>

      {/* Operational panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListPanel
          title="Latest assignments"
          href="/assignments"
          linkLabel="View all"
          isEmpty={latestAssignments.length === 0}
          emptyText="No assignments recorded yet."
        >
          {latestAssignments.map((assignment) => (
            <li key={assignment.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-lug-charcoal">
                  {`${assignment.assetManufacturer} ${assignment.assetModel}`.trim() || assignment.assetTag}
                </p>
                <p className="truncate text-xs text-lug-gray">
                  {assignment.status === 'RETURNED' ? 'Returned' : `To ${assignmentTarget(assignment)}`}
                </p>
              </div>
              <span className="whitespace-nowrap text-xs text-lug-gray">{formatDate(assignment.assignedDate)}</span>
            </li>
          ))}
        </ListPanel>

        <ListPanel
          title="Upcoming warranty expirations"
          href="/assets"
          linkLabel="View assets"
          isEmpty={warrantyUpcoming.length === 0}
          emptyText="No warranties expiring in the next 90 days."
        >
          {warrantyUpcoming.map(({ asset, expiry }) => {
            const days = Math.max(0, Math.ceil((expiry - Date.now()) / DAY_MS));
            return (
              <li key={asset.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-lug-charcoal">{asset.assetTag}</p>
                  <p className="truncate text-xs text-lug-gray">
                    {`${asset.manufacturer} ${asset.model}`.trim()}
                  </p>
                </div>
                <div className="whitespace-nowrap text-right">
                  <p className="text-xs text-lug-charcoal">{formatDate(asset.warrantyExpiryDate)}</p>
                  <p className={`text-[11px] ${days <= 30 ? 'text-amber-600' : 'text-lug-gray'}`}>
                    {days === 0 ? 'Expires today' : `in ${days} day${days === 1 ? '' : 's'}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ListPanel>

        <ListPanel
          title="Open maintenance"
          href="/maintenance"
          linkLabel="View all"
          isEmpty={openMaintenance.length === 0}
          emptyText="No open maintenance requests."
        >
          {openMaintenance.slice(0, 5).map((record) => (
            <li key={record.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-lug-charcoal">
                  {record.maintenanceNumber} · {`${record.assetManufacturer} ${record.assetModel}`.trim() || record.assetTag}
                </p>
                <p className="truncate text-xs text-lug-gray">{record.faultDescription ?? 'Scheduled maintenance'}</p>
              </div>
              <span className="whitespace-nowrap rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-lug-gray">
                {labelize(record.status)}
              </span>
            </li>
          ))}
        </ListPanel>

        <ListPanel
          title="Open repairs"
          href="/repairs"
          linkLabel="View all"
          isEmpty={openRepairs.length === 0}
          emptyText="No open repair jobs."
        >
          {openRepairs.slice(0, 5).map((record) => (
            <li key={record.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-lug-charcoal">
                  {record.repairNumber} · {`${record.assetManufacturer} ${record.assetModel}`.trim() || record.assetTag}
                </p>
                <p className="truncate text-xs text-lug-gray">{record.vendorName ?? record.assignedTechnician ?? 'Internal repair'}</p>
              </div>
              <span className="whitespace-nowrap rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-lug-gray">
                {labelize(record.status)}
              </span>
            </li>
          ))}
        </ListPanel>
      </div>

      {/* Repair cost summary */}
      {repairSummary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DashboardCard title="Repair cost this month" value={formatCurrency(repairSummary.repairCostThisMonth)} subtitle="Completed repair spend" />
          <DashboardCard title="Awaiting quotation" value={String(repairSummary.awaitingQuotation)} subtitle="Repairs pending a quote" />
          <DashboardCard title="With vendor" value={String(repairSummary.withVendor)} subtitle="Sent for external repair" />
          <DashboardCard title="Replacement recommended" value={String(repairSummary.replacementRecommended)} subtitle="Beyond economical repair" indicator={repairSummary.replacementRecommended > 0 ? 'red' : undefined} />
        </div>
      )}

      {/* Recent activity */}
      <div className="rounded border border-lug-light-gray bg-white">
        <div className="border-b border-lug-light-gray px-5 py-3">
          <h2 className="text-sm font-semibold text-lug-charcoal">Recent activity</h2>
        </div>
        <div className="px-5 py-2">
          {recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-lug-gray">No recent activity recorded.</p>
          ) : (
            <RecentActivityTable activities={recentActivity} />
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
