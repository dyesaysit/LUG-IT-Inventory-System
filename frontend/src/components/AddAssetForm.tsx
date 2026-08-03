import { useState } from 'react';
import type { FormEvent } from 'react';
import { CreateAssetInputSchema } from 'shared';
import { createAsset } from '../services/api';

/**
 * Add asset form component.
 *
 * @returns JSX element
 */
const AddAssetForm = () => {
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [condition, setCondition] = useState('');
  const [status, setStatus] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const asset = CreateAssetInputSchema.parse({
        assetTag,
        serialNumber,
        categoryId,
        manufacturer,
        model,
        description,
        purchaseDate,
        purchaseCost,
        warrantyExpiryDate,
        condition,
        status,
        currentLocation,
        notes,
      });
      await createAsset(asset);
      setAssetTag('');
      setSerialNumber('');
      setCategoryId(0);
      setManufacturer('');
      setModel('');
      setDescription('');
      setPurchaseDate('');
      setPurchaseCost(0);
      setWarrantyExpiryDate('');
      setCondition('');
      setStatus('');
      setCurrentLocation('');
      setNotes('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Asset Tag:
        <input type="text" value={assetTag} onChange={(event) => setAssetTag(event.target.value)} />
      </label>
      <label>
        Serial Number:
        <input type="text" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
      </label>
      <label>
        Category ID:
        <input type="number" value={categoryId} onChange={(event) => setCategoryId(event.target.valueAsNumber)} />
      </label>
      <label>
        Manufacturer:
        <input type="text" value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} />
      </label>
      <label>
        Model:
        <input type="text" value={model} onChange={(event) => setModel(event.target.value)} />
      </label>
      <label>
        Description:
        <input type="text" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Purchase Date:
        <input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
      </label>
      <label>
        Purchase Cost:
        <input type="number" value={purchaseCost} onChange={(event) => setPurchaseCost(event.target.valueAsNumber)} />
      </label>
      <label>
        Warranty Expiry Date:
        <input type="date" value={warrantyExpiryDate} onChange={(event) => setWarrantyExpiryDate(event.target.value)} />
      </label>
      <label>
        Condition:
        <input type="text" value={condition} onChange={(event) => setCondition(event.target.value)} />
      </label>
      <label>
        Status:
        <input type="text" value={status} onChange={(event) => setStatus(event.target.value)} />
      </label>
      <label>
        Current Location:
        <input type="text" value={currentLocation} onChange={(event) => setCurrentLocation(event.target.value)} />
      </label>
      <label>
        Notes:
        <input type="text" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <button type="submit">Add Asset</button>
    </form>
  );
};

export default AddAssetForm;
