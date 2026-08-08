import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import type { AssetAssignment, Department, EmploymentStatus, Person } from 'shared';
import { PersonForm } from '../components/PersonForm';
import { archivePerson, fetchAssignments, fetchDepartments, fetchPeople } from '../services/api';

const pageSize = 10;
const statuses: EmploymentStatus[] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'LEFT'];
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (char) => char.toUpperCase());
const formatDate = (value: string) => {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};

/** Complete personnel management page. */
export default function PeoplePage() {
  const { hasPermission } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [personData, departmentData, assignmentData] = await Promise.all([
        fetchPeople({ pageSize: 100, sortBy: 'lastName' }),
        fetchDepartments({ pageSize: 100, sortBy: 'name', isActive: true }),
        fetchAssignments({ status: 'ACTIVE', pageSize: 100 }),
      ]);
      setPeople(personData); setDepartments(departmentData);
      setActiveAssignments(assignmentData);
    } catch (requestError) {
      setError(axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data.error ?? requestError.message : 'Unable to load people.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);

  const departmentNames = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return people.filter((person) => {
      const searchable = [person.staffId, person.firstName, person.lastName, person.email ?? '', person.phone ?? '', person.jobTitle ?? ''].join(' ').toLowerCase();
      return (term === '' || searchable.includes(term))
        && (departmentId === '' || person.departmentId === Number(departmentId))
        && (employmentStatus === '' || person.employmentStatus === employmentStatus)
        && (activeStatus === '' || person.isActive === (activeStatus === 'active'));
    });
  }, [activeStatus, departmentId, employmentStatus, people, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const clearFilters = () => {
    setSearch(''); setDepartmentId(''); setEmploymentStatus(''); setActiveStatus(''); setPage(1);
  };
  const handleSaved = (person: Person) => {
    setPeople((current) => current.some((item) => item.id === person.id)
      ? current.map((item) => item.id === person.id ? person : item)
      : [...current, person].sort((a, b) => a.lastName.localeCompare(b.lastName)));
    setAdding(false); setEditing(null); setSuccess(`${person.firstName} ${person.lastName} was saved successfully.`);
  };
  const handleArchive = async (person: Person) => {
    if (!window.confirm(`Archive ${person.firstName} ${person.lastName}?`)) return;
    setError(null);
    try {
      await archivePerson(person.id);
      setPeople((current) => current.filter((item) => item.id !== person.id));
      setSuccess(`${person.firstName} ${person.lastName} was archived.`);
    } catch (requestError) {
      setError(axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data.error ?? requestError.message : 'Unable to archive the person.');
    }
  };
  const summary = [
    ['Total people', people.length], ['Active', people.filter((item) => item.employmentStatus === 'ACTIVE').length],
    ['On leave', people.filter((item) => item.employmentStatus === 'ON_LEAVE').length],
    ['Left', people.filter((item) => item.employmentStatus === 'LEFT').length],
  ] as const;

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl font-semibold text-lug-charcoal">People</h1><p className="mt-1 text-sm text-lug-gray">Manage staff and personnel assigned to IT assets</p></div>{hasPermission('people.create') && <button type="button" onClick={() => setAdding(true)} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Add person</button>}</header>
    {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
    {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="People summary">{summary.map(([title, value]) => <div key={title} className="rounded border border-lug-light-gray bg-white px-4 py-3"><p className="text-xs text-lug-gray">{title}</p><p className="mt-1 text-xl font-semibold text-lug-charcoal">{value}</p></div>)}</section>
    <section className="rounded border border-lug-light-gray bg-white p-4" aria-label="People filters"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search people" aria-label="Search people" className="rounded border border-lug-light-gray px-3 py-2 text-sm" /><select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }} aria-label="Filter by department" className="rounded border border-lug-light-gray px-3 py-2 text-sm"><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><select value={employmentStatus} onChange={(event) => { setEmploymentStatus(event.target.value); setPage(1); }} aria-label="Filter by employment status" className="rounded border border-lug-light-gray px-3 py-2 text-sm"><option value="">All employment statuses</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><select value={activeStatus} onChange={(event) => { setActiveStatus(event.target.value); setPage(1); }} aria-label="Filter by active status" className="rounded border border-lug-light-gray px-3 py-2 text-sm"><option value="">All active statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button type="button" onClick={clearFilters} className="rounded border border-lug-light-gray px-3 py-2 text-sm hover:bg-gray-50">Clear filters</button></div></section>
    <section className="overflow-hidden rounded border border-lug-light-gray bg-white" aria-label="People list">{loading ? <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading people…</div> : visible.length === 0 ? <div className="px-6 py-14 text-center"><h2 className="font-semibold text-lug-charcoal">{people.length === 0 ? 'No people registered yet' : 'No people match your filters'}</h2><p className="mt-2 text-sm text-lug-gray">{people.length === 0 ? 'Use the Add person button to register the first person.' : 'Clear or adjust the filters to see more results.'}</p></div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray"><tr>{['Staff ID', 'Name', 'Job title', 'Department', 'Email', 'Phone', 'Employment status', 'Active', 'Assigned assets', 'Updated', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-lug-light-gray">{visible.map((person) => <tr key={person.id} className="hover:bg-gray-50/60"><td className="whitespace-nowrap px-4 py-3 font-medium text-lug-charcoal">{person.staffId}</td><td className="whitespace-nowrap px-4 py-3 text-lug-charcoal">{person.firstName} {person.lastName}</td><td className="px-4 py-3 text-lug-gray">{person.jobTitle || '—'}</td><td className="px-4 py-3 text-lug-gray">{person.departmentId ? departmentNames.get(person.departmentId) ?? 'Unknown' : '—'}</td><td className="px-4 py-3 text-lug-gray">{person.email || '—'}</td><td className="px-4 py-3 text-lug-gray">{person.phone || '—'}</td><td className="whitespace-nowrap px-4 py-3"><span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs">{label(person.employmentStatus)}</span></td><td className="px-4 py-3 text-lug-gray">{person.isActive ? 'Yes' : 'No'}</td><td className="px-4 py-3 text-lug-gray">{activeAssignments.filter((item) => item.personId === person.id).length}</td><td className="px-4 py-3 text-lug-gray">{formatDate(person.updatedAt)}</td><td className="px-4 py-3"><div className="flex gap-3"><Link to={`/assignments?personId=${person.id}`} className="text-lug-red hover:underline">Assigned assets</Link>{hasPermission('people.update') && <button type="button" onClick={() => setEditing(person)} className="text-lug-red hover:underline">Edit</button>}{hasPermission('people.archive') && <button type="button" onClick={() => void handleArchive(person)} className="text-lug-gray hover:text-red-700">Archive</button>}</div></td></tr>)}</tbody></table></div>}{!loading && filtered.length > pageSize && <div className="flex items-center justify-between border-t border-lug-light-gray px-4 py-3 text-sm"><span className="text-lug-gray">Page {page} of {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>}</section>
    {(adding || editing) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="person-form-title"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-6 shadow-xl"><div className="mb-5"><h2 id="person-form-title" className="text-lg font-semibold text-lug-charcoal">{editing ? 'Edit person' : 'Add person'}</h2><p className="mt-1 text-sm text-lug-gray">{editing ? 'Update this personnel record.' : 'Register staff or personnel.'}</p></div><PersonForm departments={departments} person={editing ?? undefined} onCancel={() => { setAdding(false); setEditing(null); }} onSuccess={handleSaved} /></div></div>}
  </div>;
}
