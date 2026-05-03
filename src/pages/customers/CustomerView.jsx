import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import CustomerForm from './CustomerForm';
import Layout from '../../components/common/Layout';

const CustomerView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const fetchCustomer = async () => {
    try {
      const docRef = doc(db, 'customers', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCustomer({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.error("No such customer!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleUpdate = async (data) => {
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'customers', id), updatedData);
    setCustomer({ id, ...updatedData });
    setShowEdit(false);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!customer) return <div className="p-8 text-center text-red-600">Customer not found</div>;

  return (
    <Layout title="Customer Detail">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/customers')} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-medium">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            {customer.isRegular && (
              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                Regular Customer
              </span>
            )}
          </div>
          <button 
            onClick={() => setShowEdit(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Edit
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Customer Details</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dl className="space-y-4">
                <div><dt className="text-sm font-medium text-gray-500">Phone (WhatsApp)</dt><dd className="mt-1 text-sm text-gray-900">{customer.phone}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Alternate Phone</dt><dd className="mt-1 text-sm text-gray-900">{customer.alternatePhone || '-'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Email</dt><dd className="mt-1 text-sm text-gray-900">{customer.email || '-'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Address</dt><dd className="mt-1 text-sm text-gray-900">{customer.address || '-'}</dd></div>
                {customer.isRegular && <div><dt className="text-sm font-medium text-gray-500">Relationship</dt><dd className="mt-1 text-sm text-gray-900">{customer.relationship || '-'}</dd></div>}
              </dl>
            </div>
            <div>
              <dl className="space-y-4">
                <div><dt className="text-sm font-medium text-gray-500">ID Type</dt><dd className="mt-1 text-sm text-gray-900">{customer.idType || '-'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">ID Number</dt><dd className="mt-1 text-sm text-gray-900">{customer.idNumber || '-'}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500">Notes</dt><dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{customer.notes || '-'}</dd></div>
              </dl>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 border-t border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Customer Photo</p>
              {customer.photoUrl ? <img src={customer.photoUrl} alt="Customer" className="h-48 w-full object-cover rounded shadow" /> : <div className="h-48 flex items-center justify-center bg-gray-200 text-gray-400 rounded">No photo</div>}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">ID Proof</p>
              {customer.idProofUrl ? <img src={customer.idProofUrl} alt="ID" className="h-48 w-full object-cover rounded shadow" /> : <div className="h-48 flex items-center justify-center bg-gray-200 text-gray-400 rounded">No ID proof</div>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-medium text-gray-900">Linked Orders</h3>
            <p className="text-4xl font-bold text-indigo-600 mt-2">0</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-medium text-gray-900">Service Orders</h3>
            <p className="text-4xl font-bold text-indigo-600 mt-2">0</p>
          </div>
        </div>

        {showEdit && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEdit(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">Edit Customer</h3>
                  <CustomerForm initialData={customer} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CustomerView;
