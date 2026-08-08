import { useApplicationSettings } from '../context/ApplicationSettingsContext';

/**
 * Application footer with white-label organization name and system name.
 */
export function Footer() {
  const { settings } = useApplicationSettings();
  const orgName = settings?.organizationName || 'IT Inventory';
  const sysName = settings?.systemName || 'IT Inventory System';

  return (
    <footer className="border-t border-lug-light-gray bg-white py-2.5 px-6 sm:px-8 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-0.5 text-[11px] text-lug-gray max-w-6xl">
        <p>{orgName}</p>
        <p>{sysName}</p>
      </div>
    </footer>
  );
}
