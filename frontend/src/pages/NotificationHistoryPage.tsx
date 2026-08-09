import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from 'shared';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markNotificationRead } from '../services/api';

type Filter = 'unread' | 'read' | 'all';
const timestamp = (value: string) => new Date(`${value.replace(' ', 'T')}Z`).toLocaleString();

/** Paginated read and unread notification history for the authenticated user. */
export default function NotificationHistoryPage() {
  const navigate = useNavigate(); const { hasPermission } = useAuth();
  const [items, setItems] = useState<Notification[]>([]); const [page, setPage] = useState(1); const [filter, setFilter] = useState<Filter>('unread');
  const read = filter === 'all' ? undefined : filter === 'read';
  useEffect(() => { void fetchNotifications({ page, pageSize: 20, read }).then(setItems); }, [page, read]);
  const target = (item: Notification) => item.entityType === 'TICKET'
    ? (hasPermission('tickets.view') ? `/tickets?ticket=${item.entityId}` : `/portal/tickets?ticket=${item.entityId}`)
    : (hasPermission('requests.view') ? `/equipment-requests?request=${item.entityId}` : `/portal/requests?request=${item.entityId}`);
  const open = async (item: Notification) => {
    if (!item.isRead) {
      setItems((current) => filter === 'unread' ? current.filter(({ id }) => id !== item.id) : current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
      try { await markNotificationRead(item.id); } catch { setItems(await fetchNotifications({ page, pageSize: 20, read })); return; }
    }
    navigate(target(item));
  };
  return <main className="min-h-screen bg-lug-off-white p-4 sm:p-6"><div className="mx-auto max-w-3xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">Notifications</h1><div className="flex rounded border bg-white p-1" aria-label="Notification filter">
      {(['unread', 'read', 'all'] as const).map((option) => <button type="button" key={option} onClick={() => { setFilter(option); setPage(1); }} className={`rounded px-3 py-1.5 text-sm capitalize ${filter === option ? 'bg-lug-red text-white' : 'text-lug-gray'}`}>{option}</button>)}
    </div></div>
    <div className="overflow-hidden rounded border bg-white">{items.length === 0 ? <p className="p-8 text-center text-sm text-lug-gray">No {filter} notifications found.</p> : items.map((item) => <button type="button" key={item.id} onClick={() => void open(item)} className={`block w-full border-b p-4 text-left hover:bg-gray-50 ${item.isRead ? '' : 'bg-red-50/60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2"><b>{item.title}</b><time className="text-xs text-lug-gray" dateTime={item.createdAt}>{timestamp(item.createdAt)}</time></div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-lug-charcoal">{item.message}</p><p className="mt-2 text-xs font-medium text-lug-gray">{item.entityType === 'TICKET' ? 'Ticket' : 'Equipment request'} #{item.entityId}</p>
    </button>)}</div>
    <div className="flex justify-between"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-2 disabled:opacity-50">Previous</button><button disabled={items.length < 20} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-2 disabled:opacity-50">Next</button></div>
  </div></main>;
}
