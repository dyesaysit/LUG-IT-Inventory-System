import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import type { AssetAssignment, Department, InventoryAsset as Asset, Location, Person } from 'shared';
import { AssignmentForm } from '../components/AssignmentForm';
import { ReturnAssignmentForm } from '../components/ReturnAssignmentForm';
import {
  cancelAssignment, fetchAssetAssignmentHistory, fetchAssignments, fetchAssets,
  fetchDepartments, fetchLocations, fetchPeople, updateAssignment,
} from '../services/api';

const pageSize = 10;
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase());
const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};
const targetLabel = (assignment: AssetAssignment) => assignment.personName
  ?? assignment.departmentName ?? (assignment.locationName && `${assignment.locationCode} — ${assignment.locationName}`) ?? '—';

/** Complete asset assignment and return workflow page. */
export default function AssignmentsPage() {
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [returning, setReturning] = useState<AssetAssignment | null>(null);
  const [viewing, setViewing] = useState<AssetAssignment | null>(null);
  const [history, setHistory] = useState<AssetAssignment[]>([]);
  const [editing, setEditing] = useState<AssetAssignment | null>(null);
  const [assetIdFilter, setAssetIdFilter] = useState(searchParams.get('assetId') ?? '');
  const [search, setSearch] = useState(''); const [type, setType] = useState('');
  const [status, setStatus] = useState(''); const [personId, setPersonId] = useState(searchParams.get('personId') ?? '');
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') ?? ''); const [locationId, setLocationId] = useState(searchParams.get('locationId') ?? '');
  const [overdueOnly, setOverdueOnly] = useState(false); const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [assignmentData, assetData, personData, departmentData, locationData] = await Promise.all([
        fetchAssignments({ pageSize: 100 }), fetchAssets(),
        fetchPeople({ pageSize: 100, isActive: true }),
        fetchDepartments({ pageSize: 100, isActive: true }),
        fetchLocations({ pageSize: 100, isActive: true }),
      ]);
      setAssignments(assignmentData); setAssets(assetData); setPeople(personData);
      setDepartments(departmentData); setLocations(locationData);
    } catch (requestError) {
      setError(axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data.error ?? requestError.message : 'Unable to load assignments.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = useMemo(() => assignments.filter((assignment) => {
    const term = search.trim().toLowerCase();
    const overdue = assignment.status === 'ACTIVE' && !!assignment.expectedReturnDate
      && assignment.expectedReturnDate < new Date().toISOString().slice(0, 10);
    return (term === '' || [assignment.assetTag, assignment.assetManufacturer, assignment.assetModel, targetLabel(assignment)].join(' ').toLowerCase().includes(term))
      && (assetIdFilter === '' || assignment.assetId === Number(assetIdFilter))
      && (type === '' || assignment.assignmentType === type)
      && (status === '' || assignment.status === status)
      && (personId === '' || assignment.personId === Number(personId))
      && (departmentId === '' || assignment.departmentId === Number(departmentId))
      && (locationId === '' || assignment.locationId === Number(locationId))
      && (!overdueOnly || overdue);
  }), [assetIdFilter, assignments, departmentId, locationId, overdueOnly, personId, search, status, type]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const activeAssetIds = new Set(assignments.filter((item) => item.status === 'ACTIVE').map((item) => item.assetId));
  const assignableAssets = assets.filter((asset) => asset.status === 'IN_STOCK' && !activeAssetIds.has(asset.id));
  const clearFilters = () => { setAssetIdFilter(''); setSearch(''); setType(''); setStatus(''); setPersonId(''); setDepartmentId(''); setLocationId(''); setOverdueOnly(false); setPage(1); };
  const refreshWithMessage = async (message: string) => { await loadData(); setAdding(false); setReturning(null); setEditing(null); setSuccess(message); };
  const viewDetails = async (assignment: AssetAssignment) => {
    setViewing(assignment); setHistory([]);
    try { setHistory(await fetchAssetAssignmentHistory(assignment.assetId)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load history.'); }
  };
  const cancel = async (assignment: AssetAssignment) => {
    if (!window.confirm(`Cancel assignment for ${assignment.assetTag}?`)) return;
    try { await cancelAssignment(assignment.id); await refreshWithMessage('Assignment was cancelled.'); }
    catch (requestError) { setError(axios.isAxiosError<{ error?: string }>(requestError) ? requestError.response?.data.error ?? requestError.message : 'Unable to cancel assignment.'); }
  };
  const summary = [
    ['Active assignments', assignments.filter((item) => item.status === 'ACTIVE').length],
    ['Assigned to people', assignments.filter((item) => item.status === 'ACTIVE' && item.assignmentType === 'PERSON').length],
    ['Deployed to locations', assignments.filter((item) => item.status === 'ACTIVE' && item.assignmentType === 'LOCATION').length],
    ['Overdue returns', assignments.filter((item) => item.status === 'ACTIVE' && !!item.expectedReturnDate && item.expectedReturnDate < new Date().toISOString().slice(0, 10)).length],
    ['Returned this month', assignments.filter((item) => item.status === 'RETURNED' && item.returnedDate?.startsWith(new Date().toISOString().slice(0, 7))).length],
  ] as const;

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl font-semibold text-lug-charcoal">Assignments</h1><p className="mt-1 text-sm text-lug-gray">Assign, deploy, return, and track IT assets</p></div>{hasPermission('assignments.create') && <button type="button" onClick={() => setAdding(true)} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white">New assignment</button>}</header>
    {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}{error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-5" aria-label="Assignment summary">{summary.map(([title, value]) => <div key={title} className="rounded border bg-white px-4 py-3"><p className="text-xs text-lug-gray">{title}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</section>
    <section className="rounded border bg-white p-4" aria-label="Assignment filters"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input type="search" aria-label="Search assignments" placeholder="Search assignments" value={search} onChange={(event) => setSearch(event.target.value)} className="rounded border px-3 py-2 text-sm" /><select aria-label="Filter by assignment type" value={type} onChange={(event) => setType(event.target.value)} className="rounded border px-3 py-2 text-sm"><option value="">All assignment types</option>{['PERSON','DEPARTMENT','LOCATION'].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border px-3 py-2 text-sm"><option value="">All statuses</option>{['ACTIVE','RETURNED','OVERDUE','CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter by person" value={personId} onChange={(event) => setPersonId(event.target.value)} className="rounded border px-3 py-2 text-sm"><option value="">All people</option>{people.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select><select aria-label="Filter by department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="rounded border px-3 py-2 text-sm"><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><select aria-label="Filter by location" value={locationId} onChange={(event) => setLocationId(event.target.value)} className="rounded border px-3 py-2 text-sm"><option value="">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><label className="flex items-center gap-2 rounded border px-3 py-2 text-sm"><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} />Overdue only</label><button type="button" onClick={clearFilters} className="rounded border px-3 py-2 text-sm">Clear filters</button></div></section>
    <section className="overflow-hidden rounded border bg-white">{loading ? <div className="py-14 text-center text-sm text-lug-gray">Loading assignments…</div> : visible.length === 0 ? <div className="py-14 text-center"><h2 className="font-semibold">{assignments.length === 0 ? 'No assignments recorded yet' : 'No assignments match your filters'}</h2><p className="mt-2 text-sm text-lug-gray">{assignments.length === 0 ? 'Use New assignment to assign the first asset.' : 'Clear or adjust the filters.'}</p></div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b bg-gray-50 text-xs text-lug-gray"><tr>{['Asset','Asset tag','Assignment type','Assigned to / Location','Department','Assigned date','Expected return','Status','Updated','Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y">{visible.map((assignment) => <tr key={assignment.id}><td className="px-4 py-3">{assignment.assetManufacturer} {assignment.assetModel}</td><td className="px-4 py-3 font-medium">{assignment.assetTag}</td><td className="px-4 py-3">{label(assignment.assignmentType)}</td><td className="px-4 py-3">{targetLabel(assignment)}</td><td className="px-4 py-3">{assignment.departmentName || '—'}</td><td className="px-4 py-3">{formatDate(assignment.assignedDate)}</td><td className="px-4 py-3">{formatDate(assignment.expectedReturnDate)}</td><td className="px-4 py-3">{label(assignment.status)}</td><td className="px-4 py-3">{formatDate(assignment.updatedAt)}</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => void viewDetails(assignment)} className="text-lug-red">View</button>{assignment.status === 'ACTIVE' && <>{hasPermission('assignments.return') && <button type="button" onClick={() => setReturning(assignment)} className="text-lug-red">Return</button>}{hasPermission('assignments.update') && <button type="button" onClick={() => setEditing(assignment)} className="text-lug-gray">Edit</button>}{hasPermission('assignments.cancel') && <button type="button" onClick={() => void cancel(assignment)} className="text-lug-gray">Cancel</button>}</>}</div></td></tr>)}</tbody></table></div>}{filtered.length > pageSize && <div className="flex justify-between border-t px-4 py-3 text-sm"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page===1} onClick={() => setPage(page-1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button disabled={page===totalPages} onClick={() => setPage(page+1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>}</section>
    {adding && <Modal title="New assignment" close={() => setAdding(false)}><AssignmentForm assets={assignableAssets} people={people} departments={departments} locations={locations} onCancel={() => setAdding(false)} onSuccess={() => void refreshWithMessage('Assignment created successfully.')} /></Modal>}
    {returning && <Modal title="Return asset" close={() => setReturning(null)}><ReturnAssignmentForm assignment={returning} locations={locations} onCancel={() => setReturning(null)} onSuccess={() => void refreshWithMessage('Asset returned successfully.')} /></Modal>}
    {editing && <Modal title="Edit assignment" close={() => setEditing(null)}><EditAssignment assignment={editing} saved={() => void refreshWithMessage('Assignment updated successfully.')} /></Modal>}
    {viewing && <Modal title="Assignment details and history" close={() => setViewing(null)}><AssignmentDetails assignment={viewing} history={history} /></Modal>}
  </div>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-6 shadow-xl"><div className="mb-5 flex justify-between"><h2 className="text-lg font-semibold">{title}</h2><button type="button" onClick={close} aria-label="Close">Close</button></div>{children}</div></div>;
}

function EditAssignment({ assignment, saved }: { assignment: AssetAssignment; saved: () => void }) {
  const [date, setDate] = useState(assignment.expectedReturnDate ?? ''); const [purpose, setPurpose] = useState(assignment.purpose ?? ''); const [notes, setNotes] = useState(assignment.notes ?? '');
  return <form onSubmit={(event) => { event.preventDefault(); void updateAssignment(assignment.id, { expectedReturnDate: date || null, purpose: purpose || null, notes: notes || null }).then(saved); }} className="space-y-4"><label className="block text-sm">Expected return<input type="date" min={assignment.assignedDate} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block text-sm">Purpose<input value={purpose} onChange={(event) => setPurpose(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="block text-sm">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" /></label><button className="rounded bg-lug-red px-4 py-2 text-sm text-white">Save changes</button></form>;
}

function AssignmentDetails({ assignment, history }: { assignment: AssetAssignment; history: AssetAssignment[] }) {
  return <div className="space-y-5 text-sm"><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-lug-gray">Asset</dt><dd>{assignment.assetTag} — {assignment.assetManufacturer} {assignment.assetModel}</dd></div><div><dt className="text-lug-gray">Assigned to</dt><dd>{targetLabel(assignment)}</dd></div><div><dt className="text-lug-gray">Status</dt><dd>{label(assignment.status)}</dd></div><div><dt className="text-lug-gray">Dates</dt><dd>{formatDate(assignment.assignedDate)} to {assignment.returnedDate ? formatDate(assignment.returnedDate) : assignment.expectedReturnDate ? formatDate(assignment.expectedReturnDate) : 'open'}</dd></div><div><dt className="text-lug-gray">Purpose</dt><dd>{assignment.purpose || '—'}</dd></div><div><dt className="text-lug-gray">Recorded by</dt><dd>{assignment.assignedBy || '—'}{assignment.returnedBy ? ` / Returned by ${assignment.returnedBy}` : ''}</dd></div></dl><div><h3 className="mb-2 font-semibold">Asset history</h3><ol className="space-y-2 border-l pl-4">{history.map((item) => <li key={item.id}><p className="font-medium">{label(item.assignmentType)} — {label(item.status)}</p><p className="text-lug-gray">{formatDate(item.assignedDate)}{item.returnedDate ? ` to ${formatDate(item.returnedDate)}` : ''} · {targetLabel(item)}</p></li>)}</ol></div></div>;
}
