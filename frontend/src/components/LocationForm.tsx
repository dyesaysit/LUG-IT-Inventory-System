import { useState } from 'react';
import type { CreateLocationInput, Location } from 'shared';
import { createLocation, updateLocation } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

interface LocationFormProps {
  location?: Location;
  onCancel: () => void;
  onSuccess: (location: Location) => void;
}

interface FormState {
  code: string;
  name: string;
  building: string;
  floor: string;
  room: string;
  description: string;
  isActive: boolean;
}

const optional = (value: string): string | null => value.trim() || null;
const initialState = (location?: Location): FormState => ({
  code: location?.code ?? '', name: location?.name ?? '', building: location?.building ?? '',
  floor: location?.floor ?? '', room: location?.room ?? '',
  description: location?.description ?? '', isActive: location?.isActive ?? true,
});
const toInput = (form: FormState): CreateLocationInput => ({
  code: form.code, name: form.name, building: form.building,
  floor: optional(form.floor), room: optional(form.room),
  description: optional(form.description), isActive: form.isActive,
});

/** Accessible create/edit form for Locations. */
export function LocationForm({ location, onCancel, onSuccess }: LocationFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(location));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setField = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    const input = toInput(form);
    if (!input.code.trim() || !input.name.trim() || !input.building.trim()) {
      setError('Location code, location name, and building are required.'); return;
    }
    setSubmitting(true);
    try {
      const saved = location
        ? await updateLocation(location.id, input) : await createLocation(input);
      onSuccess(saved);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to save the location. Please try again.'));
    } finally { setSubmitting(false); }
  };

  const fields = [
    ['code', 'Location code', true], ['name', 'Location name', true],
    ['building', 'Building', true], ['floor', 'Floor', false], ['room', 'Room', false],
  ] as const;

  return <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
    {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">{fields.map(([field, label, required]) => <label key={field} className="text-sm font-medium text-lug-charcoal">{label}{required && <span className="text-lug-red"> *</span>}<input type="text" required={required} maxLength={field === 'code' ? 30 : 120} value={form[field]} onChange={(event) => setField(field, event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal" /></label>)}</div>
    <label className="block text-sm font-medium text-lug-charcoal">Description<textarea rows={3} maxLength={1000} value={form.description} onChange={(event) => setField('description', event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal" /></label>
    <label className="flex items-center gap-2 text-sm text-lug-charcoal"><input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} />Active location</label>
    <div className="flex justify-end gap-3 border-t border-lug-light-gray pt-4"><button type="button" onClick={onCancel} disabled={submitting} className="rounded border border-lug-light-gray px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={submitting} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{submitting ? 'Saving…' : location ? 'Save changes' : 'Add location'}</button></div>
  </form>;
}
