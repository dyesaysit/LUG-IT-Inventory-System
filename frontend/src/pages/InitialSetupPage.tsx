import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import { completeInitialSetup, fetchInitialSetupStatus } from '../services/api';

/** Secure one-time initial administrator creation screen. */
export function InitialSetupPage() {
  const navigate = useNavigate();
  const { refresh: refreshApplicationSettings } = useApplicationSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [systemName, setSystemName] = useState('IT Inventory System');
  const [institutionName, setInstitutionName] = useState('');
  const [institutionShortName, setInstitutionShortName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string>();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialSetupStatus()
      .then(({ setupRequired }) => { if (!setupRequired) navigate('/', { replace: true }); })
      .catch(() => setError('Unable to check the initial setup status.'));
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await completeInitialSetup({ username, password, confirmPassword, systemName, institutionName, institutionShortName, logoDataUrl });
      await refreshApplicationSettings();
      navigate('/', { replace: true });
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Initial setup could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'mt-1.5 w-full rounded-md border border-lug-light-gray px-3.5 py-2.5 outline-none focus:border-lug-red focus:ring-1 focus:ring-lug-red';
  return (
    <main className="min-h-screen bg-lug-off-white flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-2xl rounded-lg border border-lug-light-gray bg-white px-6 py-8 shadow-sm sm:px-10">
        <h1 className="text-2xl font-semibold text-lug-charcoal">Set up your inventory system</h1>
        <p className="mt-2 text-sm text-lug-gray">Brand this installation and create its first administrator. These details can be changed later in Settings.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-lug-charcoal sm:col-span-2">Inventory system name
              <input required value={systemName} onChange={(event) => setSystemName(event.target.value)} className={inputClass} placeholder="Acme IT Inventory" />
            </label>
            <label className="block text-sm font-medium text-lug-charcoal">Organization or institution
              <input required value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} className={inputClass} placeholder="Acme Corporation" />
            </label>
            <label className="block text-sm font-medium text-lug-charcoal">Short name
              <input required maxLength={20} value={institutionShortName} onChange={(event) => setInstitutionShortName(event.target.value)} className={inputClass} placeholder="ACME" />
            </label>
          </div>
          <label className="block text-sm font-medium text-lug-charcoal">Organization logo <span className="font-normal text-lug-gray">(optional)</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" className={`${inputClass} bg-white`} onChange={(event) => { const file=event.target.files?.[0];if(!file){setLogoDataUrl(undefined);return;}const image=new Image();image.onload=()=>{const scale=Math.min(1,600/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height);setLogoDataUrl(canvas.toDataURL('image/webp',0.82));URL.revokeObjectURL(image.src);};image.src=URL.createObjectURL(file); }} />
          </label>
          {logoDataUrl&&<div className="flex items-center gap-3 rounded border border-lug-light-gray bg-gray-50 p-3"><img src={logoDataUrl} alt="Logo preview" className="h-14 w-20 object-contain"/><span className="text-xs text-lug-gray">Compressed logo preview</span></div>}
          <div className="border-t border-lug-light-gray pt-5"><h2 className="font-semibold text-lug-charcoal">Initial administrator</h2></div>
          <label className="block text-sm font-medium text-lug-charcoal">Username
            <input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-lug-charcoal">Password
            <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
          </label>
          <p className="text-xs text-lug-gray">At least 6 characters with an uppercase letter, number, and special character.</p>
          <label className="block text-sm font-medium text-lug-charcoal">Confirm password
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          </label>
          <button disabled={submitting} className="w-full rounded-md bg-lug-red py-2.5 font-medium text-white hover:bg-lug-burgundy disabled:opacity-60">
            {submitting ? 'Creating administrator…' : 'Create administrator'}
          </button>
        </form>
      </section>
    </main>
  );
}
