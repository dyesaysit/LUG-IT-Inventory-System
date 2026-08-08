import { useEffect, useState } from 'react';
import type { EquipmentRequest, EquipmentRequestStatus } from 'shared';
import { cancelEquipmentRequest, createEquipmentRequest, fetchMyRequests } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { useFormatDate } from '../utils/formatting';

const STATUS_STYLES: Record<EquipmentRequestStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
  FULFILLED: 'border-blue-200 bg-blue-50 text-blue-700',
  CANCELLED: 'border-gray-200 bg-gray-50 text-gray-600',
};
const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Staff portal: request new equipment and track the status and history of requests. */
export default function PortalRequestsPage() {
  const formatDate = useFormatDate();
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await fetchMyRequests());
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load your requests. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (itemName.trim().length < 2) {
      setFormError('Please describe the item you need.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createEquipmentRequest({
        itemName: itemName.trim(),
        category: category.trim() || null,
        quantity: Number(quantity) || 1,
        justification: justification.trim() || null,
      });
      setRequests((current) => [created, ...current]);
      setItemName('');
      setCategory('');
      setQuantity('1');
      setJustification('');
      setSuccess('Your request was submitted and is now pending review.');
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Unable to submit the request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (request: EquipmentRequest) => {
    if (!window.confirm(`Cancel your request for ${request.itemName}?`)) return;
    setCancellingId(request.id);
    setError(null);
    try {
      const updated = await cancelEquipmentRequest(request.id);
      setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess('Request cancelled.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to cancel the request.'));
    } finally {
      setCancellingId(null);
    }
  };

  const inputClasses = 'mt-1 w-full rounded border border-lug-light-gray px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-lug-charcoal">My requests</h1>
        <p className="mt-1 text-sm text-lug-gray">Request new equipment and track its status</p>
      </header>

      {success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={(event) => void submit(event)} className="rounded border border-lug-light-gray bg-white p-5">
        <h2 className="text-base font-semibold text-lug-charcoal">Request new equipment</h2>
        {formError && (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-lug-charcoal sm:col-span-2">
            Item needed<span className="text-lug-red"> *</span>
            <input
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="e.g. Laptop docking station"
              className={inputClasses}
            />
          </label>
          <label className="block text-sm font-medium text-lug-charcoal">
            Category
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. Accessory"
              className={inputClasses}
            />
          </label>
          <label className="block text-sm font-medium text-lug-charcoal">
            Quantity
            <input
              type="number"
              min="1"
              max="999"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClasses}
            />
          </label>
          <label className="block text-sm font-medium text-lug-charcoal sm:col-span-2">
            Justification
            <textarea
              rows={3}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Why do you need this?"
              className={inputClasses}
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded border border-lug-light-gray bg-white">
        <div className="border-b border-lug-light-gray px-5 py-3">
          <h2 className="text-sm font-semibold text-lug-charcoal">Request history</h2>
        </div>
        {loading ? (
          <p className="px-6 py-12 text-center text-sm text-lug-gray">Loading your requests…</p>
        ) : requests.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-lug-gray">You have not made any requests yet.</p>
        ) : (
          <ul className="divide-y divide-lug-light-gray">
            {requests.map((request) => (
              <li key={request.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-lug-charcoal">
                    {request.itemName}
                    {request.quantity > 1 && <span className="text-lug-gray"> × {request.quantity}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-lug-gray">
                    {request.category ? `${request.category} · ` : ''}Requested {formatDate(request.createdAt)}
                  </p>
                  {request.justification && <p className="mt-1 text-sm text-lug-gray">{request.justification}</p>}
                  {request.reviewNotes && (
                    <p className="mt-1 text-sm text-lug-charcoal">
                      <span className="font-medium">IT note:</span> {request.reviewNotes}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <span className={`rounded border px-2 py-1 text-xs ${STATUS_STYLES[request.status]}`}>
                    {statusLabel(request.status)}
                  </span>
                  {request.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => void cancel(request)}
                      disabled={cancellingId === request.id}
                      className="text-xs text-lug-gray hover:text-red-700 disabled:opacity-50"
                    >
                      {cancellingId === request.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
