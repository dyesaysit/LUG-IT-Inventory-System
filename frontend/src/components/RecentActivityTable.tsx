interface Activity {
  id: number;
  asset: string;
  detail: string;
  assignedTo: string;
  user: string;
  time: string;
  status?: 'assigned' | 'deployed' | 'returned' | 'repair' | 'completed';
}

interface RecentActivityTableProps {
  activities: Activity[];
}

const statusStyles: Record<string, string> = {
  assigned:
    'bg-blue-50 text-blue-700 border-blue-200',
  deployed:
    'bg-emerald-50 text-emerald-700 border-emerald-200',
  returned:
    'bg-purple-50 text-purple-700 border-purple-200',
  repair:
    'bg-amber-50 text-amber-700 border-amber-200',
  completed:
    'bg-gray-50 text-gray-600 border-gray-200',
};

const statusLabel: Record<string, string> = {
  assigned: 'Assigned',
  deployed: 'Deployed',
  returned: 'Returned',
  repair: 'Under repair',
  completed: 'Completed',
};

/**
 * Activity log table with asset, activity, location, status, and recorded-by columns.
 * Uses muted status badges and sensible wrapping on desktop.
 */
export function RecentActivityTable({
  activities,
}: RecentActivityTableProps) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm text-left min-w-[600px]">
        <thead>
          <tr className="border-b border-lug-light-gray">
            <th className="py-2 pr-2 font-medium text-lug-gray text-xs whitespace-nowrap">
              Date & time
            </th>
            <th className="py-2 pr-2 font-medium text-lug-gray text-xs whitespace-nowrap">
              Asset
            </th>
            <th className="py-2 pr-2 font-medium text-lug-gray text-xs whitespace-nowrap">
              Activity
            </th>
            <th className="py-2 pr-2 font-medium text-lug-gray text-xs whitespace-nowrap">
              Assigned to / Location
            </th>
            <th className="py-2 pr-2 font-medium text-lug-gray text-xs whitespace-nowrap">
              Status
            </th>
            <th className="py-2 font-medium text-lug-gray text-xs whitespace-nowrap">
              Recorded by
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-lug-light-gray">
          {activities.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-2.5 pr-2 text-lug-gray text-xs whitespace-nowrap">
                {a.time}
              </td>
              <td className="py-2.5 pr-2 text-lug-charcoal text-xs font-medium whitespace-nowrap">
                {a.asset}
              </td>
              <td className="py-2.5 pr-2 text-lug-gray text-xs max-w-[180px]">
                {a.detail}
              </td>
              <td className="py-2.5 pr-2 text-lug-gray text-xs whitespace-nowrap">
                {a.assignedTo}
              </td>
              <td className="py-2.5 pr-2 whitespace-nowrap">
                {a.status ? (
                  <span
                    className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${
                      statusStyles[a.status]
                    }`}
                  >
                    {statusLabel[a.status] || a.status}
                  </span>
                ) : null}
              </td>
              <td className="py-2.5 text-lug-gray text-xs whitespace-nowrap">
                {a.user}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}