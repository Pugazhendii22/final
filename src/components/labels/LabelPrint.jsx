import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const LabelPrint = ({ labelData }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    const barcodeValue = labelData?.labelNumber
      || labelData?.data?.imei1
      || (labelData?.labelType === 'service_order' ? (labelData?.data?.orderNumber || 'NO-BARCODE') : null);
    if (barcodeRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeRef.current, String(barcodeValue), {
          format: "CODE128",
          width: 1.5,
          height: 35,
          displayValue: false,
          margin: 0
        });
      } catch (e) {
        console.error("Barcode render error:", e);
      }
    }
  }, [labelData]);

  if (!labelData) return null;

  const renderContent = () => {
    const d = labelData.data || {};
    
    switch (labelData.labelType) {
      case 'second_hand':
        return (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>
              FRENCH MOBILES
            </div>
            <div style={{ width: '100%', borderTop: '1px solid black', margin: '2px 0' }}></div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {d.brand} {d.model}
            </div>
            <div style={{ fontSize: '11px', color: 'gray', textAlign: 'center' }}>
              RAM: {d.ram} | ROM: {d.storage || d.rom}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'black', textAlign: 'center' }}>
              ₹{d.salePrice}
            </div>
            <div style={{ width: '100%', borderTop: '1px solid black', margin: '2px 0' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {(labelData.labelNumber || d.imei1) ? (
                <>
                  <svg ref={barcodeRef} style={{ height: '35px' }}></svg>
                  <div style={{ fontSize: '10px', color: 'gray', textAlign: 'center', marginTop: '1px' }}>
                    {labelData.labelNumber ? `S/N: ${labelData.labelNumber}` : 'UNASSIGNED'}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '10px', color: 'gray', padding: '10px 0' }}>No barcode available</div>
              )}
            </div>
          </div>
        );
      case 'service_order':
        const issues = Array.isArray(d.complaintTypes) ? d.complaintTypes[0] : d.complaintTypes;
        return (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
              FRENCH MOBILES
            </div>
            <div style={{ width: '100%', borderTop: '1px solid black', margin: '2px 0' }}></div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {d.customerName}
            </div>
            <div style={{ fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {d.brand} {d.model}
            </div>
            <div style={{ fontSize: '10px', color: 'gray', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              Issue: {issues}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
              Est: ₹{d.estimatedPrice || '0'}
            </div>
            <div style={{ width: '100%', borderTop: '1px solid black', margin: '2px 0' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg ref={barcodeRef} style={{ height: '35px' }}></svg>
              <div style={{ fontSize: '9px', color: 'gray', textAlign: 'center', marginTop: '1px' }}>
                Order: {d.orderNumber} | S/N: {labelData.labelNumber}
              </div>
            </div>
          </div>
        );
      case 'product':
        return (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>FRENCH MOBILES</div>
            <div style={{ width: '100%', borderTop: '1px solid black', margin: '2px 0' }}></div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{d.productName}</div>
            <div style={{ fontSize: '12px', textAlign: 'center' }}>{d.brand} | {d.category}</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>₹{d.salePrice}</div>
            <div style={{ width: '100%', borderTop: '1px solid black', margin: '2px 0' }}></div>
            <svg ref={barcodeRef} style={{ height: '35px' }}></svg>
            <div style={{ fontSize: '10px', color: 'gray', textAlign: 'center' }}>S/N: {labelData.labelNumber}</div>
          </div>
        );
      case 'sale':
        return (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>FRENCH MOBILES</div>
            <div style={{ width: '100%', borderTop: '1px solid black', margin: '2px 0' }}></div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>Invoice: {d.invoiceNumber}</div>
            <div style={{ fontSize: '12px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{d.customerName}</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>Total: ₹{d.totalAmount}</div>
            <div style={{ width: '100%', borderTop: '1px solid black', margin: '2px 0' }}></div>
            <svg ref={barcodeRef} style={{ height: '35px' }}></svg>
            <div style={{ fontSize: '10px', color: 'gray', textAlign: 'center' }}>{labelData.labelNumber}</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      width: '100mm',
      height: '50mm',
      padding: '3mm',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'white',
      color: 'black',
      overflow: 'hidden'
    }}>
      {renderContent()}
    </div>
  );
};

export default LabelPrint;
