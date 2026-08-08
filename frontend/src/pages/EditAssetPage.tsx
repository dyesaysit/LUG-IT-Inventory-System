import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryUpdateAssetInput as UpdateAssetInput,
  Location,
} from 'shared';
import { fetchAssetById, updateAsset, fetchAssetCategories, fetchLocations } from '../services/api';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import { FormField, FormSection, FormError } from '../components/FormControls';
import { apiErrorMessage } from '../utils/api-error';

type AssetCondition = NonNullable<UpdateAssetInput['condition']>;
type AssetStatus = NonNullable<UpdateAssetInput['status']>;

const CONDITION_OPTIONS = [
  'NEW',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
] as const satisfies readonly AssetCondition[];
const STATUS_OPTIONS = [
  'IN_STOCK',
  'ASSIGNED',
  'DEPLOYED',
  'UNDER_REPAIR',
  'RETIRED',
  'LOST',
  'DISPOSED',
] as const satisfies readonly AssetStatus[];

const isAssetCondition = (value: string): value is AssetCondition =>
  CONDITION_OPTIONS.some((condition) => condition === value);

const isAssetStatus = (value: string): value is AssetStatus =>
  STATUS_OPTIONS.some((status) => status === value);

interface FormState {
  assetTag: string;
  serialNumber: string;
  categoryId: string;
  manufacturer: string;
  model: string;
  description: string;
  purchaseDate: string;
  purchaseCost: string;
  warrantyExpiryDate: string;
  condition: AssetCondition;
  status: AssetStatus;
  currentLocationId: string;
  notes: string;
}

const initialState: FormState = {
  assetTag: '',
  serialNumber: '',
  categoryId: '',
  manufacturer: '',
  model: '',
  description: '',
  purchaseDate: '',
  purchaseCost: '',
  warrantyExpiryDate: '',
  condition: 'NEW',
  status: 'IN_STOCK',
  currentLocationId: '',
  notes: '',
};

function assetToForm(a: Asset): FormState {
  return {
    assetTag: a.assetTag,
    serialNumber: a.serialNumber ?? '',
    categoryId: String(a.categoryId),
    manufacturer: a.manufacturer,
    model: a.model,
    description: a.description ?? '',
    purchaseDate: a.purchaseDate ?? '',
    purchaseCost: a.purchaseCost === null ? '' : String(a.purchaseCost),
    warrantyExpiryDate: a.warrantyExpiryDate ?? '',
    condition: a.condition,
    status: a.status,
    currentLocationId: a.currentLocationId ? String(a.currentLocationId) : '',
    notes: a.notes ?? '',
  };
}

function formToUpdateAsset(form: FormState): UpdateAssetInput {
  return {
    assetTag: form.assetTag,
    serialNumber: form.serialNumber || undefined,
    categoryId: Number(form.categoryId),
    manufacturer: form.manufacturer,
    model: form.model,
    description: form.description || undefined,
    purchaseDate: form.purchaseDate || undefined,
    purchaseCost: form.purchaseCost.trim() === '' ? undefined : Number(form.purchaseCost),
    warrantyExpiryDate: form.warrantyExpiryDate || undefined,
    condition: form.condition,
    status: form.status,
    currentLocationId: Number(form.currentLocationId),
    notes: form.notes || undefined,
  };
}

const EditAssetPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = Number(id);
  const { settings } = useApplicationSettings();
  const currencyLabel = settings?.currencySymbol || 'GH₵';

  const [form, setForm] = useState<FormState>(initialState);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!Number.isSafeInteger(assetId)) {
        setError('Invalid asset ID.');
        return;
      }
      setLoading(true);
      try {
        const [asset, fetchedCategories, fetchedLocations] = await Promise.all([
          fetchAssetById(assetId),
          fetchAssetCategories(),
          fetchLocations({ isActive: true, pageSize: 100, sortBy: 'name' }),
        ]);
        // Keep the asset's current location selectable even if it is now inactive.
        const needsCurrent =
          asset.currentLocationId !== null &&
          !fetchedLocations.some((l) => l.id === asset.currentLocationId);
        const currentOption: Location | null = needsCurrent
          ? {
              id: asset.currentLocationId as number,
              code: '',
              name: asset.currentLocation || `Location ${asset.currentLocationId}`,
              building: '',
              floor: null,
              room: null,
              description: null,
              isActive: false,
              createdAt: '',
              updatedAt: '',
              archivedAt: null,
            }
          : null;
        setForm(assetToForm(asset));
        setCategories(fetchedCategories);
        setLocations(currentOption ? [currentOption, ...fetchedLocations] : fetchedLocations);
      } catch (err) {
        setError(apiErrorMessage(err, 'Unable to load the asset. Please try again.'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [assetId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const input = formToUpdateAsset(form);
      const updated = await updateAsset(assetId, input);
      setForm(assetToForm(updated));
      setSuccess('Asset has been successfully updated.');
    } catch (err) {
      setError(apiErrorMessage(err, 'We could not save the asset. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-lug-red border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-lug-gray">Loading asset details...</p>
        </div>
      </div>
    );
  }

  const inputStyle = "w-full rounded-md border border-lug-light-gray bg-white px-3 py-2 text-sm text-lug-charcoal outline-none placeholder:text-gray-400 focus:border-lug-red focus:ring-1 focus:ring-lug-red transition-all";
  const selectStyle = "w-full rounded-md border border-lug-light-gray bg-white px-3 py-2 text-sm text-lug-charcoal outline-none focus:border-lug-red focus:ring-1 focus:ring-lug-red cursor-pointer transition-all";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Title & Back Actions */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-lug-charcoal">Edit Asset</h1>
          <p className="text-xs text-lug-gray mt-1">Update asset information, regional specifications, and inventory details</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/assets')}
          className="inline-flex self-start items-center gap-1.5 rounded-md border border-lug-light-gray bg-white px-3 py-2 text-xs font-semibold text-lug-charcoal shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to list
        </button>
      </header>

      {/* Success/Error notifications */}
      <FormError message={error} />
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6 pb-12">
        
        {/* Section 1: Identification */}
        <FormSection title="Asset Identification" description="Essential tracking attributes such as identifiers, manufacturer, and models">
          <FormField label="Asset Tag" required>
            <input
              type="text"
              required
              className={inputStyle}
              value={form.assetTag}
              onChange={(e) => handleFieldChange('assetTag', e.target.value)}
              placeholder={`e.g. ${settings?.assetTagPrefix ?? 'IT'}-2026-0001`}
            />
          </FormField>

          <FormField label="Serial Number">
            <input
              type="text"
              className={inputStyle}
              value={form.serialNumber}
              onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
              placeholder="e.g. SN12345678"
            />
          </FormField>

          <FormField label="Category" required>
            <select
              required
              className={selectStyle}
              value={form.categoryId}
              onChange={(e) => handleFieldChange('categoryId', e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Manufacturer" required>
            <input
              type="text"
              required
              className={inputStyle}
              value={form.manufacturer}
              onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
              placeholder="e.g. Apple or Dell"
            />
          </FormField>

          <FormField label="Model" required>
            <input
              type="text"
              required
              className={inputStyle}
              value={form.model}
              onChange={(e) => handleFieldChange('model', e.target.value)}
              placeholder="e.g. MacBook Pro M3"
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Description">
              <input
                type="text"
                className={inputStyle}
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Compact description of the physical unit"
              />
            </FormField>
          </div>
        </FormSection>

        {/* Section 2: Purchase & Financial */}
        <FormSection title="Purchase & Financial Details" description="Financial data including cost and warranties configurations">
          <FormField label="Purchase Date">
            <input
              type="date"
              className={inputStyle}
              value={form.purchaseDate}
              onChange={(e) => handleFieldChange('purchaseDate', e.target.value)}
            />
          </FormField>

          <FormField label="Purchase Cost">
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-sm text-lug-gray">{currencyLabel}</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`${inputStyle} pl-8`}
                value={form.purchaseCost}
                onChange={(e) => handleFieldChange('purchaseCost', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </FormField>

          <FormField label="Warranty Expiry Date">
            <input
              type="date"
              className={inputStyle}
              value={form.warrantyExpiryDate}
              onChange={(e) => handleFieldChange('warrantyExpiryDate', e.target.value)}
            />
          </FormField>
        </FormSection>

        {/* Section 3: Inventory Details */}
        <FormSection title="Inventory Profile & Location" description="Track the lifecycle status, functional condition, and geographical placement">
          <FormField label="Condition" required>
            <select
              className={selectStyle}
              value={form.condition}
              onChange={(e) => {
                if (isAssetCondition(e.target.value)) {
                  handleFieldChange('condition', e.target.value);
                }
              }}
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Status" required>
            <select
              className={selectStyle}
              value={form.status}
              onChange={(e) => {
                if (isAssetStatus(e.target.value)) {
                  handleFieldChange('status', e.target.value);
                }
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Current Location"
            required
            helpText={locations.length === 0 ? 'No active locations found. Add one under Locations first.' : undefined}
          >
            <select
              required
              className={selectStyle}
              value={form.currentLocationId}
              onChange={(e) => handleFieldChange('currentLocationId', e.target.value)}
            >
              <option value="">
                {locations.length === 0 ? 'No locations available' : 'Select a location'}
              </option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {location.building ? ` — ${location.building}` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Notes">
              <textarea
                rows={3}
                className={`${inputStyle} resize-none`}
                value={form.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Any special remarks or instructions for handling this asset"
              />
            </FormField>
          </div>
        </FormSection>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 border-t border-lug-light-gray pt-6">
          <button
            type="button"
            disabled={submitting}
            onClick={() => navigate('/assets')}
            className="rounded-md border border-lug-light-gray bg-white px-4 py-2 text-sm font-semibold text-lug-charcoal hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-lug-red/20 focus:ring-offset-2 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-lug-red px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-lug-red focus:ring-offset-2 disabled:opacity-50 transition-all"
          >
            {submitting ? 'Saving changes…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAssetPage;
