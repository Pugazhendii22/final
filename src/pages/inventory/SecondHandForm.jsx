import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import CustomerAutocomplete from '../../components/common/CustomerAutocomplete';
import ImeiInput from '../../components/ImeiInput';
import { getLabelNumber } from '../../utils/getLabelNumber';
import { printLabel } from '../../utils/printLabel.jsx';

const SecondHandForm = ({ initialData, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const defaultChecklist = {
    frontCamera: "Working", rearCamera: "Working", earpieceSpeaker: "Working",
    simSlot1: "Working", simSlot2: "Working", microphone: "Working", loudspeaker: "Working",
    proximitySensor: "Working", powerButton: "Working", volumeButtons: "Working",
    mobileData: "Working", bluetooth: "Working", wifi: "Working", flashlight: "Working",
    displayReplaced: "No", whiteSpots: "No", physicalDamage: "No"
  };

  const calculateGrade = (checklist) => {
    if (checklist.physicalDamage === 'Yes' || 
        (checklist.simSlot1 === 'Not Working' && checklist.simSlot2 === 'Not Working') ||
        (checklist.earpieceSpeaker === 'Not Working' && checklist.loudspeaker === 'Not Working' && checklist.microphone === 'Not Working')) {
      return 'D';
    }

    const notWorkingItems = Object.keys(checklist).filter(k => checklist[k] === 'Not Working');
    
    if (checklist.displayReplaced === 'Yes' || checklist.whiteSpots === 'Yes' || notWorkingItems.length >= 4) {
      return 'C';
    }

    const bGradeAllowedItems = ['proximitySensor', 'powerButton', 'volumeButtons', 'frontCamera', 'rearCamera', 'bluetooth', 'wifi', 'mobileData', 'flashlight'];
    const hasCriticalNotWorking = notWorkingItems.some(item => !bGradeAllowedItems.includes(item));
    
    if (hasCriticalNotWorking) {
        return 'C'; 
    }

    if (notWorkingItems.length >= 1 && notWorkingItems.length <= 3) {
      return 'B';
    }

    return 'A';
  };

  const [formData, setFormData] = useState(() => {
    const base = initialData || {};
    const checklist = base.conditionChecklist || { ...defaultChecklist };
    const autoGrade = base.gradeAutoCalculated || calculateGrade(checklist);
    const manualOverride = base.gradeManualOverride || false;
    const initialCondition = base.condition || (manualOverride ? base.condition : autoGrade);
    
    return {
      brand: base.brand || '',
      customBrand: base.customBrand || '',
      model: base.model || '',
      ram: base.ram || '',
      rom: base.rom || '',
      imei1: base.imei1 || '',
      imei2: base.imei2 || '',
      purchasePrice: base.purchasePrice || '',
      salePrice: base.salePrice || '',
      condition: initialCondition,
      conditionDetails: base.conditionDetails || {},
      notes: base.notes || '',
      photo1Url: base.photo1Url || base.frontImageUrl || '',
      photo2Url: base.photo2Url || base.backImageUrl || '',
      photo3Url: base.photo3Url || '',
      photo4Url: base.photo4Url || '',
      photo5Url: base.photo5Url || '',
      photo6Url: base.photo6Url || '',
      idCardFrontUrl: base.idCardFrontUrl || '',
      idCardBackUrl: base.idCardBackUrl || '',
      sellerCustomerId: base.sellerCustomerId || '',
      sellerName: base.sellerName || '',
      sellerPhone: base.sellerPhone || '',
      sellerAlternatePhone: base.sellerAlternatePhone || '',
      purchaseDate: base.purchaseDate || new Date().toISOString().split('T')[0],
      supplier: base.supplier || '',
      status: base.status || 'available',
      conditionChecklist: checklist,
      gradeAutoCalculated: autoGrade,
      gradeManualOverride: manualOverride
    };
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState({});
  const [error, setError] = useState('');
  
  const [customers, setCustomers] = useState([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', idType: 'Aadhaar', idNumber: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [labelAssigned, setLabelAssigned] = useState(false);
  const [assignedLabelNumber, setAssignedLabelNumber] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [localId, setLocalId] = useState(initialData?.id || null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved

  useEffect(() => {
    if (localId) {
      const checkLabel = async () => {
        const q = query(collection(db, 'label_registry'), where('referenceId', '==', localId), where('labelType', '==', 'second_hand'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLabelAssigned(true);
          setAssignedLabelNumber(snap.docs[0].data().labelNumber);
        }
      };
      checkLabel();
    }
  }, [localId]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const snap = await getDocs(collection(db, 'customers'));
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setCustomers(list);
    };
    fetchCustomers();
  }, []);

  const handleCustomerSelect = (c) => {
    setFormData(prev => ({
      ...prev,
      sellerCustomerId: c.id,
      sellerName: c.name || '',
      sellerPhone: c.phone || '',
      sellerAlternatePhone: c.alternatePhone || ''
    }));
  };

  const handleSaveNewCustomer = async () => {
    if(!newCust.name || !newCust.phone) return alert('Name and phone required');
    setSavingCustomer(true);
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        name: newCust.name,
        phone: newCust.phone,
        idType: newCust.idType,
        idNumber: newCust.idNumber
      });
      const c = { id: docRef.id, name: newCust.name, phone: newCust.phone, idType: newCust.idType, idNumber: newCust.idNumber };
      setCustomers(prev => [...prev, c]);
      handleCustomerSelect(c);
      setShowNewCustomer(false);
      setNewCust({ name: '', phone: '', idType: 'Aadhaar', idNumber: '' });
    } catch(err) {
      alert(err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const BRANDS = ['Samsung', 'Apple', 'Xiaomi', 'Realme', 'OPPO', 'Vivo', 'OnePlus', 'Nokia', 'Other'];
  const RAM_OPTIONS = ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'];
  const ROM_OPTIONS = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];

  const group1 = [
    { key: 'frontCamera', label: 'Front Camera' },
    { key: 'rearCamera', label: 'Rear Camera' },
    { key: 'earpieceSpeaker', label: 'Earpiece Speaker' },
    { key: 'simSlot1', label: 'SIM Slot 1' },
    { key: 'simSlot2', label: 'SIM Slot 2' },
    { key: 'microphone', label: 'Microphone' },
    { key: 'loudspeaker', label: 'Loudspeaker' },
    { key: 'proximitySensor', label: 'Proximity Sensor' },
    { key: 'powerButton', label: 'Power Button' },
    { key: 'volumeButtons', label: 'Volume Buttons' },
    { key: 'mobileData', label: 'Mobile Data' },
    { key: 'bluetooth', label: 'Bluetooth' },
    { key: 'wifi', label: 'Wi-Fi' },
    { key: 'flashlight', label: 'Flashlight' }
  ];

  const group2 = [
    { key: 'displayReplaced', label: 'Display Replaced' },
    { key: 'whiteSpots', label: 'White Spots on Display' },
    { key: 'physicalDamage', label: 'Physical Damage / Bent' }
  ];

  const handleUploadPhoto = async (file, fieldName) => {
    if (!file) return;
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset || cloudName.includes('paste_')) {
      setError("Cloudinary configuration missing in .env");
      return;
    }

    setUploadingPhotos(prev => ({ ...prev, [fieldName]: true }));
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: data,
      });
      const fileData = await res.json();
      if (fileData.secure_url) {
        setFormData(prev => ({ ...prev, [fieldName]: fileData.secure_url }));
      } else {
        throw new Error(fileData.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const removePhoto = (fieldName) => setFormData(prev => ({ ...prev, [fieldName]: '' }));

  const handleConditionChange = (e) => {
    setFormData({
      ...formData,
      condition: e.target.value,
      conditionDetails: {}, // reset details when condition changes
      gradeManualOverride: true
    });
  };

  const handleChecklistChange = (key, value) => {
    setFormData(prev => {
      const newChecklist = { ...prev.conditionChecklist, [key]: value };
      const newGrade = calculateGrade(newChecklist);
      return {
        ...prev,
        conditionChecklist: newChecklist,
        condition: newGrade,
        gradeAutoCalculated: newGrade,
        gradeManualOverride: false
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.photo1Url) {
      setError("Photo 1 (Front) is required.");
      return;
    }
    setSaveStatus('saving');
    setError('');
    try {
      const finalData = { ...formData, createdBy: currentUser.uid };
      if (finalData.brand === 'Other') {
        finalData.brand = finalData.customBrand;
      }
      delete finalData.customBrand;
      
      if (localId) {
        finalData.id = localId;
      }
      
      const newId = await onSave(finalData);
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
      if (window.confirm(`Assign label #${nextNum} to this mobile?`)) {
        await addDoc(collection(db, 'label_registry'), {
          labelNumber: Number(nextNum),
          labelType: 'second_hand',
          referenceId: localId,
          assignedBy: currentUser.uid,
          assignedAt: new Date().toISOString(),
          isActive: true,
          data: { ...formData }
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
      // Print with assigned label number
      printLabel({
        labelType: 'second_hand',
        labelNumber: assignedLabelNumber,
        data: {
          brand: formData.brand,
          model: formData.model,
          ram: formData.ram,
          rom: formData.rom,
          salePrice: formData.salePrice,
          imei1: formData.imei1,
          grade: formData.condition,
        }
      });
    } else {
      // Print without assigned label — use IMEI1 as barcode
      printLabel({
        labelType: 'second_hand',
        labelNumber: null,
        data: {
          brand: formData.brand,
          model: formData.model,
          ram: formData.ram,
          rom: formData.rom,
          salePrice: formData.salePrice,
          imei1: formData.imei1,
          grade: formData.condition,
        }
      });
    }
  };

  const renderPhotoUpload = (label, fieldName, isRequired = false) => (
    <div className="border border-gray-200 rounded p-3 bg-white">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {isRequired && <span className="text-red-500">*</span>}
      </label>
      {formData[fieldName] ? (
        <div className="relative">
          <img src={formData[fieldName]} alt={label} className="h-32 w-full object-cover rounded shadow-sm border" />
          <button type="button" onClick={() => removePhoto(fieldName)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center hover:bg-red-600 shadow text-xs">
            ✕
          </button>
        </div>
      ) : (
        <div>
          <input type="file" accept="image/*" onChange={e => handleUploadPhoto(e.target.files[0], fieldName)} className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          {uploadingPhotos[fieldName] && <span className="text-sm text-blue-600 block mt-1">Uploading...</span>}
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-8">
      {error && <div className="text-red-600 bg-red-100 p-3 rounded">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 mt-2">
          <h4 className="font-semibold text-gray-700 border-b pb-2 mb-4">Seller Details</h4>
          <CustomerAutocomplete
            customers={customers}
            nameValue={formData.sellerName}
            phoneValue={formData.sellerPhone}
            onNameChange={val => setFormData({...formData, sellerName: val})}
            onPhoneChange={val => setFormData({...formData, sellerPhone: val})}
            onSelectCustomer={handleCustomerSelect}
          />
          <div className="mt-2 text-sm text-gray-600 flex items-center justify-between">
            <span>Can't find the seller?</span>
            <button type="button" onClick={() => setShowNewCustomer(!showNewCustomer)} className="text-indigo-600 font-medium hover:underline">
              {showNewCustomer ? 'Cancel Adding New' : '+ Add New Customer'}
            </button>
          </div>
          {showNewCustomer && (
            <div className="mt-3 p-4 bg-indigo-50 border border-indigo-100 rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Name *</label>
                <input type="text" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Phone *</label>
                <input type="text" value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">ID Type</label>
                <select value={newCust.idType} onChange={e => setNewCust({...newCust, idType: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 p-2 text-sm">
                  <option>Aadhaar</option>
                  <option>PAN</option>
                  <option>Driving License</option>
                  <option>Voter ID</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">ID Number</label>
                <input type="text" value={newCust.idNumber} onChange={e => setNewCust({...newCust, idNumber: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 p-2 text-sm" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button type="button" onClick={handleSaveNewCustomer} disabled={savingCustomer} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-indigo-700">
                  {savingCustomer ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 mt-4"><h4 className="font-semibold text-gray-700 border-b pb-2">Device Info</h4></div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Brand *</label>
          <select required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="">Select Brand</option>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {formData.brand === 'Other' && (
            <input type="text" placeholder="Enter Custom Brand" required value={formData.customBrand || ''} onChange={e => setFormData({...formData, customBrand: e.target.value})} className="mt-2 block w-full border border-gray-300 rounded-md p-2" />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Model *</label>
          <input type="text" required list="model-list" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          <datalist id="model-list">
            <option value="Galaxy S23" />
            <option value="iPhone 14" />
            <option value="iPhone 13" />
            <option value="Redmi Note 12" />
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">RAM *</label>
          <select required value={formData.ram} onChange={e => setFormData({...formData, ram: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="">Select RAM</option>
            {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ROM *</label>
          <select required value={formData.rom} onChange={e => setFormData({...formData, rom: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="">Select ROM</option>
            {ROM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <ImeiInput
            label="IMEI 1"
            value={formData.imei1}
            onChange={val => setFormData({...formData, imei1: val})}
            required={true}
            scannerId="scanner-secondhand-imei1"
          />
        </div>
        <div>
          <ImeiInput
            label="IMEI 2 (optional)"
            value={formData.imei2}
            onChange={val => setFormData({...formData, imei2: val})}
            scannerId="scanner-secondhand-imei2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Purchase Price *</label>
          <input type="number" required min="0" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sale Price *</label>
          <input type="number" required min="0" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Purchase Date *</label>
          <input type="date" required value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Supplier</label>
          <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>

        <div className="md:col-span-2 mt-6">
          <h4 className="font-semibold text-gray-700 border-b pb-2 mb-4">Device Condition Check</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <div className="space-y-4">
              <h5 className="font-medium text-gray-600 mb-2">Functionality Checks</h5>
              {group1.map(item => (
                <div key={item.key} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => handleChecklistChange(item.key, 'Working')} className={`px-3 py-1 text-xs font-medium rounded-full ${formData.conditionChecklist[item.key] === 'Working' ? 'bg-green-100 text-green-800 border-green-300 border' : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'}`}>Working</button>
                    <button type="button" onClick={() => handleChecklistChange(item.key, 'Not Working')} className={`px-3 py-1 text-xs font-medium rounded-full ${formData.conditionChecklist[item.key] === 'Not Working' ? 'bg-red-100 text-red-800 border-red-300 border' : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'}`}>Not Working</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h5 className="font-medium text-gray-600 mb-2">Physical Checks</h5>
              {group2.map(item => (
                <div key={item.key} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => handleChecklistChange(item.key, 'Yes')} className={`px-3 py-1 text-xs font-medium rounded-full ${formData.conditionChecklist[item.key] === 'Yes' ? 'bg-red-100 text-red-800 border-red-300 border' : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'}`}>Yes</button>
                    <button type="button" onClick={() => handleChecklistChange(item.key, 'No')} className={`px-3 py-1 text-xs font-medium rounded-full ${formData.conditionChecklist[item.key] === 'No' ? 'bg-green-100 text-green-800 border-green-300 border' : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'}`}>No</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <label className="block text-sm font-medium text-gray-700">Calculated Grade:</label>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              formData.condition === 'A' ? 'bg-green-500 text-white' :
              formData.condition === 'B' ? 'bg-blue-500 text-white' :
              formData.condition === 'C' ? 'bg-orange-500 text-white' :
              formData.condition === 'D' ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-800'
            }`}>
              {formData.condition || '-'}
            </span>
            <span className="text-xs text-gray-500 italic">
              {formData.gradeManualOverride ? '(Manually set)' : '(Auto calculated — you can override below)'}
            </span>
          </div>
          
          <label className="block text-sm font-medium text-gray-700 mt-4">Override Condition (Optional)</label>
          <select required value={formData.condition} onChange={handleConditionChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white">
            <option value="">Select Condition</option>
            <option value="A">A - In warranty (brand), full kit & bill</option>
            <option value="B">B - Out of warranty (minor wear & tear)</option>
            <option value="C">C - Out of warranty (worn-out condition)</option>
            <option value="D">D - Crack/chipped/broken/parts missing</option>
          </select>
        </div>

        {formData.condition === 'A' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Warranty Expiry</label>
              <input type="date" value={formData.conditionDetails.warrantyExpiry || ''} onChange={e => setFormData({...formData, conditionDetails: {...formData.conditionDetails, warrantyExpiry: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Accessories Included</label>
              <input type="text" value={formData.conditionDetails.accessories || ''} onChange={e => setFormData({...formData, conditionDetails: {...formData.conditionDetails, accessories: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
            </div>
          </>
        )}

        {formData.condition === 'B' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description of Wear</label>
            <textarea required value={formData.conditionDetails.wearDescription || ''} onChange={e => setFormData({...formData, conditionDetails: {...formData.conditionDetails, wearDescription: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md p-2"></textarea>
          </div>
        )}

        {formData.condition === 'C' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description of Condition</label>
            <textarea required value={formData.conditionDetails.conditionDescription || ''} onChange={e => setFormData({...formData, conditionDetails: {...formData.conditionDetails, conditionDescription: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md p-2"></textarea>
          </div>
        )}

        {formData.condition === 'D' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description of Damage</label>
            <textarea required value={formData.conditionDetails.damageDescription || ''} onChange={e => setFormData({...formData, conditionDetails: {...formData.conditionDetails, damageDescription: e.target.value}})} className="mt-1 block w-full border border-gray-300 rounded-md p-2"></textarea>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Special features / notes</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="3"></textarea>
        </div>

        <div className="md:col-span-2 mt-6">
          <h4 className="font-semibold text-gray-700 border-b pb-2 mb-4">Mobile Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {renderPhotoUpload('Photo 1: Front', 'photo1Url', true)}
            {renderPhotoUpload('Photo 2: Back', 'photo2Url')}
            {renderPhotoUpload('Photo 3: Left Side', 'photo3Url')}
            {renderPhotoUpload('Photo 4: Right Side', 'photo4Url')}
            {renderPhotoUpload('Photo 5: Top/Bottom', 'photo5Url')}
            {renderPhotoUpload('Photo 6: Additional', 'photo6Url')}
          </div>
          
          <h4 className="font-semibold text-gray-700 border-b pb-2 mt-8 mb-4">Document / ID Card Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {renderPhotoUpload('Photo 7: ID Card Front', 'idCardFrontUrl')}
            {renderPhotoUpload('Photo 8: ID Card Back / Doc', 'idCardBackUrl')}
          </div>
        </div>
      </div>

      <div className="flex flex-col mt-6 pt-4 border-t">
        {saveStatus === 'saved' && <div className="text-green-600 font-medium mb-3">Saved successfully</div>}
        <div className="flex gap-3 flex-wrap items-center">
          {saveStatus === 'saved' ? (
            <button type="submit" disabled={Object.values(uploadingPhotos).some(v => v)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">
              Saved ✓
            </button>
          ) : (
            <button type="submit" disabled={saveStatus === 'saving' || Object.values(uploadingPhotos).some(v => v)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-blue-700">
              {saveStatus === 'saving' ? 'Saving...' : 'Save Mobile'}
            </button>
          )}
          
          {labelAssigned ? (
            <button type="button" disabled className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold cursor-not-allowed">
              Label #{assignedLabelNumber} ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAssignLabel}
              disabled={!localId || assigning}
              className="bg-slate-700 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              {assigning ? 'Assigning...' : 'Assign Label'}
            </button>
          )}
          
          <button
            type="button"
            onClick={handlePrintLabel}
            disabled={!localId}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700"
          >
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

export default SecondHandForm;
