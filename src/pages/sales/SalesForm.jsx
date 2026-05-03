import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import CustomerAutocomplete from '../../components/common/CustomerAutocomplete';

const SalesForm = ({ onSave, onCancel, prefillData }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState(() => {
    const prefill = prefillData || {};
    return {
      date: new Date().toISOString().split('T')[0],
      customerName: prefill.customerName || '',
      customerPhone: prefill.customerPhone || '',
      customerAddress: prefill.customerAddress || '',
      items: prefill.items ? prefill.items.map(item => ({
        type: 'Service',
        itemId: 'service',
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        imei: ''
      })) : [],
      discount: 0,
      paymentMethod: 'Cash',
      splitCash: '',
      splitUpi: '',
      amountPaid: '',
      notes: '',
      linkedServiceOrderId: prefill.serviceOrderId || '',
      linkedServiceOrderNumber: prefill.serviceOrderNumber || ''
    };
  });
  
  const [customers, setCustomers] = useState([]);
  const [secondHandMobiles, setSecondHandMobiles] = useState([]);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const custSnap = await getDocs(collection(db, 'customers'));
        const cList = [];
        custSnap.forEach(doc => cList.push({ id: doc.id, ...doc.data() }));
        setCustomers(cList);

        const shSnap = await getDocs(collection(db, 'second_hand_mobiles'));
        const shList = [];
        shSnap.forEach(doc => {
          if (doc.data().status === 'available') {
            shList.push({ id: doc.id, ...doc.data() });
          }
        });
        setSecondHandMobiles(shList);

        const prodSnap = await getDocs(collection(db, 'products'));
        const pList = [];
        prodSnap.forEach(doc => pList.push({ id: doc.id, ...doc.data() }));
        setProducts(pList);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  const handleCustomerSelect = (c) => {
    setFormData(prev => ({ 
      ...prev, 
      customerName: c.name || '', 
      customerPhone: c.phone || '',
      customerAddress: c.address || c.customerAddress || ''
    }));
  };

  const addItem = (type) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { type, itemId: '', name: '', quantity: 1, unitPrice: 0, total: 0, imei: '' }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      item[field] = value;

      if (field === 'itemId') {
        if (item.type === 'Second-hand') {
          const sh = secondHandMobiles.find(m => m.id === value);
          if (sh) {
            item.name = `${sh.brand} ${sh.model}`;
            item.unitPrice = Number(sh.salePrice || 0);
            item.imei = sh.imei1 || '';
            item.quantity = 1; // Can't change quantity for second hand
          }
        } else if (item.type === 'New') {
          const prod = products.find(p => p.id === value);
          if (prod) {
            item.name = prod.name;
            item.unitPrice = Number(prod.salePrice || prod.price || 0);
            item.quantity = 1;
          }
        }
      }

      if (field === 'quantity' || field === 'unitPrice' || field === 'itemId') {
        item.total = item.quantity * item.unitPrice;
      }

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalAmount = subtotal - (Number(formData.discount) || 0);
  const balanceDue = totalAmount - (Number(formData.amountPaid) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent double clicks
    
    if (formData.items.length === 0) {
      setError("Add at least one item.");
      return;
    }
    
    // Validate split payment
    if (formData.paymentMethod === 'Split') {
      const splitTotal = (Number(formData.splitCash) || 0) + (Number(formData.splitUpi) || 0);
      if (splitTotal !== Number(formData.amountPaid)) {
        setError("Split Cash and UPI must add up to Amount Paid.");
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const finalData = { 
        ...formData, 
        subtotal, 
        totalAmount, 
        balanceDue,
        createdBy: currentUser.uid 
      };
      delete finalData.linkedServiceOrderNumber;
      await onSave(finalData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      <div className="flex items-center mb-2">
        <button 
          type="button" 
          onClick={() => { navigate('/sales'); if(onCancel) onCancel(); }} 
          className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sales
        </button>
      </div>
      {error && <div className="text-red-600 bg-red-100 p-3 rounded">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date *</label>
          <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div></div>
        <CustomerAutocomplete
          customers={customers}
          nameValue={formData.customerName}
          phoneValue={formData.customerPhone}
          onNameChange={val => setFormData({...formData, customerName: val})}
          onPhoneChange={val => setFormData({...formData, customerPhone: val})}
          onSelectCustomer={handleCustomerSelect}
        />
        {formData.linkedServiceOrderId && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Linked Service Order</label>
            <input type="text" readOnly value={formData.linkedServiceOrderNumber} className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-100 font-medium" />
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-gray-700">Items</h4>
          <div className="space-x-2">
            <button type="button" onClick={() => addItem('Second-hand')} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm hover:bg-indigo-200">+ Second-hand</button>
            <button type="button" onClick={() => addItem('New')} className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200">+ New Product</button>
          </div>
        </div>

        {formData.items.map((item, index) => (
          <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-50 p-3 rounded mb-3 border">
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-medium text-gray-500 mb-1">{item.type} Item</label>
              {item.type === 'Second-hand' ? (
                <select required value={item.itemId} onChange={e => handleItemChange(index, 'itemId', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm">
                  <option value="">Select Device</option>
                  {secondHandMobiles.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} (IMEI: {m.imei1}) - ₹{m.salePrice}</option>)}
                </select>
              ) : item.type === 'Service' ? (
                <input type="text" value={item.name} readOnly className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-100" />
              ) : (
                <div className="flex flex-col w-full">
                  <select required value={item.itemId} onChange={e => handleItemChange(index, 'itemId', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm">
                    <option value="">Select Product</option>
                    {products.map(p => {
                      const isOutOfStock = Number(p.stock) <= 0;
                      return (
                        <option key={p.id} value={p.id} disabled={isOutOfStock}>
                          {p.name} (Stock: {p.stock || 0}) - ₹{p.salePrice || p.price || 0} {isOutOfStock ? '- Out of Stock' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {item.type === 'New' && item.itemId && (
                    <span className="text-xs text-gray-500 mt-1">
                      {(() => {
                        const selectedProd = products.find(p => p.id === item.itemId);
                        return selectedProd ? `Available Stock: ${selectedProd.stock || 0}` : '';
                      })()}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="w-1/4 md:w-24">
              <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
              <input type="number" min="1" required disabled={item.type === 'Second-hand'} value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full border border-gray-300 rounded p-2 text-sm" />
            </div>
            
            <div className="w-1/3 md:w-32">
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label>
              <input type="number" min="0" required value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))} className="w-full border border-gray-300 rounded p-2 text-sm" />
            </div>
            
            <div className="w-1/4 md:w-32">
              <label className="block text-xs font-medium text-gray-500 mb-1">Total</label>
              <input type="number" readOnly value={item.total} className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-100 font-medium" />
            </div>
            
            <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2">✕</button>
          </div>
        ))}
        {formData.items.length === 0 && <p className="text-sm text-gray-500 italic">No items added.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
            <select required value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Split">Split</option>
            </select>
          </div>
          
          {formData.paymentMethod === 'Split' && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500">Cash Amount</label>
                <input type="number" required min="0" value={formData.splitCash} onChange={e => setFormData({...formData, splitCash: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500">UPI Amount</label>
                <input type="number" required min="0" value={formData.splitUpi} onChange={e => setFormData({...formData, splitUpi: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Amount Paid *</label>
            <input type="number" required min="0" value={formData.amountPaid} onChange={e => setFormData({...formData, amountPaid: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes / Remarks</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">₹{subtotal}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Discount:</span>
            <input type="number" min="0" value={formData.discount} onChange={e => setFormData({...formData, discount: e.target.value})} className="w-24 border border-gray-300 rounded p-1 text-right" />
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total Amount:</span>
            <span className="text-indigo-700">₹{totalAmount}</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-gray-600 border-t pt-2">
            <span>Balance Due:</span>
            <span className={balanceDue > 0 ? "text-red-600" : "text-green-600"}>₹{balanceDue}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <button type="button" onClick={onCancel} disabled={submitting} className="px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[140px]">
          {submitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : 'Complete Sale'}
        </button>
      </div>
    </form>
  );
};

export default SalesForm;
