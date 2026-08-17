import { useState } from 'react';

interface TicketMessageDialogProps {
  title: string;
  description: string;
  submitLabel: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (message: string) => Promise<void>;
}

/** Collects an additional-information message for a ticket. */
export function TicketMessageDialog({ title, description, submitLabel, busy, onCancel, onSubmit }: TicketMessageDialogProps) {
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form className="w-full max-w-lg space-y-4 rounded bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); void onSubmit(message.trim()); }}>
        <div><h2 className="text-lg font-semibold text-lug-charcoal">{title}</h2><p className="mt-1 text-sm text-lug-gray">{description}</p></div>
        <label className="block text-sm font-medium text-lug-charcoal">Message <span className="text-lug-red">*</span>
          <textarea autoFocus required minLength={2} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 text-sm" />
        </label>
        <div className="flex justify-end gap-2 border-t border-lug-light-gray pt-4">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded border border-lug-light-gray px-4 py-2 text-sm">Cancel</button>
          <button disabled={busy || message.trim().length < 2} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? 'Sending…' : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
