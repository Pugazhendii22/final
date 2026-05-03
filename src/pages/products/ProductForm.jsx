import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { getLabelNumber } from '../../utils/getLabelNumber';
import { printLabel } from '../../utils/printLabel.jsx';

const ProductForm = ({ onSave, onCancel, initialData = null }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState(initialData || {
    name: '',
    brand: '',
    category: 'Charger',
    purchasePrice: '',
    salePrice: '',
    stock: '',
    threshold: 5,
    sku: '',
    notes: '',
    imageUrl: '',
    compatibleModels: []
  });
  const [modelsInput, setModelsInput] = useState(initialData?.compatibleModels ? initialData.compatibleModels.join(', ') : '');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [labelAssigned, setLabelAssigned] = useState(false);
  const [assignedLabelNumber, setAssignedLabelNumber] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [localId, setLocalId] = useState(initialData?.id || null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved

  useEffect(() => {
    if (localId) {
      const checkLabel = async () => {
        const q = query(collection(db, 'label_registry'), where('referenceId', '==', localId), where('labelType', '==', 'product'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLabelAssigned(true);
          setAssignedLabelNumber(snap.docs[0].data().labelNumber);
        }
      };
      checkLabel();
    }
  }, [localId]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      setFormData(prev => ({ ...prev, imageUrl: data.secure_url }));
    } catch (err) {
      console.error("Upload error:", err);
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    setError('');

    try {
      let finalSku = formData.sku;
      if (!finalSku) {
        finalSku = 'SKU-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      }

      const stockNum = Number(formData.stock) || 0;
      const thresholdNum = Number(formData.threshold) || 5;

      let status = 'in stock';
      if (stockNum === 0) status = 'out of stock';
      else if (stockNum <= thresholdNum) status = 'low stock';

      const data = {
        ...formData,
        sku: finalSku,
        purchasePrice: Number(formData.purchasePrice) || 0,
        salePrice: Number(formData.salePrice) || 0,
        stock: stockNum,
        threshold: thresholdNum,
        status,
        compatibleModels: modelsInput.split(',').map(m => m.trim()).filter(m => m !== ''),
        updatedAt: new Date().toISOString()
      };

      if (!localId) {
        data.createdAt = new Date().toISOString();
        data.createdBy = currentUser.uid;
      } else {
        data.id = localId;
      }
      
      const newId = await onSave(data);
      if (newId) setLocalId(newId);
      setSaveStatus('saved');
    } catch (err) {
      setError(err.message);
      setSaveStatus('idle');
    }
  };

  const handleAssignLabel = async () => {
    if (!localId) return;
    setAssigning(true);
    try {
      const nextNum = await getLabelNumber();
      if (window.confirm(`Assign label #${nextNum} to this product?`)) {
        await addDoc(collection(db, 'label_registry'), {
          labelNumber: Number(nextNum),
          labelType: 'product',
          referenceId: localId,
          assignedBy: currentUser.uid,
          assignedAt: new Date().toISOString(),
          isActive: true,
          data: {
            productName: formData.name || '',
            brand: formData.brand || '',
            category: formData.category || '',
            sku: formData.sku || '',
            purchasePrice: Number(formData.purchasePrice) || 0,
            salePrice: Number(formData.salePrice) || 0,
            stockQuantity: Number(formData.stock) || 0,
            imageUrl: formData.imageUrl || '',
            notes: formData.notes || '',
          }
        });
        setLabelAssigned(true);
        setAssignedLabelNumber(nextNum);
      }
    } catch (err) {
      alert("Error assigning label: " + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handlePrintLabel = () => {
    if (labelAssigned && assignedLabelNumber) {
      printLabel({
        labelNumber: assignedLabelNumber,
        labelType: 'product',
        data: {
          productName: formData.name || '',
          brand: formData.brand || '',
          category: formData.category || '',
          salePrice: Number(formData.salePrice) || 0,
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      {error && <div className="text-red-600 bg-red-100 p-3 rounded">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Product Name *</label>
          <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Compatible Models (optional)</label>
          <textarea value={modelsInput} onChange={e => setModelsInput(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>
          <p className="mt-1 text-xs text-gray-500">Separate each model with a comma. E.g: C21, C21Y, C25, C25S</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Brand</label>
          <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category *</label>
          <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="Charger">Charger</option>
            <option value="Cable">Cable</option>
            <option value="Earphones">Earphones</option>
            <option value="Back Cover">Back Cover</option>
            <option value="Screen Guard">Screen Guard</option>
            <option value="Battery">Battery</option>
            <option value="Memory Card">Memory Card</option>
            <option value="Power Bank">Power Bank</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
          <input type="number" min="0" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sale Price *</label>
          <input type="number" min="0" required value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stock Quantity *</label>
          <input type="number" min="0" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
          <input type="number" min="0" value={formData.threshold} onChange={e => setFormData({...formData, threshold: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Barcode / SKU</label>
          <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="Leave blank to auto-generate" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
          <input type="file" accept="image/*" onChange={handleUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
          {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="mt-2 h-32 object-contain rounded border" />}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="3"></textarea>
        </div>
      </div>

      <div className="flex flex-col mt-6 pt-4 border-t">
        {saveStatus === 'saved' && <div className="text-green-600 font-medium mb-3">Saved successfully</div>}
        <div className="flex gap-3 flex-wrap items-center">
          {saveStatus === 'saved' ? (
            <button type="submit" disabled={uploading} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">
              Saved ✓
            </button>
          ) : (
            <button type="submit" disabled={saveStatus === 'saving' || uploading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-blue-700">
              {saveStatus === 'saving' ? 'Saving...' : 'Save Product'}
            </button>
          )}
          
          {labelAssigned ? (
            <button type="button" disabled className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold cursor-not-allowed">
              Label Assigned: #{assignedLabelNumber} ✓
            </button>
          ) : (
            <button type="button" onClick={handleAssignLabel} disabled={!localId || assigning} className="bg-slate-700 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-slate-800">
              {assigning ? 'Assigning...' : 'Assign Label'}
            </button>
          )}
          
          <button type="button" onClick={handlePrintLabel} disabled={!labelAssigned} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-purple-700">
            Print Label
          </button>

          <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg text-gray-700 bg-white hover:bg-gray-50 ml-auto font-medium">
            {saveStatus === 'saved' || labelAssigned ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
