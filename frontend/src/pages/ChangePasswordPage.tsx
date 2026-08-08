import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../services/api';
import { useAuth } from '../context/AuthContext';

/** Allows authenticated users to replace a temporary or existing password. */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (newPassword !== confirmNewPassword) { setError('New password and confirmation do not match.'); return; }
    setSaving(true);
    try { await changePassword({ currentPassword, newPassword, confirmNewPassword }); await logout(); navigate('/', { replace: true }); }
    catch { setError('Password change failed. Check your current password and requirements.'); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }
    finally { setSaving(false); }
  };
  return <main className="min-h-screen bg-lug-off-white p-6 flex items-center justify-center"><section className="w-full max-w-lg rounded-lg border bg-white p-8"><h1 className="text-2xl font-semibold">Change password</h1><p className="mt-2 text-sm text-lug-gray">Use at least six characters with an uppercase letter, a number, and a special character.</p>{error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4">{[['Current password',currentPassword,setCurrentPassword],['New password',newPassword,setNewPassword],['Confirm new password',confirmNewPassword,setConfirmNewPassword]].map(([label,value,setter])=><label key={label as string} className="block text-sm font-medium">{label as string}<input type="password" value={value as string} onChange={(event)=>(setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)} required className="mt-1 w-full rounded border px-3 py-2" /></label>)}<button disabled={saving} className="w-full rounded bg-lug-red py-2 text-white disabled:opacity-50">{saving?'Changing password…':'Change password'}</button></form></section></main>;
}
