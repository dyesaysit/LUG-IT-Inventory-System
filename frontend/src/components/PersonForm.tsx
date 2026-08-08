import { useState } from 'react';
import type { CreatePersonInput, Department, EmploymentStatus, Person } from 'shared';
import { createPerson, updatePerson } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

interface PersonFormProps {
  departments: Department[];
  person?: Person;
  onCancel: () => void;
  onSuccess: (person: Person) => void;
}

interface FormState {
  staffId: string; firstName: string; lastName: string; email: string;
  phone: string; jobTitle: string; departmentId: string;
  employmentStatus: EmploymentStatus; notes: string; isActive: boolean;
}

const statuses: EmploymentStatus[] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'LEFT'];
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase());
const optional = (value: string): string | null => value.trim() || null;
const initialState = (person?: Person): FormState => ({
  staffId: person?.staffId ?? '', firstName: person?.firstName ?? '',
  lastName: person?.lastName ?? '', email: person?.email ?? '', phone: person?.phone ?? '',
  jobTitle: person?.jobTitle ?? '', departmentId: person?.departmentId?.toString() ?? '',
  employmentStatus: person?.employmentStatus ?? 'ACTIVE', notes: person?.notes ?? '',
  isActive: person?.isActive ?? true,
});

const toInput = (form: FormState): CreatePersonInput => ({
  staffId: form.staffId, firstName: form.firstName, lastName: form.lastName,
  email: optional(form.email), phone: optional(form.phone), jobTitle: optional(form.jobTitle),
  departmentId: form.departmentId === '' ? null : Number(form.departmentId),
  employmentStatus: form.employmentStatus, notes: optional(form.notes), isActive: form.isActive,
});

/** Accessible create/edit form for personnel records. */
export function PersonForm({ departments, person, onCancel, onSuccess }: PersonFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(person));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setField = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const input = toInput(form);
    if (!input.staffId.trim() || !input.firstName.trim() || !input.lastName.trim()) {
      setError('Staff ID, first name, and last name are required.'); return;
    }
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      setError('Enter a valid email address.'); return;
    }
    setSubmitting(true);
    try {
      const saved = person ? await updatePerson(person.id, input) : await createPerson(input);
      onSuccess(saved);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to save the person. Please try again.'));
    } finally { setSubmitting(false); }
  };

  const textFields = [
    ['staffId', 'Staff ID', true], ['firstName', 'First name', true],
    ['lastName', 'Last name', true], ['email', 'Email', false],
    ['phone', 'Phone', false], ['jobTitle', 'Job title', false],
  ] as const;

  return <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
    {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2">{textFields.map(([field, fieldLabel, required]) => <label key={field} className="text-sm font-medium text-lug-charcoal">{fieldLabel}{required && <span className="text-lug-red"> *</span>}<input type={field === 'email' ? 'email' : 'text'} required={required} value={form[field]} onChange={(event) => setField(field, event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal" /></label>)}</div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-lug-charcoal">Department<select value={form.departmentId} onChange={(event) => setField('departmentId', event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal"><option value="">No department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.code} — {department.name}</option>)}</select></label>
      <label className="text-sm font-medium text-lug-charcoal">Employment status<select value={form.employmentStatus} onChange={(event) => setField('employmentStatus', event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal">{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
    </div>
    <label className="block text-sm font-medium text-lug-charcoal">Notes<textarea rows={3} value={form.notes} onChange={(event) => setField('notes', event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal" /></label>
    <label className="flex items-center gap-2 text-sm text-lug-charcoal"><input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} />Active person</label>
    <div className="flex justify-end gap-3 border-t border-lug-light-gray pt-4"><button type="button" onClick={onCancel} disabled={submitting} className="rounded border border-lug-light-gray px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={submitting} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{submitting ? 'Saving…' : person ? 'Save changes' : 'Add person'}</button></div>
  </form>;
}
