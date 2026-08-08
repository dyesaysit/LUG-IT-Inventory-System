/**
 * Centralized format utility functions.
 * All formatting uses the configured organization settings from ApplicationSettingsContext.
 * Never hardcode currency symbols, locale, or date formats in individual components.
 */

import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import type { PublicApplicationSettings } from 'shared';

/** Formats a numeric monetary value using the configured currency symbol and locale. */
export function formatCurrency(
  value: number | null | undefined,
  settings: PublicApplicationSettings,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const formatted = new Intl.NumberFormat(settings.locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${settings.currencySymbol} ${formatted}`;
}

/** Hook version of formatCurrency that reads settings from context. */
export function useFormatCurrency(): (value: number | null | undefined) => string {
  const { settings } = useApplicationSettings();
  return (value: number | null | undefined) => {
    if (!settings) return value?.toFixed(2) ?? '—';
    return formatCurrency(value, settings);
  };
}

/** Formats a date using the configured locale and date format. */
export function formatDate(
  date: Date | string | null | undefined,
  settings: PublicApplicationSettings,
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  if (settings.dateFormat === 'MM/DD/YYYY') {
    return new Intl.DateTimeFormat(settings.locale, {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      timeZone: settings.timezone,
    }).format(d);
  }
  if (settings.dateFormat === 'YYYY-MM-DD') {
    return new Intl.DateTimeFormat(settings.locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: settings.timezone,
    })
      .format(d)
      .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1');
  }
  // Default DD/MM/YYYY
  return new Intl.DateTimeFormat(settings.locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: settings.timezone,
  }).format(d);
}

/** Hook version of formatDate. */
export function useFormatDate(): (date: Date | string | null | undefined) => string {
  const { settings } = useApplicationSettings();
  return (date: Date | string | null | undefined) => {
    if (!settings) return date?.toString() ?? '—';
    return formatDate(date, settings);
  };
}

/** Formats a human-readable date (e.g. "4 August 2026"). */
export function formatDateLong(
  date: Date | string | null | undefined,
  settings: PublicApplicationSettings,
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(settings.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: settings.timezone,
  }).format(d);
}

/** Formats a human-readable date and time (e.g. "4 August 2026 at 3:20 PM"). */
export function formatDateTime(
  date: Date | string | null | undefined,
  settings: PublicApplicationSettings,
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const hour12 = settings.timeFormat === '12_HOUR';
  return new Intl.DateTimeFormat(settings.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12,
    timeZone: settings.timezone,
  }).format(d);
}

/** Formats time only (e.g. "3:20 PM" or "15:20"). */
export function formatTime(
  date: Date | string | null | undefined,
  settings: PublicApplicationSettings,
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const hour12 = settings.timeFormat === '12_HOUR';
  return new Intl.DateTimeFormat(settings.locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
    timeZone: settings.timezone,
  }).format(d);
}

/** Hook version of formatDateTime. */
export function useFormatDateTime(): (date: Date | string | null | undefined) => string {
  const { settings } = useApplicationSettings();
  return (date: Date | string | null | undefined) => {
    if (!settings) return date?.toString() ?? '—';
    return formatDateTime(date, settings);
  };
}

/** Hook version of formatDateLong. */
export function useFormatDateLong(): (date: Date | string | null | undefined) => string {
  const { settings } = useApplicationSettings();
  return (date: Date | string | null | undefined) => {
    if (!settings) return date?.toString() ?? '—';
    return formatDateLong(date, settings);
  };
}