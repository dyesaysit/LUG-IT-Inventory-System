import { useEffect, useState } from 'react';
import type { AssetAssignment, Ticket, TicketCategory, TicketPriority, TicketStatus } from 'shared';
import { createPortalTicket, fetchMyAssets, fetchMyTickets } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { useFormatDate } from '../utils/formatting';

const CATEGORIES: TicketCategory[] = ['DEVICE', 'NETWORK', 'ACCOUNT', 'SOFTWARE', 'ACCESS', 'OTHER'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const label = (value: string) => value.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const statusLabel = (status: TicketStatus) => ({ NEW: 'Submitted', ASSIGNED: 'Assigned to IT', IN_PROGRESS: 'IT is working on it', COMPLETED: 'Resolved', CLOSED: 'Closed', CANCELLED: 'Cancelled' })[status];

/** Staff portal history for tickets owned by the signed-in account. */
export default function PortalTicketsPage() {
  const formatDate = useFormatDate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assetId: '', category: 'OTHER' as TicketCategory, priority: 'MEDIUM' as TicketPriority });

  useEffect(() => {
    Promise.all([fetchMyTickets(), fetchMyAssets()])
      .then(([ticketData, assetData]) => { setTickets(ticketData); setAssets(assetData); })
      .catch((reason: unknown) => setError(apiErrorMessage(reason, 'Unable to load your tickets.')))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const created = await createPortalTicket({ title: form.title.trim(), description: form.description.trim() || null, assetId: form.assetId ? Number(form.assetId) : null, category: form.category, priority: form.priority });
      setTickets((current) => [created, ...current]); setAdding(false);
      setForm({ title: '', description: '', assetId: '', category: 'OTHER', priority: 'MEDIUM' });
      setSuccess(`Ticket ${created.ticketNumber} was submitted to IT.`);
    } catch (reason) { setError(apiErrorMessage(reason, 'Unable to submit your ticket.')); }
    finally { setSaving(false); }
  };
  const inputClasses = 'mt-1 w-full rounded border border-lug-light-gray px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-semibold text-lug-charcoal">My tickets</h1><p className="mt-1 text-sm text-lug-gray">Issues you reported and their current IT status</p></div><button type="button" onClick={() => setAdding(true)} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white">Raise ticket</button></header>
      {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!error && <section className="overflow-hidden rounded border border-lug-light-gray bg-white">
        {loading ? <p className="px-6 py-12 text-center text-sm text-lug-gray">Loading your tickets…</p> : tickets.length === 0 ? <p className="px-6 py-12 text-center text-sm text-lug-gray">You have not reported any issues yet.</p> : <ul className="divide-y divide-lug-light-gray">{tickets.map((ticket) => <li key={ticket.id} className="px-5 py-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-lug-charcoal">{ticket.title}</p><p className="mt-0.5 text-xs text-lug-gray">{ticket.ticketNumber} · {ticket.assetTag ?? 'General issue'} · {formatDate(ticket.createdAt)}</p></div><span className="rounded border border-lug-light-gray bg-gray-50 px-2 py-1 text-xs capitalize text-lug-charcoal">{statusLabel(ticket.status)}</span></div>{ticket.description && <p className="mt-2 text-sm text-lug-gray">{ticket.description}</p>}{ticket.resolution && <p className="mt-2 text-sm text-lug-charcoal"><span className="font-medium">Resolution:</span> {ticket.resolution}</p>}</li>)}</ul>}
      </section>}
      {adding && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={(event) => void submit(event)} className="w-full max-w-lg space-y-4 rounded bg-white p-6 shadow-xl"><h2 className="text-lg font-semibold">Raise ticket</h2><label className="block text-sm font-medium">Issue type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as TicketCategory })} className={inputClasses}>{CATEGORIES.map((category) => <option key={category} value={category}>{label(category)} issue</option>)}</select></label><label className="block text-sm font-medium">Title<input required minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClasses} /></label><label className="block text-sm font-medium">Details<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClasses} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Related asset<select value={form.assetId} onChange={(event) => setForm({ ...form, assetId: event.target.value, category: event.target.value ? 'DEVICE' : form.category })} className={inputClasses}><option value="">None</option>{assets.map((asset) => <option key={asset.assetId} value={asset.assetId}>{asset.assetTag} â€” {asset.assetManufacturer} {asset.assetModel}</option>)}</select></label><label className="block text-sm font-medium">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TicketPriority })} className={inputClasses}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select></label></div><div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setAdding(false)} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? 'Submittingâ€¦' : 'Submit ticket'}</button></div></form></div>}
    </div>
  );
}
