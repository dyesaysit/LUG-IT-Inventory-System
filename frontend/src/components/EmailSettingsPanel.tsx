import { useEffect, useState } from 'react';
import { fetchEmailSettings, saveEmailSettings, sendTestEmail } from '../services/api';
import type { EmailSettingsInput, EmailSettingsView } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

const empty: EmailSettingsInput = { enabled:false,smtpHost:'',smtpPort:587,smtpSecure:false,smtpUsername:'',smtpPassword:'',fromName:'IT Support',fromAddress:'',applicationUrl:'' };

/** Administrator GUI for SMTP notification delivery. */
export const EmailSettingsPanel = () => {
  const [form,setForm]=useState<EmailSettingsInput>(empty);
  const [smtpPort,setSmtpPort]=useState('587');
  const [passwordConfigured,setPasswordConfigured]=useState(false);
  const [testRecipient,setTestRecipient]=useState('');
  const [busy,setBusy]=useState(false);
  const [testing,setTesting]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [testMessage,setTestMessage]=useState<string|null>(null);
  const [testError,setTestError]=useState<string|null>(null);
  useEffect(()=>{void fetchEmailSettings().then((data:EmailSettingsView)=>{setForm({...data,smtpPassword:''});setSmtpPort(String(data.smtpPort));setPasswordConfigured(data.passwordConfigured)}).catch((err)=>setError(apiErrorMessage(err,'Unable to load email settings.')))},[]);
  const field=<K extends keyof EmailSettingsInput>(key:K,value:EmailSettingsInput[K])=>setForm(current=>({...current,[key]:value}));
  const save=async()=>{const port=Number(smtpPort);if(!Number.isInteger(port)||port<1||port>65535){setError('Enter an SMTP port between 1 and 65535.');return}setBusy(true);setError(null);setMessage(null);try{const data=await saveEmailSettings({...form,smtpPort:port,smtpPassword:form.smtpPassword||undefined});setPasswordConfigured(data.passwordConfigured);setForm(current=>({...current,smtpPort:data.smtpPort,smtpPassword:''}));setSmtpPort(String(data.smtpPort));setMessage('Email settings saved.')}catch(err){setError(apiErrorMessage(err,'Unable to save email settings.'))}finally{setBusy(false)}};
  const test=async()=>{setBusy(true);setTesting(true);setTestError(null);setTestMessage('Sending test email…');try{const result=await sendTestEmail(testRecipient);setTestMessage(`${result.message} Check ${testRecipient}, including its spam folder.`)}catch(err){setTestMessage(null);setTestError(apiErrorMessage(err,'The test email could not be sent. Check the saved SMTP details and credentials.'))}finally{setBusy(false);setTesting(false)}};
  const input='mt-1 w-full rounded border border-lug-light-gray px-3 py-2 text-sm';
  return <div className="space-y-5">
    <div><h2 className="font-semibold text-lug-charcoal">Email notifications</h2><p className="text-sm text-lug-gray">Send no-reply ticket alerts through your organization SMTP account.</p></div>
    {message&&<div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}{error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.enabled} onChange={e=>field('enabled',e.target.checked)}/>Enable ticket email notifications</label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">SMTP host<input className={input} value={form.smtpHost} onChange={e=>field('smtpHost',e.target.value)} placeholder="smtp.office365.com"/></label>
      <label className="text-sm">SMTP port<input type="number" min="1" max="65535" inputMode="numeric" className={input} value={smtpPort} onChange={e=>setSmtpPort(e.target.value)} placeholder="587"/></label>
      <label className="text-sm">SMTP username<input className={input} value={form.smtpUsername} onChange={e=>field('smtpUsername',e.target.value)} placeholder="support@example.org"/></label>
      <label className="text-sm">SMTP password<input type="password" autoComplete="new-password" className={input} value={form.smtpPassword??''} onChange={e=>field('smtpPassword',e.target.value)} placeholder={passwordConfigured?'Saved — leave blank to keep':'Enter password or app password'}/></label>
      <label className="text-sm">From name<input className={input} value={form.fromName} onChange={e=>field('fromName',e.target.value)}/></label>
      <label className="text-sm">From address<input type="email" className={input} value={form.fromAddress} onChange={e=>field('fromAddress',e.target.value)} placeholder="support@example.org"/></label>
      <label className="text-sm sm:col-span-2">Application URL<input type="url" className={input} value={form.applicationUrl} onChange={e=>field('applicationUrl',e.target.value)} placeholder="https://inventory.example.org"/><span className="text-xs text-lug-gray">Used for the “Open Inventory System” link in messages.</span></label>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.smtpSecure} onChange={e=>field('smtpSecure',e.target.checked)}/>Use implicit TLS (normally port 465). Leave off for STARTTLS on port 587.</label>
    <button type="button" disabled={busy} onClick={()=>void save()} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save email settings</button>
    <div className="border-t border-lug-light-gray pt-4"><h3 className="text-sm font-semibold">Send a test email</h3><p className="mt-1 text-xs text-lug-gray">The test uses the last saved SMTP settings. Save any changes above first.</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input type="email" className={`${input} mt-0 flex-1`} value={testRecipient} onChange={e=>setTestRecipient(e.target.value)} placeholder="recipient@example.org"/><button type="button" disabled={busy||!testRecipient} onClick={()=>void test()} className="rounded border border-lug-red px-4 py-2 text-sm font-medium text-lug-red disabled:opacity-50">{testing?'Sending…':'Send test'}</button></div>{testMessage&&<div role="status" aria-live="polite" className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{testMessage}</div>}{testError&&<div role="alert" className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{testError}</div>}</div>
  </div>;
};
