import { useState } from 'react';
import type { CreateDepartmentInput, Department } from 'shared';
import { createDepartment, updateDepartment } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

interface DepartmentFormProps {
  department?: Department;
  onCancel: () => void;
  onSuccess: (department: Department) => void;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  headOfDepartment: string;
  email: string;
  phone: string;
  isActive: boolean;
}

const initialState = (department?: Department): FormState => ({
  code: department?.code ?? '',
  name: department?.name ?? '',
  description: department?.description ?? '',
  headOfDepartment: department?.headOfDepartment ?? '',
  email: department?.email ?? '',
  phone: department?.phone ?? '',
  isActive: department?.isActive ?? true,
});

const optional = (value: string): string | null => value.trim() || null;

const toInput = (form: FormState): CreateDepartmentInput => ({
  code: form.code,
  name: form.name,
  description: optional(form.description),
  headOfDepartment: optional(form.headOfDepartment),
  email: optional(form.email),
  phone: optional(form.phone),
  isActive: form.isActive,
});

/** Accessible create/edit form shared by Department modals. */
export function DepartmentForm({ department, onCancel, onSuccess }: DepartmentFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(department));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const input = toInput(form);
    if (!input.code.trim() || !input.name.trim()) {
      setError('Department code and department name are required.');
      return;
    }
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const saved = department
        ? await updateDepartment(department.id, input)
        : await createDepartment(input);
      onSuccess(saved);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to save the department. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    ['code', 'Department code', true],
    ['name', 'Department name', true],
    ['headOfDepartment', 'Head of department', false],
    ['email', 'Email', false],
    ['phone', 'Phone', false],
  ] as const;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([field, label, required]) => (
          <label key={field} className="text-sm font-medium text-lug-charcoal">
            {label}{required && <span className="text-lug-red"> *</span>}
            <input
              type={field === 'email' ? 'email' : 'text'}
              required={required}
              maxLength={field === 'code' ? 20 : field === 'name' || field === 'headOfDepartment' ? 120 : undefined}
              value={form[field]}
              onChange={(event) => setField(field, event.target.value)}
              className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal"
            />
          </label>
        ))}
      </div>
      <label className="block text-sm font-medium text-lug-charcoal">
        Description
        <textarea value={form.description} maxLength={1000} rows={3} onChange={(event) => setField('description', event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 font-normal" />
      </label>
      <label className="flex items-center gap-2 text-sm text-lug-charcoal">
        <input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} />
        Active department
      </label>
      <div className="flex justify-end gap-3 border-t border-lug-light-gray pt-4">
        <button type="button" onClick={onCancel} disabled={submitting} className="rounded border border-lug-light-gray px-4 py-2 text-sm">Cancel</button>
        <button type="submit" disabled={submitting} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {submitting ? 'Saving…' : department ? 'Save changes' : 'Add department'}
        </button>
      </div>
    </form>
  );
}
