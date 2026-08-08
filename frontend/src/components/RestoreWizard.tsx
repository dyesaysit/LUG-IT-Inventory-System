import { useEffect, useState } from 'react';
import type { BackupRecord, RestoreBackupResult } from 'shared';
import { restoreBackup } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { Spinner } from './Spinner';

interface RestoreWizardProps {
  backup: BackupRecord;
  formatBytes: (bytes: number) => string;
  formatDate: (value: string | null) => string;
  onCancel: () => void;
  onRestored: (result: RestoreBackupResult) => void;
}

const CONFIRM_WORD = 'RESTORE';

/**
 * Two-step confirmation wizard for restoring the database from a backup.
 * Step 1 explains the consequences; step 2 requires typing RESTORE. A progress
 * indicator is shown while the restore is staged.
 */
export function RestoreWizard({ backup, formatBytes, formatDate, onCancel, onRestored }: RestoreWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !restoring) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [restoring, onCancel]);

  const submit = async () => {
    if (confirmText !== CONFIRM_WORD) return;
    setRestoring(true);
    setError(null);
    try {
      const result = await restoreBackup(backup.id, { confirmation: CONFIRM_WORD });
      onRestored(result);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to restore the backup. Please try again.'));
      setRestoring(false);
    }
  };

  const notVerified = backup.status !== 'VERIFIED';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-wizard-title"
      onClick={() => !restoring && onCancel()}
    >
      <div
        className="w-full max-w-lg rounded border border-lug-light-gray bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="restore-wizard-title" className="text-lg font-semibold text-lug-charcoal">
            Restore database
          </h2>
          {!restoring && <span className="text-xs text-lug-gray">Step {step} of 2</span>}
        </div>

        {restoring ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Spinner className="h-8 w-8 text-lug-red" />
            <p className="text-sm font-medium text-lug-charcoal">Restoring database…</p>
            <p className="text-xs text-lug-gray">Please keep this window open until the restore is staged.</p>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <dl className="rounded border border-lug-light-gray bg-gray-50 p-3 text-sm">
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-lug-gray">Backup</dt>
                <dd className="truncate font-medium text-lug-charcoal" title={backup.filename}>
                  {backup.filename}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-lug-gray">Created</dt>
                <dd className="text-lug-charcoal">{formatDate(backup.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-lug-gray">Size</dt>
                <dd className="text-lug-charcoal">{backup.sizeBytes ? formatBytes(backup.sizeBytes) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 py-0.5">
                <dt className="text-lug-gray">Verified</dt>
                <dd className="text-lug-charcoal">{backup.verifiedAt ? formatDate(backup.verifiedAt) : 'Not verified'}</dd>
              </div>
            </dl>

            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">This action cannot be undone.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                <li>The entire current database will be replaced with this backup.</li>
                <li>Any changes made since this backup was taken will be lost.</li>
                <li>All users will be signed out.</li>
                <li>The application must be restarted to complete the restore.</li>
              </ul>
            </div>

            {notVerified && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                This backup has not been verified. Consider verifying it, and creating a fresh backup of the current
                data, before you continue.
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-lug-light-gray pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-lug-gray">
              To confirm you want to overwrite the current database with{' '}
              <span className="font-medium text-lug-charcoal">{backup.filename}</span>, type{' '}
              <span className="font-mono font-semibold text-lug-charcoal">{CONFIRM_WORD}</span> below.
            </p>
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <input
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={`Type ${CONFIRM_WORD}`}
              aria-label={`Type ${CONFIRM_WORD} to confirm`}
              autoFocus
              className="w-full rounded border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            />
            <div className="flex justify-between gap-2 border-t border-lug-light-gray pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={confirmText !== CONFIRM_WORD}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Restore database
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
