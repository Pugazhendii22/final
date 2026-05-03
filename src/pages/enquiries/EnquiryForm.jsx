import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const EnquiryForm = ({ onSave, onCancel, initialData = null }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState(initialData || {
    customerName: '',
    customerPhone: '',
    modelEnquired: '',
    budgetMin: '',
    budgetMax: '',
    medium: 'Walk-in',
    seriousness: 'Ordinary',
    requiredWithin: 'No Rush',
    status: 'Open',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = {
        ...formData,
        budgetMin: Number(formData.budgetMin) || 0,
        budgetMax: Number(formData.budgetMax) || 0,
        updatedAt: new Date().toISOString()
      };

      if (!initialData) {
        data.createdAt = new Date().toISOString();
        data.createdBy = currentUser.uid;
      }
      
      await onSave(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="text-red-600 bg-red-100 p-3 rounded">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Customer Name *</label>
          <input type="text" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">WhatsApp Number *</label>
          <input type="text" required value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Model Enquired *</label>
          <input type="text" required value={formData.modelEnquired} onChange={e => setFormData({...formData, modelEnquired: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Budget</label>
          <input type="number" min="0" value={formData.budgetMin} onChange={e => setFormData({...formData, budgetMin: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Budget</label>
          <input type="number" min="0" value={formData.budgetMax} onChange={e => setFormData({...formData, budgetMax: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Medium</label>
          <select value={formData.medium} onChange={e => setFormData({...formData, medium: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="Walk-in">Walk-in</option>
            <option value="Instagram">Instagram</option>
            <option value="YouTube">YouTube</option>
            <option value="Referral">Referral</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Seriousness</label>
          <select value={formData.seriousness} onChange={e => setFormData({...formData, seriousness: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="Urgent">Urgent</option>
            <option value="Ordinary">Ordinary</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Required Within</label>
          <select value={formData.requiredWithin} onChange={e => setFormData({...formData, requiredWithin: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="No Rush">No Rush</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="Open">Open</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Converted">Converted</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="3"></textarea>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Enquiry'}
        </button>
      </div>
    </form>
  );
};

export default EnquiryForm;
