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
  const [dataLoaded, setDataLoaded] = useState(false);
  const [printing, setPrinting] = useState(false);
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
        setDataLoaded(true);
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

  const handlePrintSection = async (sectionId) => {
    if (printing) return;
    setPrinting(true);

    try {
      // Re-fetch fresh data from Firestore before printing
      const [salSnap, srvSnap, shSnap, prdSnap, custSnap] = await Promise.all([
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'service_orders')),
        getDocs(collection(db, 'second_hand_mobiles')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'customers')),
      ]);
      const sal = []; salSnap.forEach(d => sal.push({ id: d.id, ...d.data() }));
      const srv = []; srvSnap.forEach(d => srv.push({ id: d.id, ...d.data() }));
      const sh = [];  shSnap.forEach(d  => sh.push({ id: d.id, ...d.data() }));
      const prd = []; prdSnap.forEach(d => prd.push({ id: d.id, ...d.data() }));
      const cst = []; custSnap.forEach(d => cst.push({ id: d.id, ...d.data() }));
      setSales(sal); setServiceOrders(srv); setSecondHand(sh); setProducts(prd); setCustomers(cst);

      // Small delay so React can re-render with fresh data before we snapshot innerHTML
      await new Promise(r => setTimeout(r, 200));

      const sectionContent = document.getElementById(sectionId).innerHTML;

      // Remove any existing overlay
      const existing = document.getElementById('report-print-overlay');
      if (existing) existing.remove();

      const printDiv = document.createElement('div');
      printDiv.id = 'report-print-overlay';
      printDiv.innerHTML = `
        <style>
          #report-print-overlay {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #000;
            padding: 15mm;
            background: white;
          }
          #report-print-overlay h2 { font-size: 16px; margin: 16px 0 8px 0; border-bottom: 2px solid #000; padding-bottom: 4px; }
          #report-print-overlay h3 { font-size: 13px; margin: 12px 0 6px 0; }
          #report-print-overlay p { margin-bottom: 4px; }
          #report-print-overlay table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          #report-print-overlay th { background: #f0f0f0; font-weight: bold; text-align: left; padding: 6px 8px; border: 1px solid #ccc; font-size: 11px; }
          #report-print-overlay td { padding: 5px 8px; border: 1px solid #ccc; font-size: 11px; }
          #report-print-overlay tr:nth-child(even) { background: #f9f9f9; }
          #report-print-overlay .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          #report-print-overlay .stat-card { border: 1px solid #ccc; padding: 8px; text-align: center; border-radius: 4px; }
          #report-print-overlay .stat-label { font-size: 10px; color: #666; }
          #report-print-overlay .stat-value { font-size: 16px; font-weight: bold; }
          #report-print-overlay .hidden { display: block !important; }
        </style>
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px;">
          <h1 style="font-size:20px;font-weight:bold;margin-bottom:4px;">FRENCH MOBILES</h1>
          <p style="font-size:12px;margin-bottom:2px;">Management Report</p>
          <p style="font-size:11px;color:#666;">Generated: ${new Date().toLocaleString('en-IN')}</p>
        </div>
        ${sectionContent}
      `;
      document.body.appendChild(printDiv);

      setTimeout(() => {
        window.print();
        setTimeout(() => {
          printDiv.remove();
          setPrinting(false);
        }, 1000);
      }, 800);
    } catch (err) {
      console.error('Print error:', err);
      setPrinting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading reports...</div>;

  const currentDateTime = new Date().toLocaleString();

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
  const totalSrvRev = filteredSrv.reduce((sum, s) => sum + (Number(s.estimatedPrice) || 0), 0);
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
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-end no-print">
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

        <div className="mb-6 border-b border-gray-200 no-print">
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

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6 no-print">
            <h2 className="text-2xl font-bold text-gray-900">{activeTab} Report</h2>
            <button
              onClick={() => handlePrintSection(`section-${activeTab}`)}
              disabled={!dataLoaded || printing}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center no-print disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              {printing ? 'Preparing...' : !dataLoaded ? 'Loading...' : 'Print Report'}
            </button>
          </div>

          <div id="report-print-area">
            <div id="section-Sales" className={activeTab !== 'Sales' ? 'hidden' : ''}>
              <h2 className="text-lg font-bold border-b mb-4 hidden print:block">Sales Report</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stats-grid">
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-gray-500 stat-label">Total Sales</p><p className="text-lg font-bold stat-value">{filteredSales.length}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-green-700 stat-label">Total Revenue</p><p className="text-lg font-bold text-green-700 stat-value">₹{totalSalesRev}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-blue-700 stat-label">New Product Rev</p><p className="text-lg font-bold text-blue-700 stat-value">₹{newProdRev}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-purple-700 stat-label">2nd-Hand Rev</p><p className="text-lg font-bold text-purple-700 stat-value">₹{shRev}</p></div>
              </div>
              
              <h3 className="text-md font-semibold mb-4">Payment Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm stats-grid">
                <div className="border p-3 rounded stat-card">Cash: <span className="font-bold">₹{payCash}</span></div>
                <div className="border p-3 rounded stat-card">UPI: <span className="font-bold">₹{payUpi}</span></div>
                <div className="border p-3 rounded stat-card">Card: <span className="font-bold">₹{payCard}</span></div>
                <div className="border p-3 rounded stat-card">Split: <span className="font-bold">₹{paySplit}</span></div>
              </div>

              <h3 className="text-md font-semibold mb-4">Sales List</h3>
              <table className="min-w-full divide-y divide-gray-200 border-collapse border">
                <thead><tr><th className="p-2 text-left font-bold border">Date</th><th className="p-2 text-left font-bold border">Invoice</th><th className="p-2 text-left font-bold border">Customer</th><th className="p-2 text-left font-bold border">Amount</th></tr></thead>
                <tbody>
                  {filteredSales.map(s => (
                    <tr key={s.id}><td className="p-2 border">{new Date(s.createdAt).toLocaleDateString()}</td><td className="p-2 border">{s.invoiceNumber}</td><td className="p-2 border">{s.customerName}</td><td className="p-2 font-bold border">₹{s.totalAmount}</td></tr>
                  ))}
                  {filteredSales.length === 0 && <tr><td colSpan="4" className="p-2 text-center text-gray-500 border">No sales found in this range.</td></tr>}
                </tbody>
              </table>
            </div>

            <div id="section-Service" className={activeTab !== 'Service' ? 'hidden' : ''}>
              <h2 className="text-lg font-bold border-b mb-4 hidden print:block">Service Report</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 stats-grid">
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-gray-500 stat-label">Total Orders</p><p className="text-lg font-bold stat-value">{filteredSrv.length}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-green-700 stat-label">Total Revenue</p><p className="text-lg font-bold text-green-700 stat-value">₹{totalSrvRev}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card">
                  <p className="text-sm text-gray-500 stat-label">Status</p>
                  <p className="text-sm mt-1">Completed: <span className="font-bold">{srvStatus.completed}</span> | Pending: <span className="font-bold">{srvStatus.pending}</span> | Returned: <span className="font-bold">{srvStatus.returned}</span></p>
                </div>
              </div>

              <h3 className="text-md font-semibold mb-4">Service Orders List</h3>
              <table className="min-w-full divide-y divide-gray-200 border-collapse border">
                <thead><tr><th className="p-2 text-left font-bold border">Date</th><th className="p-2 text-left font-bold border">Order</th><th className="p-2 text-left font-bold border">Customer</th><th className="p-2 text-left font-bold border">Status</th><th className="p-2 text-left font-bold border">Amount</th><th className="p-2 text-left font-bold border">Advance Paid</th></tr></thead>
                <tbody>
                  {filteredSrv.map(s => (
                    <tr key={s.id}><td className="p-2 border">{new Date(s.createdAt).toLocaleDateString()}</td><td className="p-2 border">{s.orderNumber}</td><td className="p-2 border">{s.customerName}</td><td className="p-2 border">{s.status}</td><td className="p-2 font-bold border">₹{s.estimatedPrice || 0}</td><td className="p-2 border">₹{s.advancePaid || 0}</td></tr>
                  ))}
                  {filteredSrv.length === 0 && <tr><td colSpan="6" className="p-2 text-center text-gray-500 border">No service orders found in this range.</td></tr>}
                </tbody>
              </table>
            </div>

            <div id="section-Inventory" className={activeTab !== 'Inventory' ? 'hidden' : ''}>
              <h2 className="text-lg font-bold border-b mb-4 hidden print:block">Inventory Report</h2>
              <h3 className="text-md font-semibold mb-4">Second-Hand Mobiles</h3>
              <div className="grid grid-cols-2 gap-4 mb-8 stats-grid">
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-green-700 stat-label">Available</p><p className="text-lg font-bold text-green-700 stat-value">{shAvailable}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-gray-500 stat-label">Sold</p><p className="text-lg font-bold text-gray-700 stat-value">{shSold}</p></div>
              </div>

              <h3 className="text-md font-semibold mb-4">Products (Accessories/New)</h3>
              <div className="grid grid-cols-3 gap-4 mb-8 stats-grid">
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-green-700 stat-label">In Stock</p><p className="text-lg font-bold text-green-700 stat-value">{prodInStock}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-yellow-700 stat-label">Low Stock</p><p className="text-lg font-bold text-yellow-700 stat-value">{prodLowStock}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-red-700 stat-label">Out of Stock</p><p className="text-lg font-bold text-red-700 stat-value">{prodOutStock}</p></div>
              </div>

              <h3 className="text-md font-semibold mb-4">Available Second-Hand Devices</h3>
              <table className="min-w-full divide-y divide-gray-200 border-collapse border">
                <thead><tr><th className="p-2 text-left font-bold border">Brand/Model</th><th className="p-2 text-left font-bold border">Specs</th><th className="p-2 text-left font-bold border">Price</th></tr></thead>
                <tbody>
                  {secondHand.filter(s => s.status !== 'sold').map(s => (
                    <tr key={s.id}><td className="p-2 border">{s.brand} {s.model}</td><td className="p-2 border">{s.ram} / {s.rom}</td><td className="p-2 font-bold border">₹{s.salePrice}</td></tr>
                  ))}
                  {secondHand.filter(s => s.status !== 'sold').length === 0 && <tr><td colSpan="3" className="p-2 text-center text-gray-500 border">No devices available.</td></tr>}
                </tbody>
              </table>
            </div>

            <div id="section-Customers" className={activeTab !== 'Customers' ? 'hidden' : ''}>
              <h2 className="text-lg font-bold border-b mb-4 hidden print:block">Customers Report</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 stats-grid">
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-gray-500 stat-label">Total Customers</p><p className="text-lg font-bold stat-value">{customers.length}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-indigo-700 stat-label">New (in range)</p><p className="text-lg font-bold text-indigo-700 stat-value">{filteredCust.length}</p></div>
                <div className="bg-gray-50 border p-4 rounded stat-card"><p className="text-sm text-purple-700 stat-label">Regular Customers</p><p className="text-lg font-bold text-purple-700 stat-value">{regularCust}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
