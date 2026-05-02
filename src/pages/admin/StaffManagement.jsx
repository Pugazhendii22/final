import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db, secondaryAuth } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';

const StaffManagement = () => {
  const { currentUser, userRole } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchStaff = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const staffList = [];
      querySnapshot.forEach((doc) => { staffList.push(doc.data()); });
      setStaff(staffList);
    } catch (err) { console.error("Error fetching staff:", err); } finally { setLoading(false); }
  };

  useEffect(() => { if (userRole === 'admin') fetchStaff(); }, [userRole]);

  if (userRole !== 'admin') return <Navigate to="/dashboard" replace />;

  const handleToggleStatus = async (uid, currentStatus) => {
    if (uid === currentUser.uid) return;
    try { await updateDoc(doc(db, 'users', uid), { isActive: !currentStatus }); fetchStaff(); } catch (err) { console.error(err); }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStaff.email, newStaff.password);
      const user = userCredential.user;
      await signOut(secondaryAuth);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, name: newStaff.name, email: newStaff.email, role: newStaff.role, isActive: true, createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setNewStaff({ name: '', email: '', password: '', role: 'staff' });
      fetchStaff();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <Layout title="Staff Management">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm shrink-0">+ Add Staff</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-lg h-14 animate-pulse" />)}</div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {staff.map((s) => (
                <tr key={s.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{s.email}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize whitespace-nowrap">{s.role}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {s.uid !== currentUser.uid && (
                      <button onClick={() => handleToggleStatus(s.uid, s.isActive)} className={`text-xs font-medium ${s.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}>
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative w-full sm:max-w-lg sm:rounded-xl bg-white shadow-2xl z-10 flex flex-col max-h-screen sm:max-h-[90vh]">
            <form onSubmit={handleAddStaff}>
              <div className="px-5 py-4 border-b">
                <h3 className="text-lg font-semibold">Add New Staff</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {error && <div className="p-3 text-red-700 bg-red-100 rounded-lg text-sm">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" required value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" required value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" required value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="px-5 py-4 border-t flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StaffManagement;
