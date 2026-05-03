import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';
import ProductForm from './ProductForm';
import { getLabelNumber } from '../../utils/getLabelNumber';
import { printLabel } from '../../utils/printLabel.jsx';
import Layout from '../../components/common/Layout';

const ProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [labelEntry, setLabelEntry] = useState(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [assigningLabel, setAssigningLabel] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [showAllModels, setShowAllModels] = useState(false);

  const fetchProduct = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'products', id));
      if (docSnap.exists()) setProduct({ id: docSnap.id, ...docSnap.data() });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchLabel = async () => {
    const snap = await getDocs(query(collection(db, 'label_registry'), where('referenceId', '==', id), where('labelType', '==', 'product')));
    if (!snap.empty) setLabelEntry(snap.docs[0].data());
  };

  useEffect(() => { fetchProduct(); fetchLabel(); }, [id]);

  const handleUpdate = async (data) => {
    await updateDoc(doc(db, 'products', id), data);
    setProduct({ id, ...data });
    return id;
  };

  const openLabelDialog = async () => {
    const next = await getLabelNumber();
    setLabelInput(String(next));
    setShowLabelDialog(true);
  };

  const confirmAssign = async () => {
    setAssigningLabel(true);
    try {
      await addDoc(collection(db, 'label_registry'), {
        labelNumber: Number(labelInput),
        labelType: 'product',
        referenceId: id,
        assignedBy: auth.currentUser?.uid || 'unknown',
        assignedAt: new Date().toISOString(),
        isActive: true,
        data: {
          productName: product.name || '',
          brand: product.brand || '',
          category: product.category || '',
          sku: product.sku || '',
          purchasePrice: Number(product.purchasePrice || 0),
          salePrice: Number(product.salePrice || 0),
          stockQuantity: Number(product.stock || 0),
          imageUrl: product.imageUrl || '',
          notes: product.notes || '',
          createdBy: product.createdBy || '',
          createdAt: product.createdAt || '',
        }
      });
      setLabelEntry({ labelNumber: Number(labelInput) });
      setShowLabelDialog(false);
    } catch (err) { console.error(err); alert('Failed to assign label.'); }
    finally { setAssigningLabel(false); }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!product) return <div className="p-8 text-center text-red-600">Product not found</div>;

  return (
    <Layout title="Product Detail">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/products')} className="flex items-center text-gray-500 hover:text-indigo-600 font-medium">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full
              ${product.status === 'in stock' ? 'bg-green-100 text-green-800' : ''}
              ${product.status === 'low stock' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${product.status === 'out of stock' ? 'bg-red-100 text-red-800' : ''}`}>
              {product.status?.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {labelEntry ? (
              <>
                <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-300">
                  🏷 Label: #{labelEntry.labelNumber}
                </span>
                <button onClick={() => printLabel(labelEntry)} className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Print
                </button>
              </>
            ) : (
              <button onClick={openLabelDialog} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium">
                Assign Label Number
              </button>
            )}
            <button onClick={() => setShowEdit(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Edit</button>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <dl className="space-y-4">
              <div><dt className="text-sm font-medium text-gray-500">Brand</dt><dd className="mt-1 text-sm text-gray-900">{product.brand || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Category</dt><dd className="mt-1 text-sm text-gray-900">{product.category}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">SKU / Barcode</dt><dd className="mt-1 text-sm text-gray-900 font-mono">{product.sku}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Notes</dt><dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{product.notes || '-'}</dd></div>
            </dl>
            <dl className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <dt className="text-sm font-medium text-gray-500">Stock</dt>
                <dd className="mt-2 text-3xl font-bold text-gray-900">{product.stock}</dd>
                <dd className="mt-1 text-xs text-gray-500">Threshold: {product.threshold}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><dt className="text-sm font-medium text-gray-500">Purchase Price</dt><dd className="mt-1 text-lg font-medium text-red-600">₹{product.purchasePrice}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Sale Price</dt><dd className="mt-1 text-lg font-bold text-green-600">₹{product.salePrice}</dd></div>
              </div>
            </dl>
          </div>
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-center">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-64 object-contain rounded shadow bg-white" />
            ) : (
              <div className="h-64 w-full md:w-1/2 flex items-center justify-center bg-gray-200 text-gray-400 rounded">No Image</div>
            )}
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-medium text-gray-900">Compatible Models</h3>
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="Search model..."
                value={modelSearchQuery}
                onChange={(e) => setModelSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            {(() => {
              const models = product.compatibleModels || [];
              if (models.length === 0) {
                return <p className="text-gray-500 text-sm">Not specified</p>;
              }
              const filteredModels = models.filter(m => (m || '').toLowerCase().includes(modelSearchQuery.toLowerCase()));
              const displayedModels = showAllModels || modelSearchQuery ? filteredModels : filteredModels.slice(0, 20);
              
              if (filteredModels.length === 0) {
                 return <p className="text-gray-500 text-sm">No models found matching "{modelSearchQuery}"</p>;
              }

              return (
                <div>
                  <div className="flex flex-wrap">
                    {displayedModels.map((model, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded mr-1 mb-1 inline-block">
                        {model}
                      </span>
                    ))}
                  </div>
                  {!showAllModels && !modelSearchQuery && filteredModels.length > 20 && (
                    <button
                      onClick={() => setShowAllModels(true)}
                      className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Show all ({filteredModels.length})
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {showLabelDialog && (
          <div className="fixed z-50 inset-0 flex items-center justify-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowLabelDialog(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
              <h3 className="text-lg font-bold mb-2">Assign Label Number</h3>
              <p className="text-gray-600 mb-4">Assigning to <strong>{product.name}</strong>.</p>
              <input type="number" value={labelInput} onChange={e => setLabelInput(e.target.value)} className="w-full border border-gray-300 rounded-md px-4 py-2 text-2xl font-bold mb-4" />
              <div className="flex space-x-3">
                <button onClick={confirmAssign} disabled={assigningLabel} className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 font-medium disabled:opacity-50">
                  {assigningLabel ? 'Assigning...' : `Confirm #${labelInput}`}
                </button>
                <button onClick={() => setShowLabelDialog(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showEdit && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowEdit(false)}></div>
              <div className="relative bg-white rounded-lg shadow-xl sm:max-w-2xl w-full">
                <div className="px-4 pt-5 pb-4 sm:p-6">
                  <h3 className="text-lg font-medium mb-5">Edit Product</h3>
                  <div className="max-h-[75vh] overflow-y-auto px-2">
                    <ProductForm initialData={product} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductView;
