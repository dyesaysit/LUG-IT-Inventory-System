import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PortalProfile } from 'shared';
import { fetchPortalProfile } from '../services/api';
import { apiErrorMessage } from '../utils/api-error';

/** Staff portal profile and entry point to the existing password workflow. */
export default function PortalProfilePage() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetchPortalProfile().then(setProfile).catch((reason: unknown) => setError(apiErrorMessage(reason, 'Unable to load your profile.'))); }, []);
  return <div className="space-y-5"><header><h1 className="text-xl font-semibold text-lug-charcoal">Profile</h1><p className="mt-1 text-sm text-lug-gray">Your staff account details</p></header>{error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{profile && <section className="rounded border border-lug-light-gray bg-white p-5"><dl className="space-y-3 text-sm"><div><dt className="text-lug-gray">Name</dt><dd className="font-medium text-lug-charcoal">{profile.personName ?? 'Not linked'}</dd></div><div><dt className="text-lug-gray">Username</dt><dd className="font-medium text-lug-charcoal">{profile.username}</dd></div><div><dt className="text-lug-gray">Email</dt><dd className="font-medium text-lug-charcoal">{profile.email ?? 'Not provided'}</dd></div></dl><Link to="/change-password" className="mt-5 inline-block rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy">Change password</Link></section>}</div>;
}
