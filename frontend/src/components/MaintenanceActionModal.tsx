import { useState, type FormEvent } from 'react';
import type { MaintenanceRecord } from 'shared';
import {
  completeMaintenance,
  markMaintenanceBeyondRepair,
  markMaintenanceWaitingForParts,
  startMaintenance,
} from '../services/api';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import { apiErrorMessage } from '../utils/api-error';

type Action = 'start' | 'waiting' | 'complete' | 'beyond';
interface Props {
  record: MaintenanceRecord;
  action: Action;
  onClose: () => void;
  onSuccess: () => void;
}
const conditions = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const;

/** Captures the required data for a maintenance workflow transition. */
export function MaintenanceActionModal({ record, action, onClose, onSuccess }: Props) {
  const { settings } = useApplicationSettings();
  const currencyLabel = settings?.currencySymbol || 'GH₵';
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [work, setWork] = useState('');
  const [parts, setParts] = useState('');
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('0');
  const [downtime, setDowntime] = useState('0');
  const [condition, setCondition] = useState<(typeof conditions)[number]>('GOOD');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const title = {
    start: record.status === 'WAITING_FOR_PARTS' ? 'Resume maintenance' : 'Start maintenance',
    waiting: 'Waiting for parts',
    complete: 'Complete maintenance',
    beyond: 'Mark beyond repair',
  }[action];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (action === 'start')
        await startMaintenance(record.id, {
          startedDate: record.startedDate ?? date,
          diagnosis: notes || null,
        });
      if (action === 'waiting')
        await markMaintenanceWaitingForParts(record.id, {
          partsUsed: parts || null,
          notes: notes || null,
        });
      if (action === 'complete')
        await completeMaintenance(record.id, {
          completedDate: date,
          workPerformed: work,
          partsUsed: parts || null,
          maintenanceCost: Number(cost),
          downtimeHours: Number(downtime),
          conditionAfter: condition,
          resolution,
          notes: notes || null,
        });
      if (action === 'beyond')
        await markMaintenanceBeyondRepair(record.id, {
          conditionAfter: 'DAMAGED',
          resolution: resolution || 'Beyond economical repair',
          notes: notes || null,
        });
      onSuccess();
    } catch (submitError) {
      setError(apiErrorMessage(submitError, 'Unable to update maintenance. Please try again.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-xl space-y-4 rounded bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {(action === 'start' || action === 'complete') && (
          <label className="block text-sm">
            {action === 'start' ? 'Start date' : 'Completed date'}
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        {action === 'complete' && (
          <>
            <label className="block text-sm">
              Work performed
              <textarea
                required
                value={work}
                onChange={(event) => setWork(event.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Resolution
              <textarea
                required
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">
                Cost
                <div className="mt-1 flex items-center rounded border px-3">
                  <span className="text-sm text-lug-gray">{currencyLabel}</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={cost}
                    onChange={(event) => setCost(event.target.value)}
                    className="w-full border-0 py-2"
                  />
                </div>
              </label>
              <label className="text-sm">
                Downtime hours
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={downtime}
                  onChange={(event) => setDowntime(event.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Condition
                <select
                  value={condition}
                  onChange={(event) => setCondition(event.target.value as typeof condition)}
                  className="mt-1 w-full rounded border px-3 py-2"
                >
                  {conditions.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}
        {(action === 'waiting' || action === 'complete') && (
          <label className="block text-sm">
            Parts used / required
            <textarea
              value={parts}
              onChange={(event) => setParts(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        {action === 'beyond' && (
          <label className="block text-sm">
            Resolution
            <textarea
              required
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        <label className="block text-sm">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
            Cancel
          </button>
          <button disabled={saving} className="rounded bg-lug-red px-4 py-2 text-sm text-white">
            {saving ? 'Saving…' : title}
          </button>
        </div>
      </form>
    </div>
  );
}
