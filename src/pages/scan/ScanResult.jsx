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
  <div className="bg-white rounded-xl p-4 mb-3 shadow-sm">
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

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">Loading...</div>;
  if (!data) return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 pt-10 max-w-[480px] mx-auto">
      <div className="bg-indigo-900 w-full p-4 rounded-t-xl text-center">
        <h1 className="text-xl font-bold text-white tracking-widest uppercase">FRENCH MOBILES</h1>
      </div>
      <div className="bg-white p-8 w-full rounded-b-xl shadow-sm text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Label #{labelNumber} not found</h2>
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
    <div className="min-h-screen bg-gray-100 p-4 pb-10 flex flex-col items-center">
      <div className="w-full max-w-[480px]">
        {/* Header Section */}
        <div className="bg-indigo-900 rounded-xl p-6 mb-3 shadow-sm text-center text-white">
          <h1 className="text-xl font-bold tracking-widest mb-4">FRENCH MOBILES</h1>
          <div className="flex justify-center items-center space-x-2 mb-3">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">#{data.labelNumber}</span>
            <Badge color={typeColor}>{typeName}</Badge>
          </div>
          <div className="text-xs text-indigo-200">
            Assigned: {new Date(assignedAt).toLocaleDateString()}
          </div>
        </div>

        {hasPatternLock && (
          <Section title="Phone Lock Pattern">
            <PatternLock value={d.lockPattern || []} readOnly />
          </Section>
        )}
        {labelType === 'second_hand' && (
          <>
            <Section title="Device Info">
              <Row label="Brand & Model" value={`${d.brand} ${d.model}`} />
              <Row label="Config" value={`${d.ram} / ${d.rom}`} />
              <div className="flex justify-between items-center py-1 mt-1">
                <span className="text-gray-500 text-sm">Grade</span>
                <Badge color={
                  d.grade === 'A' ? 'bg-green-100 text-green-800' :
                  d.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                  d.grade === 'C' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }>Grade {d.grade}</Badge>
              </div>
              <Row label="Condition" value={d.condition || `Grade ${d.grade}`} />
              <Row label="IMEI 1" value={d.imei1 || '-'} />
              <Row label="IMEI 2" value={d.imei2 || '-'} />
              <Row label="Serial Number" value={d.serialNumber || 'Not provided'} />
            </Section>

            <Section title="Pricing">
              <Row label="Purchase Price" value={`₹${d.purchasePrice}`} />
              <Row label="Sale Price" value={`₹${d.salePrice}`} />
            </Section>

            <Section title="Purchase Info">
              <Row label="Purchase Date" value={d.purchaseDate ? new Date(d.purchaseDate).toLocaleDateString() : '-'} />
              <Row label="Supplier" value={d.supplier || '-'} />
              {d.specialNotes && (
                <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 block text-xs">Special Notes</span>
                  {d.specialNotes}
                </div>
              )}
            </Section>

            <Section title="Status">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 text-sm">Current Status</span>
                <Badge color={d.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {d.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>
            </Section>

            {d.conditionChecklist && Object.keys(d.conditionChecklist).length > 0 && (
              <Section title="Condition Checklist">
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(d.conditionChecklist).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-sm border-b border-gray-50 pb-1">
                      <span className="text-gray-700 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      {v === 'Working' || v === 'No' ? (
                         <span className="text-green-600 font-bold flex items-center">
                           <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                           {v}
                         </span>
                      ) : (
                         <span className="text-red-600 font-bold flex items-center">
                           <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                           {v}
                         </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {labelType === 'service_order' && (
          <>
            <Section title="Order Info">
              <Row label="Order Number" value={d.orderNumber} />
              <Row label="Date Received" value={d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'} />
            </Section>

            <Section title="Device">
              <Row label="Brand & Model" value={`${d.brand} ${d.model}`} />
              <Row label="Colour" value={d.colour || '-'} />
            </Section>

            <Section title="Customer">
              <Row label="Name" value={d.customerName} />
              <Row label="Phone" value={d.customerPhone} />
            </Section>

            <Section title="Service Details">
              <div className="mb-3">
                <span className="text-gray-500 text-sm block mb-1">Complaints</span>
                <div className="flex flex-wrap gap-1.5">
                  {d.complaintTypes?.length > 0 ? (
                    d.complaintTypes.map((c, i) => <Badge key={i} color="bg-red-50 text-red-700 border border-red-100">{c}</Badge>)
                  ) : (
                    <Badge color="bg-red-50 text-red-700 border border-red-100">{d.complaintType}</Badge>
                  )}
                </div>
              </div>
              {d.problemDetails && (
                <div className="mb-3 text-sm bg-gray-50 p-2 rounded">
                  <span className="text-gray-500 block text-xs">Details</span>
                  {d.problemDetails}
                </div>
              )}
              <Row label="Estimated Price" value={`₹${d.estimatedPrice || 0}`} />
              <Row label="Advance Paid" value={`₹${d.advancePaid || 0}`} />
            </Section>

            <Section title="Status">
              <div className="flex justify-between items-center py-1 mb-2">
                <span className="text-gray-500 text-sm">Status</span>
                <Badge color={
                  d.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  d.status === 'Returned' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }>{d.status || 'Received'}</Badge>
              </div>
              <Row label="Technician" value={d.technicianName || 'Unassigned'} />
            </Section>

            {d.accessoriesCollected && d.accessoriesCollected.length > 0 && (
              <Section title="Accessories Collected">
                <div className="text-sm font-medium">{d.accessoriesCollected.join(', ')}</div>
              </Section>
            )}
          </>
        )}

        {labelType === 'product' && (
          <>
            <Section title="Product Info">
              <Row label="Name" value={d.productName} />
              <Row label="Brand & Category" value={`${d.brand} • ${d.category}`} />
              <Row label="SKU" value={d.sku} />
            </Section>

            <Section title="Pricing">
              <Row label="Sale Price" value={`₹${d.salePrice}`} />
            </Section>

            <Section title="Stock">
              <Row label="Quantity" value={d.stockQuantity} />
              <div className="flex justify-between items-center py-1 mt-1">
                <span className="text-gray-500 text-sm">Status</span>
                <Badge color={d.stockQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {d.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                </Badge>
              </div>
            </Section>
          </>
        )}

        {labelType === 'sale' && (
          <>
            <Section title="Invoice Info">
              <Row label="Invoice Number" value={d.invoiceNumber} />
              <Row label="Sale Date" value={d.saleDate ? new Date(d.saleDate).toLocaleDateString() : '-'} />
            </Section>

            <Section title="Customer">
              <Row label="Name" value={d.customerName} />
              <Row label="Phone" value={d.customerPhone} />
            </Section>

            <Section title="Items">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="text-left py-2 font-medium">Item</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Price</th>
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {d.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">₹{item.unitPrice}</td>
                        <td className="py-2 text-right font-medium">₹{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Payment">
              <Row label="Subtotal" value={`₹${d.subtotal}`} isBold={false} />
              <Row label="Discount" value={`₹${d.discount || 0}`} isBold={false} />
              <div className="border-t my-2 pt-2">
                <Row label="Total Amount" value={`₹${d.totalAmount}`} />
              </div>
              <div className="flex justify-between items-center py-1 mt-2 mb-2">
                <span className="text-gray-500 text-sm">Payment Method</span>
                <Badge color="bg-indigo-100 text-indigo-800">{d.paymentMethod}</Badge>
              </div>
              <Row label="Amount Paid" value={`₹${d.amountPaid}`} />
              <Row label="Balance Due" value={`₹${d.balanceDue}`} />
            </Section>
          </>
        )}

      </div>
    </div>
  );
};

export default ScanResult;
