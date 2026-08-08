import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { PublicApplicationSettings } from 'shared';
import axios from 'axios';

/** The value provided by ApplicationSettingsProvider. */
interface ApplicationSettingsContextValue {
  /** Current organization/public settings. `null` until loaded. */
  settings: PublicApplicationSettings | null;
  /** True while the initial fetch is in progress. */
  loading: boolean;
  /** Non-null if the settings fetch failed. */
  error: string | null;
  /** Refetch settings from the server. */
  refresh: () => Promise<void>;
}

const ApplicationSettingsContext = createContext<ApplicationSettingsContextValue>({
  settings: null,
  loading: true,
  error: null,
  refresh: () => Promise.resolve(),
});

/** Fetches public settings from the server. Does not require authentication. */
async function fetchPublicSettings(): Promise<PublicApplicationSettings> {
  const response = await axios.get<PublicApplicationSettings>('/api/public-settings');
  return response.data;
}

/**
 * ApplicationSettingsProvider fetches and provides white-label organization
 * settings (branding, locale, currency, etc.) to the entire frontend app.
 *
 * Must wrap the entire application tree — it works before authentication.
 */
export function ApplicationSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicApplicationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicSettings();
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[ApplicationSettings]', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<ApplicationSettingsContextValue>(
    () => ({ settings, loading, error, refresh }),
    [settings, loading, error, refresh],
  );

  return (
    <ApplicationSettingsContext.Provider value={value}>
      {children}
    </ApplicationSettingsContext.Provider>
  );
}

/**
 * Hook to access white-label organization settings anywhere in the frontend.
 * Throws if used outside an ApplicationSettingsProvider.
 */
export function useApplicationSettings(): ApplicationSettingsContextValue {
  const ctx = useContext(ApplicationSettingsContext);
  if (!ctx) {
    throw new Error(
      'useApplicationSettings must be used within ApplicationSettingsProvider',
    );
  }
  return ctx;
}