import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Department } from 'shared';
import { DepartmentForm } from '../components/DepartmentForm';
import { archiveDepartment, fetchDepartments } from '../services/api';

const pageSize = 10;
const formatDate = (value: string) => {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};

/** Complete Departments management page. */
export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDepartments(await fetchDepartments({ pageSize: 100, sortBy: 'name' }));
    } catch (requestError) {
      setError(axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data.error ?? requestError.message
        : 'Unable to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDepartments(); }, [loadDepartments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return departments.filter((department) => {
      const matchesSearch = term === '' || [department.code, department.name, department.headOfDepartment ?? '']
        .some((value) => value.toLowerCase().includes(term));
      const matchesStatus = status === '' || department.isActive === (status === 'active');
      return matchesSearch && matchesStatus;
    });
  }, [departments, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const clearFilters = () => { setSearch(''); setStatus(''); setPage(1); };
  const handleSaved = (department: Department) => {
    setDepartments((current) => {
      const exists = current.some((item) => item.id === department.id);
      return exists
        ? current.map((item) => item.id === department.id ? department : item)
        : [...current, department].sort((a, b) => a.name.localeCompare(b.name));
    });
    setAdding(false);
    setEditing(null);
    setSuccess(`${department.name} was saved successfully.`);
  };

  const handleArchive = async (department: Department) => {
    if (!window.confirm(`Archive ${department.name}?`)) return;
    setError(null);
    try {
      await archiveDepartment(department.id);
      setDepartments((current) => current.filter((item) => item.id !== department.id));
      setSuccess(`${department.name} was archived.`);
    } catch (requestError) {
      setError(axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data.error ?? requestError.message
        : 'Unable to archive the department.');
    }
  };

  const summary = [
    ['Total departments', departments.length],
    ['Active departments', departments.filter((item) => item.isActive).length],
    ['Inactive departments', departments.filter((item) => !item.isActive).length],
  ] as const;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-semibold text-lug-charcoal">Departments</h1><p className="mt-1 text-sm text-lug-gray">Manage Lancaster University Ghana departments</p></div>
        <button type="button" onClick={() => setAdding(true)} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Add department</button>
      </header>

      {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Department summary">
        {summary.map(([label, value]) => <div key={label} className="rounded border border-lug-light-gray bg-white px-4 py-3"><p className="text-xs text-lug-gray">{label}</p><p className="mt-1 text-xl font-semibold text-lug-charcoal">{value}</p></div>)}
      </section>

      <section className="rounded border border-lug-light-gray bg-white p-4" aria-label="Department filters">
        <div className="grid gap-3 sm:grid-cols-3">
          <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search departments" aria-label="Search departments" className="rounded border border-lug-light-gray px-3 py-2 text-sm" />
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by status" className="rounded border border-lug-light-gray px-3 py-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <button type="button" onClick={clearFilters} className="rounded border border-lug-light-gray px-3 py-2 text-sm hover:bg-gray-50">Clear filters</button>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-lug-light-gray bg-white" aria-label="Department list">
        {loading ? <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading departments…</div>
          : visible.length === 0 ? <div className="px-6 py-14 text-center"><h2 className="font-semibold text-lug-charcoal">{departments.length === 0 ? 'No departments registered yet' : 'No departments match your filters'}</h2><p className="mt-2 text-sm text-lug-gray">{departments.length === 0 ? 'Use the Add department button to create the first department.' : 'Clear or adjust the filters to see more results.'}</p></div>
          : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray"><tr>{['Code', 'Department', 'Head of department', 'Email', 'Phone', 'Status', 'Updated', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-lug-light-gray">{visible.map((department) => <tr key={department.id} className="hover:bg-gray-50/60"><td className="px-4 py-3 font-medium text-lug-charcoal">{department.code}</td><td className="px-4 py-3"><p className="font-medium text-lug-charcoal">{department.name}</p><p className="max-w-xs truncate text-xs text-lug-gray">{department.description || '—'}</p></td><td className="px-4 py-3 text-lug-gray">{department.headOfDepartment || '—'}</td><td className="px-4 py-3 text-lug-gray">{department.email || '—'}</td><td className="px-4 py-3 text-lug-gray">{department.phone || '—'}</td><td className="px-4 py-3"><span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs">{department.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3 text-lug-gray">{formatDate(department.updatedAt)}</td><td className="px-4 py-3"><div className="flex gap-3"><button type="button" onClick={() => setEditing(department)} className="text-lug-red hover:underline">Edit</button><button type="button" onClick={() => void handleArchive(department)} className="text-lug-gray hover:text-red-700">Archive</button></div></td></tr>)}</tbody></table></div>}
        {!loading && filtered.length > pageSize && <div className="flex items-center justify-between border-t border-lug-light-gray px-4 py-3 text-sm"><span className="text-lug-gray">Page {page} of {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>}
      </section>

      {(adding || editing) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="department-form-title"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-xl"><div className="mb-5"><h2 id="department-form-title" className="text-lg font-semibold text-lug-charcoal">{editing ? 'Edit department' : 'Add department'}</h2><p className="mt-1 text-sm text-lug-gray">{editing ? 'Update the department details.' : 'Create a Lancaster University Ghana department.'}</p></div><DepartmentForm department={editing ?? undefined} onCancel={() => { setAdding(false); setEditing(null); }} onSuccess={handleSaved} /></div></div>}
    </div>
  );
}
