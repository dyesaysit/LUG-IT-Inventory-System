import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Person, Role, User } from 'shared';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { UserForm } from '../components/UserForm';
import {
  deactivateUser,
  fetchPeople,
  fetchRoles,
  fetchUsers,
  reactivateUser,
  revokeUserSessions,
  unlockUser,
} from '../services/api';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../utils/api-error';
import { useFormatDate, useFormatDateTime } from '../utils/formatting';

const PAGE_SIZE = 10;

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'danger' | 'default';
  action: () => Promise<void>;
}

const isLocked = (user: User): boolean =>
  Boolean(user.lockedUntil) && new Date(user.lockedUntil as string).getTime() > Date.now();

/** Complete system user administration page. */
export default function UsersPage() {
  const formatDate = useFormatDate();
  const formatDateTime = useFormatDateTime();
  const { settings } = useApplicationSettings();
  const { hasPermission, hasAnyPermission } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [lockedOnly, setLockedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, roleData] = await Promise.all([
        fetchUsers({ pageSize: 100, sortBy: 'username' }),
        fetchRoles(),
      ]);
      setUsers(userData);
      setRoles(roleData);
      // Linking to a person is optional; do not fail the whole page if it is unavailable.
      try {
        setPeople(await fetchPeople({ pageSize: 100, sortBy: 'lastName' }));
      } catch {
        setPeople([]);
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!adding && !editing && !resetting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAdding(false);
        setEditing(null);
        setResetting(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [adding, editing, resetting]);

  const roleNames = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const searchable = [user.username, user.email ?? '', user.personName ?? '', user.roleName].join(' ').toLowerCase();
      return (
        (term === '' || searchable.includes(term)) &&
        (roleId === '' || user.roleId === Number(roleId)) &&
        (activeStatus === '' || user.isActive === (activeStatus === 'active')) &&
        (!lockedOnly || isLocked(user))
      );
    });
  }, [activeStatus, lockedOnly, roleId, search, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const clearFilters = () => {
    setSearch('');
    setRoleId('');
    setActiveStatus('');
    setLockedOnly(false);
    setPage(1);
  };

  const summary = [
    ['Total users', users.length],
    ['Active', users.filter((user) => user.isActive).length],
    ['Locked', users.filter((user) => isLocked(user)).length],
    ['Administrators', users.filter((user) => user.roleCode === 'SYSTEM_ADMINISTRATOR' && user.isActive).length],
  ] as const;

  const handleSaved = async (saved: User) => {
    setAdding(false);
    setEditing(null);
    setSuccess(`${saved.username} was saved successfully.`);
    await load();
  };

  const handleResetSuccess = async () => {
    const target = resetting;
    setResetting(null);
    setSuccess(target ? `Temporary password set for ${target.username}.` : 'Temporary password set.');
    await load();
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    setError(null);
    try {
      await confirm.action();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'The action could not be completed. Please try again.'));
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  const askToggleActive = (user: User) => {
    const deactivating = user.isActive;
    setConfirm({
      title: deactivating ? 'Deactivate user' : 'Reactivate user',
      message: deactivating
        ? `Deactivate ${user.username}? They will lose access and all active sessions will end.`
        : `Reactivate ${user.username}? They will be able to sign in again.`,
      confirmLabel: deactivating ? 'Deactivate' : 'Reactivate',
      tone: deactivating ? 'danger' : 'default',
      action: async () => {
        if (deactivating) await deactivateUser(user.id);
        else await reactivateUser(user.id);
        await load();
        setSuccess(`${user.username} was ${deactivating ? 'deactivated' : 'reactivated'}.`);
      },
    });
  };

  const askUnlock = (user: User) => {
    setConfirm({
      title: 'Unlock account',
      message: `Unlock ${user.username}? This clears the lockout and resets failed sign-in attempts.`,
      confirmLabel: 'Unlock',
      tone: 'default',
      action: async () => {
        await unlockUser(user.id);
        await load();
        setSuccess(`${user.username} was unlocked.`);
      },
    });
  };

  const askRevokeSessions = (user: User) => {
    setConfirm({
      title: 'Revoke sessions',
      message: `Sign ${user.username} out of all active sessions on every device?`,
      confirmLabel: 'Revoke sessions',
      tone: 'danger',
      action: async () => {
        await revokeUserSessions(user.id);
        setSuccess(`Signed ${user.username} out of all sessions.`);
      },
    });
  };

  const filterSelectClasses = 'rounded border border-lug-light-gray px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-lug-charcoal">User management</h1>
          <p className="mt-1 text-sm text-lug-gray">Manage access to {settings?.systemName ?? 'the system'}</p>
        </div>
        {hasPermission('users.create') && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy"
          >
            Add user
          </button>
        )}
      </header>

      {success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="User summary">
        {summary.map(([title, value]) => (
          <div key={title} className="rounded border border-lug-light-gray bg-white px-4 py-3">
            <p className="text-xs text-lug-gray">{title}</p>
            <p className="mt-1 text-xl font-semibold text-lug-charcoal">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded border border-lug-light-gray bg-white p-4" aria-label="User filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search users"
            aria-label="Search users"
            className={filterSelectClasses}
          />
          <select
            value={roleId}
            onChange={(event) => {
              setRoleId(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
            className={filterSelectClasses}
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            value={activeStatus}
            onChange={(event) => {
              setActiveStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className={filterSelectClasses}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <label className="flex items-center gap-2 rounded border border-lug-light-gray px-3 py-2 text-sm text-lug-charcoal">
            <input
              type="checkbox"
              checked={lockedOnly}
              onChange={(event) => {
                setLockedOnly(event.target.checked);
                setPage(1);
              }}
            />
            Locked only
          </label>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded border border-lug-light-gray px-3 py-2 text-sm text-lug-charcoal hover:bg-gray-50"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-lug-light-gray bg-white" aria-label="User list">
        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading users…</div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-lug-charcoal">
              {users.length === 0 ? 'No users yet' : 'No users match your filters'}
            </h2>
            <p className="mt-2 text-sm text-lug-gray">
              {users.length === 0
                ? 'Use the Add user button to create the first account.'
                : 'Clear or adjust the filters to see more results.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray">
                <tr>
                  {['Username', 'Linked person', 'Email', 'Role', 'Status', 'Account', 'Last login', 'Updated', 'Actions'].map(
                    (heading) => (
                      <th key={heading} className="px-4 py-3 font-medium">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-lug-light-gray">
                {visible.map((user) => {
                  const locked = isLocked(user);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-lug-charcoal">{user.username}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{user.personName ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{user.email ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-lug-gray">
                        {roleNames.get(user.roleId) ?? user.roleName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`rounded border px-2 py-1 text-xs ${
                            user.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 bg-gray-50 text-gray-600'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.mustChangePassword && (
                          <p className="mt-1 text-[11px] text-amber-600">Password change required</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {locked ? (
                          <span
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700"
                            title={`Locked until ${formatDateTime(user.lockedUntil)}`}
                          >
                            Locked
                          </span>
                        ) : (
                          <span className="text-lug-gray">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-lug-gray">
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{formatDate(user.updatedAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="inline-flex gap-3">
                          {hasPermission('users.update') && (
                            <button type="button" onClick={() => setEditing(user)} className="text-lug-red hover:underline">
                              Edit
                            </button>
                          )}
                          {hasPermission('users.reset_password') && (
                            <button type="button" onClick={() => setResetting(user)} className="text-lug-red hover:underline">
                              Reset password
                            </button>
                          )}
                          {locked && hasPermission('users.update') && (
                            <button type="button" onClick={() => askUnlock(user)} className="text-lug-red hover:underline">
                              Unlock
                            </button>
                          )}
                          {hasPermission('users.deactivate') && (
                            <button
                              type="button"
                              onClick={() => askToggleActive(user)}
                              className="text-lug-gray hover:text-lug-charcoal"
                            >
                              {user.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                          {hasAnyPermission('users.reset_password', 'users.deactivate') && (
                            <button
                              type="button"
                              onClick={() => askRevokeSessions(user)}
                              className="text-lug-gray hover:text-lug-charcoal"
                            >
                              Revoke sessions
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-lug-light-gray px-4 py-3 text-sm">
            <span className="text-lug-gray">
              Page {page} of {totalPages} · {filtered.length} users
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded border border-lug-light-gray px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded border border-lug-light-gray px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {(adding || editing) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-form-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-6 shadow-xl">
            <div className="mb-5">
              <h2 id="user-form-title" className="text-lg font-semibold text-lug-charcoal">
                {editing ? 'Edit user' : 'Add user'}
              </h2>
              <p className="mt-1 text-sm text-lug-gray">
                {editing ? 'Update this account, its role, and its linked person.' : 'Create a new system account.'}
              </p>
            </div>
            <UserForm
              roles={roles}
              people={people}
              user={editing ?? undefined}
              onCancel={() => {
                setAdding(false);
                setEditing(null);
              }}
              onSuccess={handleSaved}
            />
          </div>
        </div>
      )}

      {resetting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded bg-white p-6 shadow-xl">
            <div className="mb-5">
              <h2 id="reset-password-title" className="text-lg font-semibold text-lug-charcoal">
                Reset password
              </h2>
            </div>
            <ResetPasswordForm user={resetting} onCancel={() => setResetting(null)} onSuccess={handleResetSuccess} />
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          tone={confirm.tone}
          busy={confirmBusy}
          onConfirm={() => void runConfirm()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
