import { useState, type FormEvent } from 'react';
import type { RepairJob, RepairOutcome } from 'shared';
import {
  approveRepair,
  completeRepair,
  markRepairBeyondRepair,
  markRepairWaitingForParts,
  rejectRepair,
  returnRepairToSchool,
  sendRepairToVendor,
  startRepair,
  submitRepairQuotation,
} from '../services/api';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import { apiErrorMessage } from '../utils/api-error';

export type RepairAction =
  | 'quotation'
  | 'approve'
  | 'reject'
  | 'send'
  | 'start'
  | 'waiting'
  | 'complete'
  | 'return'
  | 'beyond';
interface Props {
  record: RepairJob;
  action: RepairAction;
  onClose: () => void;
  onSuccess: () => void;
}
const conditions = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const;
const outcomes = [
  'REPAIRED',
  'PARTIALLY_REPAIRED',
  'UNREPAIRABLE',
  'REPLACEMENT_RECOMMENDED',
  'RETURNED_WITHOUT_REPAIR',
] as const;
/** Captures data required by a repair lifecycle transition. */
export function RepairActionModal({ record, action, onClose, onSuccess }: Props) {
  const { settings } = useApplicationSettings();
  const currencyLabel = settings?.currencySymbol || 'GH₵';
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState(String(record.quotationAmount ?? 0));
  const [name, setName] = useState('');
  const [reference, setReference] = useState(record.vendorReference ?? '');
  const [diagnosis, setDiagnosis] = useState('');
  const [work, setWork] = useState('');
  const [parts, setParts] = useState('');
  const [outcome, setOutcome] = useState<RepairOutcome>('REPAIRED');
  const [condition, setCondition] = useState<(typeof conditions)[number]>('GOOD');
  const [recommended, setRecommended] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const title = {
    quotation: 'Submit quotation',
    approve: 'Approve repair',
    reject: 'Reject repair',
    send: 'Send to vendor',
    start:
      record.status === 'REPORTED'
        ? 'Start diagnosis'
        : record.status === 'WAITING_FOR_PARTS'
          ? 'Resume repair'
          : 'Start repair',
    waiting: 'Waiting for parts',
    complete: 'Complete repair',
    return: 'Return to school',
    beyond: 'Mark beyond repair',
  }[action];
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (action === 'quotation')
        await submitRepairQuotation(record.id, {
          quotationNumber: number,
          quotationAmount: Number(amount),
          vendorReference: reference || null,
          estimatedCompletionDate: date,
          partsReplaced: parts || null,
          notes: notes || null,
        });
      if (action === 'approve')
        await approveRepair(record.id, {
          approvedAmount: Number(amount),
          approvedBy: name,
          approvalDate: date,
          notes: notes || null,
          justification: reason || null,
        });
      if (action === 'reject')
        await rejectRepair(record.id, {
          notes: `Rejected by ${name}: ${reason}${notes ? `; ${notes}` : ''}`,
        });
      if (action === 'send')
        await sendRepairToVendor(record.id, {
          sentDate: date,
          vendorReference: reference || null,
          notes: notes || null,
        });
      if (action === 'start')
        await startRepair(record.id, { diagnosis: diagnosis || null, notes: notes || null });
      if (action === 'waiting')
        await markRepairWaitingForParts(record.id, {
          partsReplaced: parts || null,
          notes: notes || null,
        });
      if (action === 'complete')
        await completeRepair(record.id, {
          completedDate: date,
          diagnosis,
          repairAction: work,
          partsReplaced: parts || null,
          finalCost: Number(amount),
          outcome,
          conditionAfter: condition,
          replacementRecommended: recommended,
          replacementReason: reason || null,
          notes: notes || null,
        });
      if (action === 'return')
        await returnRepairToSchool(record.id, {
          returnedDate: date,
          receivedBy: name,
          returnCondition: condition,
          notes: notes || null,
        });
      if (action === 'beyond')
        await markRepairBeyondRepair(record.id, {
          replacementRecommended: true,
          replacementReason: reason,
          notes: notes || null,
        });
      onSuccess();
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to update repair. Please try again.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={(e) => void submit(e)}
        className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded bg-white p-6"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {['quotation', 'approve', 'send', 'complete', 'return'].includes(action) && (
          <label className="block text-sm">
            Date
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        {action === 'quotation' && (
          <>
            <label className="block text-sm">
              Quotation number
              <input
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Quotation amount
              <div className="mt-1 flex items-center rounded border px-3">
                <span className="text-sm text-lug-gray">{currencyLabel}</span>
                <input
                  required
                  min="0"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border-0 py-2"
                />
              </div>
            </label>
          </>
        )}
        {['approve', 'complete'].includes(action) && (
          <label className="block text-sm">
            {action === 'approve' ? 'Approved amount' : 'Final cost'}
            <div className="mt-1 flex items-center rounded border px-3">
              <span className="text-sm text-lug-gray">{currencyLabel}</span>
              <input
                required
                min="0"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border-0 py-2"
              />
            </div>
          </label>
        )}
        {['approve', 'reject', 'return'].includes(action) && (
          <label className="block text-sm">
            {action === 'approve'
              ? 'Approved by'
              : action === 'reject'
                ? 'Rejected by'
                : 'Received by'}
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        {['quotation', 'send'].includes(action) && (
          <label className="block text-sm">
            Vendor reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        {['start', 'complete'].includes(action) && (
          <label className="block text-sm">
            Diagnosis
            <textarea
              required={action === 'complete'}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        {action === 'complete' && (
          <>
            <label className="block text-sm">
              Repair action
              <textarea
                required
                value={work}
                onChange={(e) => setWork(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Outcome
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as RepairOutcome)}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                {outcomes.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Condition after
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as typeof condition)}
                className="mt-1 w-full rounded border px-3 py-2"
              >
                {conditions.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={recommended}
                onChange={(e) => setRecommended(e.target.checked)}
              />{' '}
              Replacement recommended
            </label>
          </>
        )}
        {['quotation', 'waiting', 'complete'].includes(action) && (
          <label className="block text-sm">
            Parts required or replaced
            <textarea
              value={parts}
              onChange={(e) => setParts(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        {['approve', 'reject', 'complete', 'beyond'].includes(action) && (
          <label className="block text-sm">
            {action === 'reject'
              ? 'Rejection reason'
              : action === 'beyond' || recommended
                ? 'Replacement reason'
                : 'Justification'}
            <textarea
              required={action === 'reject' || action === 'beyond' || recommended}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        )}
        {action === 'return' && (
          <label className="block text-sm">
            Return condition
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as typeof condition)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {conditions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
            Cancel
          </button>
          <button disabled={saving} className="rounded bg-lug-red px-4 py-2 text-sm text-white">
            {saving ? 'Saving…' : title}
          </button>
        </div>
      </form>
    </div>
  );
}
