import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  value: string;
  subtitle?: string;
  /** Status colour for the icon tint and (icon-less) status dot. */
  indicator?: 'green' | 'amber' | 'red';
  /** Optional leading icon rendered in a colour-coded tile. */
  icon?: ReactNode;
}

const dotStyles: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const tintStyles: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
};

/**
 * Compact dashboard stat card with an optional colour-coded icon tile and
 * status indicator. Restrained styling, sentence case.
 */
export function DashboardCard({ title, value, subtitle, indicator, icon }: DashboardCardProps) {
  const tint = indicator ? tintStyles[indicator] : 'bg-gray-100 text-lug-gray';
  return (
    <div className="flex items-start gap-3 rounded border border-lug-light-gray bg-white px-4 py-3.5">
      {icon && (
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded ${tint}`} aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {indicator && !icon && (
            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotStyles[indicator]}`} aria-hidden="true" />
          )}
          <p className="text-xs text-lug-gray">{title}</p>
        </div>
        <p className="mt-0.5 text-xl font-semibold tracking-tight text-lug-charcoal">{value}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-lug-gray">{subtitle}</p>}
      </div>
    </div>
  );
}
