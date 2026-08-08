import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import type { PublicApplicationSettings } from 'shared';

/**
 * @deprecated Use formatCurrency from ./formatting instead.
 * Formats monetary values using the configured currency from ApplicationSettings.
 */
export function formatGhanaCedis(
  value: number | null | undefined,
  settings?: PublicApplicationSettings | null,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const symbol = settings?.currencySymbol || 'GH₵';
  const locale = settings?.locale || 'en';
  const formatted = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${symbol} ${formatted}`;
}

/**
 * React hook returning a currency formatter that reads settings from context.
 * Preferred usage for components that already have the ApplicationSettings provider.
 */
export function useFormatCurrency(): (value: number | null | undefined) => string {
  const { settings } = useApplicationSettings();
  return (value: number | null | undefined) => {
    return formatGhanaCedis(value, settings);
  };
}