import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import EnquiryForm from './EnquiryForm';
import Layout from '../../components/common/Layout';

const EnquiryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const fetchEnquiry = async () => {
      try {
        const docRef = doc(db, 'enquiries', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEnquiry({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEnquiry();
  }, [id]);

  const handleUpdate = async (data) => {
    await updateDoc(doc(db, 'enquiries', id), data);
    setEnquiry({ id, ...data });
    setShowEdit(false);
  };

  const handleConvertToSale = async () => {
    try {
      await updateDoc(doc(db, 'enquiries', id), { status: 'Converted' });
      navigate('/sales', { 
        state: { 
          customerName: enquiry.customerName, 
          customerPhone: enquiry.customerPhone 
        } 
      });
    } catch (err) {
      console.error(err);
      alert('Failed to convert to sale');
    }
  };

  const openWhatsApp = () => {
    const phone = enquiry.customerPhone.replace(/\D/g, '');
    const message = `Hi ${enquiry.customerName}, thank you for your enquiry at French Mobiles. We will get back to you shortly regarding ${enquiry.modelEnquired}. - French Mobiles`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!enquiry) return <div className="p-8 text-center text-red-600">Enquiry not found</div>;

  return (
    <Layout title="Enquiry Detail">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/enquiries')} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-medium">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{enquiry.customerName}</h1>
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
              ${enquiry.status === 'Open' ? 'bg-blue-100 text-blue-800' : ''}
              ${enquiry.status === 'Follow-up' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${enquiry.status === 'Converted' ? 'bg-green-100 text-green-800' : ''}
              ${enquiry.status === 'Closed' ? 'bg-gray-100 text-gray-800' : ''}
            `}>
              {enquiry.status}
            </span>
          </div>
          <div className="flex space-x-3">
            <button onClick={openWhatsApp} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.126.549 4.195 1.593 6.012L.15 24l6.105-1.594A11.961 11.961 0 0012.031 24c6.645 0 12.031-5.385 12.031-12.031C24.062 5.385 18.676 0 12.031 0zm3.435 17.291c-.147.411-.849.789-1.2.822-.323.03-.787.114-2.585-.634-2.15-1.001-3.528-3.197-3.633-3.339-.105-.142-.865-1.155-.865-2.203s.548-1.564.743-1.782c.195-.218.423-.272.565-.272s.283 0 .408.006c.132.006.31-.05.485.374.181.442.61 1.488.665 1.598.055.111.093.24.019.39-.074.15-.113.243-.223.364-.111.121-.235.267-.336.364-.113.107-.23.224-.105.439.125.215.556.918 1.196 1.487.828.736 1.52.96 1.735 1.066.215.106.34.09.467-.056.128-.146.551-.643.699-.864.148-.221.296-.184.492-.111.196.073 1.242.586 1.454.693.212.107.353.159.404.248.051.089.051.521-.096.932z"/></svg>
              WhatsApp
            </button>
            <button onClick={handleConvertToSale} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
              Convert to Sale
            </button>
            <button onClick={() => setShowEdit(true)} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              Edit
            </button>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Customer Info</h3>
              <div><p className="text-sm text-gray-500">Name</p><p className="font-medium">{enquiry.customerName}</p></div>
              <div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{enquiry.customerPhone}</p></div>
              <div><p className="text-sm text-gray-500">Enquiry Date</p><p className="font-medium">{new Date(enquiry.createdAt).toLocaleString()}</p></div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Requirements</h3>
              <div><p className="text-sm text-gray-500">Model Enquired</p><p className="font-medium">{enquiry.modelEnquired}</p></div>
              <div><p className="text-sm text-gray-500">Budget Range</p><p className="font-medium text-green-600">₹{enquiry.budgetMin} - ₹{enquiry.budgetMax}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Required Within</p><p className="font-medium">{enquiry.requiredWithin}</p></div>
                <div><p className="text-sm text-gray-500">Seriousness</p><p className={`font-medium ${enquiry.seriousness === 'Urgent' ? 'text-red-600' : ''}`}>{enquiry.seriousness}</p></div>
              </div>
              <div><p className="text-sm text-gray-500">Source</p><p className="font-medium">{enquiry.medium}</p></div>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Notes</h3>
              <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded text-sm text-gray-700">{enquiry.notes || 'No notes provided.'}</p>
            </div>
          </div>
        </div>

        {showEdit && (
          <div className="fixed z-10 inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEdit(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">Edit Enquiry</h3>
                  <EnquiryForm initialData={enquiry} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EnquiryView;
