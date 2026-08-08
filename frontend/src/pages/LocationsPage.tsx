import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import type { AssetAssignment, Location } from 'shared';
import { LocationForm } from '../components/LocationForm';
import { archiveLocation, fetchAssignments, fetchLocations } from '../services/api';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';

const pageSize = 10;
const formatDate = (value: string) => {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};

/** Complete Locations management page. */
export default function LocationsPage() {
  const { hasPermission } = useAuth();
  const { settings } = useApplicationSettings();
  const orgName = settings?.organizationName || 'Organization';
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [building, setBuilding] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);

  const loadLocations = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [locationData, assignmentData] = await Promise.all([
        fetchLocations({ pageSize: 100, sortBy: 'name' }),
        fetchAssignments({ status: 'ACTIVE', pageSize: 100 }),
      ]);
      setLocations(locationData); setActiveAssignments(assignmentData);
    }
    catch (requestError) {
      setError(axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data.error ?? requestError.message : 'Unable to load locations.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadLocations(); }, [loadLocations]);

  const buildings = useMemo(
    () => [...new Set(locations.map((location) => location.building))].sort(), [locations],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return locations.filter((location) => {
      const searchable = [location.code, location.name, location.building, location.floor ?? '', location.room ?? '', location.description ?? ''].join(' ').toLowerCase();
      return (term === '' || searchable.includes(term))
        && (building === '' || location.building === building)
        && (active === '' || location.isActive === (active === 'active'));
    });
  }, [active, building, locations, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const clearFilters = () => { setSearch(''); setBuilding(''); setActive(''); setPage(1); };
  const handleSaved = (location: Location) => {
    setLocations((current) => current.some((item) => item.id === location.id)
      ? current.map((item) => item.id === location.id ? location : item)
      : [...current, location].sort((a, b) => a.name.localeCompare(b.name)));
    setAdding(false); setEditing(null); setSuccess(`${location.name} was saved successfully.`);
  };
  const handleArchive = async (location: Location) => {
    if (!window.confirm(`Archive ${location.name}?`)) return;
    setError(null);
    try {
      await archiveLocation(location.id);
      setLocations((current) => current.filter((item) => item.id !== location.id));
      setSuccess(`${location.name} was archived.`);
    } catch (requestError) {
      setError(axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data.error ?? requestError.message : 'Unable to archive the location.');
    }
  };
  const summary = [
    ['Total locations', locations.length],
    ['Active locations', locations.filter((item) => item.isActive).length],
    ['Buildings', new Set(locations.map((item) => item.building)).size],
    ['Rooms', locations.filter((item) => item.room).length],
  ] as const;

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl font-semibold text-lug-charcoal">Locations</h1><p className="mt-1 text-sm text-lug-gray">Manage {orgName} IT locations</p></div>{hasPermission('locations.create') && <button type="button" onClick={() => setAdding(true)} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Add location</button>}</header>
    {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
    {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Location summary">{summary.map(([title, value]) => <div key={title} className="rounded border border-lug-light-gray bg-white px-4 py-3"><p className="text-xs text-lug-gray">{title}</p><p className="mt-1 text-xl font-semibold text-lug-charcoal">{value}</p></div>)}</section>
    <section className="rounded border border-lug-light-gray bg-white p-4" aria-label="Location filters"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search locations" aria-label="Search locations" className="rounded border border-lug-light-gray px-3 py-2 text-sm" /><select value={building} onChange={(event) => { setBuilding(event.target.value); setPage(1); }} aria-label="Filter by building" className="rounded border border-lug-light-gray px-3 py-2 text-sm"><option value="">All buildings</option>{buildings.map((value) => <option key={value} value={value}>{value}</option>)}</select><select value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }} aria-label="Filter by active status" className="rounded border border-lug-light-gray px-3 py-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button type="button" onClick={clearFilters} className="rounded border border-lug-light-gray px-3 py-2 text-sm hover:bg-gray-50">Clear filters</button></div></section>
    <section className="overflow-hidden rounded border border-lug-light-gray bg-white" aria-label="Location list">{loading ? <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading locations…</div> : visible.length === 0 ? <div className="px-6 py-14 text-center"><h2 className="font-semibold text-lug-charcoal">{locations.length === 0 ? 'No locations registered yet' : 'No locations match your filters'}</h2><p className="mt-2 text-sm text-lug-gray">{locations.length === 0 ? 'Use the Add location button to register the first location.' : 'Clear or adjust the filters to see more results.'}</p></div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray"><tr>{['Code', 'Location', 'Building', 'Floor', 'Room', 'Description', 'Deployed assets', 'Status', 'Updated', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-lug-light-gray">{visible.map((location) => <tr key={location.id} className="hover:bg-gray-50/60"><td className="px-4 py-3 font-medium text-lug-charcoal">{location.code}</td><td className="px-4 py-3 font-medium text-lug-charcoal">{location.name}</td><td className="px-4 py-3 text-lug-gray">{location.building}</td><td className="px-4 py-3 text-lug-gray">{location.floor || '—'}</td><td className="px-4 py-3 text-lug-gray">{location.room || '—'}</td><td className="max-w-xs truncate px-4 py-3 text-lug-gray">{location.description || '—'}</td><td className="px-4 py-3 text-lug-gray">{activeAssignments.filter((item) => item.locationId === location.id).length}</td><td className="px-4 py-3"><span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs">{location.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3 text-lug-gray">{formatDate(location.updatedAt)}</td><td className="px-4 py-3"><div className="flex gap-3"><Link to={`/assignments?locationId=${location.id}`} className="text-lug-red hover:underline">Deployed assets</Link>{hasPermission('locations.update') && <button type="button" onClick={() => setEditing(location)} className="text-lug-red hover:underline">Edit</button>}{hasPermission('locations.archive') && <button type="button" onClick={() => void handleArchive(location)} className="text-lug-gray hover:text-red-700">Archive</button>}</div></td></tr>)}</tbody></table></div>}{!loading && filtered.length > pageSize && <div className="flex items-center justify-between border-t border-lug-light-gray px-4 py-3 text-sm"><span className="text-lug-gray">Page {page} of {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>}</section>
    {(adding || editing) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="location-form-title"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-xl"><div className="mb-5"><h2 id="location-form-title" className="text-lg font-semibold text-lug-charcoal">{editing ? 'Edit location' : 'Add location'}</h2><p className="mt-1 text-sm text-lug-gray">{editing ? 'Update this location.' : 'Register an IT location.'}</p></div><LocationForm location={editing ?? undefined} onCancel={() => { setAdding(false); setEditing(null); }} onSuccess={handleSaved} /></div></div>}
  </div>;
}