import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import Layout from '../../components/common/Layout';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const RatingsList = () => {
  const { userRole } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('submitted');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('All');
  const [filterTechnician, setFilterTechnician] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'ratings'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRatings(list);
    } catch (err) {
      console.error("Error fetching ratings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'ratings', deleteTarget.id));
      setRatings(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  // Get unique technicians for filter dropdown
  const technicians = [...new Set(ratings.map(r => r.technicianName).filter(Boolean))];

  const filteredRatings = ratings.filter(r => {
    if (tab === 'submitted' && r.status !== 'submitted') return false;
    if (tab === 'pending' && r.status !== 'pending') return false;
    
    if (filterRating !== 'All' && String(r.rating) !== String(filterRating)) return false;
    if (filterTechnician !== 'All' && r.technicianName !== filterTechnician) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.customerName?.toLowerCase().includes(q) && !r.orderNumber?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <Layout title="Customer Ratings">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Ratings</h1>
          <p className="text-sm text-gray-500 mt-1">View and analyze feedback from customers.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 ${tab === 'submitted' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab('submitted')}
          >
            Submitted Ratings
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 ${tab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab('pending')}
          >
            Pending (Link Sent)
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              type="text"
              placeholder="Search customer or order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          {tab === 'submitted' && (
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full md:w-auto p-2.5"
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          )}

          <select
            value={filterTechnician}
            onChange={(e) => setFilterTechnician(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full md:w-auto p-2.5"
          >
            <option value="All">All Technicians</option>
            {technicians.map(tech => (
              <option key={tech} value={tech}>{tech}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading ratings...</div>
        ) : filteredRatings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No ratings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Device & Order</th>
                  <th className="px-6 py-3">Technician</th>
                  {tab === 'submitted' && (
                    <>
                      <th className="px-6 py-3">Rating</th>
                      <th className="px-6 py-3">Comment</th>
                      <th className="px-6 py-3">Submitted At</th>
                    </>
                  )}
                  {tab === 'pending' && <th className="px-6 py-3">Sent At</th>}
                  {userRole === 'admin' && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRatings.map(r => (
                  <tr key={r.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{r.customerName}</p>
                      <p className="text-xs text-gray-500">{r.customerPhone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{r.brand} {r.model}</p>
                      <Link to={`/service/${r.serviceOrderId}`} className="text-xs text-indigo-600 hover:underline">{r.orderNumber}</Link>
                    </td>
                    <td className="px-6 py-4">{r.technicianName || '-'}</td>
                    
                    {tab === 'submitted' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-yellow-400">
                          {Array.from({length: 5}).map((_, i) => (
                            <span key={i}>{i < r.rating ? '★' : '☆'}</span>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          {r.comment ? (
                            <p className="text-gray-700 italic max-w-xs break-words">"{r.comment}"</p>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleString() : new Date(r.submittedAt).toLocaleString()}
                        </td>
                      </>
                    )}
                    
                    {tab === 'pending' && (
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}
                      </td>
                    )}
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setDeleteTarget(r)} title="Delete" className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
        title="Delete Rating"
        message="Are you sure you want to delete this rating? This action cannot be undone."
      />
    </Layout>
  );
};

export default RatingsList;
