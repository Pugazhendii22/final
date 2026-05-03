import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import CustomerForm from './CustomerForm';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center p-0 sm:p-4">
    <div className="fixed inset-0 bg-black/60" onClick={onClose} />
    <div className="relative w-full sm:max-w-2xl sm:rounded-xl bg-white shadow-2xl z-10 flex flex-col max-h-screen sm:max-h-[90vh]">
      <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white rounded-t-xl">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
    </div>
  </div>
);

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchCustomers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'customers'));
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setCustomers(list);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleSaveCustomer = async (data) => {
    await addDoc(collection(db, 'customers'), { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setShowModal(false);
    fetchCustomers();
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.replace(/\s+/g, '').toLowerCase();
    return [c.name, c.phone].some(v => v?.replace(/\s+/g, '').toLowerCase().includes(q));
  });

  return (
    <Layout title="Customers">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} total</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm shrink-0">
          + Add Customer
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name or phone..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="w-full mb-4 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
      />

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-lg h-14 animate-pulse" />)}</div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Alt Phone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">ID Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Badge</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{c.alternatePhone || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{c.idType || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.isRegular && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Regular</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link to={`/customers/${c.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View / Edit</Link>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400 text-sm">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Add New Customer" onClose={() => setShowModal(false)}>
          <CustomerForm onSave={handleSaveCustomer} onCancel={() => setShowModal(false)} />
        </Modal>
      )}
    </Layout>
  );
};

export default CustomerList;
