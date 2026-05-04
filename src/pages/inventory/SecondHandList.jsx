import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import SecondHandForm from './SecondHandForm';
import { useAuth } from '../../context/AuthContext';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center p-0 sm:p-4">
    <div className="fixed inset-0 bg-black/60" onClick={onClose} />
    <div className="relative w-full sm:max-w-3xl sm:rounded-xl bg-white shadow-2xl z-10 flex flex-col max-h-screen sm:max-h-[90vh]">
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

const SecondHandList = () => {
  const { userRole } = useAuth();
  const [mobiles, setMobiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMobiles = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'second_hand_mobiles'));
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMobiles(list);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMobiles(); }, []);

  const handleSaveMobile = async (data) => {
    const newMobile = { ...data, updatedAt: new Date().toISOString() };
    if (data.id) {
      const { id, ...updateData } = newMobile;
      await import('firebase/firestore').then(m => m.updateDoc(m.doc(db, 'second_hand_mobiles', id), updateData));
      fetchMobiles(); return id;
    }
    newMobile.createdAt = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'second_hand_mobiles'), newMobile);
    fetchMobiles(); return docRef.id;
  };

  const handleDeleteClick = (m) => {
    if (m.status === 'sold') {
      alert('Cannot delete a sold mobile.');
      return;
    }
    setDeleteTarget(m);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'second_hand_mobiles', deleteTarget.id));
      setMobiles(prev => prev.filter(m => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const filteredMobiles = mobiles.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.replace(/\s+/g, '').toLowerCase();
    return [m.brand, m.model, m.imei1, m.imei2, m.serialNumber].some(v => v?.replace(/\s+/g, '').toLowerCase().includes(q));
  });

  const gradeColor = (g) => ({ A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800', C: 'bg-yellow-100 text-yellow-800', D: 'bg-red-100 text-red-800' }[g] || 'bg-gray-100 text-gray-800');

  return (
    <Layout title="Second-Hand Inventory">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Second-Hand Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{mobiles.length} device(s) in stock</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm shrink-0"
        >
          + Add New Mobile
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by brand, model, IMEI or serial number..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="w-full mb-4 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      />

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-lg h-14 animate-pulse" />)}</div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wider">Brand & Model</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wider hidden md:table-cell">RAM/ROM</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wider">Condition</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wider hidden md:table-cell">Purchase</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wider">Sale Price</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wider">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredMobiles.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.brand} {m.model}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{m.ram}/{m.rom}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${gradeColor(m.condition)}`}>Grade {m.condition}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">₹{m.purchasePrice}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">₹{m.salePrice}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {(m.status || '').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link to={`/inventory/second-hand/${m.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View / Edit</Link>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleDeleteClick(m)}
                        title={m.status === 'sold' ? 'Cannot delete sold mobile' : 'Delete'}
                        className="ml-3 text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredMobiles.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400 text-sm">No mobiles found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Add Second-Hand Mobile" onClose={() => setShowModal(false)}>
          <SecondHandForm onSave={handleSaveMobile} onCancel={() => setShowModal(false)} />
        </Modal>
      )}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
        title="Delete Mobile"
        message="Are you sure you want to delete this mobile? This action cannot be undone."
      />
    </Layout>
  );
};

export default SecondHandList;
