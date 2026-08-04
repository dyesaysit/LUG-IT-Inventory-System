import axios from 'axios';
import type {
  AssetListQuery,
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
} from 'shared';

/**
 * API base URL.
 */
const api = axios.create({
  baseURL: '/api',
});

/**
 * Assets API endpoint.
 */
const ASSETS_ENDPOINT = '/assets';
const ASSET_CATEGORIES_ENDPOINT = '/asset-categories';

interface AssetApiResponse {
  id: number;
  asset_tag: string;
  serial_number: string | null;
  category_id: number;
  manufacturer: string;
  model: string;
  description: string;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_expiry_date: string | null;
  condition: Asset['condition'];
  status: Asset['status'];
  current_location: string;
  notes: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface AssetCategoryApiResponse {
  id: number;
  name: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const mapAsset = (asset: AssetApiResponse): Asset => ({
  id: asset.id,
  assetTag: asset.asset_tag,
  serialNumber: asset.serial_number,
  categoryId: asset.category_id,
  manufacturer: asset.manufacturer,
  model: asset.model,
  description: asset.description,
  purchaseDate: asset.purchase_date,
  purchaseCost: asset.purchase_cost,
  warrantyExpiryDate: asset.warranty_expiry_date,
  condition: asset.condition,
  status: asset.status,
  currentLocation: asset.current_location,
  notes: asset.notes,
  createdAt: asset.created_at,
  updatedAt: asset.updated_at,
  archivedAt: asset.archived_at,
});

const mapAssetCategory = (category: AssetCategoryApiResponse): AssetCategory => ({
  id: category.id,
  name: category.name,
  description: category.description,
  isActive: category.is_active === 1,
  createdAt: category.created_at,
  updatedAt: category.updated_at,
});

/**
 * Fetches the available asset categories.
 *
 * @returns Promise of asset categories
 */
export const fetchAssetCategories = async (): Promise<AssetCategory[]> => {
  const response = await api.get<AssetCategoryApiResponse[]>(ASSET_CATEGORIES_ENDPOINT);
  return response.data.map(mapAssetCategory);
};

/**
 * Fetches a list of assets.
 *
 * @param query - Query parameters (e.g. search, status, condition)
 * @returns Promise of asset list
 */
export const fetchAssets = async (query: AssetListQuery = {}): Promise<Asset[]> => {
  const response = await api.get<AssetApiResponse[]>(ASSETS_ENDPOINT, { params: query });
  return response.data.map(mapAsset);
};

/**
 * Fetches an asset by ID.
 *
 * @param id - Asset ID
 * @returns Promise of asset object
 */
export const fetchAssetById = async (id: number): Promise<Asset> => {
  const response = await api.get<AssetApiResponse>(`${ASSETS_ENDPOINT}/${id}`);
  return mapAsset(response.data);
};

/**
 * Creates a new asset.
 *
 * @param asset - Asset object
 * @returns Promise of created asset object
 */
export const createAsset = async (asset: CreateAssetInput): Promise<Asset> => {
  const response = await api.post<AssetApiResponse>(ASSETS_ENDPOINT, asset);
  return mapAsset(response.data);
};

/**
 * Updates an existing asset.
 *
 * @param id - Asset ID
 * @param asset - Asset object
 * @returns Promise of updated asset object
 */
export const updateAsset = async (id: number, asset: UpdateAssetInput): Promise<Asset> => {
  const response = await api.patch<AssetApiResponse>(`${ASSETS_ENDPOINT}/${id}`, asset);
  return mapAsset(response.data);
};

/**
 * Archives an asset.
 *
 * @param id - Asset ID
 * @returns Promise of archived asset object
 */
export const archiveAsset = async (id: number): Promise<void> => {
  await api.delete(`${ASSETS_ENDPOINT}/${id}`);
};
