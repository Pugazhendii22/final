import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import ServiceOrderForm from './ServiceOrderForm';
import { useAuth } from '../../context/AuthContext';
import NewSaleModal from '../../components/sales/NewSaleModal';

const ServiceOrderList = () => {
  const { currentUser, userName, userRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showModal, setShowModal] = useState(false);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedOrderForComplete, setSelectedOrderForComplete] = useState(null);
  const [completeChecklist, setCompleteChecklist] = useState({
    frontCamera: false, rearCamera: false, earpieceSpeaker: false, microphone: false,
    loudspeaker: false, cleanSpeakerFilter: false, proximitySensor: false, newFilterChanged: false,
    powerButton: false, volumeButtons: false, displayClarity: false, mobileData: false,
    bluetooth: false, wifi: false, cleanPasteGlue: false, whiteSpots: false,
    frameBentCheck: false, customerApproval: false
  });
  const [completeError, setCompleteError] = useState('');

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [completedOrderForBill, setCompletedOrderForBill] = useState(null);
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [salePrefillData, setSalePrefillData] = useState(null);

  const STATUSES = ['Received', 'In Progress', 'Parts Awaiting', 'Completed', 'Awaiting Customer Approval', 'Returned'];

  const fetchOrdersAndCustomers = async () => {
    try {
      const custSnap = await getDocs(collection(db, 'customers'));
      const cList = [];
      custSnap.forEach(doc => cList.push(doc.data()));
      setCustomers(cList);

      let queryRef = collection(db, 'service_orders');
      if (userRole?.toLowerCase() === 'staff') {
        queryRef = query(queryRef, where('technicianUid', '==', currentUser.uid));
      }
      const snap = await getDocs(queryRef);
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchOrdersAndCustomers();
    };
    loadInitialData();
  }, []);

  const generateOrderNumber = async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const snapshot = await getDocs(collection(db, 'service_orders'));
    let count = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.orderNumber && data.orderNumber.includes(dateStr)) {
        count++;
      }
    });
    return `SRV-${dateStr}-${count.toString().padStart(3, '0')}`;
  };

  const handleSaveOrder = async (data) => {
    let orderNumber = data.orderNumber;
    if (!orderNumber) {
      orderNumber = await generateOrderNumber();
    }

    const newOrder = {
      ...data,
      orderNumber,
      updatedAt: new Date().toISOString()
    };

    if (!customers.find(c => c.phone === data.customerPhone)) {
      await addDoc(collection(db, 'customers'), {
        name: data.customerName,
        phone: data.customerPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (data.id) {
      const { id, ...updateData } = newOrder;
      await import('firebase/firestore').then(m => m.updateDoc(m.doc(db, 'service_orders', id), updateData));
      fetchOrdersAndCustomers();
      return id;
    }

    newOrder.createdAt = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'service_orders'), newOrder);
    fetchOrdersAndCustomers();
    return docRef.id;
  };

  const openCompleteModal = (order) => {
    setSelectedOrderForComplete(order);
    setCompleteChecklist({
      frontCamera: false, rearCamera: false, earpieceSpeaker: false, microphone: false,
      loudspeaker: false, cleanSpeakerFilter: false, proximitySensor: false, newFilterChanged: false,
      powerButton: false, volumeButtons: false, displayClarity: false, mobileData: false,
      bluetooth: false, wifi: false, cleanPasteGlue: false, whiteSpots: false,
      frameBentCheck: false, customerApproval: false
    });
    setCompleteError('');
    setCompleteModalOpen(true);
  };

  const handleCompleteToggle = (key) => {
    setCompleteChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmComplete = async () => {
    const allChecked = Object.values(completeChecklist).every(val => val === true);
    if (!allChecked) {
      setCompleteError('Please complete all checklist items before marking as complete');
      return;
    }

    try {
      const updateData = {
        status: 'Completed',
        preDeliveryChecklist: completeChecklist,
        completedAt: new Date().toISOString(),
        actualCompletedAt: new Date(),
        completedBy: { 
          uid: currentUser.uid, 
          name: userName || currentUser.displayName || currentUser.email || 'Unknown'
        },
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'service_orders', selectedOrderForComplete.id), updateData);
      
      const finalOrder = { ...selectedOrderForComplete, ...updateData };
      setOrders(orders.map(o => o.id === selectedOrderForComplete.id ? finalOrder : o));
      setCompleteModalOpen(false);

      setCompletedOrderForBill(finalOrder);
      setBillModalOpen(true);
    } catch (err) {
      setCompleteError('Failed to complete order. ' + err.message);
    }
  };

  const handleCreateBill = (order) => {
    const o = order || completedOrderForBill;
    
    if (o.billCreated) {
      alert("A bill already exists for this order.");
      setBillModalOpen(false);
      return;
    }

    const complaintText = o.complaintTypes?.join(', ') || o.complaintNature || 'Service';
    const billData = {
      saleType: "Service",
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      items: [{ 
        name: `Service - ${complaintText}${o.otherComplaint ? ` - ${o.otherComplaint}` : ''}`, 
        quantity: 1, 
        unitPrice: Number(o.estimatedPrice) || 0 
      }],
      serviceOrderId: o.id,
      serviceOrderNumber: o.orderNumber
    };
    setSalePrefillData(billData);
    setBillModalOpen(false);
    setNewSaleModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Received': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Parts Awaiting': return 'bg-orange-100 text-orange-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Awaiting Customer Approval': return 'bg-purple-100 text-purple-800';
      case 'Returned': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const normalizeDate = (value) => {
    if (!value) return null;
    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isDueTodayDate = (date) => {
    if (!date) return false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return date >= start && date < end;
  };

  const isOrderOverdue = (o) => {
    const expected = normalizeDate(o.expectedCompletionAt);
    return expected && expected < new Date() && o.status !== 'Completed' && o.status !== 'Returned';
  };

  const isOrderDueToday = (o) => {
    const expected = normalizeDate(o.expectedCompletionAt);
    return expected && isDueTodayDate(expected) && o.status !== 'Completed' && o.status !== 'Returned';
  };

  const overdueCount = orders.filter(isOrderOverdue).length;
  const dueTodayCount = orders.filter(isOrderDueToday).length;

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.replace(/\s+/g, '').toLowerCase();
    const matchesSearch = !searchQuery || 
      (o.customerName?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (o.customerPhone?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (o.orderNumber?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (o.brand?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (o.model?.replace(/\s+/g, '').toLowerCase() || '').includes(q);
    
    const matchesStatus = !statusFilter || o.status === statusFilter;
    const matchesTab = activeTab === 'All' ||
      (activeTab === 'Overdue' && isOrderOverdue(o)) ||
      (activeTab === 'Due Today' && isOrderDueToday(o)) ||
      (activeTab === 'Completed' && o.status === 'Completed');
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  return (
    <Layout title="Service Orders">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} total</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm shrink-0">+ New Service Order</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {['All','Overdue','Due Today','Completed'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-full text-sm font-medium ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {tab}
            {tab === 'Overdue' && overdueCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white px-2 py-0.5 text-[11px] font-semibold">{overdueCount}</span>
            )}
            {tab === 'Due Today' && dueTodayCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500 text-white px-2 py-0.5 text-[11px] font-semibold">{dueTodayCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Search order #, name, phone, brand..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-lg h-14 animate-pulse" />)}</div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Order #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Device</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Deadline</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Complaint</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Est.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredOrders.map(o => {
                const complaints = o.complaintTypes || (o.complaintNature ? [o.complaintNature] : []);
                const visibleComplaints = complaints.slice(0, 2);
                const moreCount = complaints.length - 2;
                const expectedDate = normalizeDate(o.expectedCompletionAt);
                const deadlineIsOverdue = expectedDate && expectedDate < new Date() && o.status !== 'Completed' && o.status !== 'Returned';
                const deadlineClass = o.status === 'Completed' ? 'bg-gray-100 text-gray-700' : deadlineIsOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
                const deadlineLabel = expectedDate ? `${expectedDate.toLocaleDateString()} ${expectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-';
                return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{o.orderNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{o.customerName}</div>
                    <div className="text-xs text-gray-400">{o.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{o.brand} {o.model}</td>
                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${deadlineClass}`}>
                      {deadlineLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {visibleComplaints.map((c, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded">{c}</span>
                      ))}
                      {moreCount > 0 && <span className="text-xs text-gray-400">+{moreCount} more</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap hidden md:table-cell">₹{o.estimatedPrice}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(o.status)}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                    <Link to={`/service/${o.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View</Link>
                    {(userRole?.toLowerCase() === 'admin' || (userRole?.toLowerCase() === 'staff' && o.technicianUid === currentUser.uid)) && o.status !== 'Completed' && o.status !== 'Returned' && (
                      <button onClick={() => openCompleteModal(o)} className="bg-green-600 text-white px-2 py-1 rounded text-xs ml-1" title="Complete">✓</button>
                    )}
                    {o.status === 'Completed' && !o.billCreated && (
                      <button onClick={() => handleCreateBill(o)} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs ml-1" title="Create Bill">Bill</button>
                    )}
                    {o.status === 'Completed' && o.billCreated && (
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold ml-1">Billed</span>
                    )}
                  </td>
                </tr>
              )})}
              {filteredOrders.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No service orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center p-0 sm:p-4">
            <div className="fixed inset-0 bg-black/60" onClick={() => setShowModal(false)} />
            <div className="relative w-full sm:max-w-4xl sm:rounded-xl bg-white shadow-2xl z-10 flex flex-col max-h-screen sm:max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white sm:rounded-t-xl">
                <h3 className="text-lg font-semibold">Create Service Order</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4">
                <ServiceOrderForm onSave={handleSaveOrder} onCancel={() => setShowModal(false)} />
              </div>
            </div>
          </div>
        )}

        {completeModalOpen && selectedOrderForComplete && (
          <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setCompleteModalOpen(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-4 border-b pb-2">Pre-Delivery Quality Check</h3>
                  {completeError && <div className="mb-4 text-red-600 bg-red-100 p-2 rounded text-sm">{completeError}</div>}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Functionality Checks</h4>
                      <div className="space-y-3">
                        {[
                          { key: 'frontCamera', label: 'Front Camera (Clear dust)' },
                          { key: 'rearCamera', label: 'Rear Camera (Clear dust)' },
                          { key: 'earpieceSpeaker', label: 'Earpiece Speaker' },
                          { key: 'microphone', label: 'Microphone' },
                          { key: 'loudspeaker', label: 'Loudspeaker' },
                          { key: 'cleanSpeakerFilter', label: 'Clean Speaker Filter' },
                          { key: 'proximitySensor', label: 'Proximity Sensor' },
                          { key: 'newFilterChanged', label: 'Change New Filter if Needed & Possible' },
                          { key: 'powerButton', label: 'Power Button' },
                          { key: 'volumeButtons', label: 'Volume Buttons' },
                          { key: 'displayClarity', label: 'Display Clarity' },
                          { key: 'mobileData', label: 'Mobile Data' },
                          { key: 'bluetooth', label: 'Bluetooth' },
                          { key: 'wifi', label: 'Wi-Fi' }
                        ].map(item => (
                          <label key={item.key} className="flex items-start space-x-3 cursor-pointer">
                            <input type="checkbox" checked={completeChecklist[item.key]} onChange={() => handleCompleteToggle(item.key)} className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                            <span className="text-gray-700 text-sm leading-tight pt-1">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Physical & Completion Checks</h4>
                      <div className="space-y-3">
                        {[
                          { key: 'cleanPasteGlue', label: 'Check & Clean Paste and Glue' },
                          { key: 'whiteSpots', label: 'White Spots on Display' },
                          { key: 'frameBentCheck', label: 'Frame Bent Check (Replace if Needed)' },
                          { key: 'customerApproval', label: 'Got Approval from Customer for Additional Services' }
                        ].map(item => (
                          <label key={item.key} className="flex items-start space-x-3 cursor-pointer">
                            <input type="checkbox" checked={completeChecklist[item.key]} onChange={() => handleCompleteToggle(item.key)} className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                            <span className="text-gray-700 text-sm leading-tight pt-1">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t">
                  <button onClick={handleConfirmComplete} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                    Confirm Complete
                  </button>
                  <button onClick={() => setCompleteModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {billModalOpen && completedOrderForBill && (
          <div className="fixed z-50 inset-0 flex items-center justify-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setBillModalOpen(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6 z-10 text-center">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Service Completed</h3>
              <p className="text-gray-600 mb-6">Would you like to create a bill for this service order?</p>
              <div className="flex space-x-3">
                <button onClick={() => handleCreateBill(null)} className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 font-medium">
                  Create Bill
                </button>
                <button onClick={() => setBillModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 font-medium">
                  Later
                </button>
              </div>
            </div>
          </div>
        )}

        <NewSaleModal 
          isOpen={newSaleModalOpen} 
          onClose={() => setNewSaleModalOpen(false)} 
          prefillData={salePrefillData} 
          onSuccess={() => {
            fetchOrdersAndCustomers();
          }} 
        />
    </Layout>
  );
};

export default ServiceOrderList;
