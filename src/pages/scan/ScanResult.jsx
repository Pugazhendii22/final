import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import PatternLock from '../../components/PatternLock';

const Badge = ({ children, color }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>
    {children}
  </span>
);

const Row = ({ label, value, isBold = true }) => (
  <div className="flex justify-between items-start py-1">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className={`text-sm ${isBold ? 'font-medium' : ''} text-right`}>{value}</span>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl p-4 mb-3 shadow-sm break-words">
    {title && <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">{title}</h3>}
    {children}
  </div>
);

const ScanResult = () => {
  const { labelNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const q = query(collection(db, 'label_registry'), where('labelNumber', '==', Number(labelNumber)));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setData(snap.docs[0].data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistry();
  }, [labelNumber]);

  if (loading) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">Loading...</div>;
  if (!data) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 pt-10 max-w-[480px] mx-auto">
      <div className="bg-[#002395] w-full p-4 rounded-t-2xl text-center break-words">
        <h1 className="text-xl font-bold text-white tracking-widest uppercase">FRENCH MOBILES</h1>
      </div>
      <div className="bg-white p-4 md:p-8 w-full rounded-b-2xl shadow-sm border-x border-b border-[#e2e8f0] text-center break-words">
        <h2 className="text-lg font-bold text-[#0f172a] mb-2">Label #{labelNumber} not found</h2>
      </div>
    </div>
  );

  const { labelType, data: d, assignedAt } = data;
  const hasPatternLock = d?.lockType === 'Pattern' || (Array.isArray(d?.lockPattern) && d.lockPattern.length > 0);

  const typeColor = {
    second_hand: 'bg-purple-100 text-purple-800',
    service_order: 'bg-blue-100 text-blue-800',
    product: 'bg-teal-100 text-teal-800',
    sale: 'bg-green-100 text-green-800'
  }[labelType] || 'bg-gray-100 text-gray-800';

  const typeName = labelType.replace('_', ' ').toUpperCase();

  return (
  <div className="min-h-screen bg-[#f8fafc] pb-8">

    {/* HEADER */}
    <div className="bg-[#002395] px-4 py-4 text-center">
      <p className="text-white/70 text-xs uppercase tracking-widest mb-1">French Mobiles</p>
      <h1 className="text-white font-bold text-lg">Label #{labelNumber}</h1>
      {labelType && (
        <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium ${
          labelType === 'service_order' ? 'bg-[#ED2939] text-white' :
          labelType === 'second_hand' ? 'bg-white text-[#002395]' :
          labelType === 'product' ? 'bg-green-400 text-white' :
          'bg-orange-400 text-white'
        }`}>
          {labelType === 'service_order' ? 'Service Order' :
           labelType === 'second_hand' ? 'Second-Hand Mobile' :
           labelType === 'product' ? 'Product' : 'Sale'}
        </span>
      )}
    </div>

    {loading ? (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#002395] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    ) : !data ? (
      <div className="text-center py-20 px-4">
        <i className="fas fa-exclamation-circle text-4xl text-gray-200 mb-3 block"></i>
        <p className="text-gray-500 font-semibold">Label #{labelNumber} not found</p>
        <p className="text-gray-400 text-sm mt-1">This label may not be assigned yet</p>
      </div>
    ) : (
      <div className="px-4 py-4 space-y-4 max-w-md mx-auto">

        {labelType === 'second_hand' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-[#002395] p-5">
              <h2 className="text-xl font-bold text-[#0f172a]">
                {d?.brand} {d?.model}
              </h2>
              <div className="flex gap-2 mt-2 flex-wrap">
                {d?.ram && (
                  <span className="bg-[#002395]/10 text-[#002395] text-xs px-2 py-0.5 rounded-full">
                    {d.ram} RAM
                  </span>
                )}
                {d?.rom && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    {d.rom} ROM
                  </span>
                )}
                {d?.grade && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    d.grade === 'A' ? 'bg-green-100 text-green-700' :
                    d.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                    d.grade === 'C' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-[#ED2939]'
                  }`}>
                    Grade {d.grade}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-[#002395] mt-3">
                ₹{d?.salePrice}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
                Device Info
              </p>
              <div className="grid grid-cols-2 gap-3">
                {d?.imei1 && (
                  <div>
                    <p className="text-xs text-gray-400">IMEI 1</p>
                    <p className="font-semibold text-[#0f172a] text-sm break-all">{d.imei1}</p>
                  </div>
                )}
                {d?.serialNumber && (
                  <div>
                    <p className="text-xs text-gray-400">Serial Number</p>
                    <p className="font-semibold text-[#0f172a] text-sm break-all">{d.serialNumber}</p>
                  </div>
                )}
                {d?.condition && (
                  <div>
                    <p className="text-xs text-gray-400">Condition</p>
                    <p className="font-semibold text-[#0f172a] text-sm">{d.condition}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <p className={`font-semibold text-sm ${
                    d?.status === 'available' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {d?.status === 'available' ? 'Available' : 'Sold'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {labelType === 'service_order' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-[#ED2939] p-5">
              <p className="text-xs font-bold text-[#ED2939] font-mono">{d?.orderNumber}</p>
              <h2 className="text-xl font-bold text-[#0f172a] mt-1">{d?.customerName}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{d?.customerPhone}</p>
              <p className="text-lg font-bold text-[#002395] mt-2">₹{d?.estimatedPrice}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
                Service Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Device</p>
                  <p className="font-semibold text-[#0f172a] text-sm">
                    {d?.brand} {d?.model}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Technician</p>
                  <p className="font-semibold text-[#0f172a] text-sm">{d?.technicianName}</p>
                </div>
              </div>
              {d?.complaintTypes?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Issues</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.complaintTypes.map((c, i) => (
                      <span key={i} className="bg-[#ED2939]/10 text-[#ED2939] text-xs px-2 py-0.5 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {labelType === 'product' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-green-500 p-5">
              <h2 className="text-xl font-bold text-[#0f172a]">{d?.productName}</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {d?.brand} · {d?.category}
              </p>
              <p className="text-2xl font-bold text-[#002395] mt-2">₹{d?.salePrice}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
                Stock Info
              </p>
              <div className="grid grid-cols-2 gap-3">
                {d?.sku && (
                  <div>
                    <p className="text-xs text-gray-400">SKU</p>
                    <p className="font-semibold text-[#0f172a] text-sm">{d.sku}</p>
                  </div>
                )}
                {d?.stockQuantity && (
                  <div>
                    <p className="text-xs text-gray-400">Stock</p>
                    <p className="font-semibold text-[#0f172a] text-sm">{d.stockQuantity} units</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {labelType === 'sale' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-orange-500 p-5">
              <p className="text-xs font-bold text-[#002395] font-mono">{d?.invoiceNumber}</p>
              <h2 className="text-xl font-bold text-[#0f172a] mt-1">{d?.customerName}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{d?.customerPhone}</p>
              <p className="text-2xl font-bold text-[#002395] mt-2">₹{d?.totalAmount}</p>
            </div>
            {d?.items?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-xs font-bold text-[#002395] uppercase tracking-wide mb-3 border-l-4 border-[#002395] pl-3">
                  Items
                </p>
                <div className="space-y-2">
                  {d.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[#0f172a]">{item.name}</span>
                      <span className="font-semibold text-[#002395]">₹{item.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-400 text-center">
            Assigned on {assignedAt ? new Date(assignedAt).toLocaleDateString('en-IN') : '-'}
          </p>
        </div>

      </div>
    )}
  </div>
);
};

export default ScanResult;
