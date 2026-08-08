import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  Location,
} from 'shared';
import { createAsset, fetchAssetCategories, fetchLocations } from '../services/api';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import { FormField, FormSection, FormError } from './FormControls';
import { apiErrorMessage } from '../utils/api-error';

type AssetCondition = CreateAssetInput['condition'];
type AssetStatus = CreateAssetInput['status'];

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

interface AddAssetFormProps {
  onCancel?: () => void;
  onSuccess?: (asset: Asset) => void;
}

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

const INITIAL: FormState = {
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

function toCreateAssetInput(form: FormState): CreateAssetInput {
  return {
    assetTag: form.assetTag,
    serialNumber: form.serialNumber || null,
    categoryId: Number(form.categoryId),
    manufacturer: form.manufacturer,
    model: form.model,
    description: form.description || '',
    purchaseDate: form.purchaseDate || null,
    purchaseCost: form.purchaseCost.trim() === '' ? null : Number(form.purchaseCost),
    warrantyExpiryDate: form.warrantyExpiryDate || null,
    condition: form.condition,
    status: form.status,
    currentLocationId: Number(form.currentLocationId),
    notes: form.notes || '',
  };
}

/**
 * AddAssetForm Component - Styled to support clear UI/UX boundaries, consistent spacing, and standard styling.
 */
export const AddAssetForm = ({ onCancel, onSuccess }: AddAssetFormProps) => {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { settings } = useApplicationSettings();
  const currencyLabel = settings?.currencySymbol || 'GH₵';

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [categoryData, locationData] = await Promise.all([
          fetchAssetCategories(),
          fetchLocations({ isActive: true, pageSize: 100, sortBy: 'name' }),
        ]);
        setCategories(categoryData);
        setLocations(locationData);
      } catch (err) {
        setError(apiErrorMessage(err, 'Unable to load form options. Please try again.'));
      } finally {
        setOptionsLoading(false);
      }
    };
    void loadOptions();
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const input = toCreateAssetInput(form);
      const createdAsset = await createAsset(input);
      setForm(INITIAL);
      onSuccess?.(createdAsset);
    } catch (err) {
      setError(apiErrorMessage(err, 'We could not add the asset. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = "w-full rounded-md border border-lug-light-gray bg-white px-3 py-2 text-sm text-lug-charcoal outline-none placeholder:text-gray-400 focus:border-lug-red focus:ring-1 focus:ring-lug-red transition-all";
  const selectStyle = "w-full rounded-md border border-lug-light-gray bg-white px-3 py-2 text-sm text-lug-charcoal outline-none focus:border-lug-red focus:ring-1 focus:ring-lug-red cursor-pointer transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
      <FormError message={error} />

      {/* Grid of details inside form controls */}
      <div className="space-y-6">
        
        {/* Section 1: Identification */}
        <FormSection title="Asset Identification" description="Core details used to track the device within the inventory">
          <FormField label="Asset Tag" required>
            <input
              type="text"
              required
              className={inputStyle}
              value={form.assetTag}
              onChange={(e) => update('assetTag', e.target.value)}
              placeholder={`e.g. ${settings?.assetTagPrefix ?? 'IT'}-2026-0001`}
            />
          </FormField>

          <FormField label="Serial Number">
            <input
              type="text"
              className={inputStyle}
              value={form.serialNumber}
              onChange={(e) => update('serialNumber', e.target.value)}
              placeholder="e.g. SN12345678"
            />
          </FormField>

          <FormField label="Category" required>
            <select
              required
              className={selectStyle}
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
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
              onChange={(e) => update('manufacturer', e.target.value)}
              placeholder="e.g. Apple or Dell"
            />
          </FormField>

          <FormField label="Model" required>
            <input
              type="text"
              required
              className={inputStyle}
              value={form.model}
              onChange={(e) => update('model', e.target.value)}
              placeholder="e.g. MacBook Pro M3"
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Description">
              <input
                type="text"
                className={inputStyle}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Compact description of the physical unit"
              />
            </FormField>
          </div>
        </FormSection>

        {/* Section 2: Financial & Sourcing */}
        <FormSection title="Purchase & Financial Details" description="Financial cost parameters and active warranties">
          <FormField label="Purchase Date">
            <input
              type="date"
              className={inputStyle}
              value={form.purchaseDate}
              onChange={(e) => update('purchaseDate', e.target.value)}
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
                onChange={(e) => update('purchaseCost', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </FormField>

          <FormField label="Warranty Expiry Date">
            <input
              type="date"
              className={inputStyle}
              value={form.warrantyExpiryDate}
              onChange={(e) => update('warrantyExpiryDate', e.target.value)}
            />
          </FormField>
        </FormSection>

        {/* Section 3: Profile & Location */}
        <FormSection title="Inventory Profile & Location" description="Device functional status, condition level, and placement">
          <FormField label="Condition" required>
            <select
              className={selectStyle}
              value={form.condition}
              onChange={(e) => {
                if (isAssetCondition(e.target.value)) update('condition', e.target.value);
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
                if (isAssetStatus(e.target.value)) update('status', e.target.value);
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
            helpText={!optionsLoading && locations.length === 0 ? 'No active locations found. Add one under Locations first.' : undefined}
          >
            <select
              required
              className={selectStyle}
              value={form.currentLocationId}
              onChange={(e) => update('currentLocationId', e.target.value)}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading
                  ? 'Loading locations…'
                  : locations.length === 0
                    ? 'No locations available'
                    : 'Select a location'}
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
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Any special remarks or instructions for handling this asset"
              />
            </FormField>
          </div>
        </FormSection>
      </div>

      {/* Button Tray */}
      <div className="flex items-center justify-end gap-3 border-t border-lug-light-gray pt-5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-lug-light-gray bg-white px-4 py-2 text-sm font-semibold text-lug-charcoal hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-lug-red/20 focus:ring-offset-2 transition-all"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-lug-red px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-lug-red focus:ring-offset-2 disabled:opacity-50 transition-all"
        >
          {submitting ? 'Creating asset…' : 'Add asset'}
        </button>
      </div>
    </form>
  );
};
