import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Link, useLocation } from 'react-router-dom';
import NewSaleModal from '../../components/sales/NewSaleModal';
import Layout from '../../components/common/Layout';

const SalesList = () => {
  const location = useLocation();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [prefillData, setPrefillData] = useState(null);

  useEffect(() => {
    if (location.state && location.state.customerName && location.state.customerPhone) {
      setPrefillData({
        customerName: location.state.customerName,
        customerPhone: location.state.customerPhone
      });
      setShowModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      const custSnap = await getDocs(collection(db, 'customers'));
      const cList = [];
      custSnap.forEach(doc => cList.push(doc.data()));
      setCustomers(cList);

      const snap = await getDocs(collection(db, 'sales'));
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSales(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSales = sales.filter(s => {
    const q = searchQuery.replace(/\s+/g, '').toLowerCase();
    const matchesSearch = !searchQuery || 
      (s.customerName?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (s.customerPhone?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (s.invoiceNumber?.replace(/\s+/g, '').toLowerCase() || '').includes(q);
    
    const sDate = s.date;
    const matchesFrom = !fromDate || sDate >= fromDate;
    const matchesTo = !toDate || sDate <= toDate;

    return matchesSearch && matchesFrom && matchesTo;
  });

  return (
    <Layout title="Sales & Billing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales &amp; Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sales.length} total records</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm shrink-0">
          + New Sale
        </button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <input type="text" placeholder="Search invoice, customer, phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-500 shrink-0">From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-500 shrink-0">To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <button onClick={() => { setSearchQuery(''); setFromDate(''); setToDate(''); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0">Clear</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-lg h-14 animate-pulse" />)}</div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Items</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Payment</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredSales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-indigo-600 whitespace-nowrap">{s.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{s.date ? new Date(s.date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                    <div className="font-medium">{s.customerName}</div>
                    <div className="text-xs text-gray-400">{s.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{s.items?.length || 0} item(s)</td>
                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">₹{s.totalAmount}</td>
                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">{s.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link to={`/sales/${s.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View</Link>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No sales found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <NewSaleModal isOpen={showModal} onClose={() => { setShowModal(false); setPrefillData(null); }} onSuccess={fetchData} prefillData={prefillData} />
    </Layout>
  );
};

export default SalesList;
