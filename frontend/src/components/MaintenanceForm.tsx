import { useState, type FormEvent } from 'react';
import type { CreateMaintenanceInput, InventoryAsset as Asset } from 'shared';
import { createMaintenanceRecord } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

const types = ['CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'UPGRADE', 'WARRANTY_SERVICE', 'OTHER'] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());

interface Props {
  assets: Asset[];
  initialAssetId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

/** Modal form for reporting maintenance against an inventory asset. */
export function MaintenanceForm({ assets, initialAssetId, onCancel, onSuccess }: Props) {
  const [assetId, setAssetId] = useState(String(initialAssetId ?? ''));
  const [maintenanceType, setMaintenanceType] = useState<CreateMaintenanceInput['maintenanceType']>('CORRECTIVE');
  const [priority, setPriority] = useState<CreateMaintenanceInput['priority']>('MEDIUM');
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledDate, setScheduledDate] = useState('');
  const [technician, setTechnician] = useState('');
  const [vendor, setVendor] = useState('');
  const [fault, setFault] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setSaving(true);
    try {
      await createMaintenanceRecord({
        assetId: Number(assetId), maintenanceType, priority, reportedDate,
        scheduledDate: scheduledDate || null, assignedTechnician: technician.trim() || null,
        vendor: vendor.trim() || null, faultDescription: fault.trim() || null,
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (submitError) {
      setError(apiErrorMessage(submitError, 'Unable to report maintenance. Please try again.'));
    } finally { setSaving(false); }
  };

  return <form onSubmit={(event) => void submit(event)} className="space-y-4">
    {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-lug-charcoal sm:col-span-2">Asset<span className="text-lug-red"> *</span><select required value={assetId} onChange={(event) => setAssetId(event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2"><option value="">Select an asset</option>{assets.filter((asset) => !['DISPOSED', 'RETIRED'].includes(asset.status)).map((asset) => <option key={asset.id} value={asset.id}>{asset.assetTag} — {asset.manufacturer} {asset.model}</option>)}</select></label>
      <label className="text-sm">Type<select value={maintenanceType} onChange={(event) => setMaintenanceType(event.target.value as CreateMaintenanceInput['maintenanceType'])} className="mt-1 w-full rounded border px-3 py-2">{types.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="text-sm">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as CreateMaintenanceInput['priority'])} className="mt-1 w-full rounded border px-3 py-2">{priorities.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <label className="text-sm">Reported date<span className="text-lug-red"> *</span><input required type="date" value={reportedDate} onChange={(event) => setReportedDate(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
      <label className="text-sm">Scheduled date<input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
      <label className="text-sm">Assigned technician<input value={technician} onChange={(event) => setTechnician(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
      <label className="text-sm">Vendor<input value={vendor} onChange={(event) => setVendor(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
      <label className="text-sm sm:col-span-2">Fault description{maintenanceType === 'CORRECTIVE' && <span className="text-lug-red"> *</span>}<textarea required={maintenanceType === 'CORRECTIVE'} value={fault} onChange={(event) => setFault(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
      <label className="text-sm sm:col-span-2">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label>
    </div>
    <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded bg-lug-red px-4 py-2 text-sm text-white disabled:opacity-60">{saving ? 'Saving…' : 'Report maintenance'}</button></div>
  </form>;
}
