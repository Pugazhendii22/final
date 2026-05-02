import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';
import SecondHandForm from './SecondHandForm';
import { getLabelNumber } from '../../utils/getLabelNumber';
import { printLabel } from '../../utils/printLabel.jsx';
import Layout from '../../components/common/Layout';

const group1 = [
  { key: 'frontCamera', label: 'Front Camera' },
  { key: 'rearCamera', label: 'Rear Camera' },
  { key: 'earpieceSpeaker', label: 'Earpiece Speaker' },
  { key: 'simSlot1', label: 'SIM Slot 1' },
  { key: 'simSlot2', label: 'SIM Slot 2' },
  { key: 'microphone', label: 'Microphone' },
  { key: 'loudspeaker', label: 'Loudspeaker' },
  { key: 'proximitySensor', label: 'Proximity Sensor' },
  { key: 'powerButton', label: 'Power Button' },
  { key: 'volumeButtons', label: 'Volume Buttons' },
  { key: 'mobileData', label: 'Mobile Data' },
  { key: 'bluetooth', label: 'Bluetooth' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'flashlight', label: 'Flashlight' }
];

const group2 = [
  { key: 'displayReplaced', label: 'Display Replaced' },
  { key: 'whiteSpots', label: 'White Spots on Display' },
  { key: 'physicalDamage', label: 'Physical Damage / Bent' }
];

const SecondHandView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [labelEntry, setLabelEntry] = useState(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [assigningLabel, setAssigningLabel] = useState(false);

  const fetchMobile = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'second_hand_mobiles', id));
      if (docSnap.exists()) setMobile({ id: docSnap.id, ...docSnap.data() });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchLabel = async () => {
    const snap = await getDocs(query(collection(db, 'label_registry'), where('referenceId', '==', id), where('labelType', '==', 'second_hand')));
    if (!snap.empty) setLabelEntry(snap.docs[0].data());
  };

  useEffect(() => { fetchMobile(); fetchLabel(); }, [id]);

  const handleUpdate = async (data) => {
    const updated = { ...data, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'second_hand_mobiles', id), updated);
    setMobile({ id, ...updated });
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
        labelType: 'second_hand',
        referenceId: id,
        assignedBy: auth.currentUser?.uid || 'unknown',
        assignedAt: new Date().toISOString(),
        isActive: true,
        data: {
          brand: mobile.brand || '', model: mobile.model || '',
          ram: mobile.ram || '', rom: mobile.rom || '',
          condition: mobile.condition || '', grade: mobile.condition || '',
          imei1: mobile.imei1 || '', imei2: mobile.imei2 || '',
          purchasePrice: Number(mobile.purchasePrice || 0),
          salePrice: Number(mobile.salePrice || 0),
          purchaseDate: mobile.purchaseDate || '', supplier: mobile.supplier || '',
          specialNotes: mobile.notes || '',
          frontImageUrl: mobile.frontImageUrl || '', backImageUrl: mobile.backImageUrl || '',
          status: mobile.status || '', createdBy: mobile.createdBy || '', createdAt: mobile.createdAt || '',
        }
      });
      setLabelEntry({ labelNumber: Number(labelInput) });
      setShowLabelDialog(false);
    } catch (err) { console.error(err); alert('Failed to assign label.'); }
    finally { setAssigningLabel(false); }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!mobile) return <div className="p-8 text-center text-red-600">Mobile not found</div>;

  return (
    <Layout title="Second-Hand Detail">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/inventory/second-hand')} className="flex items-center text-gray-500 hover:text-indigo-600 font-medium">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{mobile.brand} {mobile.model}</h1>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${mobile.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {mobile.status?.toUpperCase()}
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
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Device Details</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <dl className="space-y-4">
              <div><dt className="text-sm font-medium text-gray-500">Brand</dt><dd className="mt-1 text-sm text-gray-900">{mobile.brand}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Model</dt><dd className="mt-1 text-sm text-gray-900">{mobile.model}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Config</dt><dd className="mt-1 text-sm text-gray-900">{mobile.ram} / {mobile.rom}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">IMEI 1</dt><dd className="mt-1 text-sm text-gray-900">{mobile.imei1}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">IMEI 2</dt><dd className="mt-1 text-sm text-gray-900">{mobile.imei2 || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Condition</dt><dd className="mt-1 text-sm text-gray-900">Grade {mobile.condition}</dd></div>
            </dl>
            <dl className="space-y-4">
              <div><dt className="text-sm font-medium text-gray-500">Purchase Price</dt><dd className="mt-1 text-sm font-semibold text-red-600">₹{mobile.purchasePrice}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Sale Price</dt><dd className="mt-1 text-sm font-semibold text-green-600">₹{mobile.salePrice}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Purchase Date</dt><dd className="mt-1 text-sm text-gray-900">{mobile.purchaseDate ? new Date(mobile.purchaseDate).toLocaleDateString() : '-'}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Supplier</dt><dd className="mt-1 text-sm text-gray-900">{mobile.supplier || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Notes</dt><dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{mobile.notes || '-'}</dd></div>
            </dl>
          </div>

          {/* Condition Checklist Section */}
          {mobile.conditionChecklist && (
            <div className="px-4 py-5 sm:p-6 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-3 mb-4 border-b pb-2">
                <h3 className="text-lg font-medium text-gray-900">Condition Checklist</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${mobile.condition === 'A' ? 'bg-green-500 text-white' :
                  mobile.condition === 'B' ? 'bg-blue-500 text-white' :
                    mobile.condition === 'C' ? 'bg-orange-500 text-white' :
                      mobile.condition === 'D' ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-800'
                  }`}>
                  Grade {mobile.condition}
                </span>
                <span className="text-xs text-gray-500 italic bg-gray-100 px-2 py-0.5 rounded">
                  {mobile.gradeManualOverride ? 'Manually set' : 'Auto calculated'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Functionality</h4>
                  <ul className="space-y-2">
                    {group1.map(item => (
                      <li key={item.key} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700">{item.label}</span>
                        {mobile.conditionChecklist[item.key] === 'Working' ? (
                          <span className="text-green-600 font-medium flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Working
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>Not Working
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Physical Condition</h4>
                  <ul className="space-y-2">
                    {group2.map(item => (
                      <li key={item.key} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700">{item.label}</span>
                        {mobile.conditionChecklist[item.key] === 'No' ? (
                          <span className="text-green-600 font-medium flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>No
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Yes
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {mobile.sellerCustomerId && (
            <div className="px-4 py-5 sm:px-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Seller Details</h3>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">{mobile.sellerName}</span>
                  {mobile.sellerPhone && <span className="ml-2">({mobile.sellerPhone})</span>}
                </p>
              </div>
              <Link to={`/customers/${mobile.sellerCustomerId}`} className="text-indigo-600 hover:text-indigo-900 bg-white border border-gray-300 px-3 py-1.5 rounded text-sm font-medium shadow-sm">
                View Profile
              </Link>
            </div>
          )}

          <div className="px-4 py-5 sm:p-6 bg-white border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Photos & Documents</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { label: 'Photo 1: Front', url: mobile.photo1Url || mobile.frontImageUrl },
                { label: 'Photo 2: Back', url: mobile.photo2Url || mobile.backImageUrl },
                { label: 'Photo 3: Left Side', url: mobile.photo3Url },
                { label: 'Photo 4: Right Side', url: mobile.photo4Url },
                { label: 'Photo 5: Top/Bottom', url: mobile.photo5Url },
                { label: 'Photo 6: Additional', url: mobile.photo6Url },
                { label: 'Photo 7: ID Card Front', url: mobile.idCardFrontUrl },
                { label: 'Photo 8: ID Card Back / Doc', url: mobile.idCardBackUrl }
              ].map((img, idx) => (
                <div key={idx}>
                  <p className="text-sm font-medium text-gray-600 mb-2">{img.label}</p>
                  {img.url ? (
                    <a href={img.url} target="_blank" rel="noreferrer">
                      <img src={img.url} alt={img.label} className="h-48 w-full object-contain rounded shadow-sm border border-gray-200 bg-gray-50 hover:opacity-90 transition-opacity" />
                    </a>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-gray-50 text-gray-400 rounded border border-dashed border-gray-300 text-xs">No photo</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showLabelDialog && (
          <div className="fixed z-50 inset-0 flex items-center justify-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowLabelDialog(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Assign Label Number</h3>
              <p className="text-gray-600 mb-4">Assigning to <strong>{mobile.brand} {mobile.model}</strong>. Edit number if needed.</p>
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
              <div className="relative bg-white rounded-lg shadow-xl sm:max-w-3xl w-full">
                <div className="px-4 pt-5 pb-4 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-5">Edit Mobile Details</h3>
                  <div className="max-h-[70vh] overflow-y-auto px-2">
                    <SecondHandForm initialData={mobile} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
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

export default SecondHandView;
