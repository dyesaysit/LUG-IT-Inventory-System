import { DashboardCard } from '../components/DashboardCard';
import { RecentActivityTable } from '../components/RecentActivityTable';

const stats = [
  {
    title: 'Total assets',
    value: '486',
    subtitle: 'Across 14 departments',
    indicator: undefined as 'green' | 'amber' | 'red' | undefined,
  },
  {
    title: 'Assigned assets',
    value: '327',
    subtitle: '67% of total',
    indicator: undefined,
  },
  {
    title: 'Available assets',
    value: '91',
    subtitle: 'Ready for assignment',
    indicator: 'green' as const,
  },
  {
    title: 'Departments',
    value: '14',
    subtitle: 'All active',
    indicator: undefined,
  },
  {
    title: 'People',
    value: '238',
    subtitle: 'Staff and faculty',
    indicator: undefined,
  },
  {
    title: 'Locations',
    value: '22',
    subtitle: 'Campus rooms and offices',
    indicator: undefined,
  },
  {
    title: 'Warranty expiring',
    value: '11',
    subtitle: 'Within 30 days',
    indicator: 'amber' as const,
  },
  {
    title: 'Open maintenance requests',
    value: '6',
    subtitle: '3 overdue',
    indicator: 'red' as const,
  },
];

interface DistributionRow {
  label: string;
  count: number;
  share: number; // 0–100
}

const distribution: DistributionRow[] = [
  { label: 'Laptops', count: 204, share: 42 },
  { label: 'Desktop computers', count: 118, share: 24 },
  { label: 'Projectors', count: 47, share: 10 },
  { label: 'Network equipment', count: 52, share: 11 },
  { label: 'Printers', count: 38, share: 8 },
  { label: 'Other equipment', count: 27, share: 5 },
];

interface AttentionItem {
  label: string;
  href: string;
}

const attentionItems: AttentionItem[] = [
  { label: '6 open maintenance requests', href: '/maintenance' },
  { label: '11 warranties expiring within 30 days', href: '/assets' },
  { label: '3 unassigned devices', href: '/assignments' },
  { label: '2 overdue returns', href: '/assignments' },
];

const recentActivity = [
  {
    id: 1,
    asset: 'Dell Latitude 5420',
    detail: 'Assigned to Dr. Ama Mensah',
    assignedTo: 'Dr. Ama Mensah',
    user: 'E. Asare',
    time: 'Today, 09:14',
    status: 'assigned' as const,
  },
  {
    id: 2,
    asset: 'Epson EB‑X51',
    detail: 'Deployed to Lecture Room B12',
    assignedTo: 'Lecture Room B12',
    user: 'K. Owusu',
    time: 'Today, 08:42',
    status: 'deployed' as const,
  },
  {
    id: 3,
    asset: 'Cisco SG350‑28',
    detail: 'Installed in Administration Block rack',
    assignedTo: 'Administration Block',
    user: 'K. Owusu',
    time: 'Today, 08:05',
    status: 'deployed' as const,
  },
  {
    id: 4,
    asset: 'HP EliteDesk 800 G6',
    detail: 'Returned by Finance Department',
    assignedTo: 'Finance Department',
    user: 'A. Tagoe',
    time: 'Yesterday, 16:30',
    status: 'returned' as const,
  },
  {
    id: 5,
    asset: 'Lenovo ThinkPad T14',
    detail: 'Sent for motherboard repair',
    assignedTo: 'IT Support',
    user: 'E. Asare',
    time: 'Yesterday, 14:10',
    status: 'repair' as const,
  },
  {
    id: 6,
    asset: 'Dell OptiPlex 3090',
    detail: 'Assigned to Mr. Stephen Kofi',
    assignedTo: 'Mr. Stephen Kofi',
    user: 'E. Asare',
    time: 'Yesterday, 11:22',
    status: 'assigned' as const,
  },
  {
    id: 7,
    asset: 'APC Smart‑UPS 1500',
    detail: 'Maintenance completed — Server Room A',
    assignedTo: 'Server Room A',
    user: 'K. Owusu',
    time: '3 Aug 2026, 10:00',
    status: 'completed' as const,
  },
];

const today = new Date();
const dateLabel = today.toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Dashboard page: summary stat cards, asset distribution, attention items, and recent activity.
 */
export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Compact header with date */}
      <div>
        <h1 className="text-lg font-semibold text-lug-charcoal">Dashboard</h1>
        <p className="text-xs text-lug-gray mt-0.5">IT inventory overview</p>
        <p className="text-xs text-lug-gray mt-0.5">{dateLabel}</p>
      </div>

      {/* Stat cards — 4 columns desktop, 2 tablet, 1 mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((s) => (
          <DashboardCard
            key={s.title}
            title={s.title}
            value={s.value}
            subtitle={s.subtitle}
            indicator={s.indicator}
          />
        ))}
      </div>

      {/* Secondary summary: Asset distribution + Attention required */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Asset distribution */}
        <div className="bg-white rounded border border-lug-light-gray px-5 py-4">
          <h2 className="text-sm font-semibold text-lug-charcoal mb-3">
            Asset distribution
          </h2>
          <div className="space-y-2.5">
            {distribution.map((d) => (
              <div key={d.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-lug-charcoal">{d.label}</span>
                  <span className="text-lug-gray">
                    {d.count} ({d.share}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lug-red/60 rounded-full"
                    style={{ width: `${d.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention required */}
        <div className="bg-white rounded border border-lug-light-gray px-5 py-4">
          <h2 className="text-sm font-semibold text-lug-charcoal mb-3">
            Attention required
          </h2>
          <ul className="divide-y divide-lug-light-gray">
            {attentionItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="block py-2.5 text-sm text-lug-charcoal hover:text-lug-red transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded border border-lug-light-gray">
        <div className="px-5 py-3.5 border-b border-lug-light-gray">
          <h2 className="text-sm font-semibold text-lug-charcoal">
            Recent activity
          </h2>
        </div>
        <div className="px-5 py-2">
          <RecentActivityTable activities={recentActivity} />
        </div>
      </div>
    </div>
  );
}