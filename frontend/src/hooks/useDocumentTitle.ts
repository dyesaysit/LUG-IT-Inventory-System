import { useEffect } from 'react';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';

/**
 * Updates the browser document title using the configured system name.
 * Pass an optional page-specific prefix (e.g. "Assets").
 */
export function useDocumentTitle(page?: string): void {
  const { settings } = useApplicationSettings();
  const systemName = settings?.systemName || 'IT Inventory System';

  useEffect(() => {
    document.title = page ? `${page} | ${systemName}` : systemName;
  }, [page, systemName]);
}