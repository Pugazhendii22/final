import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import ProductForm from './ProductForm';
import { useAuth } from '../../context/AuthContext';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const ProductList = () => {
  const { userRole } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setProducts(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSaveProduct = async (data) => {
    if (data.id) {
      const { id, ...updateData } = data;
      await import('firebase/firestore').then(m => m.updateDoc(m.doc(db, 'products', id), updateData));
      fetchProducts();
      return id;
    }
    const docRef = await addDoc(collection(db, 'products'), data);
    fetchProducts();
    return docRef.id;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'products', deleteTarget.id));
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.replace(/\s+/g, '').toLowerCase();
    const matchesSearch = !searchQuery || 
      (p.name?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (p.brand?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      (p.category?.replace(/\s+/g, '').toLowerCase() || '').includes(q) ||
      Boolean(p.compatibleModels?.some(m => (m || '').replace(/\s+/g, '').toLowerCase().includes(q)));
    
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesStatus = !statusFilter || p.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const statusColor = (s) => ({ 'in stock': 'bg-green-100 text-green-800', 'low stock': 'bg-yellow-100 text-yellow-800', 'out of stock': 'bg-red-100 text-red-800' }[s] || 'bg-gray-100 text-gray-800');

  return (
    <Layout title="Products Inventory">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} products</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm shrink-0">+ New Product</button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <input type="text" placeholder="Search name, brand, category, compatible models..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
          <option value="">All Categories</option>
          {['Charger','Cable','Earphones','Back Cover','Screen Guard','Battery','Memory Card','Power Bank','Other'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="in stock">In Stock</option>
          <option value="low stock">Low Stock</option>
          <option value="out of stock">Out of Stock</option>
        </select>
        <button onClick={() => { setSearchQuery(''); setCategoryFilter(''); setStatusFilter(''); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0">Clear</button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-lg h-14 animate-pulse" />)}</div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Product</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs hidden md:table-cell">Prices</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Stock</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? (
                        <img className="h-9 w-9 rounded-full object-cover shrink-0" src={p.imageUrl} alt="" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs shrink-0">{(p.name || '?').charAt(0)}</div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="truncate">{p.name}</span>
                          {p.compatibleModels && p.compatibleModels.length > 0 && (
                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0">
                              {p.compatibleModels.length} models
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{p.category}</td>
                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                    <div className="text-gray-400 text-xs">Buy: ₹{p.purchasePrice}</div>
                    <div className="font-medium text-green-600">₹{p.salePrice}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{p.stock}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{(p.status || '').toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link to={`/products/${p.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">View</Link>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => setDeleteTarget(p)}
                        title="Delete product"
                        className="ml-3 text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No products found.</td></tr>
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
              <h3 className="text-lg font-semibold">Add New Product</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <ProductForm onSave={handleSaveProduct} onCancel={() => setShowModal(false)} />
            </div>
          </div>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
      />
    </Layout>
  );
};

export default ProductList;

