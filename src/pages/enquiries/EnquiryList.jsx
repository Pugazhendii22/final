import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import EnquiryForm from './EnquiryForm';

const EnquiryList = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [seriousnessFilter, setSeriousnessFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchEnquiries = async () => {
    try {
      const snap = await getDocs(collection(db, 'enquiries'));
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEnquiries(list);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEnquiries(); }, []);

  const handleSaveEnquiry = async (data) => {
    await addDoc(collection(db, 'enquiries'), data);
    setShowModal(false);
    fetchEnquiries();
  };

  const filteredEnquiries = enquiries.filter(e => {
    const q = searchQuery.replace(/\s+/g, '').toLowerCase();
    const matchesSearch = !searchQuery || 
      (e.customerName?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (e.customerPhone?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (e.modelEnquired?.replace(/\s+/g, '').toLowerCase() || '').includes(q);
    const matchesStatus = !statusFilter || e.status === statusFilter;
    const matchesSeriousness = !seriousnessFilter || e.seriousness === seriousnessFilter;
    return matchesSearch && matchesStatus && matchesSeriousness;
  });

  const statusColor = (s) => ({ Open: 'bg-blue-100 text-blue-800', 'Follow-up': 'bg-yellow-100 text-yellow-800', Converted: 'bg-green-100 text-green-800', Closed: 'bg-gray-100 text-gray-800' }[s] || 'bg-gray-100 text-gray-800');

  return (
    <Layout title="Enquiries">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enquiry Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">{enquiries.length} total</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm shrink-0">+ New Enquiry</button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <input type="text" placeholder="Search name, phone, model..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Converted">Converted</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={seriousnessFilter} onChange={e => setSeriousnessFilter(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
          <option value="">All Seriousness</option>
          <option value="Urgent">Urgent</option>
          <option value="Ordinary">Ordinary</option>
        </select>
        <button onClick={() => { setSearchQuery(''); setStatusFilter(''); setSeriousnessFilter(''); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0">Clear</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-lg h-14 animate-pulse" />)}</div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Model</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Budget</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Details</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredEnquiries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{e.customerName}</div>
                    <div className="text-xs text-gray-400">{e.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{e.modelEnquired}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">₹{e.budgetMin} - ₹{e.budgetMax}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    <span className={e.seriousness === 'Urgent' ? 'text-red-600 font-bold text-xs' : 'text-xs'}>{e.seriousness}</span>
                    <span className="text-xs text-gray-400"> | {e.requiredWithin}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(e.status)}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link to={`/enquiries/${e.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View</Link>
                  </td>
                </tr>
              ))}
              {filteredEnquiries.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No enquiries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative w-full sm:max-w-2xl sm:rounded-xl bg-white shadow-2xl z-10 flex flex-col max-h-screen sm:max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white sm:rounded-t-xl">
              <h3 className="text-lg font-semibold">Add New Enquiry</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <EnquiryForm onSave={handleSaveEnquiry} onCancel={() => setShowModal(false)} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EnquiryList;
