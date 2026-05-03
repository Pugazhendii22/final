import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import CustomerForm from './CustomerForm';
import Layout from '../../components/common/Layout';

const CustomerView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const [sales, setSales] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const normalizePhone = (phone) => {
    if (!phone) return "";
    return phone.toString().replace(/\s+/g, "").replace(/^\+91/, "").replace(/^0/, "").trim();
  };

  const fetchHistory = async (custData) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const salesQuery = query(
        collection(db, 'sales'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const serviceQuery = query(
        collection(db, 'service_orders'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const [salesSnap, serviceSnap] = await Promise.all([
        getDocs(salesQuery),
        getDocs(serviceQuery)
      ]);

      const customerNormalizedPhone = normalizePhone(custData.phone);
      const customerNormalizedAlt = normalizePhone(custData.alternatePhone);
      const customerNameLower = custData.name ? custData.name.toLowerCase() : "";

      const matchCustomer = (docData) => {
        const docPhone = normalizePhone(docData.customerPhone);
        if (customerNormalizedPhone && docPhone === customerNormalizedPhone) return true;
        if (customerNormalizedAlt && docPhone === customerNormalizedAlt) return true;
        const docName = docData.customerName ? docData.customerName.toLowerCase() : "";
        if (customerNameLower && docName === customerNameLower) return true;
        return false;
      };

      const salesData = [];
      salesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (matchCustomer(data)) {
          salesData.push({ id: doc.id, ...data });
        }
      });

      const serviceData = [];
      serviceSnap.docs.forEach(doc => {
        const data = doc.data();
        if (matchCustomer(data)) {
          serviceData.push({ id: doc.id, ...data });
        }
      });

      // We limit to 20 for display
      setSales(salesData.slice(0, 20));
      setServiceOrders(serviceData.slice(0, 20));
    } catch (err) {
      console.error("Error fetching history:", err);
      setHistoryError('Could not load history. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'customers', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomer({ id: docSnap.id, ...data });
        if (data.phone || data.alternatePhone || data.name) {
          await fetchHistory(data);
        } else {
          setHistoryLoading(false);
        }
      } else {
        console.error("No such customer!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async (data) => {
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'customers', id), updatedData);
    setCustomer({ id, ...updatedData });
    setShowEdit(false);
    if (data.phone !== customer.phone || data.alternatePhone !== customer.alternatePhone || data.name !== customer.name) {
      fetchHistory(updatedData);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!customer) return <div className="p-8 text-center text-red-600">Customer not found</div>;

  const totalPurchases = sales.length;
  const totalSpent = sales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
  const totalBalanceDue = sales.reduce((sum, sale) => sum + (Number(sale.balanceDue) || 0), 0);
  const totalServices = serviceOrders.length;

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const date = typeof dateValue.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Received': return 'bg-blue-100 text-blue-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Parts Awaiting': return 'bg-orange-100 text-orange-700';
      case 'Completed': return 'bg-green-100 text-green-600';
      case 'Awaiting Customer Approval': return 'bg-purple-100 text-purple-700';
      case 'Returned': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Layout title="Customer Detail">
      <div className="max-w-5xl mx-auto">
        {/* 1. Back button and Title */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/customers')} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-medium">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            {customer.isRegular && (
              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                Regular Customer
              </span>
            )}
          </div>
          <button 
            onClick={() => setShowEdit(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Edit
          </button>
        </div>

        {/* 2. Customer Contact Details + Photo */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Contact Details</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><dt className="text-sm font-medium text-gray-500">Phone (WhatsApp)</dt><dd className="mt-1 text-sm font-semibold text-gray-900">{customer.phone}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Alternate Phone</dt><dd className="mt-1 text-sm text-gray-900">{customer.alternatePhone || '-'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Email</dt><dd className="mt-1 text-sm text-gray-900">{customer.email || '-'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Address</dt><dd className="mt-1 text-sm text-gray-900">{customer.address || '-'}</dd></div>
                {customer.isRegular && <div><dt className="text-sm font-medium text-gray-500">Relationship</dt><dd className="mt-1 text-sm text-gray-900">{customer.relationship || '-'}</dd></div>}
              </dl>
            </div>
            <div className="w-full md:w-48 shrink-0">
              <p className="text-sm font-medium text-gray-500 mb-2">Customer Photo</p>
              {customer.photoUrl ? (
                <img src={customer.photoUrl} alt="Customer" className="h-48 w-full object-cover rounded shadow" />
              ) : (
                <div className="h-48 flex items-center justify-center bg-gray-100 text-gray-400 rounded border border-gray-200">No photo</div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Purchases</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalPurchases}</p>
          </div>
          <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Spent</p>
            <p className="text-2xl font-bold text-green-600 mt-1">₹{totalSpent.toLocaleString()}</p>
          </div>
          <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Service Orders</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{totalServices}</p>
          </div>
          <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Balance Due</p>
            <p className={`text-2xl font-bold mt-1 ${totalBalanceDue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              ₹{totalBalanceDue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 4. ID Details Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">ID & Additional Info</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><dt className="text-sm font-medium text-gray-500">ID Type</dt><dd className="mt-1 text-sm text-gray-900">{customer.idType || '-'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">ID Number</dt><dd className="mt-1 text-sm text-gray-900">{customer.idNumber || '-'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-sm font-medium text-gray-500">Notes</dt><dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{customer.notes || '-'}</dd></div>
              </dl>
            </div>
            <div className="w-full md:w-48 shrink-0">
              <p className="text-sm font-medium text-gray-500 mb-2">ID Proof</p>
              {customer.idProofUrl ? (
                <img src={customer.idProofUrl} alt="ID" className="h-48 w-full object-cover rounded shadow" />
              ) : (
                <div className="h-48 flex items-center justify-center bg-gray-100 text-gray-400 rounded border border-gray-200">No ID proof</div>
              )}
            </div>
          </div>
        </div>

        {/* Error Handling */}
        {historyError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center justify-between">
            <p>{historyError}</p>
            <button onClick={() => fetchHistory(customer)} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-medium text-sm">Retry</button>
          </div>
        )}

        {/* 5 & 6. History Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Purchase History */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-receipt text-blue-500"></i>
                Purchase History
              </h2>
              <span className="text-sm text-gray-500 font-medium">{sales.length} Purchases</span>
            </div>
            
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-24 w-full"></div>
                ))}
              </div>
            ) : sales.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-8 text-center">
                <i className="fas fa-receipt text-gray-300 text-3xl mb-2"></i>
                <p className="text-gray-500">No purchase history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sales.map(sale => {
                  const itemNames = (sale.items || []).map(i => i.name).join(', ');
                  const displayItems = itemNames.length > 60 ? itemNames.substring(0, 60) + '...' : itemNames;
                  return (
                    <div 
                      key={sale.id} 
                      onClick={() => navigate(`/sales/${sale.id}`)}
                      className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-blue-600">{sale.invoiceNumber}</span>
                        <span className="text-sm text-gray-500">{formatDate(sale.createdAt)}</span>
                      </div>
                      <div className="text-sm text-gray-700 mb-3 line-clamp-1">{displayItems || 'No items'}</div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">₹{sale.totalAmount}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">{sale.paymentMethod || 'Unknown'}</span>
                      </div>
                      {(Number(sale.balanceDue) || 0) > 0 && (
                        <div className="mt-2">
                          <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">
                            Balance Due: ₹{sale.balanceDue}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Service History */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-tools text-purple-500"></i>
                Service History
              </h2>
              <span className="text-sm text-gray-500 font-medium">{serviceOrders.length} Service Orders</span>
            </div>

            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-24 w-full"></div>
                ))}
              </div>
            ) : serviceOrders.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-8 text-center">
                <i className="fas fa-tools text-gray-300 text-3xl mb-2"></i>
                <p className="text-gray-500">No service history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceOrders.map(order => {
                  const complaints = order.complaintTypes || (order.complaintNature ? [order.complaintNature] : []);
                  const displayComplaints = complaints.slice(0, 2);
                  const extraComplaints = complaints.length - 2;

                  return (
                    <div 
                      key={order.id} 
                      onClick={() => navigate(`/service/${order.id}`)}
                      className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-blue-600">{order.orderNumber}</span>
                        <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-800 mb-2">
                        {order.brand} {order.model}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {displayComplaints.map((c, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">{c}</span>
                        ))}
                        {extraComplaints > 0 && (
                          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded">+{extraComplaints} more</span>
                        )}
                        {complaints.length === 0 && <span className="text-xs text-gray-400 italic">No complaints listed</span>}
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {order.estimatedPrice ? `₹${order.estimatedPrice}` : 'Price not set'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-bold ${getStatusColor(order.status)}`}>
                          {order.status || 'Unknown'}
                        </span>
                      </div>
                      {order.technicianName && (
                        <div className="text-xs text-gray-400 border-t border-gray-50 pt-2 mt-1">
                          Technician: {order.technicianName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Edit Modal */}
        {showEdit && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEdit(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">Edit Customer</h3>
                  <CustomerForm initialData={customer} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CustomerView;
