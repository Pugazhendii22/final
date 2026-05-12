import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';
import ServiceOrderForm from './ServiceOrderForm';
import PatternLock from '../../components/PatternLock';
import { getLabelNumber } from '../../utils/getLabelNumber';
import { useAuth } from '../../context/AuthContext';
import NewSaleModal from '../../components/sales/NewSaleModal';
import { printLabel } from '../../utils/printLabel.jsx';
import Layout from '../../components/common/Layout';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const STATUSES = ['Received', 'In Progress', 'Parts Awaiting', 'Awaiting Customer Approval', 'Returned'];
const NON_COMPLETED_STATUSES = ['Received', 'In Progress', 'Parts Awaiting', 'Awaiting Customer Approval', 'Returned'];

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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      await updateDoc(doc(db, 'service_orders', id), updatePayload);
      setOrder(prev => ({ ...prev, ...updatePayload }));
    } catch (err) { console.error(err); } finally { setUpdatingStatus(false); }
  };

  const handleCompleteOrder = async () => {
    if (order?.status === 'Completed') return;
    setUpdatingStatus(true);
    try {
      const updatePayload = {
        status: 'Completed',
        updatedAt: new Date().toISOString(),
        actualCompletedAt: new Date()
      };
      await updateDoc(doc(db, 'service_orders', id), updatePayload);
      setOrder(prev => ({ ...prev, ...updatePayload }));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
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
      setOrder(prev => ({ ...prev, ratingToken: token }));
      setRatingDoc({ id: token, ...ratingData });

      const message = `Hi ${order.customerName}, your ${order.brand} ${order.model} service (₹${order.estimatedPrice}) is completed at French Mobiles! 🎉\n\nPlease take a moment to rate our service:\nhttps://${window.location.host}/rate/${token}\n\nThank you for choosing French Mobiles! 🙏`;
      const phone = order.customerPhone.replace(/\D/g, '');
      window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');

    } catch (e) {
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleting(true);
    try {
      // Delete the service order document
      await deleteDoc(doc(db, 'service_orders', deleteTarget.id));
      
      // If there's a linked sale, we might want to handle it, but for now just delete the order
      // If there's a rating token, delete the rating document too
      if (deleteTarget.ratingToken) {
        try {
          await deleteDoc(doc(db, 'ratings', deleteTarget.ratingToken));
        } catch (ratingErr) {
          console.error('Error deleting rating:', ratingErr);
          // Don't fail the whole operation if rating deletion fails
        }
      }
      
      // If there's a label assigned, mark it as inactive
      if (labelEntry) {
        try {
          const labelQuery = query(
            collection(db, 'label_registry'),
            where('referenceId', '==', deleteTarget.id),
            where('labelType', '==', 'service_order')
          );
          const labelSnap = await getDocs(labelQuery);
          if (!labelSnap.empty) {
            await updateDoc(labelSnap.docs[0].ref, { isActive: false });
          }
        } catch (labelErr) {
          console.error('Error deactivating label:', labelErr);
          // Don't fail the whole operation if label deactivation fails
        }
      }
      
      // Navigate back to service list
      navigate('/service');
    } catch (err) {
      console.error('Error deleting service order:', err);
      alert('Failed to delete service order. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    if (order && userRole?.toLowerCase() === 'staff' && order.technicianUid !== currentUser?.uid) {
      alert("You are not authorized to view this order");
      navigate('/service', { replace: true });
    }
  }, [order, userRole, currentUser, navigate]);

  if (loading) return <div className="p-4 md:p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-4 md:p-8 text-center text-red-600">Order not found</div>;

  if (order && userRole?.toLowerCase() === 'staff' && order.technicianUid !== currentUser?.uid) {
    return null;
  }

  const expectedCompletionDate = order.expectedCompletionAt ? (order.expectedCompletionAt.toDate ? order.expectedCompletionAt.toDate() : new Date(order.expectedCompletionAt)) : null;
  const isCompleted = order.status === 'Completed';
  const isOverdue = expectedCompletionDate && !isCompleted && expectedCompletionDate < new Date();

  const canChangeStatus = userRole === 'admin' || (
    userRole === 'staff' &&
    order?.technicianUid === currentUser?.uid &&
    order?.status !== 'Completed' &&
    order?.status !== 'Returned'
  );

  const statusColors = order?.status === 'Completed' ? 'bg-green-100 text-green-700' :
    order?.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
    order?.status === 'Parts Awaiting' ? 'bg-orange-100 text-orange-700' :
    order?.status === 'Returned' ? 'bg-red-100 text-[#ED2939]' :
    order?.status === 'Awaiting Customer Approval' ? 'bg-purple-100 text-purple-700' :
    'bg-blue-100 text-blue-700';

  const availableStatusOptions = NON_COMPLETED_STATUSES;
  const filteredStatusOptions = userRole === 'admin'
    ? availableStatusOptions
    : availableStatusOptions.slice(Math.max(0, availableStatusOptions.indexOf(order?.status)));

  const showStatusSelect = canChangeStatus && order?.status !== 'Completed';

  try {
    return (
  <div className="min-h-screen bg-[#f8fafc] pb-24">

    {/* HEADER */}
    <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
      <button onClick={() => navigate('/service')} className="text-[#002395] p-1">
        <i className="fas fa-arrow-left text-lg"></i>
      </button>
      <h1 className="text-lg font-bold text-[#0f172a] flex-1">Service Order</h1>
      {userRole?.toLowerCase() === 'admin' && (
        <button onClick={() => setDeleteTarget(order)} className="text-[#ED2939] p-2">
          <i className="fas fa-trash text-base"></i>
        </button>
      )}
    </div>

    <div className="px-4 py-4 space-y-4">

      {/* ORDER CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <p className="text-xs font-bold text-[#002395] font-mono truncate max-w-full">
                {order?.orderNumber}
              </p>
              {showStatusSelect ? (
                <select
                  value={order?.status}
                  onChange={handleStatusChange}
                  disabled={updatingStatus}
                  className="w-full md:w-auto max-w-full inline-flex items-center bg-white border border-gray-200 text-[11px] sm:text-xs text-gray-700 rounded-full px-3 py-2 font-semibold whitespace-normal shadow-sm focus:outline-none focus:ring-2 focus:ring-[#002395]"
                >
                  {filteredStatusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              ) : (
                <span className={`self-start text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-semibold whitespace-normal break-words max-w-full ${statusColors}`}>
                  {order?.status}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-[#0f172a] mt-3">{order?.customerName}</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              <i className="fas fa-phone text-green-500 mr-1"></i>
              {order?.customerPhone}
            </p>
            {order?.alternatePhone && (
              <p className="text-gray-400 text-xs mt-0.5">{order?.alternatePhone}</p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Device</p>
              <p className="font-semibold text-[#0f172a] text-sm">{order?.brand} {order?.model}</p>
            </div>
            {order?.colour && (
              <div>
                <p className="text-xs text-gray-400">Colour</p>
                <p className="font-semibold text-[#0f172a] text-sm">{order?.colour}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Estimated Price</p>
              <p className="font-bold text-[#002395] text-lg">₹{order?.estimatedPrice}</p>
            </div>
            {order?.advancePaid > 0 && (
              <div>
                <p className="text-xs text-gray-400">Advance Paid</p>
                <p className="font-semibold text-green-600 text-sm">₹{order?.advancePaid}</p>
              </div>
            )}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {(userRole?.toLowerCase() === 'admin' || order?.technicianUid === currentUser?.uid) && (
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 bg-[#002395]/10 text-[#002395] px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <i className="fas fa-edit"></i> Edit
            </button>
          )}
          <button
            onClick={() => openWhatsApp('receive')}
            className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-semibold"
          >
            <i className="fab fa-whatsapp"></i> Received
          </button>
          {(userRole?.toLowerCase() === 'admin' || order?.technicianUid === currentUser?.uid) && order?.status !== 'Completed' && (
            <button
              onClick={handleCompleteOrder}
              disabled={updatingStatus}
              className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              <i className="fas fa-check-circle"></i> Complete
            </button>
          )}
          {order?.status === 'Completed' && (
            <button
              onClick={() => openWhatsApp('complete')}
              className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <i className="fab fa-whatsapp"></i> Ready
            </button>
          )}
          {order?.status === 'Completed' && !order?.ratingToken && (
            <button
              onClick={handleSendRating}
              disabled={generatingRating}
              className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              <i className="fas fa-star"></i> Rating
            </button>
          )}
          {labelEntry ? (
            <button
              onClick={() => printLabel(labelEntry)}
              className="flex items-center gap-1.5 bg-[#ED2939]/10 text-[#ED2939] px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <i className="fas fa-print"></i> Print #{labelEntry.labelNumber}
            </button>
          ) : (
            <button
              onClick={openLabelDialog}
              className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <i className="fas fa-tag"></i> Assign Label
            </button>
          )}
          {order?.status === 'Completed' && !order?.billCreated && (
            <button
              onClick={handleCreateBill}
              className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <i className="fas fa-receipt"></i> Bill
            </button>
          )}
          {order?.status === 'Completed' && order?.billCreated && order?.linkedSaleId && (
            <button
              onClick={() => navigate(`/sales/${order?.linkedSaleId}`)}
              className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <i className="fas fa-receipt"></i> View Bill
            </button>
          )}
        </div>
      </div>

      {/* ISSUES REPORTED */}
      {(order?.complaintTypes?.length > 0 || order?.complaintNature || order?.otherComplaint) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-[#ED2939] uppercase tracking-wide mb-3 border-l-4 border-[#ED2939] pl-3">
            Issues Reported
          </p>
          <div className="flex flex-wrap gap-2">
            {order?.complaintTypes && order.complaintTypes.length > 0 ? (
              Array.isArray(order.complaintTypes) ? order.complaintTypes.map((c, i) => (
                <span key={i} className="bg-[#ED2939]/10 text-[#ED2939] text-xs px-3 py-1 rounded-full font-medium">
                  {c}
                </span>
              )) : (
                <span className="bg-[#ED2939]/10 text-[#ED2939] text-xs px-3 py-1 rounded-full font-medium">
                  {order.complaintTypes}
                </span>
              )
            ) : order?.complaintNature ? (
              <span className="bg-[#ED2939]/10 text-[#ED2939] text-xs px-3 py-1 rounded-full font-medium">
                {order.complaintNature}
              </span>
            ) : null}
            {order?.otherComplaint && (
              <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                {order.otherComplaint}
              </span>
            )}
          </div>
          {order?.problemDetails && (
            <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-xl p-3">{order.problemDetails}</p>
          )}
        </div>
      )}

      {/* SERVICE DETAILS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
          Service Details
        </p>
        <div className="grid grid-cols-2 gap-3">
          {order?.technicianName && (
            <div>
              <p className="text-xs text-gray-400">Technician</p>
              <p className="font-semibold text-[#0f172a] text-sm">{order?.technicianName}</p>
            </div>
          )}
          {order?.imei && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400">IMEI</p>
              <p className="font-semibold text-[#0f172a] text-sm break-all">{order?.imei}</p>
            </div>
          )}
          {order?.lockType && order?.lockType !== 'None' && (
            <div>
              <p className="text-xs text-gray-400">Lock Type</p>
              <p className="font-semibold text-[#0f172a] text-sm">{order?.lockType}</p>
            </div>
          )}
          {order?.pattern && order.pattern.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Pattern</p>
              <p className="font-semibold text-[#0f172a] text-sm">{order.pattern.join(' → ')}</p>
            </div>
          )}
          {order?.rawMaterialCost > 0 && (
            <div>
              <p className="text-xs text-gray-400">Raw Material</p>
              <p className="font-semibold text-[#0f172a] text-sm">₹{order?.rawMaterialCost}</p>
            </div>
          )}
          {order?.outsideLabourCost > 0 && (
            <div>
              <p className="text-xs text-gray-400">Outside Labour</p>
              <p className="font-semibold text-[#0f172a] text-sm">₹{order?.outsideLabourCost}</p>
            </div>
          )}
        </div>
      </div>

      {/* TIME TRACKING */}
      {(order?.receivedAt || order?.expectedCompletionAt) && (
        <div className={`bg-white rounded-2xl shadow-sm border-l-4 p-4 ${
          order?.status !== 'Completed' && order?.expectedCompletionAt &&
          new Date(order?.expectedCompletionAt?.toDate?.() || order.expectedCompletionAt) < new Date()
            ? 'border-[#ED2939]'
            : 'border-green-500'
        }`}>
          <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3">
            Time Tracking
          </p>
          <div className="grid grid-cols-2 gap-3">
            {order?.receivedAt && (
              <div>
                <p className="text-xs text-gray-400">Received</p>
                <p className="font-semibold text-[#0f172a] text-sm">
                  {new Date(order?.receivedAt?.toDate?.() || order.receivedAt).toLocaleString('en-IN')}
                </p>
              </div>
            )}
            {order?.expectedCompletionAt && (
              <div>
                <p className="text-xs text-gray-400">Expected By</p>
                <p className={`font-semibold text-sm ${
                  order?.status !== 'Completed' &&
                  new Date(order?.expectedCompletionAt?.toDate?.() || order.expectedCompletionAt) < new Date()
                    ? 'text-[#ED2939]'
                    : 'text-[#0f172a]'
                }`}>
                  {new Date(order?.expectedCompletionAt?.toDate?.() || order.expectedCompletionAt).toLocaleString('en-IN')}
                  {order?.status !== 'Completed' &&
                  new Date(order?.expectedCompletionAt?.toDate?.() || order.expectedCompletionAt) < new Date() && (
                    <span className="ml-1 text-xs bg-[#ED2939] text-white px-1.5 py-0.5 rounded-full">
                      OVERDUE
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACCESSORIES */}
      {order?.accessories?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
            Accessories Collected
          </p>
          <div className="flex flex-wrap gap-2">
            {order.accessories.map((acc, i) => (
              <span key={i} className="bg-[#002395]/10 text-[#002395] text-xs px-3 py-1 rounded-full">
                {acc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SUGGESTIONS */}
      {order?.suggestions && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
            Notes & Suggestions
          </p>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{order?.suggestions}</p>
        </div>
      )}

      {/* DEVICE IMAGE */}
      {order?.imageUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 mb-6">
          <h3 className="text-lg font-bold text-[#0f172a] mb-4 flex items-center">
            <i className="fas fa-camera text-[#002395] mr-2"></i>Device Image
          </h3>
          <div className="flex justify-center">
            <img src={order.imageUrl} alt="Device" className="max-w-full h-auto rounded-lg shadow-sm border border-[#e2e8f0]" />
          </div>
        </div>
      )}

    </div>

    {/* MODALS */}
    {showLabelDialog && (
      <div className="fixed z-50 inset-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-[#0f172a]/50" onClick={() => setShowLabelDialog(false)}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10">
          <h3 className="text-lg font-bold text-[#0f172a] mb-2 flex items-center">
            <i className="fas fa-tag text-[#002395] mr-2"></i>Assign Label Number
          </h3>
          <p className="text-[#64748b] mb-4">Assigning to order <strong className="text-[#0f172a]">{order.orderNumber}</strong>.</p>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            className="w-full border border-[#e2e8f0] focus:border-[#002395] focus:ring-1 focus:ring-[#002395] rounded-lg px-4 py-3 text-2xl font-bold mb-4 bg-[#f8fafc]"
          />
          <div className="flex space-x-3">
            <button
              onClick={confirmAssign}
              disabled={assigningLabel}
              className="flex-1 bg-[#002395] text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-[#001a7a]"
            >
              {assigningLabel ? 'Assigning...' : `Confirm #${labelInput}`}
            </button>
            <button
              onClick={() => setShowLabelDialog(false)}
              className="flex-1 bg-[#e2e8f0] text-[#64748b] py-3 rounded-xl font-medium hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {showEdit && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
        <div className="bg-white w-full md:max-w-2xl md:mx-auto rounded-t-3xl md:rounded-2xl flex flex-col max-h-[90vh]">
          {/* Modal handle */}
          <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Edit Service Order</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ServiceOrderForm initialData={order} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
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

    <ConfirmDeleteModal
      isOpen={!!deleteTarget}
      onConfirm={handleDelete}
      onCancel={() => setDeleteTarget(null)}
      title="Delete Service Order"
      message={`Are you sure you want to delete service order ${deleteTarget?.orderNumber}? This will also delete any associated rating and deactivate the label. This action cannot be undone.`}
      deleting={deleting}
    />

  </div>
);
  } catch (err) {
    console.error("Error rendering ServiceOrderView:", err);
    return (
      <Layout title="Error" pageType="detail" backTo="/service">
        <div className="p-4 md:p-8 text-center text-red-600 bg-red-50 rounded-lg max-w-2xl mx-auto mt-10 break-words">
          <h3 className="font-bold text-xl mb-2">Something went wrong</h3>
          <p>The service order details could not be displayed due to an error.</p>
          <p className="text-sm mt-4 text-red-500 font-mono bg-red-100 p-2 rounded text-left overflow-x-auto break-words">{err.toString()}</p>
          <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-4 py-2 rounded break-words">Refresh Page</button>
        </div>
      </Layout>
    );
  }
};

export default ServiceOrderView;
