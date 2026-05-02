import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const LabelPrint = ({ labelData }) => {
  const barcodeRef = useRef(null);
  
  useEffect(() => {
    if (barcodeRef.current && labelData?.labelNumber) {
      JsBarcode(barcodeRef.current, String(labelData.labelNumber), {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 0
      });
    }
  }, [labelData]);

  if (!labelData) return null;

  const renderContent = () => {
    const d = labelData.data || {};
    
    switch (labelData.labelType) {
      case 'second_hand':
        return (
          <div className="flex flex-col items-center justify-center flex-1 w-full px-2">
            <div className="font-bold text-[14px] text-center leading-tight truncate w-full">{d.brand} {d.model}</div>
            <div className="text-[12px] text-center leading-tight mt-0.5">{d.ram} / {d.storage}</div>
            <div className="text-[12px] leading-tight mt-0.5">Grade: {d.condition}</div>
            <div className="font-bold text-[14px] leading-tight mt-0.5">₹{d.salePrice}</div>
          </div>
        );
      case 'service_order':
        const issues = Array.isArray(d.complaintTypes) ? d.complaintTypes.join(', ') : d.complaintTypes;
        return (
          <div className="flex flex-col items-center justify-center flex-1 w-full px-2">
            <div className="font-bold text-[13px] text-center leading-tight truncate w-full">{d.customerName}</div>
            <div className="text-[12px] text-center leading-tight truncate w-full mt-0.5">{d.brand} {d.model}</div>
            <div className="text-[11px] text-center leading-tight mt-0.5 line-clamp-2 w-full">{issues}</div>
            <div className="font-bold text-[12px] leading-tight mt-0.5">Est: ₹{d.estimatedPrice || '0'}</div>
          </div>
        );
      case 'product':
        return (
          <div className="flex flex-col items-center justify-center flex-1 w-full px-2">
            <div className="font-bold text-[14px] text-center leading-tight truncate w-full">{d.productName}</div>
            <div className="text-[12px] text-center leading-tight mt-0.5">{d.brand} | {d.category}</div>
            <div className="font-bold text-[14px] leading-tight mt-0.5">₹{d.salePrice}</div>
          </div>
        );
      case 'sale':
        return (
          <div className="flex flex-col items-center justify-center flex-1 w-full px-2">
            <div className="font-bold text-[13px] text-center leading-tight mt-1">Invoice: {d.invoiceNumber}</div>
            <div className="text-[12px] text-center leading-tight truncate w-full mt-1">{d.customerName}</div>
            <div className="font-bold text-[14px] leading-tight mt-1">Total: ₹{d.totalAmount}</div>
          </div>
        );
      default:
        return <div className="flex-1"></div>;
    }
  };

  return (
    <div className="w-[100mm] h-[50mm] bg-white text-black overflow-hidden flex flex-col font-sans p-2 box-border mx-auto">
      <div className="text-center font-bold text-[12px] uppercase tracking-wider mb-1">
        FRENCH MOBILES
      </div>
      <div className="border-t border-black w-full mb-1"></div>
      
      {renderContent()}
      
      <div className="mt-auto flex flex-col items-center justify-end pb-1 w-full">
        <img ref={barcodeRef} className="max-w-full h-[40px]" alt="Barcode" />
        <div className="text-[10px] font-mono tracking-widest mt-0.5">
          {labelData.labelNumber}
        </div>
      </div>
    </div>
  );
};

export default LabelPrint;
