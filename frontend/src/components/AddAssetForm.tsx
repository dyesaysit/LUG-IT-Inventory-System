import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
} from 'shared';
import { createAsset, fetchAssetCategories } from '../services/api';

type AssetCondition = CreateAssetInput['condition'];
type AssetStatus = CreateAssetInput['status'];

const CONDITION_OPTIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const satisfies readonly AssetCondition[];
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

/** Form state type (strings for all inputs, numbers for numeric fields). */
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
  currentLocation: string;
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
  currentLocation: '',
  notes: '',
};

/** Converts form state to a valid CreateAssetInput, mapping empty strings and zeros to null where appropriate. */
function toCreateAssetInput(form: FormState): CreateAssetInput {
  return {
    assetTag: form.assetTag,
    serialNumber: form.serialNumber,
    categoryId: Number(form.categoryId),
    manufacturer: form.manufacturer,
    model: form.model,
    description: form.description,
    purchaseDate: form.purchaseDate,
    purchaseCost: form.purchaseCost.trim() === '' ? 0 : Number(form.purchaseCost),
    warrantyExpiryDate: form.warrantyExpiryDate,
    condition: form.condition,
    status: form.status,
    currentLocation: form.currentLocation,
    notes: form.notes,
  };
}

/**
 * Add asset form component.
 */
const AddAssetForm = ({ onCancel, onSuccess }: AddAssetFormProps) => {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategories(await fetchAssetCategories());
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to load categories.');
      }
    };

    void loadCategories();
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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to add asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&_label]:text-sm [&_label]:font-medium [&_label]:text-lug-charcoal [&_input]:mt-1 [&_input]:w-full [&_input]:rounded [&_input]:border [&_input]:border-lug-light-gray [&_input]:px-3 [&_input]:py-2 [&_select]:mt-1 [&_select]:w-full [&_select]:rounded [&_select]:border [&_select]:border-lug-light-gray [&_select]:px-3 [&_select]:py-2"
    >
      {error && (
        <div className="sm:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <label>
        Asset Tag:
        <input type="text" value={form.assetTag} onChange={(e) => update('assetTag', e.target.value)} />
      </label>
      <label>
        Serial Number:
        <input type="text" value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} />
      </label>
      <label>
        Category:
        <select value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} required>
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Manufacturer:
        <input type="text" value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} />
      </label>
      <label>
        Model:
        <input type="text" value={form.model} onChange={(e) => update('model', e.target.value)} />
      </label>
      <label>
        Description:
        <input type="text" value={form.description} onChange={(e) => update('description', e.target.value)} />
      </label>
      <label>
        Purchase Date:
        <input type="date" value={form.purchaseDate} onChange={(e) => update('purchaseDate', e.target.value)} />
      </label>
      <label>
        Purchase Cost:
        <input type="number" value={form.purchaseCost} onChange={(e) => update('purchaseCost', e.target.value)} />
      </label>
      <label>
        Warranty Expiry Date:
        <input type="date" value={form.warrantyExpiryDate} onChange={(e) => update('warrantyExpiryDate', e.target.value)} />
      </label>
      <label>
        Condition:
        <select
          value={form.condition}
          onChange={(e) => {
            if (isAssetCondition(e.target.value)) update('condition', e.target.value);
          }}
        >
          {CONDITION_OPTIONS.map((condition) => (
            <option key={condition} value={condition}>{condition}</option>
          ))}
        </select>
      </label>
      <label>
        Status:
        <select
          value={form.status}
          onChange={(e) => {
            if (isAssetStatus(e.target.value)) update('status', e.target.value);
          }}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        Current Location:
        <input type="text" value={form.currentLocation} onChange={(e) => update('currentLocation', e.target.value)} />
      </label>
      <label>
        Notes:
        <input type="text" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
      </label>
      <div className="sm:col-span-2 flex justify-end gap-2 border-t border-lug-light-gray pt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border border-lug-light-gray px-4 py-2 text-sm text-lug-charcoal hover:bg-gray-50">
            Cancel
          </button>
        )}
        <button type="submit" disabled={submitting} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
          {submitting ? 'Saving…' : 'Add asset'}
        </button>
      </div>
    </form>
  );
};

export default AddAssetForm;
