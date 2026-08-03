import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAssetRepository } from '../repositories/AssetRepository';
import type { InventoryCreateAssetInput as CreateAssetInput } from 'shared';

/**
 * Asset repository test suite.
 */
describe('AssetRepository', () => {
  it('should create a new asset', async () => {
    const repository = createAssetRepository();
    const asset: CreateAssetInput = {
      assetTag: 'Test Asset',
      serialNumber: '123456',
      categoryId: 1,
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      description: 'Test Description',
      purchaseDate: '2022-01-01',
      purchaseCost: 100.0,
      warrantyExpiryDate: '2023-01-01',
      condition: 'NEW',
      status: 'IN_STOCK',
      currentLocation: 'Test Location',
      notes: 'Test Notes',
    };
    const createdAsset = await repository.createAsset(asset);
    assert.deepEqual(createdAsset, asset);
  });

  it('should get an asset by ID', async () => {
    const repository = createAssetRepository();
    const asset: CreateAssetInput = {
      assetTag: 'Test Asset',
      serialNumber: '123456',
      categoryId: 1,
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      description: 'Test Description',
      purchaseDate: '2022-01-01',
      purchaseCost: 100.0,
      warrantyExpiryDate: '2023-01-01',
      condition: 'NEW',
      status: 'IN_STOCK',
      currentLocation: 'Test Location',
      notes: 'Test Notes',
    };
    const createdAsset = await repository.createAsset(asset);
    const retrievedAsset = await repository.getAssetById(createdAsset.id);
    assert.deepEqual(retrievedAsset, createdAsset);
  });

  it('should update an asset', async () => {
    const repository = createAssetRepository();
    const asset: CreateAssetInput = {
      assetTag: 'Test Asset',
      serialNumber: '123456',
      categoryId: 1,
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      description: 'Test Description',
      purchaseDate: '2022-01-01',
      purchaseCost: 100.0,
      warrantyExpiryDate: '2023-01-01',
      condition: 'NEW',
      status: 'IN_STOCK',
      currentLocation: 'Test Location',
      notes: 'Test Notes',
    };
    const createdAsset = await repository.createAsset(asset);
    const updatedAsset = {
      ...createdAsset,
      assetTag: 'Updated Test Asset',
    };
    await repository.updateAsset(createdAsset.id, updatedAsset);
    const retrievedAsset = await repository.getAssetById(createdAsset.id);
    assert.deepEqual(retrievedAsset, updatedAsset);
  });

  it('should archive an asset', async () => {
    const repository = createAssetRepository();
    const asset: CreateAssetInput = {
      assetTag: 'Test Asset',
      serialNumber: '123456',
      categoryId: 1,
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      description: 'Test Description',
      purchaseDate: '2022-01-01',
      purchaseCost: 100.0,
      warrantyExpiryDate: '2023-01-01',
      condition: 'NEW',
      status: 'IN_STOCK',
      currentLocation: 'Test Location',
      notes: 'Test Notes',
    };
    const createdAsset = await repository.createAsset(asset);
    await repository.archiveAsset(createdAsset.id);
    const retrievedAsset = await repository.getAssetById(createdAsset.id);
    assert.equal(retrievedAsset, null);
  });
});
