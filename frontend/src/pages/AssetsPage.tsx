import { useEffect, useState } from 'react';
import type { InventoryAsset as Asset } from 'shared';
import { fetchAssets } from '../services/api';

/**
 * Assets page component.
 *
 * @returns JSX element
 */
const AssetsPage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAssetsData = async () => {
      setLoading(true);
      try {
        const data = await fetchAssets();
        setAssets(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    fetchAssetsData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Assets</h1>
      <ul>
        {assets.map((asset) => (
          <li key={asset.id}>{asset.assetTag}</li>
        ))}
      </ul>
    </div>
  );
};

export default AssetsPage;
