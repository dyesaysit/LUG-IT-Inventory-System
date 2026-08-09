import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InventoryAsset as Asset, Ticket, TicketCategory, TicketPriority, TicketStatus } from 'shared';
import {
  assignTicket,
  cancelTicket,
  closeTicket,
  completeTicket,
  convertTicket,
  createTicket,
  fetchAssets,
  fetchTickets,
  fetchTicketSummary,
  startTicket,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/api-error';

const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CATEGORIES: TicketCategory[] = ['DEVICE', 'NETWORK', 'ACCOUNT', 'SOFTWARE', 'ACCESS', 'OTHER'];
const STATUSES: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'];
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};
const STATUS_STYLE: Record<TicketStatus, string> = {
  NEW: 'border-gray-200 bg-gray-50 text-gray-600',
  ASSIGNED: 'border-blue-200 bg-blue-50 text-blue-700',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-700',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CLOSED: 'border-gray-200 bg-gray-100 text-gray-600',
  CANCELLED: 'border-red-200 bg-red-50 text-red-700',
};

type Action = { ticket: Ticket; kind: 'assign' | 'complete' | 'convert' };

/** Ticket Management: raise tickets and drive them through the New → Closed workflow. */
export default function TicketsPage() {
  const { hasPermission } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState({ open: 0, unassigned: 0, inProgress: 0, closedThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assetId: '', category: 'OTHER' as TicketCategory, priority: 'MEDIUM' as TicketPriority });
  const [action, setAction] = useState<Action | null>(null);
  const [details, setDetails] = useState<Ticket | null>(null);
  const [actionText, setActionText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketData, summaryData] = await Promise.all([fetchTickets({ pageSize: 100 }), fetchTicketSummary()]);
      setTickets(ticketData);
      setSummary(summaryData);
      try {
        setAssets(await fetchAssets());
      } catch {
        setAssets([]);
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load tickets.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        (term === '' || `${t.ticketNumber} ${t.title} ${t.assignedTo ?? ''} ${t.assetTag ?? ''}`.toLowerCase().includes(term)) &&
        (status === '' || t.status === status),
    );
  }, [tickets, search, status]);

  const replace = (updated: Ticket) => setTickets((current) => current.map((t) => (t.id === updated.id ? updated : t)));

  const run = async (fn: () => Promise<Ticket>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      replace(await fn());
      setSuccess(message);
      setSummary(await fetchTicketSummary());
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, 'The action could not be completed.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3) {
      setError('Please give the ticket a short title.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createTicket({
        title: form.title.trim(),
        description: form.description.trim() || null,
        assetId: form.assetId ? Number(form.assetId) : null,
        priority: form.priority,
        category: form.category,
      });
      setTickets((current) => [created, ...current]);
      setSummary(await fetchTicketSummary());
      setAdding(false);
      setForm({ title: '', description: '', assetId: '', category: 'OTHER', priority: 'MEDIUM' });
      setSuccess(`Ticket ${created.ticketNumber} was created.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to create the ticket.'));
    } finally {
      setBusy(false);
    }
  };

  const openAction = (ticket: Ticket, kind: Action['kind']) => {
    setAction({ ticket, kind });
    setActionText('');
  };

  const submitAction = async () => {
    if (!action) return;
    const { ticket, kind } = action;
    let ok = false;
    if (kind === 'assign') {
      if (!actionText.trim()) return;
      ok = await run(() => assignTicket(ticket.id, { assignedTo: actionText.trim() }), `Assigned to ${actionText.trim()}.`);
    } else if (kind === 'complete') {
      if (actionText.trim().length < 3) return;
      ok = await run(() => completeTicket(ticket.id, { resolution: actionText.trim() }), 'Ticket marked as completed.');
    }
    if (ok) setAction(null);
  };

  const doConvert = async (kind: 'MAINTENANCE' | 'REPAIR') => {
    if (!action) return;
    const ok = await run(
      () => convertTicket(action.ticket.id, { kind }),
      kind === 'MAINTENANCE' ? 'Maintenance job created from ticket.' : 'Repair job created from ticket.',
    );
    if (ok) setAction(null);
  };

  const inputClasses = 'mt-1 w-full rounded border border-lug-light-gray px-3 py-2 text-sm';
  const cards = [
    ['Open tickets', summary.open],
    ['Unassigned', summary.unassigned],
    ['In progress', summary.inProgress],
    ['Closed this month', summary.closedThisMonth],
  ] as const;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-lug-charcoal">Tickets</h1>
          <p className="mt-1 text-sm text-lug-gray">Raise and track IT support tickets through to resolution</p>
        </div>
        {hasPermission('tickets.create') && (
          <button type="button" onClick={() => setAdding(true)} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy">
            New ticket
          </button>
        )}
      </header>

      {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([title, value]) => (
          <div key={title} className="rounded border border-lug-light-gray bg-white px-4 py-3">
            <p className="text-xs text-lug-gray">{title}</p>
            <p className="mt-1 text-xl font-semibold text-lug-charcoal">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded border border-lug-light-gray bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets" aria-label="Search tickets" className="rounded border border-lug-light-gray px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="rounded border border-lug-light-gray px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </select>
          <button type="button" onClick={() => { setSearch(''); setStatus(''); }} className="rounded border border-lug-light-gray px-3 py-2 text-sm text-lug-charcoal hover:bg-gray-50">Clear filters</button>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-lug-light-gray bg-white">
        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading tickets…</div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-lug-charcoal">{tickets.length === 0 ? 'No tickets yet' : 'No tickets match your filters'}</h2>
            <p className="mt-2 text-sm text-lug-gray">{tickets.length === 0 ? 'Use New ticket to raise the first one.' : 'Clear or adjust the filters to see more.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray">
                <tr>{['Ticket', 'Requester', 'Department', 'Title', 'Category', 'Asset', 'Priority', 'Status', 'Assigned technician', 'Linked job', 'Submitted', 'Actions'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-lug-light-gray">
                {visible.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-lug-charcoal">{ticket.ticketNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{ticket.requesterName || ticket.requesterUsername || 'â€”'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{ticket.departmentName || 'â€”'}</td>
                    <td className="px-4 py-3"><p className="text-lug-charcoal">{ticket.title}</p></td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{label(ticket.category)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{ticket.assetTag ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{label(ticket.priority)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className={`rounded border px-2 py-1 text-xs ${STATUS_STYLE[ticket.status]}`}>{label(ticket.status)}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{ticket.assignedTo ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{ticket.repairNumber ?? ticket.maintenanceNumber ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{formatDate(ticket.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="inline-flex flex-wrap gap-3">
                        <button type="button" onClick={() => setDetails(ticket)} className="text-lug-gray hover:text-lug-charcoal">View</button>
                        {ticket.status === 'NEW' && hasPermission('tickets.update') && (
                          <button type="button" disabled={busy} onClick={() => openAction(ticket, 'assign')} className="text-lug-red hover:underline disabled:opacity-50">Assign</button>
                        )}
                        {ticket.status === 'ASSIGNED' && hasPermission('tickets.update') && (
                          <>
                            <button type="button" disabled={busy} onClick={() => openAction(ticket, 'assign')} className="text-lug-red hover:underline disabled:opacity-50">Reassign</button>
                            <button type="button" disabled={busy} onClick={() => void run(() => startTicket(ticket.id), 'Ticket is now in progress.')} className="text-lug-red hover:underline disabled:opacity-50">Start</button>
                          </>
                        )}
                        {ticket.status === 'IN_PROGRESS' && hasPermission('tickets.update') && (
                          <>
                            {!ticket.maintenanceRecordId && !ticket.repairJobId && ticket.assetId && (
                              <button type="button" disabled={busy} onClick={() => openAction(ticket, 'convert')} className="text-lug-red hover:underline disabled:opacity-50">Create job</button>
                            )}
                            <button type="button" disabled={busy} onClick={() => openAction(ticket, 'complete')} className="text-lug-red hover:underline disabled:opacity-50">Complete</button>
                          </>
                        )}
                        {ticket.status === 'COMPLETED' && hasPermission('tickets.close') && (
                          <button type="button" disabled={busy} onClick={() => void run(() => closeTicket(ticket.id), 'Ticket closed.')} className="text-lug-red hover:underline disabled:opacity-50">Close</button>
                        )}
                        {!['COMPLETED', 'CLOSED', 'CANCELLED'].includes(ticket.status) && hasPermission('tickets.update') && (
                          <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Cancel ticket ${ticket.ticketNumber}?`)) void run(() => cancelTicket(ticket.id), 'Ticket cancelled.'); }} className="text-lug-gray hover:text-red-700 disabled:opacity-50">Cancel</button>
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

      {details && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetails(null)}><div className="w-full max-w-lg space-y-4 rounded bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div><h2 className="text-lg font-semibold">{details.ticketNumber}: {details.title}</h2><p className="mt-1 text-sm text-lug-gray">{details.requesterName || details.requesterUsername || 'Unknown requester'} · {details.departmentName || 'No department'}</p></div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-lug-gray">Category</dt><dd>{label(details.category)}</dd></div><div><dt className="text-lug-gray">Status</dt><dd>{label(details.status)}</dd></div><div><dt className="text-lug-gray">Asset</dt><dd>{details.assetTag || 'None'}</dd></div><div><dt className="text-lug-gray">Assigned technician</dt><dd>{details.assignedTo || 'Unassigned'}</dd></div><div className="col-span-2"><dt className="text-lug-gray">Description</dt><dd className="whitespace-pre-wrap">{details.description || 'No description'}</dd></div></dl><div className="flex justify-end border-t pt-4"><button type="button" onClick={() => setDetails(null)} className="rounded border px-4 py-2 text-sm">Close</button></div></div></div>}

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <form onSubmit={(e) => void submitCreate(e)} className="w-full max-w-lg space-y-4 rounded bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-lug-charcoal">New ticket</h2>
            <label className="block text-sm font-medium text-lug-charcoal">Title<span className="text-lug-red"> *</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short summary of the issue" className={inputClasses} />
            </label>
            <label className="block text-sm font-medium text-lug-charcoal">Description
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClasses} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-lug-charcoal">Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })} className={inputClasses}>
                  {CATEGORIES.map((category) => <option key={category} value={category}>{label(category)}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-lug-charcoal">Related asset
                <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} className={inputClasses}>
                  <option value="">None</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.assetTag} — {a.manufacturer} {a.model}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-lug-charcoal">Priority
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })} className={inputClasses}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-lug-light-gray pt-4">
              <button type="button" onClick={() => setAdding(false)} disabled={busy} className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={busy} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy disabled:opacity-60">{busy ? 'Saving…' : 'Create ticket'}</button>
            </div>
          </form>
        </div>
      )}

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => !busy && setAction(null)}>
          <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {action.kind === 'convert' ? (
              <>
                <h2 className="text-lg font-semibold text-lug-charcoal">Create a job from {action.ticket.ticketNumber}</h2>
                <p className="text-sm text-lug-gray">This creates a real maintenance record or repair job for the linked asset, reusing those modules.</p>
                <div className="flex justify-end gap-2 border-t border-lug-light-gray pt-4">
                  <button type="button" onClick={() => setAction(null)} disabled={busy} className="rounded border border-lug-light-gray px-4 py-2 text-sm">Cancel</button>
                  <button type="button" disabled={busy} onClick={() => void doConvert('MAINTENANCE')} className="rounded border border-lug-red px-4 py-2 text-sm font-medium text-lug-red hover:bg-red-50 disabled:opacity-60">Maintenance</button>
                  <button type="button" disabled={busy} onClick={() => void doConvert('REPAIR')} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy disabled:opacity-60">Repair</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-lug-charcoal">
                  {action.kind === 'assign' ? 'Assign ticket' : 'Complete ticket'} {action.ticket.ticketNumber}
                </h2>
                {action.kind === 'assign' ? (
                  <label className="block text-sm font-medium text-lug-charcoal">Assign to<span className="text-lug-red"> *</span>
                    <input autoFocus value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="Technician name" className={inputClasses} />
                  </label>
                ) : (
                  <label className="block text-sm font-medium text-lug-charcoal">Resolution<span className="text-lug-red"> *</span>
                    <textarea autoFocus rows={4} value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="How was it resolved?" className={inputClasses} />
                  </label>
                )}
                <div className="flex justify-end gap-2 border-t border-lug-light-gray pt-4">
                  <button type="button" onClick={() => setAction(null)} disabled={busy} className="rounded border border-lug-light-gray px-4 py-2 text-sm">Cancel</button>
                  <button type="button" disabled={busy} onClick={() => void submitAction()} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy disabled:opacity-60">{busy ? 'Saving…' : 'Confirm'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
