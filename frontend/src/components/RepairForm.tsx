import { useState, type FormEvent } from 'react';
import type { CreateRepairInput, InventoryAsset as Asset, MaintenanceRecord } from 'shared';
import { createRepair } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

const types = ['INTERNAL', 'EXTERNAL', 'WARRANTY', 'EMERGENCY', 'OTHER'] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());

const inputClasses = 'mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal';
const labelClasses = 'text-sm font-medium text-lug-charcoal';
const required = <span className="text-lug-red"> *</span>;

interface Props {
  assets: Asset[];
  maintenance: MaintenanceRecord[];
  initialAssetId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

/** Creates a formal repair job while preserving entered data on errors. */
export function RepairForm({ assets, maintenance, initialAssetId, onCancel, onSuccess }: Props) {
  const [assetId, setAssetId] = useState(String(initialAssetId ?? ''));
  const [maintenanceId, setMaintenanceId] = useState('');
  const [repairType, setRepairType] = useState<CreateRepairInput['repairType']>('INTERNAL');
  const [priority, setPriority] = useState<CreateRepairInput['priority']>('MEDIUM');
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState('');
  const [contact, setContact] = useState('');
  const [fault, setFault] = useState('');
  const [technician, setTechnician] = useState('');
  const [warranty, setWarranty] = useState(false);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vendorRequired = ['EXTERNAL', 'WARRANTY'].includes(repairType);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createRepair({
        assetId: Number(assetId),
        maintenanceRecordId: maintenanceId ? Number(maintenanceId) : null,
        repairType,
        priority,
        reportedDate,
        vendorName: vendor.trim() || null,
        vendorContact: contact.trim() || null,
        faultDescription: fault,
        assignedTechnician: technician.trim() || null,
        warrantyClaim: warranty,
        warrantyReference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to create the repair job. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${labelClasses} sm:col-span-2`}>
          Asset{required}
          <select required value={assetId} onChange={(e) => setAssetId(e.target.value)} className={inputClasses}>
            <option value="">Select an eligible asset</option>
            {assets
              .filter((a) => !['DISPOSED', 'RETIRED'].includes(a.status))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} — {a.manufacturer} {a.model}
                </option>
              ))}
          </select>
        </label>
        <label className={`${labelClasses} sm:col-span-2`}>
          Related maintenance record
          <select value={maintenanceId} onChange={(e) => setMaintenanceId(e.target.value)} className={inputClasses}>
            <option value="">None</option>
            {maintenance
              .filter((m) => !assetId || m.assetId === Number(assetId))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.maintenanceNumber} — {m.faultDescription}
                </option>
              ))}
          </select>
        </label>
        <label className={labelClasses}>
          Repair type
          <select value={repairType} onChange={(e) => setRepairType(e.target.value as typeof repairType)} className={inputClasses}>
            {types.map((v) => (
              <option key={v} value={v}>
                {label(v)}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClasses}>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={inputClasses}>
            {priorities.map((v) => (
              <option key={v} value={v}>
                {label(v)}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClasses}>
          Reported date{required}
          <input required type="date" value={reportedDate} onChange={(e) => setReportedDate(e.target.value)} className={inputClasses} />
        </label>
        <label className={labelClasses}>
          Assigned technician
          <input value={technician} onChange={(e) => setTechnician(e.target.value)} className={inputClasses} />
        </label>
        <label className={labelClasses}>
          Vendor name{vendorRequired && required}
          <input required={vendorRequired} value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputClasses} />
        </label>
        <label className={labelClasses}>
          Vendor contact
          <input value={contact} onChange={(e) => setContact(e.target.value)} className={inputClasses} />
        </label>
        <label className={`${labelClasses} sm:col-span-2`}>
          Fault description{required}
          <textarea required rows={3} value={fault} onChange={(e) => setFault(e.target.value)} className={inputClasses} />
        </label>
        <label className="flex items-center gap-2 text-sm text-lug-charcoal">
          <input type="checkbox" checked={warranty} onChange={(e) => setWarranty(e.target.checked)} /> Warranty claim
        </label>
        <label className={labelClasses}>
          Warranty reference
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClasses} />
        </label>
        <label className={`${labelClasses} sm:col-span-2`}>
          Notes
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClasses} />
        </label>
      </div>
      <div className="flex justify-end gap-3 border-t border-lug-light-gray pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded border border-lug-light-gray px-4 py-2 text-sm">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Create repair job'}
        </button>
      </div>
    </form>
  );
}
