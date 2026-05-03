import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import Layout from '../../components/common/Layout';
import { printLabel } from '../../utils/printLabel.jsx';
import { useAuth } from '../../context/AuthContext';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const LabelRegistryList = () => {
  const { userRole } = useAuth();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLabel, setEditingLabel] = useState(null);
  const [newLabelNum, setNewLabelNum] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLabels = async () => {
    try {
      const snap = await getDocs(collection(db, 'label_registry'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => b.labelNumber - a.labelNumber);
      setLabels(list);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchLabels(); }, []);

  const handleEditClick = (lbl) => { setEditingLabel(lbl); setNewLabelNum(lbl.labelNumber); };

  const handleUpdateNumber = async () => {
    try {
      await updateDoc(doc(db, 'label_registry', editingLabel.id), { labelNumber: Number(newLabelNum) });
      setEditingLabel(null);
      fetchLabels();
    } catch (err) { console.error(err); alert('Failed to update label number'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'label_registry', deleteTarget.id));
      setLabels(prev => prev.filter(l => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const filteredLabels = labels.filter(l => !searchQuery || String(l.labelNumber).includes(searchQuery));

  return (
    <Layout title="Label Registry">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Label Registry</h1>
          <p className="text-sm text-gray-500 mt-0.5">{labels.length} labels</p>
        </div>
      </div>

      <input type="text" placeholder="Search by Label Number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full mb-4 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-lg h-14 animate-pulse" />)}</div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Label #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Reference</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredLabels.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-indigo-600 whitespace-nowrap">#{l.labelNumber}</td>
                  <td className="px-4 py-3 text-gray-500 uppercase whitespace-nowrap text-xs">{(l.labelType || '').replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {l.labelType === 'second_hand' && `${l.data?.brand || ''} ${l.data?.model || ''}`}
                    {l.labelType === 'service_order' && `${l.data?.orderNumber || ''} - ${l.data?.customerName || ''}`}
                    {l.labelType === 'product' && `${l.data?.productName || ''}`}
                    {l.labelType === 'sale' && `${l.data?.invoiceNumber || ''}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{l.assignedAt ? new Date(l.assignedAt).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                    <button onClick={() => printLabel(l)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Print</button>
                    <button onClick={() => handleEditClick(l)} className="text-indigo-600 hover:text-indigo-900 text-xs font-medium">Edit</button>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => setDeleteTarget(l)}
                        title="Delete label"
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-4">Edit Label Number</h3>
            <input type="number" value={newLabelNum} onChange={e => setNewLabelNum(e.target.value)} className="w-full border rounded-lg p-2.5 mb-4 text-xl" />
            <div className="flex gap-2">
              <button onClick={handleUpdateNumber} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium">Save</button>
              <button onClick={() => setEditingLabel(null)} className="flex-1 bg-gray-200 py-2.5 rounded-lg font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
        title="Delete Label"
        message="Are you sure you want to delete this label entry? This action cannot be undone."
      />
    </Layout>
  );
};

export default LabelRegistryList;
