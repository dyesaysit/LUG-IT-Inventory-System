import axios from 'axios';
import type {
  AssetListQuery,
  InventoryAsset as Asset,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
} from 'shared';

/**
 * API base URL.
 */
const API_URL = '/api';

/**
 * Assets API endpoint.
 */
const ASSETS_ENDPOINT = `${API_URL}/assets`;

/**
 * Fetches a list of assets.
 *
 * @param query - Query parameters (e.g. search, status, condition)
 * @returns Promise of asset list
 */
export const fetchAssets = async (query: AssetListQuery = {}): Promise<Asset[]> => {
  const response = await axios.get<Asset[]>(ASSETS_ENDPOINT, { params: query });
  return response.data;
};

/**
 * Fetches an asset by ID.
 *
 * @param id - Asset ID
 * @returns Promise of asset object
 */
export const fetchAssetById = async (id: number): Promise<Asset> => {
  const response = await axios.get<Asset>(`${ASSETS_ENDPOINT}/${id}`);
  return response.data;
};

/**
 * Creates a new asset.
 *
 * @param asset - Asset object
 * @returns Promise of created asset object
 */
export const createAsset = async (asset: CreateAssetInput): Promise<Asset> => {
  const response = await axios.post<Asset>(ASSETS_ENDPOINT, asset);
  return response.data;
};

/**
 * Updates an existing asset.
 *
 * @param id - Asset ID
 * @param asset - Asset object
 * @returns Promise of updated asset object
 */
export const updateAsset = async (id: number, asset: UpdateAssetInput): Promise<Asset> => {
  const response = await axios.patch<Asset>(`${ASSETS_ENDPOINT}/${id}`, asset);
  return response.data;
};

/**
 * Archives an asset.
 *
 * @param id - Asset ID
 * @returns Promise of archived asset object
 */
export const archiveAsset = async (id: number): Promise<void> => {
  await axios.delete(`${ASSETS_ENDPOINT}/${id}`);
};
