import { useState } from 'react';
import type { User } from 'shared';
import { resetUserPassword } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { FormError, FormField } from './FormControls';

interface ResetPasswordFormProps {
  user: User;
  onCancel: () => void;
  onSuccess: () => void;
}

const PASSWORD_HELP =
  'At least 6 characters, including an uppercase letter, a number, and a special character.';

const inputClasses =
  'w-full rounded border border-lug-light-gray px-3 py-2 text-sm text-lug-charcoal focus:border-lug-red focus:ring-1 focus:ring-lug-red outline-none';

const passwordIssue = (password: string): string | null => {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.';
  return null;
};

/** Sets a new temporary password for a user; they must change it at next sign-in. */
export function ResetPasswordForm({ user, onCancel, onSuccess }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const errors: { password?: string; confirm?: string } = {};
    const issue = passwordIssue(password);
    if (issue) errors.password = issue;
    if (password !== confirm) errors.confirm = 'Passwords do not match.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await resetUserPassword(user.id, { newTemporaryPassword: password, confirmTemporaryPassword: confirm });
      onSuccess();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to reset the password. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <p className="text-sm text-lug-gray">
        Set a new temporary password for <span className="font-medium text-lug-charcoal">{user.username}</span>. They
        will be required to change it at next sign-in, and all active sessions will end.
      </p>
      <FormError message={error} />
      <FormField label="New temporary password" required error={fieldErrors.password} helpText={PASSWORD_HELP}>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          className={inputClasses}
        />
      </FormField>
      <FormField label="Confirm temporary password" required error={fieldErrors.confirm}>
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          className={inputClasses}
        />
      </FormField>
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
          {submitting ? 'Saving…' : 'Reset password'}
        </button>
      </div>
    </form>
  );
}
