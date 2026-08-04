import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type {
  InventoryAsset as Asset,
  InventoryUpdateAssetInput as UpdateAssetInput,
} from 'shared';
import { fetchAssetById, updateAsset } from '../services/api';

type AssetCondition = NonNullable<UpdateAssetInput['condition']>;
type AssetStatus = NonNullable<UpdateAssetInput['status']>;

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

/** Form state mirrors UpdateAssetInput shape using string for nullable fields and numbers for numeric fields. */
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
  currentLocation: '',
  notes: '',
};

/** Maps a server Asset to form state. */
function assetToForm(a: Asset): FormState {
  return {
    assetTag: a.assetTag,
    serialNumber: a.serialNumber ?? '',
    categoryId: String(a.categoryId),
    manufacturer: a.manufacturer,
    model: a.model,
    description: a.description,
    purchaseDate: a.purchaseDate ?? '',
    purchaseCost: a.purchaseCost === null ? '' : String(a.purchaseCost),
    warrantyExpiryDate: a.warrantyExpiryDate ?? '',
    condition: a.condition,
    status: a.status,
    currentLocation: a.currentLocation,
    notes: a.notes,
  };
}

/** Maps form state to an UpdateAssetInput. */
function formToUpdateAsset(form: FormState): UpdateAssetInput {
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
 * Edit asset page component.
 */
const EditAssetPage = () => {
  const { id } = useParams<{ id: string }>();
  const assetId = Number(id);
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!Number.isSafeInteger(assetId)) {
        setError(new Error('Invalid asset ID.'));
        return;
      }
      setLoading(true);
      try {
        const asset = await fetchAssetById(assetId);
        setForm(assetToForm(asset));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assetId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const input = formToUpdateAsset(form);
      const updated = await updateAsset(assetId, input);
      setForm(assetToForm(updated));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Asset Tag:
        <input type="text" value={form.assetTag} onChange={(e) => setForm((prev) => ({ ...prev, assetTag: e.target.value }))} />
      </label>
      <label>
        Serial Number:
        <input type="text" value={form.serialNumber} onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))} />
      </label>
      <label>
        Category ID:
        <input type="number" value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))} />
      </label>
      <label>
        Manufacturer:
        <input type="text" value={form.manufacturer} onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))} />
      </label>
      <label>
        Model:
        <input type="text" value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} />
      </label>
      <label>
        Description:
        <input type="text" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
      </label>
      <label>
        Purchase Date:
        <input type="date" value={form.purchaseDate} onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} />
      </label>
      <label>
        Purchase Cost:
        <input type="number" value={form.purchaseCost} onChange={(e) => setForm((prev) => ({ ...prev, purchaseCost: e.target.value }))} />
      </label>
      <label>
        Warranty Expiry Date:
        <input type="date" value={form.warrantyExpiryDate} onChange={(e) => setForm((prev) => ({ ...prev, warrantyExpiryDate: e.target.value }))} />
      </label>
      <label>
        Condition:
        <select
          value={form.condition}
          onChange={(e) => {
            const { value } = e.target;
            if (isAssetCondition(value)) {
              setForm((prev) => ({ ...prev, condition: value }));
            }
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
            const { value } = e.target;
            if (isAssetStatus(value)) {
              setForm((prev) => ({ ...prev, status: value }));
            }
          }}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        Current Location:
        <input type="text" value={form.currentLocation} onChange={(e) => setForm((prev) => ({ ...prev, currentLocation: e.target.value }))} />
      </label>
      <label>
        Notes:
        <input type="text" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
      </label>
      <button type="submit">Update Asset</button>
    </form>
  );
};

export default EditAssetPage;
