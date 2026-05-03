import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/common/Layout';

const ReportsPage = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState('Sales');

  // Master Data
  const [sales, setSales] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [secondHand, setSecondHand] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }

    const fetchAll = async () => {
      try {
        const [salSnap, srvSnap, shSnap, prdSnap, custSnap] = await Promise.all([
          getDocs(collection(db, 'sales')),
          getDocs(collection(db, 'service_orders')),
          getDocs(collection(db, 'second_hand_mobiles')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'customers')),
        ]);

        const sal = []; salSnap.forEach(d => sal.push({ id: d.id, ...d.data() }));
        const srv = []; srvSnap.forEach(d => srv.push({ id: d.id, ...d.data() }));
        const sh = []; shSnap.forEach(d => sh.push({ id: d.id, ...d.data() }));
        const prd = []; prdSnap.forEach(d => prd.push({ id: d.id, ...d.data() }));
        const cst = []; custSnap.forEach(d => cst.push({ id: d.id, ...d.data() }));

        setSales(sal);
        setServiceOrders(srv);
        setSecondHand(sh);
        setProducts(prd);
        setCustomers(cst);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userRole, navigate]);

  // Filters
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = dateStr.split('T')[0];
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  const printReport = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center">Loading reports...</div>;

  // --- SALES REPORT CALCS ---
  const filteredSales = sales.filter(s => inRange(s.createdAt));
  const totalSalesRev = filteredSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  let newProdRev = 0; let shRev = 0;
  let payCash = 0; let payUpi = 0; let payCard = 0; let paySplit = 0;

  filteredSales.forEach(s => {
    if (s.saleType === 'New Product') newProdRev += Number(s.totalAmount) || 0;
    else shRev += Number(s.totalAmount) || 0;

    if (s.paymentMethod === 'Cash') payCash += Number(s.totalAmount) || 0;
    else if (s.paymentMethod === 'UPI') payUpi += Number(s.totalAmount) || 0;
    else if (s.paymentMethod === 'Card') payCard += Number(s.totalAmount) || 0;
    else if (s.paymentMethod === 'Split') paySplit += Number(s.totalAmount) || 0;
  });

  // --- SERVICE REPORT CALCS ---
  const filteredSrv = serviceOrders.filter(s => inRange(s.createdAt));
  const totalSrvRev = filteredSrv.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const srvStatus = { completed: 0, pending: 0, returned: 0 };
  filteredSrv.forEach(s => {
    if (s.status === 'Completed') srvStatus.completed++;
    else if (s.status === 'Returned') srvStatus.returned++;
    else srvStatus.pending++;
  });

  // --- INVENTORY REPORT CALCS ---
  const shAvailable = secondHand.filter(s => s.status !== 'sold').length;
  const shSold = secondHand.filter(s => s.status === 'sold').length;
  const prodInStock = products.filter(p => p.status === 'in stock').length;
  const prodLowStock = products.filter(p => p.status === 'low stock').length;
  const prodOutStock = products.filter(p => p.status === 'out of stock').length;

  // --- CUSTOMER REPORT CALCS ---
  const filteredCust = customers.filter(c => inRange(c.createdAt));
  const regularCust = customers.filter(c => c.isRegular).length;

  return (
    <Layout title="Management Reports">
      <div className="max-w-7xl mx-auto print:p-0">
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-end print:hidden">
          <div>
            <label className="block text-sm text-gray-600 mb-1">From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-gray-300 rounded px-3 py-2" />
          </div>
          <button onClick={() => {setFromDate(''); setToDate('');}} className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50">Clear Filters</button>
        </div>

        <div className="mb-6 border-b border-gray-200 print:hidden">
          <nav className="-mb-px flex space-x-8">
            {['Sales', 'Service', 'Inventory', 'Customers'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab} Report
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white shadow rounded-lg p-6 print:shadow-none print:p-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{activeTab} Report</h2>
            <button onClick={printReport} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 print:hidden flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Report
            </button>
          </div>

          <div className="text-sm text-gray-500 mb-6 hidden print:block">
            Report Date Range: {fromDate || 'Start'} to {toDate || 'End'}
          </div>

          {activeTab === 'Sales' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded"><p className="text-sm text-gray-500">Total Sales</p><p className="text-2xl font-bold">{filteredSales.length}</p></div>
                <div className="bg-green-50 p-4 rounded"><p className="text-sm text-green-700">Total Revenue</p><p className="text-2xl font-bold text-green-700">₹{totalSalesRev}</p></div>
                <div className="bg-blue-50 p-4 rounded"><p className="text-sm text-blue-700">New Product Rev</p><p className="text-xl font-bold text-blue-700">₹{newProdRev}</p></div>
                <div className="bg-purple-50 p-4 rounded"><p className="text-sm text-purple-700">2nd-Hand Rev</p><p className="text-xl font-bold text-purple-700">₹{shRev}</p></div>
              </div>
              
              <h3 className="text-lg font-semibold mb-4">Payment Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="border p-3 rounded">Cash: <span className="font-bold">₹{payCash}</span></div>
                <div className="border p-3 rounded">UPI: <span className="font-bold">₹{payUpi}</span></div>
                <div className="border p-3 rounded">Card: <span className="font-bold">₹{payCard}</span></div>
                <div className="border p-3 rounded">Split: <span className="font-bold">₹{paySplit}</span></div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Sales List</h3>
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50"><tr><th className="p-3 text-left text-xs font-medium text-gray-500">Date</th><th className="p-3 text-left text-xs font-medium text-gray-500">Invoice</th><th className="p-3 text-left text-xs font-medium text-gray-500">Customer</th><th className="p-3 text-left text-xs font-medium text-gray-500">Amount</th></tr></thead>
                <tbody>
                  {filteredSales.map(s => (
                    <tr key={s.id} className="border-b"><td className="p-3 text-sm">{new Date(s.createdAt).toLocaleDateString()}</td><td className="p-3 text-sm">{s.invoiceNumber}</td><td className="p-3 text-sm">{s.customerName}</td><td className="p-3 text-sm font-medium">₹{s.totalAmount}</td></tr>
                  ))}
                  {filteredSales.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-sm text-gray-500">No sales found in this range.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Service' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded"><p className="text-sm text-gray-500">Total Orders</p><p className="text-2xl font-bold">{filteredSrv.length}</p></div>
                <div className="bg-green-50 p-4 rounded"><p className="text-sm text-green-700">Total Revenue</p><p className="text-2xl font-bold text-green-700">₹{totalSrvRev}</p></div>
                <div className="bg-white border p-4 rounded">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-sm mt-1">Completed: <span className="font-bold">{srvStatus.completed}</span> | Pending: <span className="font-bold">{srvStatus.pending}</span> | Returned: <span className="font-bold">{srvStatus.returned}</span></p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Service Orders List</h3>
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50"><tr><th className="p-3 text-left text-xs font-medium text-gray-500">Date</th><th className="p-3 text-left text-xs font-medium text-gray-500">Order</th><th className="p-3 text-left text-xs font-medium text-gray-500">Customer</th><th className="p-3 text-left text-xs font-medium text-gray-500">Status</th><th className="p-3 text-left text-xs font-medium text-gray-500">Amount</th></tr></thead>
                <tbody>
                  {filteredSrv.map(s => (
                    <tr key={s.id} className="border-b"><td className="p-3 text-sm">{new Date(s.createdAt).toLocaleDateString()}</td><td className="p-3 text-sm">{s.orderNumber}</td><td className="p-3 text-sm">{s.customerName}</td><td className="p-3 text-sm">{s.status}</td><td className="p-3 text-sm font-medium">₹{s.amount || 0}</td></tr>
                  ))}
                  {filteredSrv.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-sm text-gray-500">No service orders found in this range.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Inventory' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Second-Hand Mobiles</h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-green-50 p-4 rounded"><p className="text-sm text-green-700">Available</p><p className="text-2xl font-bold text-green-700">{shAvailable}</p></div>
                <div className="bg-gray-50 p-4 rounded"><p className="text-sm text-gray-500">Sold</p><p className="text-2xl font-bold text-gray-700">{shSold}</p></div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Products (Accessories/New)</h3>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-green-50 p-4 rounded"><p className="text-sm text-green-700">In Stock</p><p className="text-2xl font-bold text-green-700">{prodInStock}</p></div>
                <div className="bg-yellow-50 p-4 rounded"><p className="text-sm text-yellow-700">Low Stock</p><p className="text-2xl font-bold text-yellow-700">{prodLowStock}</p></div>
                <div className="bg-red-50 p-4 rounded"><p className="text-sm text-red-700">Out of Stock</p><p className="text-2xl font-bold text-red-700">{prodOutStock}</p></div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Available Second-Hand Devices</h3>
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50"><tr><th className="p-3 text-left text-xs font-medium text-gray-500">Brand/Model</th><th className="p-3 text-left text-xs font-medium text-gray-500">Specs</th><th className="p-3 text-left text-xs font-medium text-gray-500">Price</th></tr></thead>
                <tbody>
                  {secondHand.filter(s => s.status !== 'sold').map(s => (
                    <tr key={s.id} className="border-b"><td className="p-3 text-sm">{s.brand} {s.model}</td><td className="p-3 text-sm">{s.ram} / {s.rom}</td><td className="p-3 text-sm font-medium">₹{s.salePrice}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Customers' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded"><p className="text-sm text-gray-500">Total Customers</p><p className="text-2xl font-bold">{customers.length}</p></div>
                <div className="bg-indigo-50 p-4 rounded"><p className="text-sm text-indigo-700">New (in range)</p><p className="text-2xl font-bold text-indigo-700">{filteredCust.length}</p></div>
                <div className="bg-purple-50 p-4 rounded"><p className="text-sm text-purple-700">Regular Customers</p><p className="text-2xl font-bold text-purple-700">{regularCust}</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
