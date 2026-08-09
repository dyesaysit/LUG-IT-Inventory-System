import { useEffect, useState } from 'react';
import type { AssetAssignment, PortalProfile } from 'shared';
import { fetchMyAssets, fetchPortalProfile, reportAssetProblem } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';
import { useFormatDate } from '../utils/formatting';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/** Staff portal: assets currently assigned to me, with the ability to report a problem. */
export default function PortalAssetsPage() {
  const formatDate = useFormatDate();
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [assets, setAssets] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [reporting, setReporting] = useState<AssetAssignment | null>(null);
  const [fault, setFault] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, assetData] = await Promise.all([fetchPortalProfile(), fetchMyAssets()]);
      setProfile(profileData);
      setAssets(assetData);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load your assets. Please try again.'));
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

  const openReport = (assignment: AssetAssignment) => {
    setReporting(assignment);
    setFault('');
    setPriority('MEDIUM');
    setFormError(null);
  };

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reporting) return;
    if (fault.trim().length < 3) {
      setFormError('Please describe the problem.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const record = await reportAssetProblem({ assetId: reporting.assetId, faultDescription: fault.trim(), priority });
      setReporting(null);
      setSuccess(`Reported to IT — ticket ${record.ticketNumber} was created.`);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Unable to report the problem. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-lug-charcoal">
          {profile?.personName ? `Welcome, ${profile.personName}` : 'My assets'}
        </h1>
        <p className="mt-1 text-sm text-lug-gray">Equipment currently assigned to you</p>
      </header>

      {success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && profile && profile.personId === null && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Your account is not yet linked to a staff record, so no assigned assets can be shown. Please contact IT.
        </div>
      )}

      {loading ? (
        <div className="rounded border border-lug-light-gray bg-white px-6 py-14 text-center text-sm text-lug-gray">
          Loading your assets…
        </div>
      ) : !error && assets.length === 0 ? (
        profile?.personId !== null && (
          <div className="rounded border border-lug-light-gray bg-white px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-lug-charcoal">No assets assigned to you</h2>
            <p className="mt-2 text-sm text-lug-gray">When IT assigns equipment to you, it will appear here.</p>
          </div>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {assets.map((assignment) => (
            <div key={assignment.id} className="flex flex-col rounded border border-lug-light-gray bg-white p-4">
              <div className="flex-1">
                <p className="font-semibold text-lug-charcoal">
                  {`${assignment.assetManufacturer} ${assignment.assetModel}`.trim() || assignment.assetTag}
                </p>
                <p className="mt-0.5 text-xs text-lug-gray">Asset tag: {assignment.assetTag}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-lug-gray">Location</dt>
                    <dd className="text-lug-charcoal">{assignment.locationName ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-lug-gray">Assigned</dt>
                    <dd className="text-lug-charcoal">{formatDate(assignment.assignedDate)}</dd>
                  </div>
                </dl>
              </div>
              <button
                type="button"
                onClick={() => openReport(assignment)}
                className="mt-4 rounded border border-lug-red px-3 py-2 text-sm font-medium text-lug-red hover:bg-red-50"
              >
                Report a problem
              </button>
            </div>
          ))}
        </div>
      )}

      {reporting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
          onClick={() => !submitting && setReporting(null)}
        >
          <form
            onSubmit={(event) => void submitReport(event)}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded bg-white p-6 shadow-xl"
          >
            <div>
              <h2 id="report-title" className="text-lg font-semibold text-lug-charcoal">Report a problem</h2>
              <p className="mt-1 text-sm text-lug-gray">
                {`${reporting.assetManufacturer} ${reporting.assetModel}`.trim() || reporting.assetTag} ·{' '}
                {reporting.assetTag}
              </p>
            </div>
            {formError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            )}
            <label className="block text-sm font-medium text-lug-charcoal">
              What is wrong?<span className="text-lug-red"> *</span>
              <textarea
                required
                rows={4}
                value={fault}
                onChange={(event) => setFault(event.target.value)}
                placeholder="Describe the fault or issue…"
                className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-lug-charcoal">
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as (typeof PRIORITIES)[number])}
                className="mt-1 w-full rounded border border-lug-light-gray px-3 py-2 text-sm"
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0) + value.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 border-t border-lug-light-gray pt-4">
              <button
                type="button"
                onClick={() => setReporting(null)}
                disabled={submitting}
                className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy disabled:opacity-60"
              >
                {submitting ? 'Reporting…' : 'Submit report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
