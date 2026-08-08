import { useState } from 'react';
import type {
  AssignmentType, CreateAssignmentInput, Department, InventoryAsset as Asset,
  Location, Person,
} from 'shared';
import { createAssignment } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

interface AssignmentFormProps {
  assets: Asset[]; people: Person[]; departments: Department[]; locations: Location[];
  onCancel: () => void; onSuccess: () => void;
}

const today = new Date().toISOString().slice(0, 10);
const optionLabel = (target: Person | Department | Location) => 'firstName' in target
  ? `${target.firstName} ${target.lastName}` : `${target.code} — ${target.name}`;

/** Form for creating a validated asset assignment. */
export function AssignmentForm(props: AssignmentFormProps) {
  const [assetId, setAssetId] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('PERSON');
  const [targetId, setTargetId] = useState('');
  const [assignedDate, setAssignedDate] = useState(today);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const targets = assignmentType === 'PERSON' ? props.people
    : assignmentType === 'DEPARTMENT' ? props.departments : props.locations;
  const targetLabel = assignmentType === 'PERSON' ? 'Person'
    : assignmentType === 'DEPARTMENT' ? 'Department' : 'Location';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (!assetId || !targetId || !assignedDate) { setError('Asset, assignment target, and assigned date are required.'); return; }
    if (expectedReturnDate && expectedReturnDate < assignedDate) { setError('Expected return date cannot be before assigned date.'); return; }
    const target = Number(targetId);
    const input: CreateAssignmentInput = {
      assetId: Number(assetId), assignmentType, assignedDate,
      expectedReturnDate: expectedReturnDate || null, purpose: purpose.trim() || null,
      notes: notes.trim() || null,
      personId: assignmentType === 'PERSON' ? target : null,
      departmentId: assignmentType === 'DEPARTMENT' ? target : null,
      locationId: assignmentType === 'LOCATION' ? target : null,
    };
    setSubmitting(true);
    try { await createAssignment(input); props.onSuccess(); }
    catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to create the assignment. Please try again.'));
    } finally { setSubmitting(false); }
  };

  return <form onSubmit={(event) => void submit(event)} className="space-y-4">
    {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Asset *<select required value={assetId} onChange={(event) => setAssetId(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal"><option value="">Select an asset</option>{props.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetTag} — {asset.manufacturer} {asset.model}</option>)}</select></label>
      <label className="text-sm font-medium">Assignment type<select value={assignmentType} onChange={(event) => { setAssignmentType(event.target.value as AssignmentType); setTargetId(''); }} className="mt-1 w-full rounded border px-3 py-2 font-normal"><option value="PERSON">Person</option><option value="DEPARTMENT">Department</option><option value="LOCATION">Location</option></select></label>
      <label className="text-sm font-medium">{targetLabel} *<select required value={targetId} onChange={(event) => setTargetId(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal"><option value="">Select {targetLabel.toLowerCase()}</option>{targets.map((target) => <option key={target.id} value={target.id}>{optionLabel(target)}</option>)}</select></label>
      <label className="text-sm font-medium">Assigned date *<input type="date" required value={assignedDate} onChange={(event) => setAssignedDate(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium">Expected return date<input type="date" min={assignedDate} value={expectedReturnDate} onChange={(event) => setExpectedReturnDate(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label>
      <label className="text-sm font-medium">Purpose<input value={purpose} onChange={(event) => setPurpose(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label>
    </div>
    <label className="block text-sm font-medium">Notes<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label>
    <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={props.onCancel} disabled={submitting} className="rounded border px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={submitting} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{submitting ? 'Assigning…' : 'Create assignment'}</button></div>
  </form>;
}
