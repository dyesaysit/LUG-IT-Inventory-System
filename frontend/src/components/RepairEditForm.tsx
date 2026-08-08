import { useState, type FormEvent } from 'react';
import type { RepairJob } from 'shared';
import { updateRepair } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

interface Props {
  record: RepairJob;
  onCancel: () => void;
  onSuccess: () => void;
}

const inputClasses = 'mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal';
const labelClasses = 'block text-sm font-medium text-lug-charcoal';

/** Edits mutable repair details without changing lifecycle status. */
export function RepairEditForm({ record, onCancel, onSuccess }: Props) {
  const [vendor, setVendor] = useState(record.vendorName ?? '');
  const [technician, setTechnician] = useState(record.assignedTechnician ?? '');
  const [fault, setFault] = useState(record.faultDescription);
  const [notes, setNotes] = useState(record.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateRepair(record.id, {
        vendorName: vendor.trim() || null,
        assignedTechnician: technician.trim() || null,
        faultDescription: fault,
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to update the repair. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <label className={labelClasses}>
        Vendor name
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputClasses} />
      </label>
      <label className={labelClasses}>
        Assigned technician
        <input value={technician} onChange={(e) => setTechnician(e.target.value)} className={inputClasses} />
      </label>
      <label className={labelClasses}>
        Fault description<span className="text-lug-red"> *</span>
        <textarea required rows={3} value={fault} onChange={(e) => setFault(e.target.value)} className={inputClasses} />
      </label>
      <label className={labelClasses}>
        Notes
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClasses} />
      </label>
      <div className="flex justify-end gap-3 border-t border-lug-light-gray pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded border border-lug-light-gray px-4 py-2 text-sm">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
