import { useEffect, useState } from 'react';
import type { Ticket, TicketStatus } from 'shared';
import { fetchMyTickets } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { useFormatDate } from '../utils/formatting';

const statusLabel = (status: TicketStatus) => status.replaceAll('_', ' ').toLowerCase();

/** Staff portal history for tickets owned by the signed-in account. */
export default function PortalTicketsPage() {
  const formatDate = useFormatDate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTickets()
      .then(setTickets)
      .catch((reason: unknown) => setError(apiErrorMessage(reason, 'Unable to load your tickets.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <header><h1 className="text-xl font-semibold text-lug-charcoal">My tickets</h1><p className="mt-1 text-sm text-lug-gray">Issues you reported and their current IT status</p></header>
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <section className="overflow-hidden rounded border border-lug-light-gray bg-white">
        {loading ? <p className="px-6 py-12 text-center text-sm text-lug-gray">Loading your tickets…</p> : tickets.length === 0 ? <p className="px-6 py-12 text-center text-sm text-lug-gray">You have not reported any issues yet.</p> : <ul className="divide-y divide-lug-light-gray">{tickets.map((ticket) => <li key={ticket.id} className="px-5 py-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-lug-charcoal">{ticket.title}</p><p className="mt-0.5 text-xs text-lug-gray">{ticket.ticketNumber} · {ticket.assetTag ?? 'General issue'} · {formatDate(ticket.createdAt)}</p></div><span className="rounded border border-lug-light-gray bg-gray-50 px-2 py-1 text-xs capitalize text-lug-charcoal">{statusLabel(ticket.status)}</span></div>{ticket.description && <p className="mt-2 text-sm text-lug-gray">{ticket.description}</p>}{ticket.resolution && <p className="mt-2 text-sm text-lug-charcoal"><span className="font-medium">Resolution:</span> {ticket.resolution}</p>}</li>)}</ul>}
      </section>
    </div>
  );
}
