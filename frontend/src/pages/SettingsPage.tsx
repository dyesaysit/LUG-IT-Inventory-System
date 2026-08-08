import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AssetCategory,
  DatabaseMaintenanceResult,
  DatabaseStatus,
  SettingsByCategory,
  SystemInformation,
  SystemSetting,
} from 'shared';
import { useAuth } from '../context/AuthContext';
import {
  activateAssetCategory,
  createAssetCategory,
  deactivateAssetCategory,
  fetchAssetCategories,
  fetchDatabaseStatus,
  fetchSettings,
  fetchSystemInformation,
  runCheckpoint,
  runIntegrityCheck,
  runOptimize,
  updateSetting,
} from '../services/api';
import { BackupPanel } from '../components/BackupPanel';
import { LogoManager } from '../components/LogoManager';

const errorMessage = (error: unknown, fallback: string): string =>
  axios.isAxiosError<{ error?: string }>(error) ? error.response?.data.error ?? error.message : fallback;

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB');
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

const formatUptime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

type TabId =
  | 'organization'
  | 'inventory'
  | 'assignments'
  | 'maintenance'
  | 'reports'
  | 'security'
  | 'categories'
  | 'backup'
  | 'database'
  | 'system';

interface TabDef {
  id: TabId;
  label: string;
  requiredPermission?: string;
}

/**
 * Human-readable labels for setting keys. Falls back to the raw key when no label is defined.
 */
const SETTING_LABELS: Record<string, string> = {
  organization_name: 'Organization name',
  organization_short_name: 'Organization abbreviation',
  system_name: 'Application name',
  department_name: 'Owning department',
  country_code: 'Country code',
  country_name: 'Country',
  timezone: 'Timezone',
  locale: 'Locale',
  date_format: 'Date format',
  time_format: 'Time format',
  currency_code: 'Currency code',
  currency_symbol: 'Currency symbol',
  currency_name: 'Currency name',
  asset_tag_prefix: 'Asset tag prefix',
  support_email: 'Support email',
  support_phone: 'Support phone',
  address: 'Address',
  website: 'Website',
  report_footer_text: 'Report footer',
  confidentiality_text: 'Confidentiality notice',
  logo_display_size: 'Logo display size',
};

const tabs: TabDef[] = [
  { id: 'organization', label: 'Organization' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'maintenance', label: 'Maintenance & repairs' },
  { id: 'reports', label: 'Reports', requiredPermission: 'settings.reports' },
  { id: 'security', label: 'Security', requiredPermission: 'settings.security' },
  { id: 'categories', label: 'Asset categories', requiredPermission: 'settings.categories' },
  { id: 'backup', label: 'Backup & restore', requiredPermission: 'settings.backup.view' },
  { id: 'database', label: 'Database maintenance', requiredPermission: 'settings.database' },
  { id: 'system', label: 'System information' },
];

/** Renders a single editable setting row with an inline save action. */
function SettingRow({
  setting,
  disabled,
  onSave,
}: {
  setting: SystemSetting;
  disabled: boolean;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const isFixed = !setting.isEditable;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(setting.key, value);
    } finally {
      setSaving(false);
    }
  };

  const displayLabel = SETTING_LABELS[setting.key] ?? setting.key;

  return (
    <div className="grid gap-2 border-b border-lug-light-gray py-3 last:border-b-0 sm:grid-cols-3 sm:items-center">
      <div>
        <p className="text-sm font-medium text-lug-charcoal">{displayLabel}</p>
        {setting.description && <p className="text-xs text-lug-gray">{setting.description}</p>}
      </div>
      {setting.valueType === 'BOOLEAN' ? (
        <select
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled || isFixed}
          className="rounded border border-lug-light-gray px-3 py-2 text-sm disabled:bg-gray-50"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled || isFixed}
          className="rounded border border-lug-light-gray px-3 py-2 text-sm disabled:bg-gray-50"
        />
      )}
      <div>
        {isFixed ? (
          <span className="text-xs text-lug-gray">Fixed — cannot be changed</span>
        ) : (
          <button
            type="button"
            disabled={disabled || saving || value === setting.value}
            onClick={() => void handleSave()}
            className="rounded bg-lug-red px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Full Settings and System Administration page. */
export default function SettingsPage() {
  const { permissions } = useAuth();
  const availableTabs = useMemo(
    () => tabs.filter((tab) => !tab.requiredPermission || permissions.includes(tab.requiredPermission)),
    [permissions],
  );
  const [activeTab, setActiveTab] = useState<TabId>(availableTabs[0]?.id ?? 'organization');
  const [settings, setSettings] = useState<SettingsByCategory>({});
  const [readOnly, setReadOnly] = useState(true);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInformation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const canManageCategories = permissions.includes('settings.categories');
  const canMaintainDb = permissions.includes('settings.database');
  const canEditCategory = (category: string): boolean => {
    if (readOnly) return false;
    if (category === 'SECURITY') return permissions.includes('settings.security');
    if (category === 'REPORTS') return permissions.includes('settings.reports');
    return permissions.includes('settings.manage');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const requests: Promise<void>[] = [
        fetchSettings().then((response) => {
          setSettings(response.settings);
          setReadOnly(response.readOnly);
        }),
        fetchAssetCategories().then(setCategories),
        fetchSystemInformation().then(setSystemInfo),
      ];
      if (canMaintainDb) requests.push(fetchDatabaseStatus().then(setDatabaseStatus));
      await Promise.all(requests);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load settings.'));
    } finally {
      setLoading(false);
    }
  }, [canMaintainDb]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSettingSave = async (category: string, key: string, value: string) => {
    setError(null);
    try {
      const updated = await updateSetting(category, key, { value });
      setSettings((current) => ({
        ...current,
        [category]: (current[category] ?? []).map((item) => (item.key === key ? updated : item)),
      }));
      setSuccess(`${key} was updated.`);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to update the setting.'));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const category = await createAssetCategory({ name: newCategoryName.trim() });
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
      setSuccess(`${category.name} category was created.`);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to create the category.'));
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCategory = async (category: AssetCategory) => {
    setBusy(true);
    setError(null);
    try {
      if (category.isActive) {
        await deactivateAssetCategory(category.id);
      } else {
        await activateAssetCategory(category.id);
      }
      const refreshed = await fetchAssetCategories();
      setCategories(refreshed);
      setSuccess(`${category.name} was ${category.isActive ? 'deactivated' : 'activated'}.`);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to update the category.'));
    } finally {
      setBusy(false);
    }
  };

  const handleMaintenance = async (operation: () => Promise<DatabaseMaintenanceResult>, label: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      setSuccess(`${label}: ${result.message}`);
      setDatabaseStatus(await fetchDatabaseStatus());
    } catch (requestError) {
      setError(errorMessage(requestError, `Unable to run ${label.toLowerCase()}.`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-lug-charcoal">Settings</h1>
        <p className="mt-1 text-sm text-lug-gray">Configure system preferences and administration</p>
      </header>

      {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-1 border-b border-lug-light-gray">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t px-3 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-lug-red text-lug-red'
                : 'text-lug-gray hover:text-lug-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading settings…</div>
      ) : (
        <div className="rounded border border-lug-light-gray bg-white p-4">
          {activeTab === 'organization' && (
            <div className="space-y-6">
              <LogoManager
                disabled={!canEditCategory('ORGANIZATION')}
                onSuccess={(msg) => setSuccess(msg)}
                onError={(msg) => setError(msg)}
              />
              
              <div className="border-t border-lug-light-gray pt-4">
                <h3 className="text-sm font-semibold text-lug-charcoal mb-4">Regional & Organization Details</h3>
                {(settings.ORGANIZATION ?? [])
                  .filter((setting) => setting.key !== 'logo_path' && setting.key !== 'logo_display_size')
                  .map((setting) => (
                    <SettingRow key={setting.key} setting={setting} disabled={!canEditCategory('ORGANIZATION')} onSave={(key, value) => handleSettingSave('ORGANIZATION', key, value)} />
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div>
              {(settings.INVENTORY ?? []).map((setting) => (
                <SettingRow key={setting.key} setting={setting} disabled={!canEditCategory('INVENTORY')} onSave={(key, value) => handleSettingSave('INVENTORY', key, value)} />
              ))}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div>
              {(settings.ASSIGNMENTS ?? []).map((setting) => (
                <SettingRow key={setting.key} setting={setting} disabled={!canEditCategory('ASSIGNMENTS')} onSave={(key, value) => handleSettingSave('ASSIGNMENTS', key, value)} />
              ))}
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div>
              {(settings.MAINTENANCE ?? []).map((setting) => (
                <SettingRow key={setting.key} setting={setting} disabled={!canEditCategory('MAINTENANCE')} onSave={(key, value) => handleSettingSave('MAINTENANCE', key, value)} />
              ))}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              {(settings.REPORTS ?? []).map((setting) => (
                <SettingRow key={setting.key} setting={setting} disabled={!canEditCategory('REPORTS')} onSave={(key, value) => handleSettingSave('REPORTS', key, value)} />
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              {(settings.SECURITY ?? []).map((setting) => (
                <SettingRow key={setting.key} setting={setting} disabled={!canEditCategory('SECURITY')} onSave={(key, value) => handleSettingSave('SECURITY', key, value)} />
              ))}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              {canManageCategories && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="New category name"
                    className="flex-1 rounded border border-lug-light-gray px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy || !newCategoryName.trim()}
                    onClick={() => void handleCreateCategory()}
                    className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Add category
                  </button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      {canManageCategories && <th className="px-4 py-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lug-light-gray">
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className="px-4 py-3 font-medium text-lug-charcoal">{category.name}</td>
                        <td className="px-4 py-3">
                          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs">
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {canManageCategories && (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleToggleCategory(category)}
                              className="text-lug-red hover:underline disabled:opacity-50"
                            >
                              {category.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'backup' && <BackupPanel />}

          {activeTab === 'database' && databaseStatus && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded border border-lug-light-gray px-4 py-3">
                  <p className="text-xs text-lug-gray">Database size</p>
                  <p className="mt-1 text-lg font-semibold text-lug-charcoal">{formatBytes(databaseStatus.sizeBytes)}</p>
                </div>
                <div className="rounded border border-lug-light-gray px-4 py-3">
                  <p className="text-xs text-lug-gray">Page count</p>
                  <p className="mt-1 text-lg font-semibold text-lug-charcoal">{databaseStatus.pageCount}</p>
                </div>
                <div className="rounded border border-lug-light-gray px-4 py-3">
                  <p className="text-xs text-lug-gray">Journal mode</p>
                  <p className="mt-1 text-lg font-semibold text-lug-charcoal">{databaseStatus.journalMode}</p>
                </div>
                <div className="rounded border border-lug-light-gray px-4 py-3">
                  <p className="text-xs text-lug-gray">Freelist pages</p>
                  <p className="mt-1 text-lg font-semibold text-lug-charcoal">{databaseStatus.freelistCount}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void handleMaintenance(runIntegrityCheck, 'Integrity check')} className="rounded border border-lug-light-gray px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
                  Run integrity check
                </button>
                <button type="button" disabled={busy} onClick={() => void handleMaintenance(runOptimize, 'Optimize')} className="rounded border border-lug-light-gray px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
                  Optimize database
                </button>
                <button type="button" disabled={busy} onClick={() => void handleMaintenance(runCheckpoint, 'Checkpoint')} className="rounded border border-lug-light-gray px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
                  Run checkpoint
                </button>
              </div>
            </div>
          )}

          {activeTab === 'system' && systemInfo && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Application', `${systemInfo.appName} v${systemInfo.appVersion}`],
                ['Environment', systemInfo.environment],
                ['Node.js version', systemInfo.nodeVersion],
                ['SQLite version', systemInfo.sqliteVersion],
                ['Database size', formatBytes(systemInfo.databaseSizeBytes)],
                ['Last migration', systemInfo.lastMigration ?? '—'],
                ['Server uptime', formatUptime(systemInfo.uptimeSeconds)],
                ['Total users', String(systemInfo.totalUsers)],
                ['Active sessions', String(systemInfo.activeSessions)],
                ['Last backup', formatDate(systemInfo.lastBackupAt)],
                ['Current timezone', systemInfo.currentTimezone],
['Current currency', systemInfo.currentCurrency],
                ['Server time', formatDate(systemInfo.serverTime)],
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-lug-light-gray px-4 py-3">
                  <p className="text-xs text-lug-gray">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-lug-charcoal">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
