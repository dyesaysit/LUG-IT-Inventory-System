import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { UpdateAssetInputSchema } from 'shared';
import type { InventoryUpdateAssetInput as UpdateAssetInput } from 'shared';
import { fetchAssetById, updateAsset } from '../services/api';

type AssetFormState = Omit<UpdateAssetInput, 'condition' | 'status'> & {
  condition?: string;
  status?: string;
};

/**
 * Edit asset page component.
 *
 * @param id - Asset ID
 * @returns JSX element
 */
const EditAssetPage = ({ id }: { id: number }) => {
  const [asset, setAsset] = useState<AssetFormState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAssetData = async () => {
      setLoading(true);
      try {
        const data = await fetchAssetById(id);
        setAsset(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    fetchAssetData();
  }, [id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const updatedAsset = UpdateAssetInputSchema.parse(asset);
      await updateAsset(id, updatedAsset);
      setAsset(updatedAsset);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Asset Tag:
        <input type="text" value={asset.assetTag} onChange={(event) => setAsset({ ...asset, assetTag: event.target.value })} />
      </label>
      <label>
        Serial Number:
        <input type="text" value={asset.serialNumber ?? ''} onChange={(event) => setAsset({ ...asset, serialNumber: event.target.value })} />
      </label>
      <label>
        Category ID:
        <input type="number" value={asset.categoryId} onChange={(event) => setAsset({ ...asset, categoryId: event.target.valueAsNumber })} />
      </label>
      <label>
        Manufacturer:
        <input type="text" value={asset.manufacturer} onChange={(event) => setAsset({ ...asset, manufacturer: event.target.value })} />
      </label>
      <label>
        Model:
        <input type="text" value={asset.model} onChange={(event) => setAsset({ ...asset, model: event.target.value })} />
      </label>
      <label>
        Description:
        <input type="text" value={asset.description} onChange={(event) => setAsset({ ...asset, description: event.target.value })} />
      </label>
      <label>
        Purchase Date:
        <input type="date" value={asset.purchaseDate ?? ''} onChange={(event) => setAsset({ ...asset, purchaseDate: event.target.value })} />
      </label>
      <label>
        Purchase Cost:
        <input type="number" value={asset.purchaseCost ?? ''} onChange={(event) => setAsset({ ...asset, purchaseCost: event.target.valueAsNumber })} />
      </label>
      <label>
        Warranty Expiry Date:
        <input type="date" value={asset.warrantyExpiryDate ?? ''} onChange={(event) => setAsset({ ...asset, warrantyExpiryDate: event.target.value })} />
      </label>
      <label>
        Condition:
        <input type="text" value={asset.condition} onChange={(event) => setAsset({ ...asset, condition: event.target.value })} />
      </label>
      <label>
        Status:
        <input type="text" value={asset.status} onChange={(event) => setAsset({ ...asset, status: event.target.value })} />
      </label>
      <label>
        Current Location:
        <input type="text" value={asset.currentLocation} onChange={(event) => setAsset({ ...asset, currentLocation: event.target.value })} />
      </label>
      <label>
        Notes:
        <input type="text" value={asset.notes} onChange={(event) => setAsset({ ...asset, notes: event.target.value })} />
      </label>
      <button type="submit">Update Asset</button>
    </form>
  );
};

export default EditAssetPage;
