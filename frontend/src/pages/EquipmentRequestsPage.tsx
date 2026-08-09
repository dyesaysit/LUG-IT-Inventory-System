import { useCallback, useEffect, useState } from 'react';
import type { EquipmentRequest, EquipmentRequestStatus, InventoryAsset as Asset } from 'shared';
import {
  approveEquipmentRequest,
  fetchAssets,
  fetchEquipmentRequests,
  fulfilEquipmentRequest,
  rejectEquipmentRequest,
  requestMoreInformation,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/api-error';

const STATUSES: EquipmentRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED'];
const PAGE_SIZE = 20;
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
const requestStatusLabel = (request: EquipmentRequest) => request.status === 'PENDING'
  ? request.reviewedAt ? 'Needs information' : 'Submitted'
  : label(request.status);
const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};

const STATUS_STYLE: Record<EquipmentRequestStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  APPROVED: 'border-blue-200 bg-blue-50 text-blue-700',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
  FULFILLED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CANCELLED: 'border-gray-200 bg-gray-100 text-gray-600',
};

type ReviewKind = 'approve' | 'reject' | 'request-info' | 'fulfil';
type ReviewAction = { request: EquipmentRequest; kind: ReviewKind };

const ACTION_TITLE: Record<ReviewKind, string> = {
  approve: 'Approve request',
  reject: 'Reject request',
  'request-info': 'Request more information',
  fulfil: 'Fulfil request',
};

const inputClasses = 'mt-1 w-full rounded border border-lug-light-gray px-3 py-2 text-sm';

/** Admin queue for reviewing and fulfilling staff equipment requests. */
export default function EquipmentRequestsPage() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission('requests.review');
  const canFulfil = hasPermission('requests.fulfil');

  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [details, setDetails] = useState<EquipmentRequest | null>(null);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [notes, setNotes] = useState('');
  const [assetId, setAssetId] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEquipmentRequests({
        search: search.trim() || undefined,
        status: (status || undefined) as EquipmentRequestStatus | undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setRequests(data);
      setHasNext(data.length === PAGE_SIZE);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load equipment requests.'));
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const openAction = async (request: EquipmentRequest, kind: ReviewKind) => {
    setAction({ request, kind });
    setNotes('');
    setAssetId('');
    setError(null);
    if (kind === 'fulfil') {
      setAssetsLoading(true);
      try {
        // Only in-stock assets can be assigned; the assignment service enforces this too.
        const all = await fetchAssets();
        setAssets(all.filter((a) => a.status === 'IN_STOCK'));
      } catch {
        setAssets([]);
      } finally {
        setAssetsLoading(false);
      }
    }
  };

  const replace = (updated: EquipmentRequest) =>
    setRequests((current) => current.map((r) => (r.id === updated.id ? updated : r)));

  const submitAction = async () => {
    if (!action) return;
    const { request, kind } = action;
    const trimmed = notes.trim();
    if (kind === 'request-info' && trimmed.length < 3) {
      setError('Please describe what additional information is required.');
      return;
    }
    if (kind === 'fulfil' && !assetId) {
      setError('Please choose an available asset to assign.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let updated: EquipmentRequest;
      if (kind === 'approve') {
        updated = await approveEquipmentRequest(request.id, { notes: trimmed || null });
        setSuccess(`Request from ${request.requestedByName ?? request.requestedByUsername ?? 'staff'} approved.`);
      } else if (kind === 'reject') {
        updated = await rejectEquipmentRequest(request.id, { notes: trimmed || null });
        setSuccess('Request rejected.');
      } else if (kind === 'request-info') {
        updated = await requestMoreInformation(request.id, { notes: trimmed });
        setSuccess('More information has been requested.');
      } else {
        updated = await fulfilEquipmentRequest(request.id, { assetId: Number(assetId), notes: trimmed || null });
        setSuccess('Request fulfilled and asset assigned.');
      }
      replace(updated);
      setAction(null);
      if (details?.id === updated.id) setDetails(updated);
    } catch (err) {
      setError(apiErrorMessage(err, 'The action could not be completed.'));
    } finally {
      setBusy(false);
    }
  };

  const rowActions = (request: EquipmentRequest) => {
    const buttons: React.ReactNode[] = [];
    if (canReview && request.status === 'PENDING') {
      buttons.push(
        <button key="approve" type="button" disabled={busy} onClick={() => void openAction(request, 'approve')} className="text-lug-red hover:underline disabled:opacity-50">Approve</button>,
        <button key="info" type="button" disabled={busy} onClick={() => void openAction(request, 'request-info')} className="text-lug-red hover:underline disabled:opacity-50">Request info</button>,
        <button key="reject" type="button" disabled={busy} onClick={() => void openAction(request, 'reject')} className="text-lug-gray hover:text-red-700 disabled:opacity-50">Reject</button>,
      );
    }
    if (request.status === 'APPROVED') {
      if (canFulfil) {
        buttons.push(<button key="fulfil" type="button" disabled={busy} onClick={() => void openAction(request, 'fulfil')} className="text-lug-red hover:underline disabled:opacity-50">Fulfil</button>);
      }
      if (canReview) {
        buttons.push(<button key="reject" type="button" disabled={busy} onClick={() => void openAction(request, 'reject')} className="text-lug-gray hover:text-red-700 disabled:opacity-50">Reject</button>);
      }
    }
    return buttons;
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-lug-charcoal">Equipment requests</h1>
          <p className="mt-1 text-sm text-lug-gray">Review staff requests, then fulfil them by assigning an available asset</p>
        </div>
      </header>

      {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && !action && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded border border-lug-light-gray bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items or requesters" aria-label="Search requests" className="rounded border border-lug-light-gray px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="rounded border border-lug-light-gray px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <button type="button" onClick={() => { setSearch(''); setStatus(''); }} className="rounded border border-lug-light-gray px-3 py-2 text-sm text-lug-charcoal hover:bg-gray-50">Clear filters</button>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-lug-light-gray bg-white">
        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-lug-charcoal">{search || status ? 'No requests match your filters' : 'No equipment requests yet'}</h2>
            <p className="mt-2 text-sm text-lug-gray">{search || status ? 'Clear or adjust the filters to see more.' : 'Requests raised by staff in the portal will appear here.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray">
                <tr>{['Item', 'Requester', 'Qty', 'Category', 'Status', 'Requested', 'Actions'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-lug-light-gray">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setDetails(request)} className="font-medium text-lug-charcoal hover:text-lug-red hover:underline">{request.itemName}</button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{request.requestedByName || request.requestedByUsername || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{request.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{request.category ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className={`rounded border px-2 py-1 text-xs ${STATUS_STYLE[request.status]}`}>{requestStatusLabel(request)}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{formatDate(request.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="inline-flex flex-wrap gap-3">
                        <button type="button" onClick={() => setDetails(request)} className="text-lug-gray hover:text-lug-charcoal">Details</button>
                        {rowActions(request)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && requests.length > 0 && (
          <div className="flex items-center justify-between border-t border-lug-light-gray px-4 py-3 text-sm text-lug-gray">
            <span>Page {page}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-lug-light-gray px-3 py-1 text-lug-charcoal hover:bg-gray-50 disabled:opacity-50">Previous</button>
              <button type="button" disabled={!hasNext} onClick={() => setPage((p) => p + 1)} className="rounded border border-lug-light-gray px-3 py-1 text-lug-charcoal hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </section>

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setDetails(null)}>
          <div className="w-full max-w-lg space-y-4 rounded bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-lug-charcoal">{details.itemName}</h2>
                <p className="mt-1 text-sm text-lug-gray">Requested {formatDate(details.createdAt)}</p>
              </div>
              <span className={`rounded border px-2 py-1 text-xs ${STATUS_STYLE[details.status]}`}>{requestStatusLabel(details)}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-lug-gray">Requester</dt><dd className="text-lug-charcoal">{details.requestedByName || details.requestedByUsername || '—'}</dd></div>
              <div><dt className="text-lug-gray">Quantity</dt><dd className="text-lug-charcoal">{details.quantity}</dd></div>
              <div><dt className="text-lug-gray">Category</dt><dd className="text-lug-charcoal">{details.category ?? '—'}</dd></div>
              <div><dt className="text-lug-gray">Reviewed by</dt><dd className="text-lug-charcoal">{details.reviewedBy ?? '—'}</dd></div>
              <div className="col-span-2"><dt className="text-lug-gray">Justification</dt><dd className="whitespace-pre-wrap text-lug-charcoal">{details.justification || '—'}</dd></div>
              {details.reviewNotes && <div className="col-span-2"><dt className="text-lug-gray">Review notes</dt><dd className="whitespace-pre-wrap text-lug-charcoal">{details.reviewNotes}</dd></div>}
            </dl>
            <div className="flex flex-wrap justify-end gap-2 border-t border-lug-light-gray pt-4">
              {canReview && details.status === 'PENDING' && (
                <>
                  <button type="button" onClick={() => void openAction(details, 'approve')} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy">Approve</button>
                  <button type="button" onClick={() => void openAction(details, 'request-info')} className="rounded border border-lug-red px-4 py-2 text-sm font-medium text-lug-red hover:bg-red-50">Request info</button>
                  <button type="button" onClick={() => void openAction(details, 'reject')} className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50">Reject</button>
                </>
              )}
              {details.status === 'APPROVED' && canFulfil && (
                <button type="button" onClick={() => void openAction(details, 'fulfil')} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy">Fulfil</button>
              )}
              <button type="button" onClick={() => setDetails(null)} className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => !busy && setAction(null)}>
          <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-lug-charcoal">{ACTION_TITLE[action.kind]}</h2>
            <p className="text-sm text-lug-gray">
              {action.kind === 'approve' && `Approve "${action.request.itemName}" requested by ${action.request.requestedByName ?? action.request.requestedByUsername ?? 'staff'}.`}
              {action.kind === 'reject' && `Reject "${action.request.itemName}". The requester will see the status update.`}
              {action.kind === 'request-info' && `Ask ${action.request.requestedByName ?? action.request.requestedByUsername ?? 'the requester'} for more detail. The request stays pending.`}
              {action.kind === 'fulfil' && `Assign an available asset to ${action.request.requestedByName ?? action.request.requestedByUsername ?? 'the requester'} and mark this request fulfilled.`}
            </p>

            {action.kind === 'fulfil' && (
              <label className="block text-sm font-medium text-lug-charcoal">Available asset<span className="text-lug-red"> *</span>
                <select autoFocus value={assetId} onChange={(e) => setAssetId(e.target.value)} disabled={assetsLoading} className={inputClasses}>
                  <option value="">{assetsLoading ? 'Loading assets…' : 'Select an asset'}</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.assetTag} — {a.manufacturer} {a.model}</option>)}
                </select>
                {!assetsLoading && assets.length === 0 && <span className="mt-1 block text-xs text-red-700">No in-stock assets are available to assign.</span>}
              </label>
            )}

            <label className="block text-sm font-medium text-lug-charcoal">
              {action.kind === 'request-info' ? 'What is needed?' : 'Notes'}{action.kind === 'request-info' && <span className="text-lug-red"> *</span>}
              <textarea autoFocus={action.kind !== 'fulfil'} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={action.kind === 'request-info' ? 'Describe the information required' : 'Optional note (kept on the request)'} className={inputClasses} />
            </label>

            {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div className="flex justify-end gap-2 border-t border-lug-light-gray pt-4">
              <button type="button" onClick={() => setAction(null)} disabled={busy} className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={busy || (action.kind === 'fulfil' && assets.length === 0)} onClick={() => void submitAction()} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy disabled:opacity-60">{busy ? 'Working…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
