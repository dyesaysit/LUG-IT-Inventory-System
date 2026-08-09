import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from 'shared';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '../services/api';

const timestamp = (value: string) => new Date(`${value.replace(' ', 'T')}Z`).toLocaleString();
const reference = (item: Notification) => item.entityType === 'TICKET' ? `Ticket #${item.entityId}` : `Equipment request #${item.entityId}`;

/** Responsive bell menu containing only unread notifications. */
export function UnreadNotificationBell() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const refresh = async () => {
    const [nextItems, nextCount] = await Promise.all([fetchNotifications({ read: false, pageSize: 8 }), fetchUnreadNotificationCount()]);
    setItems(nextItems); setCount(nextCount);
  };
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 30_000); return () => window.clearInterval(timer); }, []);
  const target = (item: Notification) => item.entityType === 'TICKET'
    ? (hasPermission('tickets.view') ? `/tickets?ticket=${item.entityId}` : `/portal/tickets?ticket=${item.entityId}`)
    : (hasPermission('requests.view') ? `/equipment-requests?request=${item.entityId}` : `/portal/requests?request=${item.entityId}`);
  const visit = async (item: Notification) => {
    setItems((current) => current.filter(({ id }) => id !== item.id)); setCount((current) => Math.max(0, current - 1));
    try { await markNotificationRead(item.id); setOpen(false); navigate(target(item)); } catch { await refresh(); }
  };
  const markAll = async () => {
    const oldItems = items; const oldCount = count; setItems([]); setCount(0);
    try { await markAllNotificationsRead(); } catch { setItems(oldItems); setCount(oldCount); }
  };
  return <div className="relative">
    <button type="button" onClick={() => { setOpen((value) => !value); if (!open) void refresh(); }} className="relative rounded p-1.5 text-lug-gray hover:bg-gray-100" aria-label="Notifications">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.4-1.4A2 2 0 0118 14v-3a6 6 0 00-12 0v3a2 2 0 01-.6 1.6L4 17h16M9 17v1a3 3 0 006 0v-1" /></svg>
      {count > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-lug-red px-1 text-[10px] text-white">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <div className="fixed left-2 right-2 top-14 z-50 max-h-[calc(100vh-4rem)] overflow-hidden rounded border bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[min(28rem,calc(100vw-1rem))]">
      <div className="flex items-center justify-between border-b px-4 py-3"><b className="text-sm">Unread notifications</b>{items.length > 0 && <button type="button" onClick={() => void markAll()} className="text-xs text-lug-red">Mark all as read</button>}</div>
      <div className="max-h-[calc(100vh-10rem)] overflow-y-auto sm:max-h-96">{items.length === 0 ? <p className="p-5 text-center text-sm text-lug-gray">No unread notifications.</p> : items.map((item) => <button type="button" key={item.id} onClick={() => void visit(item)} className="block w-full border-b bg-red-50/60 px-4 py-3 text-left hover:bg-red-50">
        <p className="text-sm font-semibold text-lug-charcoal">{item.title}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-lug-charcoal">{item.message}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-lug-gray"><span className="font-medium">{reference(item)}</span><time dateTime={item.createdAt}>{timestamp(item.createdAt)}</time></div>
      </button>)}</div>
      <button type="button" onClick={() => { setOpen(false); navigate('/notifications'); }} className="w-full px-4 py-3 text-sm font-medium text-lug-red">View all notifications</button>
    </div>}
  </div>;
}
