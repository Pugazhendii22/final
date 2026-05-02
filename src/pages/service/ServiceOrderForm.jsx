import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import CustomerAutocomplete from '../../components/common/CustomerAutocomplete';
import { getLabelNumber } from '../../utils/getLabelNumber';
import { printLabel } from '../../utils/printLabel.jsx';

const PatternLock = lazy(() => import('../../components/PatternLock').catch(() => ({ default: () => <div className="text-red-500">Failed to load PatternLock</div> })));

const ServiceOrderForm = ({ initialData, onSave, onCancel }) => {
  const { currentUser, userName, userRole } = useAuth();
  const [staffOptions, setStaffOptions] = useState([]);

  const formatDateTimeLocal = (value) => {
    if (!value) return '';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState(() => {
    const nowLocal = new Date().toISOString().slice(0, 16);
    const base = initialData ? {
      ...initialData,
      alternatePhone: initialData.alternatePhone || '',
      technicianName: initialData.technicianName || userName || currentUser?.displayName || currentUser?.email || '',
      technicianUid: initialData.technicianUid || currentUser?.uid || '',
      receivedAt: formatDateTimeLocal(initialData.receivedAt) || nowLocal,
      expectedCompletionAt: formatDateTimeLocal(initialData.expectedCompletionAt) || ''
    } : {
      customerName: '',
      customerPhone: '',
      alternatePhone: '',
      brand: '',
      customBrand: '',
      model: '',
      colour: '',
      problemDetails: '',
      imei1: initialData?.imei1 || initialData?.imei || '',
      imei2: initialData?.imei2 || '',
      lockType: 'None',
      lockHint: initialData?.lockHint || initialData?.lockCode || '',
      lockPattern: initialData?.lockPattern || [],
      accessories: [],
      estimatedPrice: '',
      advancePaid: '0',
      status: 'Received',
      rawMaterialCost: '',
      outsideLabourCost: '',
      suggestions: '',
      imageUrl: '',
      technicianName: userName || currentUser?.displayName || currentUser?.email || '',
      technicianUid: currentUser?.uid || '',
      receivedAt: nowLocal,
      expectedCompletionAt: ''
    };
    return {
      ...base,
      complaintTypes: base.complaintTypes || (base.complaintNature ? [base.complaintNature] : []),
      otherComplaint: base.otherComplaint || (base.customComplaint || '')
    };
  });
  
  const [complaintSearch, setComplaintSearch] = useState('');
  

  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userRole?.toLowerCase() !== 'admin') return;

    const fetchStaff = async () => {
      try {
        const q = query(collection(db, 'users'), where('isActive', '==', true));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(doc => list.push({ uid: doc.id, ...doc.data() }));
        setStaffOptions(list);

        if (!initialData) {
          const defaultTech = list.find(u => u.uid === currentUser?.uid) || list[0];
          if (defaultTech) {
            setFormData(prev => ({
              ...prev,
              technicianUid: defaultTech.uid,
              technicianName: defaultTech.name || defaultTech.email || ''
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching active staff:', err);
        setStaffOptions([]);
      }
    };

    fetchStaff();
  }, [userRole, currentUser, initialData]);
  const [labelAssigned, setLabelAssigned] = useState(false);
  const [assignedLabelNumber, setAssignedLabelNumber] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [localId, setLocalId] = useState(initialData?.id || null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeImeiField, setActiveImeiField] = useState('imei1');
  const [scannerError, setScannerError] = useState('');
  const [scannerLoading, setScannerLoading] = useState(false);
  const html5QrcodeRef = useRef(null);
  const scannerDivId = 'imei-scanner-div';

  const stopScanner = () => {
    if (html5QrcodeRef.current) {
      html5QrcodeRef.current.stop()
        .then(() => html5QrcodeRef.current?.clear())
        .catch(() => {});
      html5QrcodeRef.current = null;
    }
  };

  useEffect(() => {
    if (!scannerOpen) return undefined;

    const timer = setTimeout(() => {
      html5QrcodeRef.current = new Html5Qrcode(scannerDivId);
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 100 },
        formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128]
      };

      html5QrcodeRef.current.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          try {
            stopScanner();
          } catch (err) {
            console.error('Error stopping scanner after success:', err);
          }
          setFormData(prev => ({ ...prev, [activeImeiField]: decodedText }));
          setScannerOpen(false);
        },
        () => {}
      ).catch(() => {
        setScannerError('Unable to start camera scanner.');
      }).finally(() => {
        setScannerLoading(false);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (!scannerOpen) return;
      stopScanner();
    };
  }, [scannerOpen, activeImeiField]);

  const openScanner = (field) => {
    setActiveImeiField(field);
    setScannerError('');
    setScannerLoading(true);
    setScannerOpen(true);
  };

  const closeScanner = () => {
    stopScanner();
    setScannerOpen(false);
    setScannerError('');
    setScannerLoading(false);
  };

  useEffect(() => {
    if (localId) {
      const checkLabel = async () => {
        try {
          const q = query(collection(db, 'label_registry'), where('referenceId', '==', localId), where('labelType', '==', 'service_order'));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setLabelAssigned(true);
            setAssignedLabelNumber(snap.docs[0].data().labelNumber);
          }
        } catch (err) {
          console.error("Error fetching label:", err);
        }
      };
      checkLabel();
    }
  }, [localId]);

  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const BRANDS = ['Samsung', 'Apple', 'Xiaomi', 'Realme', 'OPPO', 'Vivo', 'OnePlus', 'Nokia', 'Other'];
  const COMPLAINTS = [
    'Water locked mobile service', 'Display replacement', 'Battery replacement', 
    'Battery & coil replacement', 'Touch glass crack replacement', 'Charging board replacement', 
    'Charging pin fixing', 'Speaker replacement', 'Mike replacement service', 
    'Motherboard EMMC work', 'Power IC work', 'General cleaning', 
    'Power button strips replacement inner', 'Power button strips replacement outer', 
    'Volume strip replacement inner', 'Volume strip replacement outer', 
    'Ringer loud speaker replacement', 'Middle frame replacement', 'Full body panel Bezel', 
    'Back door replacement', 'Network complaint fix', 'Tamper glass replacement', 
    'Mobile pouch', 'Watch battery replacement', 'Watch charging issue or dead', 
    'Bluetooth earphone battery replacement', 'Bluetooth earphone charging issues or dead', 
    'Other'
  ];

  const filteredComplaints = COMPLAINTS.filter(c => c.toLowerCase().includes(complaintSearch.toLowerCase()));

  const handleComplaintToggle = (complaint) => {
    setFormData(prev => {
      const types = prev.complaintTypes || [];
      if (types.includes(complaint)) {
        return { ...prev, complaintTypes: types.filter(t => t !== complaint) };
      } else {
        return { ...prev, complaintTypes: [...types, complaint] };
      }
    });
  };

  const removeComplaint = (complaint) => {
    setFormData(prev => ({
      ...prev,
      complaintTypes: (prev.complaintTypes || []).filter(t => t !== complaint)
    }));
  };
  const LOCK_TYPES = ['None', 'PIN', 'Password', 'Pattern', 'Fingerprint', 'Face Unlock', 'Other'];
  const ACCESSORIES_OPTIONS = ['SIM card', 'Memory card', 'Back cover', 'Charger', 'Earphones', 'Box', 'Other'];
  const STATUSES = ['Received', 'In Progress', 'Parts Awaiting', 'Completed', 'Awaiting Customer Approval', 'Returned'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const custSnap = await getDocs(collection(db, 'customers'));
        const cList = [];
        custSnap.forEach(doc => {
          cList.push({ id: doc.id, ...doc.data() });
        });
        setCustomers(cList);
      } catch (err) {
        console.error("Error fetching data:", err);
        setCustomers([]);
      }
    };
    fetchData();
  }, []);

  const handleCustomerSelect = (c) => {
    setFormData(prev => ({ 
      ...prev, 
      customerName: c.name || '', 
      customerPhone: c.phone || '' 
    }));
  };

  const handleAccessoryChange = (acc) => {
    setFormData(prev => {
      const isSelected = prev.accessories.includes(acc);
      if (isSelected) {
        return { ...prev, accessories: prev.accessories.filter(a => a !== acc) };
      } else {
        return { ...prev, accessories: [...prev.accessories, acc] };
      }
    });
  };

  const handleUpload = async (file) => {
    if (!file) return;
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset || cloudName.includes('paste_')) {
      setError("Cloudinary configuration missing in .env");
      return;
    }

    setUploading(true);
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
        setFormData(prev => ({ ...prev, imageUrl: fileData.secure_url }));
      } else {
        throw new Error(fileData.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imei1 || !formData.imei1.trim()) {
      setError('Please provide IMEI 1');
      return;
    }
    if (!formData.complaintTypes || formData.complaintTypes.length === 0) {
      setError('Please select at least one complaint type');
      return;
    }
    if (!formData.receivedAt || !formData.expectedCompletionAt) {
      setError('Please provide both received and expected completion dates');
      return;
    }

    const receivedAtDate = new Date(formData.receivedAt);
    const expectedCompletionDate = new Date(formData.expectedCompletionAt);
    if (Number.isNaN(receivedAtDate.getTime()) || Number.isNaN(expectedCompletionDate.getTime())) {
      setError('Please provide valid datetime values for received and expected completion');
      return;
    }

    setSaveStatus('saving');
    setError('');
    try {
      const finalData = { ...formData, createdBy: currentUser?.uid || '' };
      if (finalData.brand === 'Other') {
        finalData.brand = finalData.customBrand;
      }
      delete finalData.customBrand;
      delete finalData.complaintNature;
      delete finalData.customComplaint;
      delete finalData.imei;
      if (!finalData.complaintTypes.includes('Other')) {
        finalData.otherComplaint = '';
      }

      if (userRole?.toLowerCase() === 'staff') {
        finalData.technicianName = userName || currentUser?.displayName || currentUser?.email || '';
        finalData.technicianUid = currentUser?.uid || '';
      } else if (userRole?.toLowerCase() === 'admin') {
        const selectedTech = staffOptions.find(u => u.uid === finalData.technicianUid);
        finalData.technicianName = selectedTech?.name || finalData.technicianName || currentUser?.displayName || currentUser?.email || '';
        finalData.technicianUid = finalData.technicianUid || currentUser?.uid || '';
      } else {
        finalData.technicianName = userName || currentUser?.displayName || currentUser?.email || '';
        finalData.technicianUid = currentUser?.uid || '';
      }

      finalData.alternatePhone = formData.alternatePhone || '';
      finalData.receivedAt = receivedAtDate;
      finalData.expectedCompletionAt = expectedCompletionDate;
      if (finalData.lockType !== 'Pattern') finalData.lockPattern = [];
      if (!['PIN', 'Password', 'Other'].includes(finalData.lockType)) finalData.lockHint = '';

      if (localId) finalData.id = localId;

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
      if (window.confirm(`Assign label #${nextNum} to this service order?`)) {
        await addDoc(collection(db, 'label_registry'), {
          labelNumber: Number(nextNum),
          labelType: 'service_order',
          referenceId: localId,
          assignedBy: currentUser?.uid || '',
          assignedAt: new Date().toISOString(),
          isActive: true,
          data: {
            orderNumber: formData.orderNumber || initialData?.orderNumber || '',
            brand: formData.brand || '',
            model: formData.model || '',
            colour: formData.colour || '',
            customerName: formData.customerName || '',
            customerPhone: formData.customerPhone || '',
            complaintTypes: formData.complaintTypes || [],
            otherComplaint: formData.otherComplaint || '',
            problemDetails: formData.problemDetails || '',
            estimatedPrice: Number(formData.estimatedPrice || 0),
            advancePaid: Number(formData.advancePaid || 0),
            technicianName: formData.technicianName || userName || currentUser?.displayName || currentUser?.email || '',
            status: formData.status || 'Received',
            accessoriesCollected: formData.accessories || [],
            lockType: formData.lockType || 'None',
            lockPattern: formData.lockPattern || [],
            lockHint: formData.lockHint || ''
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
        labelType: 'service_order',
        data: {
          customerName: formData.customerName || '',
          brand: formData.brand || '',
          model: formData.model || '',
          complaintTypes: formData.complaintTypes || [],
          estimatedPrice: Number(formData.estimatedPrice || 0)
        }
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading user data...</span>
      </div>
    );
  }

  try {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 pb-8">
        {error && <div className="text-red-600 bg-red-100 p-3 rounded">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Details */}
        <div className="md:col-span-2"><h4 className="font-semibold text-gray-700 border-b pb-2">Customer Details</h4></div>
        <CustomerAutocomplete
          customers={customers}
          nameValue={formData.customerName}
          phoneValue={formData.customerPhone}
          alternatePhoneValue={formData.alternatePhone}
          onNameChange={val => setFormData({...formData, customerName: val})}
          onPhoneChange={val => setFormData({...formData, customerPhone: val})}
          onAlternatePhoneChange={val => setFormData({...formData, alternatePhone: val})}
          onSelectCustomer={handleCustomerSelect}
        />

        {/* Device Details */}
        <div className="md:col-span-2 mt-4"><h4 className="font-semibold text-gray-700 border-b pb-2">Device Details</h4></div>
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
          <input type="text" required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Colour</label>
          <input type="text" value={formData.colour} onChange={e => setFormData({...formData, colour: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">IMEI 1 *</label>
            <div className="mt-1 relative">
              <input
                type="text"
                required
                value={formData.imei1}
                onChange={e => setFormData({...formData, imei1: e.target.value})}
                className="block w-full border border-gray-300 rounded-md p-2 pr-12"
              />
              <button type="button" onClick={() => openScanner('imei1')} className="absolute right-1 top-1/2 -translate-y-1/2 bg-slate-100 p-2 rounded border text-slate-700 hover:bg-slate-200">
                <i className="fas fa-barcode" aria-hidden="true" />
                <span className="sr-only">Scan IMEI 1</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">IMEI 2</label>
            <div className="mt-1 relative">
              <input
                type="text"
                value={formData.imei2}
                onChange={e => setFormData({...formData, imei2: e.target.value})}
                className="block w-full border border-gray-300 rounded-md p-2 pr-12"
              />
              <button type="button" onClick={() => openScanner('imei2')} className="absolute right-1 top-1/2 -translate-y-1/2 bg-slate-100 p-2 rounded border text-slate-700 hover:bg-slate-200">
                <i className="fas fa-barcode" aria-hidden="true" />
                <span className="sr-only">Scan IMEI 2</span>
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Lock Type</label>
          <select value={formData.lockType} onChange={e => {
            const selected = e.target.value;
            setFormData(prev => ({
              ...prev,
              lockType: selected,
              lockPattern: selected === 'Pattern' ? prev.lockPattern || [] : [],
              lockHint: selected === 'Pattern' ? '' : prev.lockHint
            }));
          }} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            {LOCK_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        {['PIN', 'Password', 'Other'].includes(formData.lockType) && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Lock Hint</label>
            <input type="text" value={formData.lockHint || ''} onChange={e => setFormData({...formData, lockHint: e.target.value})} placeholder="Optional hint for the lock" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>
        )}
        {formData.lockType === 'Pattern' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Draw Pattern</label>
            <Suspense fallback={<div className="text-sm text-gray-500">Loading pattern lock...</div>}>
              <PatternLock
                value={formData?.lockPattern || []}
                onChange={nextPattern => setFormData(prev => ({ ...prev, lockPattern: nextPattern || [] }))}
              />
            </Suspense>
          </div>
        )}

        {/* Issue Details */}
        <div className="md:col-span-2 mt-4"><h4 className="font-semibold text-gray-700 border-b pb-2">Issue & Status</h4></div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Nature of Complaint *</label>
          <input type="text" placeholder="Search complaints..." value={complaintSearch} onChange={e => setComplaintSearch(e.target.value)} className="mb-2 block w-full border border-gray-300 rounded-md p-2 text-sm" />
          <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
            {filteredComplaints.map(c => (
              <label key={c} className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input type="checkbox" checked={(formData.complaintTypes || []).includes(c)} onChange={() => handleComplaintToggle(c)} className="h-4 w-4 text-indigo-600 rounded border-gray-300" />
                <span className="text-sm text-gray-700">{c}</span>
              </label>
            ))}
            {filteredComplaints.length === 0 && <div className="text-sm text-gray-500 p-2">No complaints found</div>}
          </div>
          {(formData.complaintTypes || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {(formData.complaintTypes || []).map(c => (
                <span key={c} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {c}
                  <button type="button" onClick={() => removeComplaint(c)} className="ml-1.5 inline-flex text-blue-400 hover:text-blue-600 focus:outline-none">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  </button>
                </span>
              ))}
            </div>
          )}
          {(formData.complaintTypes || []).includes('Other') && (
            <div className="mt-3">
              <input type="text" required placeholder="Describe the other complaint" value={formData.otherComplaint || ''} onChange={e => setFormData({...formData, otherComplaint: e.target.value})} className="block w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Status *</label>
          <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Exact Problem / Details</label>
          <textarea value={formData.problemDetails} onChange={e => setFormData({...formData, problemDetails: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>
        </div>

        {/* Accessories */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Accessories Collected</label>
          <div className="flex flex-wrap gap-3">
            {ACCESSORIES_OPTIONS.map(acc => (
              <label key={acc} className="inline-flex items-center">
                <input type="checkbox" checked={formData.accessories.includes(acc)} onChange={() => handleAccessoryChange(acc)} className="h-4 w-4 text-indigo-600 rounded border-gray-300" />
                <span className="ml-2 text-sm text-gray-700">{acc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Financial & Assignment */}
        <div className="md:col-span-2 mt-4"><h4 className="font-semibold text-gray-700 border-b pb-2">Financial & Assignment</h4></div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Estimated Price (₹) *</label>
          <input type="number" required min="0" value={formData.estimatedPrice} onChange={e => setFormData({...formData, estimatedPrice: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Advance Paid (₹)</label>
          <input type="number" min="0" value={formData.advancePaid} onChange={e => setFormData({...formData, advancePaid: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Raw Material Cost (₹)</label>
          <input type="number" min="0" value={formData.rawMaterialCost} onChange={e => setFormData({...formData, rawMaterialCost: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Outside Labour Cost (₹)</label>
          <input type="number" min="0" value={formData.outsideLabourCost} onChange={e => setFormData({...formData, outsideLabourCost: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Received At *</label>
          <input type="datetime-local" required value={formData.receivedAt} onChange={e => setFormData({...formData, receivedAt: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Expected Completion *</label>
          <input type="datetime-local" required value={formData.expectedCompletionAt} onChange={e => setFormData({...formData, expectedCompletionAt: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Technician</label>
          {userRole?.toLowerCase() === 'admin' ? (
            <select
              value={formData.technicianUid}
              onChange={e => {
                const selected = staffOptions.find(s => s.uid === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  technicianUid: e.target.value,
                  technicianName: selected?.name || selected?.email || prev.technicianName
                }));
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white"
            >
              <option value="">Select Technician</option>
              {staffOptions.map(staff => (
                <option key={staff.uid} value={staff.uid}>{`${staff.name || staff.email}${staff.role ? ` (${staff.role})` : ''}`}</option>
              ))}
            </select>
          ) : (
            <div className="mt-1 block w-full border border-gray-200 rounded-md p-2 bg-gray-50 text-gray-700 font-medium">
              {formData.technicianName || userName || currentUser?.displayName || currentUser?.email || 'Current User'}
            </div>
          )}
        </div>
        
        {/* Images & Notes */}
        <div className="md:col-span-2 mt-4"><h4 className="font-semibold text-gray-700 border-b pb-2">Additional</h4></div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Suggestions / Precaution Notes</label>
          <textarea value={formData.suggestions} onChange={e => setFormData({...formData, suggestions: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Device Image (Optional)</label>
          <input type="file" accept="image/*" onChange={e => handleUpload(e.target.files[0])} className="mt-1 block w-full text-sm" />
          {uploading && <span className="text-sm text-blue-600">Uploading...</span>}
          {formData.imageUrl && <img src={formData.imageUrl} alt="Device" className="mt-2 h-32 w-32 object-cover rounded shadow" />}
        </div>
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm mx-4 relative z-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Scan IMEI Barcode</h3>
              <button type="button" onClick={closeScanner} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div id="imei-scanner-div" className="w-full min-h-48 rounded-xl bg-slate-100" />
            <p className="mt-3 text-sm text-gray-600">Point camera at IMEI barcode</p>
            {scannerLoading && <p className="mt-2 text-sm text-gray-600">Starting camera...</p>}
            {scannerError && <p className="mt-2 text-sm text-red-600">{scannerError}</p>}
            <div className="mt-4 text-right">
              <button type="button" onClick={closeScanner} className="px-4 py-2 bg-slate-100 rounded-md text-slate-800 hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col mt-6 pt-4 border-t">
        {saveStatus === 'saved' && <div className="text-green-600 font-medium mb-3">Saved successfully</div>}
        <div className="flex gap-3 flex-wrap items-center">
          {saveStatus === 'saved' ? (
            <button type="submit" disabled={uploading} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">
              Saved ✓
            </button>
          ) : (
            <button type="submit" disabled={saveStatus === 'saving' || uploading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-blue-700">
              {saveStatus === 'saving' ? 'Saving...' : 'Save Order'}
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
  } catch (err) {
    console.error("Error rendering ServiceOrderForm:", err);
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
        <h3 className="font-bold mb-2">Something went wrong.</h3>
        <p>Please refresh the page or contact support if the issue persists.</p>
        <p className="text-xs mt-2 text-red-400">{err.message}</p>
      </div>
    );
  }
};

export default ServiceOrderForm;
