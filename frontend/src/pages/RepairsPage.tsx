import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/api-error';
import { useSearchParams } from 'react-router-dom';
import type { InventoryAsset as Asset, MaintenanceRecord, RepairJob, RepairSummary } from 'shared';
import { RepairActionModal, type RepairAction } from '../components/RepairActionModal';
import { RepairForm } from '../components/RepairForm';
import {
  cancelRepair,
  fetchAssets,
  fetchMaintenanceRecords,
  fetchRepairs,
  fetchRepairSummary,
  startRepair,
} from '../services/api';
import { useFormatCurrency } from '../utils/formatting';
const statuses = [
  'REPORTED',
  'DIAGNOSING',
  'AWAITING_QUOTATION',
  'AWAITING_APPROVAL',
  'APPROVED',
  'SENT_TO_VENDOR',
  'IN_REPAIR',
  'WAITING_FOR_PARTS',
  'COMPLETED',
  'RETURNED',
  'CANCELLED',
  'BEYOND_REPAIR',
] as const;
const types = ['INTERNAL', 'EXTERNAL', 'WARRANTY', 'EMERGENCY', 'OTHER'] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const approvals = ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'] as const;
const label = (v: string) =>
  v
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
const date = (v: string | null) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-GB') : '—';
const actions = (r: RepairJob): RepairAction[] => {
  const a: RepairAction[] = [];
  if (r.status === 'DIAGNOSING') a.push('quotation', 'beyond');
  if (r.status === 'AWAITING_APPROVAL') a.push('approve', 'reject');
  if (r.status === 'APPROVED')
    a.push(
      ...(['EXTERNAL', 'WARRANTY'].includes(r.repairType) ? ['send' as const] : ['start' as const]),
    );
  if (r.status === 'SENT_TO_VENDOR') a.push('start', 'waiting');
  if (r.status === 'IN_REPAIR') a.push('waiting', 'complete', 'beyond');
  if (r.status === 'WAITING_FOR_PARTS') a.push('start', 'complete', 'beyond');
  if (r.status === 'COMPLETED') a.push('return');
  return a;
};
/** Maps each repair workflow action to the permission its backend route requires. */
const ACTION_PERMISSION: Record<string, string> = {
  quotation: 'repairs.update', send: 'repairs.update', start: 'repairs.update',
  waiting: 'repairs.update', beyond: 'repairs.update', approve: 'repairs.approve',
  reject: 'repairs.reject', complete: 'repairs.complete', return: 'repairs.return',
};
/** Formal internal and vendor repair workflow. */
export default function RepairsPage() {
  const formatCurrency = useFormatCurrency();
  const { hasPermission } = useAuth();
  const [params] = useSearchParams();
  const initialAsset = Number(params.get('assetId')) || undefined;
  const [records, setRecords] = useState<RepairJob[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [summary, setSummary] = useState<RepairSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<RepairJob | null>(null);
  const [workflow, setWorkflow] = useState<{ record: RepairJob; action: RepairAction } | null>(
    null,
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [approval, setApproval] = useState('');
  const [vendor, setVendor] = useState('');
  const [replacement, setReplacement] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, a, m, s] = await Promise.all([
        fetchRepairs({ pageSize: 100 }),
        fetchAssets(),
        fetchMaintenanceRecords({ pageSize: 100 }),
        fetchRepairSummary(),
      ]);
      setRecords(r);
      setAssets(a);
      setMaintenance(m);
      setSummary(s);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load repairs.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      records.filter((r) => {
        const q = search.toLowerCase();
        return (
          (!q ||
            [r.repairNumber, r.assetTag, r.assetManufacturer, r.assetModel, r.faultDescription]
              .join(' ')
              .toLowerCase()
              .includes(q)) &&
          (!initialAsset || r.assetId === initialAsset) &&
          (!status || r.status === status) &&
          (!type || r.repairType === type) &&
          (!priority || r.priority === priority) &&
          (!approval || r.approvalStatus === approval) &&
          (!vendor || r.vendorName?.toLowerCase().includes(vendor.toLowerCase())) &&
          (!replacement || r.replacementRecommended === (replacement === 'true')) &&
          (!from || r.reportedDate >= from) &&
          (!to || r.reportedDate <= to)
        );
      }),
    [
      approval,
      from,
      initialAsset,
      priority,
      records,
      replacement,
      search,
      status,
      to,
      type,
      vendor,
    ],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const cards = [
    ['Open repair jobs', summary?.openRepairs ?? 0],
    ['Awaiting quotation', summary?.awaitingQuotation ?? 0],
    ['Awaiting approval', summary?.awaitingApproval ?? 0],
    ['With vendor', summary?.withVendor ?? 0],
    ['In repair', summary?.inRepair ?? 0],
    ['Waiting for parts', summary?.waitingForParts ?? 0],
    ['Completed this month', summary?.completedThisMonth ?? 0],
    ['Replacement recommended', summary?.replacementRecommended ?? 0],
    ['Repair cost this month', formatCurrency(summary?.repairCostThisMonth ?? 0)],
  ] as const;
  const refreshed = async (message: string) => {
    setAdding(false);
    setWorkflow(null);
    setSuccess(message);
    await load();
  };
  const cancel = async (r: RepairJob) => {
    if (!window.confirm(`Cancel ${r.repairNumber}?`)) return;
    try {
      await cancelRepair(r.id);
      await refreshed('Repair cancelled.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to cancel repair.'));
    }
  };
  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Repairs</h1>
          <p className="mt-1 text-sm text-lug-gray">
            Manage internal and external repair jobs for IT assets
          </p>
        </div>
        {hasPermission('repairs.create') && (
          <button
            onClick={() => setAdding(true)}
            className="rounded bg-lug-red px-4 py-2 text-sm text-white"
          >
            New repair job
          </button>
        )}
      </header>
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(([t, v]) => (
          <div key={t} className="rounded border bg-white p-3">
            <p className="text-xs text-lug-gray">{t}</p>
            <p className="mt-1 text-xl font-semibold">{v}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <input
          aria-label="Search repairs"
          placeholder="Search repairs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded border px-3 py-2 text-sm"
        />
        {[
          [type, setType, 'All types', types],
          [priority, setPriority, 'All priorities', priorities],
          [status, setStatus, 'All statuses', statuses],
          [approval, setApproval, 'All approvals', approvals],
        ].map(([v, set, p, o]) => (
          <select
            key={p as string}
            value={v as string}
            onChange={(e) => (set as (x: string) => void)(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">{p as string}</option>
            {(o as readonly string[]).map((x) => (
              <option key={x} value={x}>
                {label(x)}
              </option>
            ))}
          </select>
        ))}
        <input
          placeholder="Vendor"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        <select
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Any replacement decision</option>
          <option value="true">Replacement recommended</option>
          <option value="false">No replacement</option>
        </select>
        <input
          aria-label="Reported from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        <input
          aria-label="Reported to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            setSearch('');
            setStatus('');
            setType('');
            setPriority('');
            setApproval('');
            setVendor('');
            setReplacement('');
            setFrom('');
            setTo('');
            setPage(1);
          }}
          className="rounded border px-3 py-2 text-sm"
        >
          Clear filters
        </button>
      </section>
      <section className="overflow-hidden rounded border bg-white">
        {loading ? (
          <p className="p-12 text-center text-sm text-lug-gray">Loading repairs…</p>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="font-semibold">No repair jobs found</h2>
            <p className="mt-1 text-sm text-lug-gray">
              Create a repair job to track a faulty asset.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-lug-gray">
                <tr>
                  {[
                    'Repair number',
                    'Asset',
                    'Type',
                    'Vendor',
                    'Fault',
                    'Priority',
                    'Status',
                    'Approval',
                    'Reported',
                    'Estimated completion',
                    'Final cost',
                    'Actions',
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-3 font-medium">{r.repairNumber}</td>
                    <td className="px-3 py-3">
                      {r.assetTag}
                      <span className="block text-xs text-lug-gray">
                        {r.assetManufacturer} {r.assetModel}
                      </span>
                    </td>
                    <td className="px-3 py-3">{label(r.repairType)}</td>
                    <td className="px-3 py-3">{r.vendorName || '—'}</td>
                    <td className="max-w-48 truncate px-3 py-3">{r.faultDescription}</td>
                    <td className="px-3 py-3">{label(r.priority)}</td>
                    <td className="px-3 py-3">{label(r.status)}</td>
                    <td className="px-3 py-3">{label(r.approvalStatus)}</td>
                    <td className="px-3 py-3">{date(r.reportedDate)}</td>
                    <td className="px-3 py-3">{date(r.estimatedCompletionDate)}</td>
                    <td className="px-3 py-3">{formatCurrency(r.finalCost)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelected(r)} className="text-lug-red">
                          View
                        </button>
                        {r.status === 'REPORTED' && hasPermission('repairs.update') && (
                          <button
                            onClick={() =>
                              void startRepair(r.id)
                                .then(() => refreshed('Diagnosis started.'))
                                .catch((err) => setError(apiErrorMessage(err, 'Unable to start diagnosis.')))
                            }
                            className="text-lug-red"
                          >
                            Diagnose
                          </button>
                        )}
                        {actions(r)
                          .filter((a) => hasPermission(ACTION_PERMISSION[a] ?? 'repairs.update'))
                          .map((a) => (
                            <button
                              key={a}
                              onClick={() => setWorkflow({ record: r, action: a })}
                              className="text-lug-red"
                            >
                              {label(a)}
                            </button>
                          ))}
                        {!['COMPLETED', 'RETURNED', 'CANCELLED', 'BEYOND_REPAIR'].includes(
                          r.status,
                        ) && hasPermission('repairs.cancel') && (
                          <button onClick={() => void cancel(r)} className="text-lug-gray">
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t p-3 text-sm">
          <span>
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">New repair job</h2>
            <RepairForm
              assets={assets}
              maintenance={maintenance}
              initialAssetId={initialAsset}
              onCancel={() => setAdding(false)}
              onSuccess={() => void refreshed('Repair job created.')}
            />
          </div>
        </div>
      )}
      {workflow && (
        <RepairActionModal
          record={workflow.record}
          action={workflow.action}
          onClose={() => setWorkflow(null)}
          onSuccess={() => void refreshed('Repair workflow updated.')}
        />
      )}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded bg-white p-6">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">{selected.repairNumber}</h2>
              <button onClick={() => setSelected(null)}>Close</button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                [
                  'Asset',
                  `${selected.assetTag} — ${selected.assetManufacturer} ${selected.assetModel}`,
                ],
                ['Related maintenance', selected.maintenanceNumber || '—'],
                ['Status', label(selected.status)],
                ['Vendor', selected.vendorName || '—'],
                ['Fault', selected.faultDescription],
                ['Diagnosis', selected.diagnosis || '—'],
                ['Repair action', selected.repairAction || '—'],
                ['Parts', selected.partsReplaced || '—'],
                ['Outcome', selected.outcome ? label(selected.outcome) : '—'],
                ['Replacement reason', selected.replacementReason || '—'],
                ['Final cost', formatCurrency(selected.finalCost)],
                ['Notes', selected.notes || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-lug-gray">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
