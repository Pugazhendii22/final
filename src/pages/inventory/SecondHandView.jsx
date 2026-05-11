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

const gradeColor = (g) => ({ 
  A: 'bg-green-100 text-green-700', 
  B: 'bg-blue-100 text-blue-700', 
  C: 'bg-orange-100 text-orange-700', 
  D: 'bg-red-100 text-red-700' 
}[g] || 'bg-gray-100 text-[#64748b]');

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
          serialNumber: mobile.serialNumber || '',
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

  if (loading) return <div className="p-4 md:p-8 text-center text-[#0f172a] font-bold">Loading...</div>;
  if (!mobile) return <div className="p-4 md:p-8 text-center text-[#ED2939] font-bold">Mobile not found</div>;

  return (
    <Layout title="Second-Hand Detail" pageType="detail" backTo="/inventory/second-hand">
      <div className="min-h-screen bg-[#f8fafc] pb-24">

        {/* HEADER */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
          <button onClick={() => navigate('/inventory/second-hand')} className="text-[#002395] p-1">
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <h1 className="text-lg font-bold text-[#0f172a] flex-1">Mobile Details</h1>
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* MAIN CARD */}
          <div className={`bg-white rounded-2xl shadow-sm border-l-4 p-5 ${
            mobile?.condition === 'A' ? 'border-green-500' :
            mobile?.condition === 'B' ? 'border-[#002395]' :
            mobile?.condition === 'C' ? 'border-orange-500' :
            'border-[#ED2939]'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-[#0f172a]">
                  {mobile?.brand} {mobile?.model}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {mobile?.ram && (
                    <span className="bg-[#002395]/10 text-[#002395] text-xs px-2 py-0.5 rounded-full">
                      {mobile?.ram} RAM
                    </span>
                  )}
                  {mobile?.rom && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {mobile?.rom} ROM
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${gradeColor(mobile?.condition)}`}>
                    Grade {mobile?.condition}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    mobile?.status === 'available' || !mobile?.status
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {mobile?.status === 'available' || !mobile?.status ? 'Available' : 'Sold'}
                  </span>
                  {labelEntry && (
                    <span className="bg-[#002395]/10 text-[#002395] text-xs px-2 py-0.5 rounded-full font-bold">
                      <i className="fas fa-tag mr-1"></i>Label #{labelEntry.labelNumber}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#002395]">₹{mobile?.salePrice}</p>
                {mobile?.purchasePrice && (
                  <p className="text-xs text-gray-400">Cost: ₹{mobile?.purchasePrice}</p>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 bg-[#002395]/10 text-[#002395] px-3 py-2 rounded-xl text-xs font-semibold"
              >
                <i className="fas fa-edit"></i> Edit
              </button>
              {labelEntry ? (
                <button
                  onClick={() => printLabel(labelEntry)}
                  className="flex items-center gap-1.5 bg-[#ED2939]/10 text-[#ED2939] px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  <i className="fas fa-print"></i> Print #{labelEntry.labelNumber}
                </button>
              ) : (
                <button
                  onClick={openLabelDialog}
                  className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  <i className="fas fa-tag"></i> Assign Label
                </button>
              )}
            </div>
          </div>

          {/* DEVICE INFO */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
              Device Info
            </p>
            <div className="grid grid-cols-2 gap-3">
              {mobile?.imei1 && (
                <div>
                  <p className="text-xs text-gray-400">IMEI 1</p>
                  <p className="font-semibold text-[#0f172a] text-sm break-all">{mobile?.imei1}</p>
                </div>
              )}
              {mobile?.imei2 && (
                <div>
                  <p className="text-xs text-gray-400">IMEI 2</p>
                  <p className="font-semibold text-[#0f172a] text-sm break-all">{mobile?.imei2}</p>
                </div>
              )}
              {mobile?.serialNumber && (
                <div>
                  <p className="text-xs text-gray-400">Serial Number</p>
                  <p className="font-semibold text-[#0f172a] text-sm break-all">{mobile?.serialNumber}</p>
                </div>
              )}
              {mobile?.purchaseDate && (
                <div>
                  <p className="text-xs text-gray-400">Purchase Date</p>
                  <p className="font-semibold text-[#0f172a] text-sm">{mobile?.purchaseDate}</p>
                </div>
              )}
              {mobile?.supplier && (
                <div>
                  <p className="text-xs text-gray-400">Supplier</p>
                  <p className="font-semibold text-[#0f172a] text-sm">{mobile?.supplier}</p>
                </div>
              )}
            </div>
            {mobile?.notes && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{mobile?.notes}</p>
              </div>
            )}
          </div>

          {/* CONDITION CHECKLIST */}
          {mobile?.conditionChecklist && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
                Device Checklist
              </p>
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Functionality</h4>
                <div className="grid grid-cols-2 gap-2">
                  {group1.map(item => (
                    <div key={item.key} className="flex items-center gap-2">
                      <i className={`fas ${
                        mobile.conditionChecklist[item.key] === 'Working'
                          ? 'fa-check-circle text-green-500'
                          : 'fa-times-circle text-[#ED2939]'
                      } text-sm`}></i>
                      <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-widest">Physical Condition</h4>
                <div className="grid grid-cols-2 gap-2">
                  {group2.map(item => (
                    <div key={item.key} className="flex items-center gap-2">
                      <i className={`fas ${
                        mobile.conditionChecklist[item.key] === 'No'
                          ? 'fa-check-circle text-green-500'
                          : 'fa-exclamation-circle text-[#ED2939]'
                      } text-sm`}></i>
                      <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SELLER DETAILS */}
          {mobile?.sellerCustomerId && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
                Seller Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Name</p>
                  <p className="font-semibold text-[#0f172a] text-sm">{mobile?.sellerName}</p>
                </div>
                {mobile?.sellerPhone && (
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="font-semibold text-[#0f172a] text-sm">{mobile?.sellerPhone}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate(`/customers/${mobile?.sellerCustomerId}`)}
                className="mt-3 text-xs text-[#002395] font-semibold"
              >
                <i className="fas fa-user mr-1"></i> View Customer Profile
              </button>
            </div>
          )}

          {/* PHOTOS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
              Photos &amp; Documents
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Front View', url: mobile?.photo1Url || mobile?.frontImageUrl },
                { label: 'Back View',  url: mobile?.photo2Url || mobile?.backImageUrl },
                { label: 'Left Side',  url: mobile?.photo3Url },
                { label: 'Right Side', url: mobile?.photo4Url },
                { label: 'Top/Bottom', url: mobile?.photo5Url },
                { label: 'Additional', url: mobile?.photo6Url },
                { label: 'ID Front',   url: mobile?.idCardFrontUrl },
                { label: 'ID Back',    url: mobile?.idCardBackUrl },
              ].map((img, idx) => (
                <div key={idx} className="flex flex-col">
                  {img.url ? (
                    <a href={img.url} target="_blank" rel="noreferrer" className="block w-full">
                      <img src={img.url} alt={img.label} className="w-full aspect-square object-cover rounded-xl shadow-sm border border-[#e2e8f0] hover:opacity-90 transition" />
                    </a>
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-[#f8fafc] text-[#64748b] rounded-xl border border-[#e2e8f0] border-dashed text-xs font-medium">No photo</div>
                  )}
                  <p className="text-xs font-semibold text-[#64748b] mt-2 text-center">{img.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* LABEL ASSIGNMENT MODAL */}
        {showLabelDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="fixed inset-0" onClick={() => setShowLabelDialog(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
              <h3 className="text-xl font-bold text-[#0f172a] mb-2">Assign Label Number</h3>
              <p className="text-[#64748b] text-sm mb-4">Assigning to <strong className="text-[#0f172a]">{mobile?.brand} {mobile?.model}</strong>.</p>
              <input type="number" inputMode="numeric" pattern="[0-9]*" value={labelInput} onChange={e => setLabelInput(e.target.value)} className="w-full border-2 border-[#e2e8f0] focus:border-[#002395] outline-none rounded-xl px-4 py-3 text-2xl font-bold text-center mb-6 text-[#0f172a]" />
              <div className="flex flex-col gap-3">
                <button onClick={confirmAssign} disabled={assigningLabel} className="w-full bg-[#002395] text-white py-3 rounded-xl font-bold hover:bg-[#001a7a] transition disabled:opacity-50">
                  {assigningLabel ? 'Assigning...' : `Confirm #${labelInput}`}
                </button>
                <button onClick={() => setShowLabelDialog(false)} className="w-full bg-white border-2 border-[#e2e8f0] text-[#64748b] py-3 rounded-xl font-bold hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEdit && (
          <SecondHandForm initialData={mobile} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
        )}

      </div>
    </Layout>
  );
};

export default SecondHandView;
