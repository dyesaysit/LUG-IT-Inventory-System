import { useEffect } from 'react';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';

/**
 * Applies white-label branding from organization settings: sets the browser
 * document title (system name) and favicon. Renders nothing.
 */
export function Branding() {
  const { settings } = useApplicationSettings();
  const systemName = settings?.systemName;
  const iconUrl = settings?.faviconUrl || settings?.logoUrl || null;

  useEffect(() => {
    if (systemName) document.title = systemName;
  }, [systemName]);

  useEffect(() => {
    if (!iconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = iconUrl;
  }, [iconUrl]);

  return null;
}
