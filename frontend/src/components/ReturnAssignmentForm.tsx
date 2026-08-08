import { useState } from 'react';
import type { AssetAssignment, InventoryAsset as Asset, Location } from 'shared';
import { returnAssignment } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

interface ReturnFormProps {
  assignment: AssetAssignment; locations: Location[];
  onCancel: () => void; onSuccess: () => void;
}
const today = new Date().toISOString().slice(0, 10);

/** Records an asset return and optional asset updates. */
export function ReturnAssignmentForm({ assignment, locations, onCancel, onSuccess }: ReturnFormProps) {
  const [returnedDate, setReturnedDate] = useState(today);
  const [returnLocationId, setReturnLocationId] = useState('');
  const [condition, setCondition] = useState<Asset['condition']>('GOOD');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnedBy, setReturnedBy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (returnedDate < assignment.assignedDate) { setError('Return date cannot be before assigned date.'); return; }
    setSubmitting(true);
    try {
      await returnAssignment(assignment.id, {
        returnedDate, returnLocationId: returnLocationId ? Number(returnLocationId) : null,
        conditionOnReturn: condition, returnNotes: returnNotes.trim() || null,
        returnedBy: returnedBy.trim() || null,
      }); onSuccess();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to return the asset. Please try again.'));
    } finally { setSubmitting(false); }
  };
  return <form onSubmit={(event) => void submit(event)} className="space-y-4">
    {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Return date<span className="text-lug-red"> *</span><input type="date" min={assignment.assignedDate} required value={returnedDate} onChange={(event) => setReturnedDate(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Return location<select value={returnLocationId} onChange={(event) => setReturnLocationId(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal"><option value="">Keep current location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.code} — {location.name}</option>)}</select></label><label className="text-sm font-medium">Condition on return<select value={condition} onChange={(event) => setCondition(event.target.value as Asset['condition'])} className="mt-1 w-full rounded border px-3 py-2 font-normal">{['NEW','GOOD','FAIR','POOR','DAMAGED'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-medium">Returned by<input value={returnedBy} onChange={(event) => setReturnedBy(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label></div>
    <label className="block text-sm font-medium">Return notes<textarea rows={3} value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label>
    <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onCancel} disabled={submitting} className="rounded border px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={submitting} className="rounded bg-lug-red px-4 py-2 text-sm text-white disabled:opacity-60">{submitting ? 'Returning…' : 'Return asset'}</button></div>
  </form>;
}
