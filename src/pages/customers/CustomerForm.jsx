import React, { useState } from 'react';

const CustomerForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    phone: '',
    alternatePhone: '',
    email: '',
    address: '',
    idType: '',
    idNumber: '',
    photoUrl: '',
    idProofUrl: '',
    isRegular: false,
    relationship: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (file, type) => {
    if (!file) return;
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset || cloudName.includes('paste_')) {
      setError("Cloudinary configuration missing in .env");
      return;
    }

    if (type === 'photo') setUploadingPhoto(true);
    else setUploadingId(true);

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
        setFormData(prev => ({ ...prev, [type === 'photo' ? 'photoUrl' : 'idProofUrl']: fileData.secure_url }));
      } else {
        throw new Error(fileData.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      setError('Image upload failed: ' + err.message);
    } finally {
      if (type === 'photo') setUploadingPhoto(false);
      else setUploadingId(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave(formData);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 bg-red-100 p-3 rounded">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone (WhatsApp) *</label>
          <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Alternate Phone</label>
          <input type="text" value={formData.alternatePhone} onChange={e => setFormData({...formData, alternatePhone: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ID Type</label>
          <select value={formData.idType} onChange={e => setFormData({...formData, idType: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="">Select ID</option>
            <option value="Aadhaar">Aadhaar</option>
            <option value="PAN">PAN</option>
            <option value="Driving Licence">Driving Licence</option>
            <option value="Working ID">Working ID</option>
            <option value="Student ID">Student ID</option>
            <option value="Additional Proof">Additional Proof</option>
            <option value="Others">Others</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ID Number</label>
          <input type="text" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Customer Photo</label>
          <input type="file" accept="image/*" onChange={e => handleUpload(e.target.files[0], 'photo')} className="mt-1 block w-full text-sm" />
          {uploadingPhoto && <span className="text-sm text-blue-600">Uploading...</span>}
          {formData.photoUrl && <img src={formData.photoUrl} alt="Customer" className="mt-2 h-20 w-20 object-cover rounded" />}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ID Proof Photo</label>
          <input type="file" accept="image/*" onChange={e => handleUpload(e.target.files[0], 'id')} className="mt-1 block w-full text-sm" />
          {uploadingId && <span className="text-sm text-blue-600">Uploading...</span>}
          {formData.idProofUrl && <img src={formData.idProofUrl} alt="ID" className="mt-2 h-20 w-20 object-cover rounded" />}
        </div>

        <div className="md:col-span-2 flex items-center space-x-2">
          <input type="checkbox" id="isRegular" checked={formData.isRegular} onChange={e => setFormData({...formData, isRegular: e.target.checked})} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
          <label htmlFor="isRegular" className="text-sm font-medium text-gray-700">Regular Customer</label>
        </div>

        {formData.isRegular && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Relationship</label>
            <select value={formData.relationship} onChange={e => setFormData({...formData, relationship: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
              <option value="">Select Relationship</option>
              <option value="Family">Family</option>
              <option value="Close Friend">Close Friend</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="3"></textarea>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading || uploadingPhoto || uploadingId} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
