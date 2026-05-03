import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';
import { getLabelNumber } from '../../utils/getLabelNumber';
import { printLabel } from '../../utils/printLabel.jsx';
import { generateInvoiceHTML } from '../../utils/generateInvoiceHTML';
import Layout from '../../components/common/Layout';

const SalesView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [labelEntry, setLabelEntry] = useState(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [assigningLabel, setAssigningLabel] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docSnap, labelSnap] = await Promise.all([
          getDoc(doc(db, 'sales', id)),
          getDocs(query(collection(db, 'label_registry'), where('referenceId', '==', id), where('labelType', '==', 'sale'))),
        ]);
        if (docSnap.exists()) setSale({ id: docSnap.id, ...docSnap.data() });
        if (!labelSnap.empty) setLabelEntry(labelSnap.docs[0].data());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setDataLoaded(true);
      }
    };
    fetchData();
  }, [id]);

  const handlePrintInvoice = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      // Re-fetch fresh data from Firestore before printing
      const freshSnap = await getDoc(doc(db, 'sales', id));
      const freshData = freshSnap.exists() ? { id: freshSnap.id, ...freshSnap.data() } : sale;

      const invoiceHTML = generateInvoiceHTML(freshData);

      const existing = document.getElementById('invoice-print-overlay');
      if (existing) existing.remove();

      const printDiv = document.createElement('div');
      printDiv.id = 'invoice-print-overlay';
      printDiv.style.cssText = 'display:none;';
      printDiv.innerHTML = invoiceHTML;
      document.body.appendChild(printDiv);
      printDiv.style.display = 'block';

      setTimeout(() => {
        window.print();
        setTimeout(() => {
          printDiv.remove();
          setPrinting(false);
        }, 1000);
      }, 800);
    } catch (err) {
      console.error('Print error:', err);
      setPrinting(false);
    }
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
        labelType: 'sale',
        referenceId: id,
        assignedBy: auth.currentUser?.uid || 'unknown',
        assignedAt: new Date().toISOString(),
        isActive: true,
        data: {
          invoiceNumber: sale.invoiceNumber || '',
          customerName: sale.customerName || '',
          customerPhone: sale.customerPhone || '',
          items: sale.items || [],
          subtotal: Number(sale.subtotal || 0),
          discount: Number(sale.discount || 0),
          totalAmount: Number(sale.totalAmount || 0),
          paymentMethod: sale.paymentMethod || '',
          amountPaid: Number(sale.amountPaid || 0),
          balanceDue: Number(sale.balanceDue || 0),
          saleDate: sale.date || '',
          createdBy: sale.createdBy || '',
        }
      });
      setLabelEntry({ labelNumber: Number(labelInput) });
      setShowLabelDialog(false);
    } catch (err) { console.error(err); alert('Failed to assign label.'); }
    finally { setAssigningLabel(false); }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!sale) return <div className="p-8 text-center text-red-600">Sale not found</div>;

  return (
    <Layout title="Sale Detail">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/sales')} className="flex items-center text-gray-500 hover:text-indigo-600 font-medium">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Invoice: {sale.invoiceNumber}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrintInvoice}
              disabled={!dataLoaded || printing}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {printing ? 'Preparing...' : !dataLoaded ? 'Loading...' : 'Print Invoice'}
            </button>
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
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="p-6 border-b border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Customer Details</p>
              <p className="font-bold text-lg mt-1">{sale.customerName}</p>
              <p className="text-gray-600">{sale.customerPhone}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Invoice Details</p>
              <p className="font-semibold mt-1">Date: {new Date(sale.date).toLocaleDateString()}</p>
              <p className="text-gray-600">Payment: {sale.paymentMethod}</p>
              {sale.paymentMethod === 'Split' && <p className="text-xs text-gray-500">Cash: ₹{sale.splitCash} | UPI: ₹{sale.splitUpi}</p>}
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Items</h3>
            <table className="min-w-full divide-y divide-gray-200 mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sale.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.name}
                      {item.imei && <span className="block text-xs text-gray-500">IMEI: {item.imei}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">₹{item.unitPrice}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>₹{sale.subtotal}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>Discount</span><span>₹{sale.discount || 0}</span></div>
                <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total</span><span className="text-indigo-600">₹{sale.totalAmount}</span></div>
                <div className="flex justify-between text-sm font-medium border-t pt-2"><span>Amount Paid</span><span className="text-green-600">₹{sale.amountPaid}</span></div>
                {sale.balanceDue > 0 && <div className="flex justify-between text-sm font-bold text-red-600"><span>Balance Due</span><span>₹{sale.balanceDue}</span></div>}
              </div>
            </div>
          </div>
          {sale.notes && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500 font-medium">Notes</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{sale.notes}</p>
            </div>
          )}
        </div>
      </div>

      {showLabelDialog && (
        <div className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowLabelDialog(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
            <h3 className="text-lg font-bold mb-2">Assign Label Number</h3>
            <p className="text-gray-600 mb-4">Assigning to invoice <strong>{sale.invoiceNumber}</strong>.</p>
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
    </Layout>
  );
};

export default SalesView;
