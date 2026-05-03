import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Layout from '../components/common/Layout';

const StatCard = ({ label, value, subvalue, color, onClick, icon }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {subvalue && <span className="text-sm font-semibold text-green-600">{subvalue}</span>}
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { userRole, currentUser } = useAuth();
  const navigate = useNavigate();

  const [lowStockCount, setLowStockCount] = useState(0);
  const [salesToday, setSalesToday] = useState({ count: 0, amount: 0 });
  const [serviceToday, setServiceToday] = useState(0);
  const [pendingService, setPendingService] = useState(0);
  const [overdueOrders, setOverdueOrders] = useState([]);
  const [dueTodayOrders, setDueTodayOrders] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [openEnquiries, setOpenEnquiries] = useState(0);
  const [loading, setLoading] = useState(true);

  // Staff-specific states
  const [myOverdueOrders, setMyOverdueOrders] = useState([]);
  const [myDueTodayOrders, setMyDueTodayOrders] = useState([]);
  const [myPendingOrdersList, setMyPendingOrdersList] = useState([]);

  // Task-specific states
  const [adminTaskStats, setAdminTaskStats] = useState({ pendingToday: 0, overdue: 0, completedToday: 0 });
  const [staffTaskStats, setStaffTaskStats] = useState({ pending: 0, overdue: 0, todayList: [] });

  // Rating-specific states
  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0, breakdown: [0,0,0,0,0,0], recent: [] });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const prodSnap = await getDocs(collection(db, 'products'));
        let lCount = 0;
        prodSnap.forEach(d => { const p = d.data(); if (p.stock <= p.threshold) lCount++; });
        setLowStockCount(lCount);

        const salesSnap = await getDocs(collection(db, 'sales'));
        let sCount = 0, sAmt = 0;
        salesSnap.forEach(d => {
          const s = d.data();
          if (s.createdAt?.startsWith(todayStr)) { sCount++; sAmt += Number(s.totalAmount) || 0; }
        });
        setSalesToday({ count: sCount, amount: sAmt });

        let srvQuery = collection(db, 'service_orders');
        if (userRole?.toLowerCase() === 'staff') {
          srvQuery = query(srvQuery, where('technicianUid', '==', currentUser.uid));
        }
        const srvSnap = await getDocs(srvQuery);

        let srvToday = 0, srvPend = 0;
        const overdueList = [];
        const dueTodayList = [];
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Staff-specific data
        const myOverdue = [];
        const myDueToday = [];
        const myPendingList = [];

        srvSnap.forEach(d => {
          const srv = d.data();
          if (srv.createdAt?.startsWith(todayStr)) srvToday++;
          if (['Received', 'In Progress', 'Parts Awaiting'].includes(srv.status)) {
            srvPend++;
          }

          const expected = srv.expectedCompletionAt?.toDate ? srv.expectedCompletionAt.toDate() : new Date(srv.expectedCompletionAt);
          
          if (srv.status !== 'Completed' && srv.status !== 'Returned') {
            if (userRole?.toLowerCase() === 'staff' && srv.technicianUid === currentUser.uid) {
              myPendingList.push({ id: d.id, ...srv, expectedCompletionAt: expected });
            }
            
            if (expected instanceof Date && !Number.isNaN(expected.getTime())) {
              if (expected < now) {
                if (userRole?.toLowerCase() === 'admin') overdueList.push({ id: d.id, ...srv, expectedCompletionAt: expected });
                if (userRole?.toLowerCase() === 'staff' && srv.technicianUid === currentUser.uid) {
                  myOverdue.push({ id: d.id, ...srv, expectedCompletionAt: expected });
                }
              } else if (expected >= startToday && expected < endToday) {
                if (userRole?.toLowerCase() === 'admin') dueTodayList.push({ id: d.id, ...srv, expectedCompletionAt: expected });
                if (userRole?.toLowerCase() === 'staff' && srv.technicianUid === currentUser.uid) {
                  myDueToday.push({ id: d.id, ...srv, expectedCompletionAt: expected });
                }
              }
            }
          }
        });
        setServiceToday(srvToday);
        setPendingService(srvPend);
        setOverdueOrders(overdueList);
        setDueTodayOrders(dueTodayList);

        // Set staff data
        setMyOverdueOrders(myOverdue);
        setMyDueTodayOrders(myDueToday);
        setMyPendingOrdersList(myPendingList);

        const custSnap = await getDocs(collection(db, 'customers'));
        setTotalCustomers(custSnap.size);

        const enqSnap = await getDocs(collection(db, 'enquiries'));
        let enqCount = 0;
        enqSnap.forEach(d => { if (d.data().status === 'Open') enqCount++; });
        setOpenEnquiries(enqCount);

        // Fetch Tasks Data
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        
        if (userRole?.toLowerCase() === 'admin') {
          let pToday = 0, oDue = 0, cToday = 0;
          tasksSnap.forEach(d => {
            const t = d.data();
            const due = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
            if (t.status === 'completed' && t.completedAt) {
              const compDate = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
              if (compDate >= startToday && compDate < endToday) cToday++;
            } else if (t.status === 'pending') {
              if (due >= startToday && due < endToday) pToday++;
              if (due < now) oDue++;
            }
          });
          setAdminTaskStats({ pendingToday: pToday, overdue: oDue, completedToday: cToday });
        } else if (userRole?.toLowerCase() === 'staff') {
          let sPend = 0, sOver = 0;
          const sList = [];
          tasksSnap.forEach(d => {
            const t = d.data();
            if (t.assignedTo === currentUser.uid && t.status === 'pending') {
              sPend++;
              const due = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
              if (due < now) sOver++;
              if (due >= startToday && due < endToday) sList.push({ id: d.id, ...t, due });
            }
          });
          setStaffTaskStats({ pending: sPend, overdue: sOver, todayList: sList.slice(0, 3) });
        }

        // Fetch Ratings Data (Admin only)
        if (userRole?.toLowerCase() === 'admin') {
          const ratingsSnap = await getDocs(collection(db, 'ratings'));
          let sum = 0, count = 0;
          let bd = [0, 0, 0, 0, 0, 0]; // index matches rating (1-5)
          let allRatings = [];
          
          ratingsSnap.forEach(d => {
            const r = d.data();
            if (r.status === 'submitted' && r.rating) {
              sum += r.rating;
              count++;
              bd[r.rating] = (bd[r.rating] || 0) + 1;
              allRatings.push({ id: d.id, ...r });
            }
          });
          
          allRatings.sort((a, b) => {
            const da = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
            const db = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt);
            return db - da;
          });
          
          setRatingStats({
            average: count > 0 ? (sum / count).toFixed(1) : 0,
            count: count,
            breakdown: bd,
            recent: allRatings.slice(0, 5)
          });
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const getTimeDeltaText = (targetDate) => {
    if (!targetDate) return '';
    const date = targetDate instanceof Date ? targetDate : (targetDate?.toDate ? targetDate.toDate() : new Date(targetDate));
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = date.getTime() - new Date().getTime();
    const absMs = Math.abs(diffMs);
    const days = Math.floor(absMs / 86400000);
    const hours = Math.floor((absMs % 86400000) / 3600000);
    const minutes = Math.floor((absMs % 3600000) / 60000);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'less than a minute';
  };

  return (
    <Layout title="Dashboard">
      {userRole?.toLowerCase() === 'staff' && staffTaskStats.overdue > 0 && (
        <div 
          onClick={() => navigate('/tasks')}
          className="bg-red-600 text-white p-3 mb-6 rounded-lg shadow-md cursor-pointer hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          You have {staffTaskStats.overdue} overdue task{staffTaskStats.overdue > 1 ? 's' : ''}!
        </div>
      )}

      {lowStockCount > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <p className="text-sm text-yellow-700 font-medium">
              {lowStockCount} product(s) are low on stock.{' '}
              <Link to="/products" className="font-bold underline">Review Inventory</Link>
            </p>
          </div>
        </div>
      )}

      {userRole === 'admin' && overdueOrders.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-700">Overdue Orders</p>
              <p className="text-sm text-red-600">{overdueOrders.length} order(s) overdue for completion.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-red-600 text-white px-3 py-1 text-xs font-semibold">{overdueOrders.length}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {overdueOrders.map(order => {
              const dueDate = order.expectedCompletionAt instanceof Date ? order.expectedCompletionAt : (order.expectedCompletionAt?.toDate ? order.expectedCompletionAt.toDate() : new Date(order.expectedCompletionAt));
              return (
                <button key={order.id} onClick={() => navigate(`/service/${order.id}`)} className="text-left w-full rounded-xl border border-red-200 bg-white p-4 hover:bg-red-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-red-700">{order.orderNumber}</span>
                    <span className="text-xs text-red-500">Overdue by {getTimeDeltaText(dueDate)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{order.customerName} · {order.brand} {order.model}</p>
                  <p className="text-sm text-slate-500">Technician: {order.technicianName || 'Unassigned'}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {userRole === 'admin' && dueTodayOrders.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-700">Due Today</p>
              <p className="text-sm text-amber-600">{dueTodayOrders.length} order(s) expected to complete today.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-600 text-white px-3 py-1 text-xs font-semibold">{dueTodayOrders.length}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {dueTodayOrders.map(order => {
              const dueDate = order.expectedCompletionAt instanceof Date ? order.expectedCompletionAt : (order.expectedCompletionAt?.toDate ? order.expectedCompletionAt.toDate() : new Date(order.expectedCompletionAt));
              return (
                <button key={order.id} onClick={() => navigate(`/service/${order.id}`)} className="text-left w-full rounded-xl border border-amber-200 bg-white p-4 hover:bg-amber-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-amber-700">{order.orderNumber}</span>
                    <span className="text-xs text-amber-600">Due in {getTimeDeltaText(dueDate)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{order.customerName} · {order.brand} {order.model}</p>
                  <p className="text-sm text-slate-500">Technician: {order.technicianName || 'Unassigned'}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {userRole?.toLowerCase() === 'staff' && myOverdueOrders.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-700">My Overdue Orders</p>
              <p className="text-sm text-red-600">{myOverdueOrders.length} order(s) overdue for completion.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-red-600 text-white px-3 py-1 text-xs font-semibold">{myOverdueOrders.length}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {myOverdueOrders.map(order => {
              const dueDate = order.expectedCompletionAt instanceof Date ? order.expectedCompletionAt : (order.expectedCompletionAt?.toDate ? order.expectedCompletionAt.toDate() : new Date(order.expectedCompletionAt));
              return (
                <button key={order.id} onClick={() => navigate(`/service/${order.id}`)} className="text-left w-full rounded-xl border border-red-200 bg-white p-4 hover:bg-red-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-red-700">{order.orderNumber}</span>
                    <span className="text-xs text-red-500">Overdue by {getTimeDeltaText(dueDate)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{order.customerName} · {order.brand} {order.model}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {userRole?.toLowerCase() === 'staff' && myDueTodayOrders.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-700">My Due Today</p>
              <p className="text-sm text-amber-600">{myDueTodayOrders.length} order(s) expected to complete today.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-600 text-white px-3 py-1 text-xs font-semibold">{myDueTodayOrders.length}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {myDueTodayOrders.map(order => {
              const dueDate = order.expectedCompletionAt instanceof Date ? order.expectedCompletionAt : (order.expectedCompletionAt?.toDate ? order.expectedCompletionAt.toDate() : new Date(order.expectedCompletionAt));
              return (
                <button key={order.id} onClick={() => navigate(`/service/${order.id}`)} className="text-left w-full rounded-xl border border-amber-200 bg-white p-4 hover:bg-amber-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-amber-700">{order.orderNumber}</span>
                    <span className="text-xs text-amber-600">Due in {getTimeDeltaText(dueDate)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{order.customerName} · {order.brand} {order.model}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {userRole?.toLowerCase() === 'staff' && myPendingOrdersList.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">My Pending Orders</p>
              <p className="text-sm text-blue-600">{myPendingOrdersList.length} active order(s) assigned to you.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-semibold">{myPendingOrdersList.length}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {myPendingOrdersList.map(order => {
              const dueDate = order.expectedCompletionAt instanceof Date ? order.expectedCompletionAt : (order.expectedCompletionAt?.toDate ? order.expectedCompletionAt.toDate() : new Date(order.expectedCompletionAt));
              return (
                <button key={order.id} onClick={() => navigate(`/service/${order.id}`)} className="text-left w-full rounded-xl border border-blue-200 bg-white p-4 hover:bg-blue-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-blue-700">{order.orderNumber}</span>
                    <span className="text-xs text-blue-600 px-2 py-0.5 rounded bg-blue-100">{order.status}</span>
                  </div>
                  <p className="text-sm text-slate-700">{order.customerName} · {order.brand} {order.model}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Task Management Overview */}
      {userRole === 'admin' && (adminTaskStats.pendingToday > 0 || adminTaskStats.overdue > 0 || adminTaskStats.completedToday > 0) && (
        <div onClick={() => navigate('/admin/tasks')} className="bg-white border-l-4 border-indigo-500 p-4 mb-6 rounded-r-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-sm font-semibold text-indigo-700">Task Overview</p>
              <p className="text-sm text-gray-500">Staff tasks progress today.</p>
            </div>
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </div>
          <div className="flex gap-4 sm:gap-8 mt-3 border-t border-gray-100 pt-3">
            <div>
              <span className="block text-2xl font-bold text-gray-800">{adminTaskStats.pendingToday}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Pending Today</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-red-600">{adminTaskStats.overdue}</span>
              <span className="text-xs text-red-500 uppercase tracking-wider font-semibold">Overdue</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-green-600">{adminTaskStats.completedToday}</span>
              <span className="text-xs text-green-500 uppercase tracking-wider font-semibold">Completed Today</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Customer Ratings */}
      {userRole === 'admin' && ratingStats.count > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Customer Ratings</h2>
            <Link to="/admin/ratings" className="text-sm text-indigo-600 font-medium hover:underline">View All</Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Score & Breakdown */}
            <div className="md:col-span-1 space-y-6">
              <div className="text-center md:text-left">
                <p className="text-5xl font-black text-gray-900 mb-2">
                  {ratingStats.average} <span className="text-2xl text-yellow-400">⭐</span>
                </p>
                <p className="text-sm text-gray-500 font-medium">Based on {ratingStats.count} ratings</p>
              </div>
              
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = ratingStats.breakdown[star] || 0;
                  const percentage = ratingStats.count > 0 ? (count / ratingStats.count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center text-sm">
                      <span className="w-12 text-gray-600 font-medium">{star} star</span>
                      <div className="flex-1 mx-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${star >= 4 ? 'bg-green-500' : star === 3 ? 'bg-yellow-400' : 'bg-red-500'}`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-right text-gray-500 text-xs">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Recent Ratings */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Recent Reviews</h3>
              <div className="space-y-4">
                {ratingStats.recent.map(review => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-semibold text-gray-900">{review.customerName}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {review.submittedAt?.toDate ? review.submittedAt.toDate().toLocaleDateString() : new Date(review.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex text-yellow-400 text-xs">
                        {Array.from({length: 5}).map((_, i) => (
                          <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600 italic mt-1 line-clamp-2">"{review.comment}"</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      Serviced by: <span className="font-medium text-gray-500">{review.technicianName}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff My Tasks Card */}
      {userRole?.toLowerCase() === 'staff' && (staffTaskStats.pending > 0 || staffTaskStats.overdue > 0) && (
        <div className="bg-white border-l-4 border-indigo-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 cursor-pointer" onClick={() => navigate('/tasks')}>
            <div>
              <p className="text-sm font-semibold text-indigo-700">My Tasks</p>
              <div className="flex gap-3 mt-1">
                <span className="text-xs font-medium text-gray-600">{staffTaskStats.pending} pending</span>
                {staffTaskStats.overdue > 0 && <span className="text-xs font-medium text-red-600">{staffTaskStats.overdue} overdue</span>}
              </div>
            </div>
            <Link to="/tasks" className="text-sm text-indigo-600 font-medium hover:underline">View All</Link>
          </div>
          <div className="grid gap-2">
            {staffTaskStats.todayList.map(task => (
              <div key={task.id} className="text-left w-full rounded-lg border border-gray-100 bg-gray-50 p-3 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-800 truncate pr-4">{task.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded capitalize whitespace-nowrap ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{task.priority}</span>
              </div>
            ))}
            {staffTaskStats.todayList.length === 0 && <p className="text-sm text-gray-500 italic">No tasks explicitly due today.</p>}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Today's snapshot</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Sales Today"
            value={salesToday.count}
            subvalue={salesToday.amount > 0 ? `₹${salesToday.amount.toLocaleString()}` : null}
            color="bg-green-100"
            onClick={() => navigate('/sales')}
            icon={<svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Service Orders Today"
            value={serviceToday}
            color="bg-blue-100"
            onClick={() => navigate('/service')}
            icon={<svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
          />
          <StatCard
            label="Pending Services"
            value={pendingService}
            color="bg-yellow-100"
            onClick={() => navigate('/service')}
            icon={<svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Low Stock Products"
            value={lowStockCount}
            color="bg-red-100"
            onClick={() => navigate('/products')}
            icon={<svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          />
          <StatCard
            label="Total Customers"
            value={totalCustomers}
            color="bg-indigo-100"
            onClick={() => navigate('/customers')}
            icon={<svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          />
          <StatCard
            label="Open Enquiries"
            value={openEnquiries}
            color="bg-purple-100"
            onClick={() => navigate('/enquiries')}
            icon={<svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'New Service Order', path: '/service', color: 'bg-blue-600 hover:bg-blue-700' },
            { label: 'New Sale', path: '/sales', color: 'bg-green-600 hover:bg-green-700' },
            { label: 'Add Customer', path: '/customers', color: 'bg-indigo-600 hover:bg-indigo-700' },
            { label: 'Scan Barcode', path: '/scanner', color: 'bg-slate-700 hover:bg-slate-800' },
          ].map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-center`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
