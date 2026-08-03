interface DashboardCardProps {
  title: string;
  value: string;
  subtitle?: string;
  /** Only used for status-context cards (available, warranty, maintenance) */
  indicator?: 'green' | 'amber' | 'red';
}

const indicatorStyles: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

/**
 * Compact dashboard stat card with subtle border and optional status indicator.
 * Uses sentence case, no uppercase, restrained styling.
 */
export function DashboardCard({
  title,
  value,
  subtitle,
  indicator,
}: DashboardCardProps) {
  return (
    <div className="bg-white rounded border border-lug-light-gray px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1">
        {indicator && (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${indicatorStyles[indicator]}`}
            aria-hidden="true"
          />
        )}
        <p className="text-xs text-lug-gray">{title}</p>
      </div>
      <p className="text-xl font-semibold text-lug-charcoal tracking-tight">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-lug-gray mt-1">{subtitle}</p>
      )}
    </div>
  );
}