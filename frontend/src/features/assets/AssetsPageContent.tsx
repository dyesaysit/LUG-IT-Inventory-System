import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { InventoryAsset as Asset, InventoryAssetCategory as AssetCategory } from 'shared';
import AddAssetForm from '../../components/AddAssetForm';
import { archiveAsset, fetchAssetCategories, fetchAssets } from '../../services/api';

const statuses = ['IN_STOCK', 'ASSIGNED', 'DEPLOYED', 'UNDER_REPAIR', 'RETIRED', 'LOST', 'DISPOSED'] as const;
const conditions = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const;
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
const dateLabel = (value: string) => {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
};

/** Full asset inventory interface. */
export function AssetsPageContent() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [condition, setCondition] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetData, categoryData] = await Promise.all([fetchAssets(), fetchAssetCategories()]);
      setAssets(assetData);
      setCategories(categoryData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load assets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const searchable = [asset.assetTag, asset.manufacturer, asset.model, asset.serialNumber ?? ''].join(' ').toLowerCase();
      return (
        (query === '' || searchable.includes(query)) &&
        (categoryId === '' || asset.categoryId === Number(categoryId)) &&
        (status === '' || asset.status === status) &&
        (condition === '' || asset.condition === condition)
      );
    });
  }, [assets, categoryId, condition, search, status]);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setStatus('');
    setCondition('');
  };

  const handleArchive = async (asset: Asset) => {
    if (!window.confirm(`Archive asset ${asset.assetTag}?`)) return;
    setError(null);
    try {
      await archiveAsset(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setSuccess(`${asset.assetTag} was archived.`);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to archive asset.');
    }
  };

  const summary = [
    ['Total assets', assets.length],
    ['In stock', assets.filter((asset) => asset.status === 'IN_STOCK').length],
    ['Assigned', assets.filter((asset) => asset.status === 'ASSIGNED').length],
    ['Under repair', assets.filter((asset) => asset.status === 'UNDER_REPAIR').length],
  ] as const;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-lug-charcoal">Assets</h1>
          <p className="mt-1 text-sm text-lug-gray">Register and manage LUG IT equipment</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Add asset</button>
      </header>

      {success && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Asset summary">
        {summary.map(([title, value]) => (
          <div key={title} className="rounded border border-lug-light-gray bg-white px-4 py-3">
            <p className="text-xs text-lug-gray">{title}</p>
            <p className="mt-1 text-xl font-semibold text-lug-charcoal">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded border border-lug-light-gray bg-white p-4" aria-label="Asset filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets" aria-label="Search assets" className="rounded border border-lug-light-gray px-3 py-2 text-sm" />
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Filter by category" className="rounded border border-lug-light-gray px-3 py-2 text-sm">
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className="rounded border border-lug-light-gray px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
          <select value={condition} onChange={(event) => setCondition(event.target.value)} aria-label="Filter by condition" className="rounded border border-lug-light-gray px-3 py-2 text-sm">
            <option value="">All conditions</option>
            {conditions.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
          <button type="button" onClick={clearFilters} className="rounded border border-lug-light-gray px-3 py-2 text-sm text-lug-charcoal hover:bg-gray-50">Clear filters</button>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-lug-light-gray bg-white" aria-label="Asset list">
        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-lug-gray">Loading assets…</div>
        ) : filteredAssets.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-lug-charcoal">{assets.length === 0 ? 'No assets registered yet' : 'No assets match your filters'}</h2>
            <p className="mt-2 text-sm text-lug-gray">{assets.length === 0 ? 'Use the Add asset button to register the first device.' : 'Clear or adjust the filters to see more results.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-lug-light-gray bg-gray-50 text-xs text-lug-gray">
                <tr>{['Asset tag', 'Asset', 'Category', 'Serial number', 'Status', 'Condition', 'Current location', 'Updated', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-lug-light-gray">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-lug-charcoal">{asset.assetTag}</td>
                    <td className="px-4 py-3"><p className="font-medium text-lug-charcoal">{asset.manufacturer} {asset.model}</p><p className="text-xs text-lug-gray">{asset.description || '—'}</p></td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{categoryNames.get(asset.categoryId) ?? `Category ${asset.categoryId}`}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{asset.serialNumber || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs">{label(asset.status)}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{label(asset.condition)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{asset.currentLocation || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-lug-gray">{dateLabel(asset.updatedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><div className="flex gap-3"><Link to={`/assets/${asset.id}/edit`} className="text-lug-red hover:underline">Edit</Link><button type="button" onClick={() => void handleArchive(asset)} className="text-lug-gray hover:text-red-700">Archive</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="add-asset-title">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-6 shadow-xl">
            <div className="mb-5"><h2 id="add-asset-title" className="text-lg font-semibold text-lug-charcoal">Add asset</h2><p className="mt-1 text-sm text-lug-gray">Register a device in the LUG inventory.</p></div>
            <AddAssetForm onCancel={() => setAdding(false)} onSuccess={(asset) => { setAssets((current) => [asset, ...current]); setAdding(false); setSuccess(`${asset.assetTag} was added successfully.`); }} />
          </div>
        </div>
      )}
    </div>
  );
}
