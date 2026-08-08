import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import type {
  InventoryAsset as Asset,
  MaintenanceRecord,
  MaintenanceSummary,
  RepairJob,
} from 'shared';
import { MaintenanceActionModal } from '../components/MaintenanceActionModal';
import { MaintenanceForm } from '../components/MaintenanceForm';
import {
  cancelMaintenance,
  fetchAssets,
  fetchMaintenanceRecords,
  fetchMaintenanceSummary,
  fetchRepairs,
} from '../services/api';
import { useFormatCurrency } from '../utils/formatting';

const statuses = [
  'REPORTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'WAITING_FOR_PARTS',
  'COMPLETED',
  'CANCELLED',
  'BEYOND_REPAIR',
] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const types = [
  'CORRECTIVE',
  'PREVENTIVE',
  'INSPECTION',
  'UPGRADE',
  'WARRANTY_SERVICE',
  'OTHER',
] as const;
const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
const displayDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB') : '—';
type WorkflowAction = 'start' | 'waiting' | 'complete' | 'beyond';

/** Maintenance register and workflow page. */
export default function MaintenancePage() {
  const { hasPermission } = useAuth();
  const formatCurrency = useFormatCurrency();
  const [params] = useSearchParams();
  const initialAssetId = Number(params.get('assetId')) || undefined;
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<MaintenanceRecord | null>(null);
  const [workflow, setWorkflow] = useState<{
    record: MaintenanceRecord;
    action: WorkflowAction;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [type, setType] = useState('');
  const [assetId, setAssetId] = useState(initialAssetId ? String(initialAssetId) : '');
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordData, assetData, summaryData, repairData] = await Promise.all([
        fetchMaintenanceRecords({ pageSize: 100 }),
        fetchAssets(),
        fetchMaintenanceSummary(),
        fetchRepairs({ pageSize: 100 }),
      ]);
      setRecords(recordData);
      setAssets(assetData);
      setSummary(summaryData);
      setRepairs(repairData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load maintenance.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const query = search.trim().toLowerCase();
        return (
          (!query ||
            [
              record.maintenanceNumber,
              record.assetTag,
              record.assetManufacturer,
              record.assetModel,
              record.faultDescription ?? '',
            ]
              .join(' ')
              .toLowerCase()
              .includes(query)) &&
          (!status || record.status === status) &&
          (!priority || record.priority === priority) &&
          (!type || record.maintenanceType === type) &&
          (!assetId || record.assetId === Number(assetId))
        );
      }),
    [assetId, priority, records, search, status, type],
  );
  const repairByMaintenance = useMemo(
    () =>
      new Map(
        repairs
          .filter((repair) => repair.maintenanceRecordId)
          .map((repair) => [repair.maintenanceRecordId, repair]),
      ),
    [repairs],
  );
  const cards = [
    ['Open requests', summary?.openRequests ?? 0],
    ['In progress', summary?.inProgress ?? 0],
    ['Waiting for parts', summary?.waitingForParts ?? 0],
    ['Critical priority', summary?.criticalPriority ?? 0],
    ['Completed this month', summary?.completedThisMonth ?? 0],
    ['Cost this month', formatCurrency(summary?.totalCostThisMonth ?? 0)],
  ] as const;
  const refreshed = async (message: string) => {
    setWorkflow(null);
    setAdding(false);
    setSuccess(message);
    await load();
  };
  const cancel = async (record: MaintenanceRecord) => {
    if (!window.confirm(`Cancel ${record.maintenanceNumber}?`)) return;
    try {
      await cancelMaintenance(record.id);
      await refreshed('Maintenance request cancelled.');
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : 'Unable to cancel maintenance.',
      );
    }
  };
  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-lug-charcoal">Maintenance</h1>
          <p className="mt-1 text-sm text-lug-gray">
            Report, schedule, and track equipment maintenance
          </p>
        </div>
        {hasPermission('maintenance.create') && (
          <button
            onClick={() => setAdding(true)}
            className="rounded bg-lug-red px-4 py-2 text-sm text-white"
          >
            Report maintenance
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
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {cards.map(([title, value]) => (
          <div key={title} className="rounded border bg-white p-3">
            <p className="text-xs text-lug-gray">{title}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
        <input
          aria-label="Search maintenance"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search maintenance"
          className="rounded border px-3 py-2 text-sm"
        />
        <select
          aria-label="Asset filter"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All assets</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.assetTag}
            </option>
          ))}
        </select>
        {[
          [status, setStatus, 'All statuses', statuses],
          [priority, setPriority, 'All priorities', priorities],
          [type, setType, 'All types', types],
        ].map(([value, setValue, placeholder, options]) => (
          <select
            key={placeholder as string}
            value={value as string}
            onChange={(e) => (setValue as (v: string) => void)(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">{placeholder as string}</option>
            {(options as readonly string[]).map((option) => (
              <option key={option} value={option}>
                {label(option)}
              </option>
            ))}
          </select>
        ))}
        <button
          onClick={() => {
            setSearch('');
            setAssetId('');
            setStatus('');
            setPriority('');
            setType('');
          }}
          className="rounded border px-3 py-2 text-sm"
        >
          Clear filters
        </button>
      </section>
      <section className="overflow-hidden rounded border bg-white">
        {loading ? (
          <p className="p-12 text-center text-sm text-lug-gray">Loading maintenance…</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="font-semibold">No maintenance records found</h2>
            <p className="mt-1 text-sm text-lug-gray">
              Report maintenance to start tracking work on an asset.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-lug-gray">
                <tr>
                  {[
                    'Number',
                    'Asset',
                    'Type',
                    'Priority',
                    'Status',
                    'Related repair',
                    'Reported',
                    'Scheduled',
                    'Technician',
                    'Cost',
                    'Actions',
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((record) => (
                  <tr key={record.id}>
                    <td className="px-3 py-3 font-medium">{record.maintenanceNumber}</td>
                    <td className="px-3 py-3">
                      <p>{record.assetTag}</p>
                      <p className="text-xs text-lug-gray">
                        {record.assetManufacturer} {record.assetModel}
                      </p>
                    </td>
                    <td className="px-3 py-3">{label(record.maintenanceType)}</td>
                    <td className="px-3 py-3">{label(record.priority)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                        {label(record.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {repairByMaintenance.get(record.id)?.repairNumber ?? '—'}
                    </td>
                    <td className="px-3 py-3">{displayDate(record.reportedDate)}</td>
                    <td className="px-3 py-3">{displayDate(record.scheduledDate)}</td>
                    <td className="px-3 py-3">{record.assignedTechnician || '—'}</td>
                    <td className="px-3 py-3">{formatCurrency(record.maintenanceCost)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelected(record)} className="text-lug-red">
                          View
                        </button>
                        {['REPORTED', 'SCHEDULED', 'WAITING_FOR_PARTS'].includes(record.status) && hasPermission('maintenance.start') && (
                          <button
                            onClick={() => setWorkflow({ record, action: 'start' })}
                            className="text-lug-red"
                          >
                            {record.status === 'WAITING_FOR_PARTS' ? 'Resume' : 'Start'}
                          </button>
                        )}
                        {record.status === 'IN_PROGRESS' && hasPermission('maintenance.update') && (
                          <button
                            onClick={() => setWorkflow({ record, action: 'waiting' })}
                            className="text-lug-red"
                          >
                            Parts
                          </button>
                        )}
                        {['IN_PROGRESS', 'WAITING_FOR_PARTS'].includes(record.status) && (
                          <>
                            {hasPermission('maintenance.complete') && (
                              <button
                                onClick={() => setWorkflow({ record, action: 'complete' })}
                                className="text-lug-red"
                              >
                                Complete
                              </button>
                            )}
                            {hasPermission('maintenance.beyond_repair') && (
                              <button
                                onClick={() => setWorkflow({ record, action: 'beyond' })}
                                className="text-lug-red"
                              >
                                Beyond repair
                              </button>
                            )}
                          </>
                        )}
                        {!['COMPLETED', 'CANCELLED', 'BEYOND_REPAIR'].includes(record.status) && hasPermission('maintenance.cancel') && (
                          <button onClick={() => void cancel(record)} className="text-lug-gray">
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
      </section>
      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Report maintenance</h2>
            <MaintenanceForm
              assets={assets}
              initialAssetId={initialAssetId}
              onCancel={() => setAdding(false)}
              onSuccess={() => void refreshed('Maintenance request reported.')}
            />
          </div>
        </div>
      )}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded bg-white p-6">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">{selected.maintenanceNumber}</h2>
              <button onClick={() => setSelected(null)}>Close</button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                [
                  'Asset',
                  `${selected.assetTag} — ${selected.assetManufacturer} ${selected.assetModel}`,
                ],
                ['Status', label(selected.status)],
                ['Fault', selected.faultDescription || '—'],
                ['Diagnosis', selected.diagnosis || '—'],
                ['Work performed', selected.workPerformed || '—'],
                ['Resolution', selected.resolution || '—'],
                ['Parts', selected.partsUsed || '—'],
                ['Downtime', `${selected.downtimeHours} hours`],
                ['Cost', formatCurrency(selected.maintenanceCost)],
                ['Notes', selected.notes || '—'],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-xs text-lug-gray">{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
      {workflow && (
        <MaintenanceActionModal
          record={workflow.record}
          action={workflow.action}
          onClose={() => setWorkflow(null)}
          onSuccess={() => void refreshed('Maintenance status updated.')}
        />
      )}
    </div>
  );
}
