import { useCallback, useEffect, useState } from 'react';
import type { BackupRecord, BackupStatus } from 'shared';
import { useAuth } from '../context/AuthContext';
import { createBackup, deleteBackup, downloadBackup, fetchBackups, fetchBackupStorage, importBackup, saveBackupStorage, verifyBackup } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { ConfirmDialog } from './ConfirmDialog';
import { RestoreWizard } from './RestoreWizard';
import { Spinner } from './Spinner';

const RESTORABLE: BackupStatus[] = ['COMPLETED', 'VERIFIED'];

const statusBadge: Record<BackupStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  COMPLETED: 'border-blue-200 bg-blue-50 text-blue-700',
  VERIFIED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  FAILED: 'border-red-200 bg-red-50 text-red-700',
  CORRUPT: 'border-red-200 bg-red-50 text-red-700',
};

const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());

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

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB');
};

/** Self-contained Backup & Restore administration panel. */
export function BackupPanel() {
  const { permissions } = useAuth();
  const canView = permissions.includes('settings.backup.view');
  const canCreate = permissions.includes('settings.backup.create');
  const canDownload = permissions.includes('settings.backup.download');
  const canVerify = permissions.includes('settings.backup.verify');
  const canRestore = permissions.includes('settings.backup.restore');
  const canArchive = permissions.includes('settings.backup.archive');

  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [restartInfo, setRestartInfo] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<BackupRecord | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [storageDirectory, setStorageDirectory] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [records, storage] = await Promise.all([fetchBackups(), fetchBackupStorage()]);
      setBackups(records);
      setStorageDirectory(storage.directory);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to load backup history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) void load();
    else setLoading(false);
  }, [canView, load]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const busy = busyLabel !== null;
  const locked = restartInfo !== null; // once a restore is staged, block further changes until restart.

  const handleCreate = async () => {
    setBusyLabel('Creating backup…');
    setError(null);
    try {
      const backup = await createBackup();
      setBackups((current) => [backup, ...current]);
      setSuccess(`Backup ${backup.filename} was created.`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to create a backup.'));
    } finally {
      setBusyLabel(null);
    }
  };

  const handleVerify = async (backup: BackupRecord) => {
    setBusyLabel('Verifying backup…');
    setError(null);
    try {
      const result = await verifyBackup(backup.id);
      if (result.valid) setSuccess(`${backup.filename} passed integrity verification.`);
      else setError(`${backup.filename} failed integrity verification and should not be restored.`);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to verify the backup.'));
    } finally {
      setBusyLabel(null);
    }
  };

  const handleDownload = async (backup: BackupRecord) => {
    setBusyLabel('Preparing download…');
    setError(null);
    try {
      await downloadBackup(backup.id, backup.filename);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to download the backup.'));
    } finally {
      setBusyLabel(null);
    }
  };

  const handleSaveStorage = async () => {
    setBusyLabel('Checking backup directory…'); setError(null);
    try { const result=await saveBackupStorage(storageDirectory);setStorageDirectory(result.directory);setSuccess('Backup directory saved. New backups will be written there.'); }
    catch(requestError){setError(apiErrorMessage(requestError,'Unable to use that backup directory.'));}
    finally{setBusyLabel(null);}
  };

  const handleImport = async () => {
    if(!selectedFile)return;
    setBusyLabel('Uploading and validating backup…');setError(null);
    try{const backup=await importBackup(selectedFile);setBackups(current=>[backup,...current]);setSelectedFile(null);setSuccess(`${backup.filename} was validated and added to restore history.`);}
    catch(requestError){setError(apiErrorMessage(requestError,'The selected file could not be imported.'));}
    finally{setBusyLabel(null);}
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiveBusy(true);
    setError(null);
    try {
      await deleteBackup(archiveTarget.id);
      setBackups((current) => current.filter((item) => item.id !== archiveTarget.id));
      setSuccess(`${archiveTarget.filename} was archived.`);
      setArchiveTarget(null);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to archive the backup.'));
    } finally {
      setArchiveBusy(false);
    }
  };

  if (!canView) {
    return <p className="text-sm text-lug-gray">You do not have permission to view backups.</p>;
  }

  return (
    <div className="space-y-4">
      {restartInfo && (
        <div className="flex items-start gap-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-semibold">Restart required</p>
            <p className="mt-0.5">{restartInfo}</p>
            <p className="mt-1 text-xs text-amber-700">
              Backup actions are paused until the application is restarted to complete the restore.
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 rounded border border-lug-light-gray bg-gray-50 p-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-lug-charcoal">Backup destination</h3>
          <p className="mt-1 text-xs text-lug-gray">Absolute path on the server, mounted USB device, or mounted network share.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input value={storageDirectory} onChange={(event)=>setStorageDirectory(event.target.value)} className="min-w-0 flex-1 rounded border border-lug-light-gray px-3 py-2 text-sm" placeholder="D:\Inventory Backups" />
            {canCreate&&<button type="button" disabled={busy||!storageDirectory.trim()} onClick={()=>void handleSaveStorage()} className="rounded border border-lug-red px-4 py-2 text-sm font-medium text-lug-red disabled:opacity-50">Save directory</button>}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-lug-charcoal">Restore from a backup file</h3>
          <p className="mt-1 text-xs text-lug-gray">Select a downloaded or transferred .sqlite backup. It is validated before restore.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input type="file" accept=".sqlite,application/vnd.sqlite3,application/octet-stream" onChange={(event)=>setSelectedFile(event.target.files?.[0]??null)} className="min-w-0 flex-1 rounded border border-lug-light-gray bg-white px-3 py-2 text-sm" />
            {canRestore&&<button type="button" disabled={busy||!selectedFile||locked} onClick={()=>void handleImport()} className="rounded border border-lug-red px-4 py-2 text-sm font-medium text-lug-red disabled:opacity-50">Add to restore list</button>}
          </div>
          {selectedFile&&<p className="mt-2 text-xs text-lug-gray">Selected: {selectedFile.name} · {formatBytes(selectedFile.size)} · File date {new Date(selectedFile.lastModified).toLocaleString('en-GB')}</p>}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {canCreate && (
          <button
            type="button"
            disabled={busy || locked}
            onClick={() => void handleCreate()}
            className="inline-flex items-center gap-2 rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy disabled:opacity-50"
          >
            {busyLabel === 'Creating backup…' && <Spinner />}
            Create manual backup
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
        {busy && (
          <span className="inline-flex items-center gap-2 text-sm text-lug-gray" role="status" aria-live="polite">
            <Spinner className="h-4 w-4 text-lug-red" />
            {busyLabel}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-lug-light-gray">
        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading backup history…</div>
        ) : backups.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h3 className="text-base font-semibold text-lug-charcoal">No backups yet</h3>
            <p className="mt-2 text-sm text-lug-gray">
              Create a manual backup before performing a restore or database maintenance.
            </p>
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray">
              <tr>
                {['Filename', 'Type', 'Size', 'Created by', 'Status', 'Verified', 'Created', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-lug-light-gray">
              {backups.map((backup) => {
                const restorable = RESTORABLE.includes(backup.status);
                return (
                  <tr key={backup.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-lug-charcoal">{backup.filename}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{label(backup.backupType)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">
                      {backup.sizeBytes ? formatBytes(backup.sizeBytes) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{backup.createdByName ?? 'System'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded border px-2 py-1 text-xs ${statusBadge[backup.status]}`}>
                        {label(backup.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">
                      {backup.verifiedAt ? formatDate(backup.verifiedAt) : 'Not verified'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{formatDate(backup.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="inline-flex gap-3">
                        {canDownload && restorable && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDownload(backup)}
                            className="text-lug-red hover:underline disabled:opacity-50"
                          >
                            Download
                          </button>
                        )}
                        {canVerify && restorable && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleVerify(backup)}
                            className="text-lug-red hover:underline disabled:opacity-50"
                          >
                            Verify
                          </button>
                        )}
                        {canRestore && restorable && (
                          <button
                            type="button"
                            disabled={busy || locked}
                            onClick={() => setRestoreTarget(backup)}
                            className="text-lug-red hover:underline disabled:opacity-50"
                          >
                            Restore
                          </button>
                        )}
                        {canArchive && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setArchiveTarget(backup)}
                            className="text-lug-gray hover:text-red-700 disabled:opacity-50"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {restoreTarget && (
        <RestoreWizard
          backup={restoreTarget}
          formatBytes={formatBytes}
          formatDate={formatDate}
          onCancel={() => setRestoreTarget(null)}
          onRestored={(result) => {
            setRestoreTarget(null);
            setRestartInfo(result.message);
            setSuccess(null);
            void load();
          }}
        />
      )}

      {archiveTarget && (
        <ConfirmDialog
          title="Archive backup"
          message={`Archive ${archiveTarget.filename}? It will be removed from the backup history and can no longer be restored or downloaded.`}
          confirmLabel="Archive"
          tone="danger"
          busy={archiveBusy}
          onConfirm={() => void confirmArchive()}
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </div>
  );
}
