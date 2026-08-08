import { useMemo, useState } from 'react';
import type { CreateUserInput, Person, Role, UpdateUserInput, User } from 'shared';
import { createUser, updateUser } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { FormError, FormField } from './FormControls';

interface UserFormProps {
  roles: Role[];
  people: Person[];
  /** When provided, the form edits this user; otherwise it creates a new one. */
  user?: User;
  onCancel: () => void;
  onSuccess: (user: User) => void;
}

interface FormState {
  username: string;
  email: string;
  roleId: string;
  personId: string;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

const PASSWORD_HELP =
  'At least 6 characters, including an uppercase letter, a number, and a special character.';

const inputClasses =
  'w-full rounded border border-lug-light-gray px-3 py-2 text-sm text-lug-charcoal focus:border-lug-red focus:ring-1 focus:ring-lug-red outline-none';

const initialState = (user?: User): FormState => ({
  username: user?.username ?? '',
  email: user?.email ?? '',
  roleId: user ? String(user.roleId) : '',
  personId: user?.personId ? String(user.personId) : '',
  temporaryPassword: '',
  confirmTemporaryPassword: '',
  isActive: user ? user.isActive : true,
  mustChangePassword: user ? user.mustChangePassword : true,
});

const passwordIssue = (password: string): string | null => {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.';
  return null;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Create/edit form for system users, covering role changes and person links. */
export function UserForm({ roles, people, user, onCancel, onSuccess }: UserFormProps) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState<FormState>(() => initialState(user));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Only active roles are selectable, but keep the current role available when editing.
  const roleOptions = useMemo(() => {
    const active = roles.filter((role) => role.isActive && !role.archivedAt);
    if (user && !active.some((role) => role.id === user.roleId)) {
      const current = roles.find((role) => role.id === user.roleId);
      if (current) return [current, ...active];
    }
    return active;
  }, [roles, user]);

  const activePeople = useMemo(() => {
    const list = people.filter((person) => person.isActive);
    if (user?.personId && !list.some((person) => person.id === user.personId)) {
      const current = people.find((person) => person.id === user.personId);
      if (current) return [current, ...list];
    }
    return list;
  }, [people, user]);

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!isEdit) {
      if (form.username.trim().length < 3) errors.username = 'Username must be at least 3 characters.';
      else if (!/^[a-zA-Z0-9._-]+$/.test(form.username.trim())) {
        errors.username = 'Use only letters, numbers, dot, underscore, or hyphen.';
      }
      const pwIssue = passwordIssue(form.temporaryPassword);
      if (pwIssue) errors.temporaryPassword = pwIssue;
      if (form.temporaryPassword !== form.confirmTemporaryPassword) {
        errors.confirmTemporaryPassword = 'Passwords do not match.';
      }
    }
    if (!form.roleId) errors.roleId = 'Please select a role.';
    if (form.email.trim() && !isValidEmail(form.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const email = form.email.trim() || null;
      const personId = form.personId === '' ? null : Number(form.personId);
      const roleId = Number(form.roleId);
      let saved: User;
      if (user) {
        const input: UpdateUserInput = { email, roleId, personId, mustChangePassword: form.mustChangePassword };
        saved = await updateUser(user.id, input);
      } else {
        const input: CreateUserInput = {
          username: form.username.trim(),
          email,
          roleId,
          personId,
          temporaryPassword: form.temporaryPassword,
          confirmTemporaryPassword: form.confirmTemporaryPassword,
          isActive: form.isActive,
        };
        saved = await createUser(input);
      }
      onSuccess(saved);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to save the user. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        {isEdit ? (
          <FormField label="Username" helpText="Usernames cannot be changed after creation.">
            <input value={form.username} readOnly disabled className={`${inputClasses} bg-gray-50 text-lug-gray`} />
          </FormField>
        ) : (
          <FormField label="Username" required error={fieldErrors.username}>
            <input
              value={form.username}
              onChange={(event) => setField('username', event.target.value)}
              autoComplete="off"
              className={inputClasses}
            />
          </FormField>
        )}

        <FormField label="Email" error={fieldErrors.email} helpText="Optional. Used for identification and login.">
          <input
            type="email"
            value={form.email}
            onChange={(event) => setField('email', event.target.value)}
            autoComplete="off"
            className={inputClasses}
          />
        </FormField>

        <FormField label="Role" required error={fieldErrors.roleId}>
          <select value={form.roleId} onChange={(event) => setField('roleId', event.target.value)} className={inputClasses}>
            <option value="">Select a role</option>
            {roleOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Linked person" helpText="Link this account to a staff record, or leave unlinked.">
          <select value={form.personId} onChange={(event) => setField('personId', event.target.value)} className={inputClasses}>
            <option value="">No linked person</option>
            {activePeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.staffId} — {person.firstName} {person.lastName}
              </option>
            ))}
          </select>
        </FormField>

        {!isEdit && (
          <>
            <FormField label="Temporary password" required error={fieldErrors.temporaryPassword} helpText={PASSWORD_HELP}>
              <input
                type="password"
                value={form.temporaryPassword}
                onChange={(event) => setField('temporaryPassword', event.target.value)}
                autoComplete="new-password"
                className={inputClasses}
              />
            </FormField>
            <FormField label="Confirm temporary password" required error={fieldErrors.confirmTemporaryPassword}>
              <input
                type="password"
                value={form.confirmTemporaryPassword}
                onChange={(event) => setField('confirmTemporaryPassword', event.target.value)}
                autoComplete="new-password"
                className={inputClasses}
              />
            </FormField>
          </>
        )}
      </div>

      {isEdit ? (
        <label className="flex items-center gap-2 text-sm text-lug-charcoal">
          <input
            type="checkbox"
            checked={form.mustChangePassword}
            onChange={(event) => setField('mustChangePassword', event.target.checked)}
          />
          Require a password change at next sign-in
        </label>
      ) : (
        <label className="flex items-center gap-2 text-sm text-lug-charcoal">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} />
          Active account
        </label>
      )}

      <div className="flex justify-end gap-2 border-t border-lug-light-gray pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy disabled:opacity-60"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
        </button>
      </div>
    </form>
  );
}
