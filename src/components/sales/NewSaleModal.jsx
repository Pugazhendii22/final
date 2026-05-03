import React from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import SalesForm from '../../pages/sales/SalesForm';

const NewSaleModal = ({ isOpen, onClose, prefillData, onSuccess }) => {
  if (!isOpen) return null;

  const generateInvoiceNumber = async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const snapshot = await getDocs(collection(db, 'sales'));
    let count = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.invoiceNumber && data.invoiceNumber.includes(dateStr)) {
        count++;
      }
    });
    return `INV-${dateStr}-${count.toString().padStart(3, '0')}`;
  };

  const handleSaveSale = async (data) => {
    const invoiceNumber = await generateInvoiceNumber();
    
    const newSale = {
      ...data,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const custSnap = await getDocs(collection(db, 'customers'));
    const customers = [];
    custSnap.forEach(doc => customers.push(doc.data()));

    // Auto-create customer if phone is new
    if (!customers.find(c => c.phone === data.customerPhone)) {
      await addDoc(collection(db, 'customers'), {
        name: data.customerName,
        phone: data.customerPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Update inventory logic
    for (const item of data.items) {
      if (item.type === 'Second-hand') {
        // Mark as sold
        await updateDoc(doc(db, 'second_hand_mobiles', item.itemId), {
          status: 'sold',
          updatedAt: new Date().toISOString()
        });
      } else if (item.type === 'New') {
        // Reduce stock
        try {
          const productRef = doc(db, 'products', item.itemId);
          await updateDoc(productRef, {
            stock: increment(-item.quantity)
          });
        } catch (e) {
          console.error("Error updating product stock", e);
        }
      }
    }

    const docRef = await addDoc(collection(db, 'sales'), newSale);

    if (data.linkedServiceOrderId) {
      await updateDoc(doc(db, 'service_orders', data.linkedServiceOrderId), {
        billCreated: true,
        linkedSaleId: docRef.id,
        updatedAt: new Date().toISOString()
      });
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">Create New Sale</h3>
            <div className="max-h-[75vh] overflow-y-auto px-2">
              <SalesForm onSave={handleSaveSale} onCancel={onClose} prefillData={prefillData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSaleModal;
