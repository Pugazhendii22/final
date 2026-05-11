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
      customerId: prefill.customerId || '',
      customerName: prefill.customerName || '',
      customerPhone: prefill.customerPhone || '',
      alternatePhone: prefill.alternatePhone || '',
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
      customerId: c.id || '',
      customerName: c.name || '', 
      customerPhone: c.phone || '',
      alternatePhone: c.alternatePhone || '',
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
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* DATE AND CUSTOMER */}
      <div>
        <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
          Customer Details
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395]"
            />
          </div>
          <CustomerAutocomplete
            customers={customers}
            nameValue={formData.customerName}
            phoneValue={formData.customerPhone}
            alternatePhoneValue={formData.alternatePhone}
            onNameChange={val => setFormData({...formData, customerName: val, customerId: ''})}
            onPhoneChange={val => setFormData({...formData, customerPhone: val, customerId: ''})}
            onAlternatePhoneChange={val => setFormData({...formData, alternatePhone: val})}
            onSelectCustomer={handleCustomerSelect}
          />
          {formData.linkedServiceOrderId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Service Order</label>
              <input
                type="text"
                readOnly
                value={formData.linkedServiceOrderNumber}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* ITEMS */}
      <div>
        <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
          Items
        </p>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => addItem('Second-hand')}
            className="flex-1 bg-[#002395]/10 text-[#002395] py-2 rounded-xl text-sm font-semibold"
          >
            + Second-hand
          </button>
          <button
            type="button"
            onClick={() => addItem('New')}
            className="flex-1 bg-green-50 text-green-700 py-2 rounded-xl text-sm font-semibold"
          >
            + New Product
          </button>
        </div>

        {formData.items.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <i className="fas fa-box-open text-3xl text-gray-200 mb-2 block"></i>
            <p className="text-gray-400 text-sm">No items added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    item.type === 'Second-hand' ? 'bg-[#002395]/10 text-[#002395]' :
                    item.type === 'Service' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {item.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-[#ED2939] p-1"
                  >
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
                <div className="space-y-2">
                  {item.type === 'Second-hand' ? (
                    <select
                      required
                      value={item.itemId}
                      onChange={e => handleItemChange(index, 'itemId', e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395] bg-white"
                    >
                      <option value="">Select Device</option>
                      {secondHandMobiles.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.brand} {m.model} (IMEI: {m.imei1}) - ₹{m.salePrice}
                        </option>
                      ))}
                    </select>
                  ) : item.type === 'Service' ? (
                    <input
                      type="text"
                      value={item.name}
                      readOnly
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-100"
                    />
                  ) : (
                    <select
                      required
                      value={item.itemId}
                      onChange={e => handleItemChange(index, 'itemId', e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395] bg-white"
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={Number(p.stock) <= 0}>
                          {p.name} (Stock: {p.stock || 0}) - ₹{p.salePrice || p.price || 0}
                          {Number(p.stock) <= 0 ? ' - Out of Stock' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Qty</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="1"
                        required
                        disabled={item.type === 'Second-hand'}
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#002395]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Price</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        required
                        value={item.unitPrice}
                        onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#002395]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Total</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        readOnly
                        value={item.total}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAYMENT */}
      <div>
        <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
          Payment
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              required
              value={formData.paymentMethod}
              onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395] bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Split">Split</option>
            </select>
          </div>
          {formData.paymentMethod === 'Split' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  min="0"
                  value={formData.splitCash}
                  onChange={e => setFormData({...formData, splitCash: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI Amount</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  min="0"
                  value={formData.splitUpi}
                  onChange={e => setFormData({...formData, splitUpi: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395]"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              min="0"
              value={formData.amountPaid}
              onChange={e => setFormData({...formData, amountPaid: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="0"
              value={formData.discount}
              onChange={e => setFormData({...formData, discount: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#002395]"
            />
          </div>
        </div>
      </div>

      {/* TOTALS SUMMARY */}
      <div className="bg-[#f8fafc] rounded-xl p-4 border border-gray-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium">₹{subtotal}</span>
        </div>
        {Number(formData.discount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Discount</span>
            <span className="font-medium text-green-600">- ₹{formData.discount}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
          <span>Total</span>
          <span className="text-[#002395]">₹{totalAmount}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>Balance Due</span>
          <span className={balanceDue > 0 ? 'text-[#ED2939]' : 'text-green-600'}>
            {balanceDue > 0 ? `₹${balanceDue}` : 'Fully Paid ✓'}
          </span>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-[#002395] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? 'Processing...' : 'Complete Sale'}
        </button>
      </div>

    </form>
  );
};

export default SalesForm;
