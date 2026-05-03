import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';
import ServiceOrderForm from './ServiceOrderForm';
import PatternLock from '../../components/PatternLock';
import { getLabelNumber } from '../../utils/getLabelNumber';
import { useAuth } from '../../context/AuthContext';
import NewSaleModal from '../../components/sales/NewSaleModal';
import { printLabel } from '../../utils/printLabel.jsx';
import Layout from '../../components/common/Layout';

const STATUSES = ['Received', 'In Progress', 'Parts Awaiting', 'Completed', 'Awaiting Customer Approval', 'Returned'];

const ServiceOrderView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [labelEntry, setLabelEntry] = useState(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [assigningLabel, setAssigningLabel] = useState(false);
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [salePrefillData, setSalePrefillData] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [editingTechnician, setEditingTechnician] = useState(false);
  const [savingTechnician, setSavingTechnician] = useState(false);
  const [ratingDoc, setRatingDoc] = useState(null);
  const [generatingRating, setGeneratingRating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const docSnap = await getDoc(doc(db, 'service_orders', id));
      if (docSnap.exists()) setOrder({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchLabel = useCallback(async () => {
    try {
      const snap = await getDocs(query(
        collection(db, 'label_registry'),
        where('referenceId', '==', id),
        where('labelType', '==', 'service_order')
      ));
      if (!snap.empty) setLabelEntry(snap.docs[0].data());
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchStaff = useCallback(async () => {
    try {
      const q = query(collection(db, 'users'), where('isActive', '==', true));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(doc => list.push({ uid: doc.id, ...doc.data() }));
      setStaffOptions(list);
    } catch (err) {
      console.error('Error fetching active staff:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchOrder();
        await fetchLabel();
        if (userRole?.toLowerCase() === 'admin') await fetchStaff();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchOrder, fetchLabel, fetchStaff, userRole]);

  useEffect(() => {
    const fetchRating = async () => {
      if (order?.ratingToken) {
        try {
          const ratingSnap = await getDoc(doc(db, 'ratings', order.ratingToken));
          if (ratingSnap.exists()) {
            setRatingDoc({ id: ratingSnap.id, ...ratingSnap.data() });
          }
        } catch (err) {
          console.error("Error fetching rating:", err);
        }
      }
    };
    fetchRating();
  }, [order?.ratingToken]);

  const formatDateTime = (value) => {
    if (!value) return '-';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const timeDeltaLabel = (date) => {
    if (!date) return '';
    const diff = date.getTime() - new Date().getTime();
    const absMs = Math.abs(diff);
    const days = Math.floor(absMs / 86400000);
    const hours = Math.floor((absMs % 86400000) / 3600000);
    const minutes = Math.floor((absMs % 3600000) / 60000);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'less than a minute';
  };

  const handleUpdate = async (data) => {
    const updated = { ...data, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'service_orders', id), updated);
    setOrder({ id, ...updated });
    return id;
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setUpdatingStatus(true);
    try {
      const updatePayload = { status: newStatus, updatedAt: new Date().toISOString() };
      if (newStatus === 'Completed' && order.status !== 'Completed') {
        updatePayload.actualCompletedAt = new Date();
      }
      await updateDoc(doc(db, 'service_orders', id), updatePayload);
      setOrder(prev => ({ ...prev, ...updatePayload }));
    } catch (err) { console.error(err); } finally { setUpdatingStatus(false); }
  };

  const handleTechnicianChange = async (uid) => {
    if (!uid) return;
    setSavingTechnician(true);
    try {
      const selected = staffOptions.find(s => s.uid === uid);
      const updatedData = {
        technicianUid: uid,
        technicianName: selected?.name || selected?.email || '',
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'service_orders', id), updatedData);
      setOrder(prev => ({ ...prev, ...updatedData }));
      setEditingTechnician(false);
    } catch (err) {
      console.error(err);
      alert('Unable to update technician.');
    } finally {
      setSavingTechnician(false);
    }
  };

  const openWhatsApp = (type) => {
    const phone = order.customerPhone.replace(/\D/g, '');
    const msg = type === 'receive'
      ? `Hi ${order.customerName}, we received your ${order.brand} ${order.model} for service. Order: ${order.orderNumber}. - French Mobiles`
      : `Hi ${order.customerName}, your ${order.brand} ${order.model} (Order: ${order.orderNumber}) is ready for pickup. Amount: ₹${order.estimatedPrice}. - French Mobiles`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCreateBill = () => {
    if (order.billCreated) {
      alert("A bill already exists for this order.");
      return;
    }
    const complaintText = order.complaintTypes?.join(', ') || order.complaintNature || 'Service';
    const billData = {
      saleType: "Service",
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: [{ 
        name: `Service - ${complaintText}${order.otherComplaint ? ` - ${order.otherComplaint}` : ''}`, 
        quantity: 1, 
        unitPrice: Number(order.estimatedPrice) || 0 
      }],
      serviceOrderId: order.id,
      serviceOrderNumber: order.orderNumber
    };
    setSalePrefillData(billData);
    setNewSaleModalOpen(true);
  };

  const handleSendRating = async () => {
    setGeneratingRating(true);
    try {
      const token = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      const ratingData = {
        token: token,
        serviceOrderId: id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        brand: order.brand,
        model: order.model,
        technicianName: order.technicianName || '',
        rating: null,
        comment: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        submittedAt: null,
        isUsed: false
      };
      
      await setDoc(doc(db, 'ratings', token), ratingData);
      await updateDoc(doc(db, 'service_orders', id), { ratingToken: token });
      setOrder(prev => ({...prev, ratingToken: token}));
      setRatingDoc({ id: token, ...ratingData });

      const message = `Hi ${order.customerName}, your ${order.brand} ${order.model} service is completed at French Mobiles! 🎉\n\nPlease take a moment to rate our service:\nhttps://${window.location.host}/rate/${token}\n\nThank you for choosing French Mobiles! 🙏`;
      const phone = order.customerPhone.replace(/\D/g, '');
      window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');

    } catch(e) {
      console.error("Error generating rating link:", e);
      alert("Failed to generate rating link.");
    }
    setGeneratingRating(false);
  };

  const openLabelDialog = async () => {
    const next = await getLabelNumber();
    setLabelInput(String(next));
    setShowLabelDialog(true);
  };

  const confirmAssign = async () => {
    setAssigningLabel(true);
    try {
      await addDoc(collection(db, 'label_registry'), {
        labelNumber: Number(labelInput),
        labelType: 'service_order',
        referenceId: id,
        assignedBy: auth.currentUser?.uid || 'unknown',
        assignedAt: new Date().toISOString(),
        isActive: true,
        data: {
          orderNumber: order.orderNumber || '',
          brand: order.brand || '', model: order.model || '', colour: order.colour || '',
          customerName: order.customerName || '', customerPhone: order.customerPhone || '',
          complaintType: order.complaintNature || '', 
          complaintTypes: order.complaintTypes || (order.complaintNature ? [order.complaintNature] : []),
          otherComplaint: order.otherComplaint || '',
          problemDetails: order.problemDetails || '',
          estimatedPrice: Number(order.estimatedPrice || 0), advancePaid: Number(order.advancePaid || 0),
          technicianName: order.technicianName || '', status: order.status || '',
          accessoriesCollected: order.accessories || [],
          rawMaterialCost: Number(order.rawMaterialCost || 0),
          outsideLabourCost: Number(order.outsideLabourCost || 0),
          createdBy: order.createdBy || '', createdAt: order.createdAt || '',
        }
      });
      setLabelEntry({ labelNumber: Number(labelInput) });
      setShowLabelDialog(false);
    } catch (err) { console.error(err); alert('Failed to assign label.'); }
    finally { setAssigningLabel(false); }
  };

  useEffect(() => {
    if (order && userRole?.toLowerCase() === 'staff' && order.technicianUid !== currentUser?.uid) {
      alert("You are not authorized to view this order");
      navigate('/service', { replace: true });
    }
  }, [order, userRole, currentUser, navigate]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-8 text-center text-red-600">Order not found</div>;

  if (order && userRole?.toLowerCase() === 'staff' && order.technicianUid !== currentUser?.uid) {
    return null;
  }

  const expectedCompletionDate = order.expectedCompletionAt ? (order.expectedCompletionAt.toDate ? order.expectedCompletionAt.toDate() : new Date(order.expectedCompletionAt)) : null;
  const isCompleted = order.status === 'Completed';
  const isOverdue = expectedCompletionDate && !isCompleted && expectedCompletionDate < new Date();

  try {
    return (
      <Layout title="Service Order Detail">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/service')} className="flex items-center text-gray-500 hover:text-indigo-600 font-medium">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Order: {order.orderNumber}</h1>
            {userRole?.toLowerCase() === 'admin' || (userRole?.toLowerCase() === 'staff' && order.technicianUid === currentUser?.uid && order.status !== 'Completed' && order.status !== 'Returned') ? (
              <select value={order.status} onChange={handleStatusChange} disabled={updatingStatus}
                className={`font-semibold rounded-full px-4 py-1 text-sm border-2 ${updatingStatus ? 'opacity-50' : ''}`}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className="font-semibold rounded-full px-4 py-1 text-sm border-2 bg-gray-100 text-gray-800">
                {order.status}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => openWhatsApp('receive')} className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-sm">WA Received</button>
            <button onClick={() => openWhatsApp('complete')} className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm">WA Ready</button>
            {labelEntry ? (
              <>
                <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-300">
                  🏷 Label: #{labelEntry.labelNumber}
                </span>
                <button onClick={() => printLabel(labelEntry)} className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Print
                </button>
              </>
            ) : (
              <button onClick={openLabelDialog} className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium">
                Assign Label Number
              </button>
            )}
            {(userRole?.toLowerCase() === 'admin' || (userRole?.toLowerCase() === 'staff' && order.technicianUid === currentUser?.uid)) && order.status !== 'Completed' && order.status !== 'Returned' && (
              <button onClick={() => setShowEdit(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">Edit Order</button>
            )}
            {order.status === 'Completed' && !order.billCreated && (
              <button onClick={handleCreateBill} className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md hover:bg-indigo-200 text-sm font-medium">Bill Pending</button>
            )}
            {order.status === 'Completed' && (
              <>
                {!order.ratingToken ? (
                  <button 
                    onClick={handleSendRating} 
                    disabled={generatingRating}
                    className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Send Rating Link
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-sm font-bold border border-gray-300">Rating Link Sent</span>
                    {ratingDoc && ratingDoc.status === 'submitted' && (
                      <span className="flex items-center text-yellow-500 font-bold bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                        ⭐ {ratingDoc.rating} / 5
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
            {order.status === 'Completed' && order.billCreated && (
              <div className="flex items-center space-x-2">
                <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-bold border border-green-300">Billed</span>
                {order.linkedSaleId && (
                  <Link to={`/sales/${order.linkedSaleId}`} className="text-indigo-600 hover:text-indigo-900 text-sm underline font-medium">View Bill</Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Device & Complaint</h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div><p className="text-sm text-gray-500">Device</p><p className="font-medium">{order.brand} {order.model} ({order.colour})</p></div>
                <div><p className="text-sm text-gray-500">IMEI 1</p><p className="font-medium">{order.imei1 || order.imei || '-'}</p></div>
                {order.imei2 ? (
                  <div><p className="text-sm text-gray-500">IMEI 2</p><p className="font-medium">{order.imei2}</p></div>
                ) : null}
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Complaints</p>
                  <div className="flex flex-wrap">
                    {order.complaintTypes && order.complaintTypes.length > 0 ? (
                      <>
                        {Array.isArray(order.complaintTypes) ? order.complaintTypes.map((c, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded mr-1 mb-1">
                            {c}
                          </span>
                        )) : (
                          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded mr-1 mb-1">{order.complaintTypes}</span>
                        )}
                      </>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded mr-1 mb-1">{order.complaintNature}</span>
                    )}
                    {order.otherComplaint && (
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded mr-1 mb-1"><span className="font-medium">Other:</span> {order.otherComplaint}</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2"><p className="text-sm text-gray-500">Lock</p><p className="font-medium">{order.lockType}{order.lockHint ? ` (${order.lockHint})` : ''}</p></div>
                {order.lockType === 'Pattern' && (
                  <div className="col-span-2">
                    <PatternLock value={order.lockPattern || []} readOnly />
                  </div>
                )}
                <div className="col-span-2"><p className="text-sm text-gray-500">Problem Details</p><p className="bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap">{order.problemDetails || '-'}</p></div>
                <div className="col-span-2"><p className="text-sm text-gray-500">Accessories</p><p className="font-medium">{order.accessories?.join(', ') || 'None'}</p></div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Financials & Assignment</h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div><p className="text-sm text-gray-500">Estimated Price</p><p className="text-xl font-bold text-green-600">₹{order.estimatedPrice}</p></div>
                <div><p className="text-sm text-gray-500">Advance Paid</p><p className="text-lg font-medium text-blue-600">₹{order.advancePaid || 0}</p></div>
                <div>
                  <p className="text-sm text-gray-500">Technician</p>
                  {userRole?.toLowerCase() === 'admin' ? (
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.technicianName || 'Unassigned'}</p>
                      <button type="button" onClick={() => setEditingTechnician(true)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6 6 3-3-6-6-3 3z" /></svg>
                      </button>
                    </div>
                  ) : (
                    <p className="font-medium">{order.technicianName || 'Unassigned'}</p>
                  )}
                </div>
                <div><p className="text-sm text-gray-500">Created At</p><p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p></div>
                <div className="border-t col-span-2 pt-4 mt-2 grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-gray-500">Raw Material</p><p className="font-medium">₹{order.rawMaterialCost || 0}</p></div>
                  <div><p className="text-sm text-gray-500">Outside Labour</p><p className="font-medium">₹{order.outsideLabourCost || 0}</p></div>
                </div>
              </div>
              {editingTechnician && userRole?.toLowerCase() === 'admin' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Change Technician</label>
                  <select
                    value={order.technicianUid || ''}
                    onChange={e => handleTechnicianChange(e.target.value)}
                    disabled={savingTechnician}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="">Select technician</option>
                    {staffOptions.map(staff => (
                      <option key={staff.uid} value={staff.uid}>{`${staff.name || staff.email}${staff.role ? ` (${staff.role})` : ''}`}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setEditingTechnician(false)} className="mt-3 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              )}
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Time Tracking</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Received At</p>
                  <p className="font-medium">{formatDateTime(order.receivedAt)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">Expected Completion</p>
                    {isOverdue && (
                      <span className="text-red-600 text-xs font-semibold">OVERDUE</span>
                    )}
                  </div>
                  <p className={`font-medium ${isCompleted ? 'text-gray-600' : isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                    {formatDateTime(order.expectedCompletionAt)}
                  </p>
                  {expectedCompletionDate ? (
                    isCompleted ? (
                      <p className="text-xs text-gray-500">Completed</p>
                    ) : isOverdue ? (
                      <p className="text-xs text-red-600">Overdue by {timeDeltaLabel(expectedCompletionDate)}</p>
                    ) : (
                      <p className="text-xs text-green-600">{timeDeltaLabel(expectedCompletionDate)} remaining</p>
                    )
                  ) : null}
                </div>
                {order.actualCompletedAt || order.completedAt ? (
                  <div>
                    <p className="text-sm text-gray-500">Actual Completed At</p>
                    <p className="font-medium">{formatDateTime(order.actualCompletedAt || order.completedAt)}</p>
                  </div>
                ) : null}
              </div>
            </div>
            {order.imageUrl && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold border-b pb-2 mb-4">Device Image</h3>
                <img src={order.imageUrl} alt="Device" className="max-h-96 rounded object-contain bg-gray-50 mx-auto" />
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Customer</h3>
              <div className="space-y-3">
                <div><p className="text-sm text-gray-500">Name</p><p className="font-medium text-lg">{order.customerName}</p></div>
                <div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{order.customerPhone}</p></div>
                <div><p className="text-sm text-gray-500">Alternate Number</p><p className="font-medium">{order.alternatePhone || 'Not specified'}</p></div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-6 bg-yellow-50">
              <h3 className="text-lg font-semibold border-b border-yellow-200 pb-2 mb-4 text-yellow-800">Technician Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-yellow-900">{order.suggestions || 'No notes provided.'}</p>
            </div>
          </div>
        </div>

        {showLabelDialog && (
          <div className="fixed z-50 inset-0 flex items-center justify-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowLabelDialog(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
              <h3 className="text-lg font-bold mb-2">Assign Label Number</h3>
              <p className="text-gray-600 mb-4">Assigning to order <strong>{order.orderNumber}</strong>.</p>
              <input type="number" value={labelInput} onChange={e => setLabelInput(e.target.value)} className="w-full border border-gray-300 rounded-md px-4 py-2 text-2xl font-bold mb-4" />
              <div className="flex space-x-3">
                <button onClick={confirmAssign} disabled={assigningLabel} className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 font-medium disabled:opacity-50">
                  {assigningLabel ? 'Assigning...' : `Confirm #${labelInput}`}
                </button>
                <button onClick={() => setShowLabelDialog(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showEdit && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowEdit(false)}></div>
              <div className="relative bg-white rounded-lg shadow-xl sm:max-w-4xl w-full">
                <div className="px-4 pt-5 pb-4 sm:p-6">
                  <h3 className="text-lg font-medium mb-5">Edit Service Order</h3>
                  <div className="max-h-[75vh] overflow-y-auto px-2">
                    <ServiceOrderForm initialData={order} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <NewSaleModal 
          isOpen={newSaleModalOpen} 
          onClose={() => setNewSaleModalOpen(false)} 
          prefillData={salePrefillData} 
          onSuccess={fetchOrder} 
        />
      </div>
      </Layout>
    );
  } catch (err) {
    console.error("Error rendering ServiceOrderView:", err);
    return (
      <Layout title="Error">
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg max-w-2xl mx-auto mt-10">
          <h3 className="font-bold text-xl mb-2">Something went wrong</h3>
          <p>The service order details could not be displayed due to an error.</p>
          <p className="text-sm mt-4 text-red-500 font-mono bg-red-100 p-2 rounded text-left overflow-x-auto">{err.toString()}</p>
          <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-4 py-2 rounded">Refresh Page</button>
        </div>
      </Layout>
    );
  }
};

export default ServiceOrderView;
