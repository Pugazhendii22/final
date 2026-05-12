export const generateInvoiceHTML = (sale) => {
  const items = sale.items || [];

  const grandTotal = Number(sale.totalAmount || 0);
  const discount = Number(sale.discount || 0);
  const isNewProduct = (sale.saleType || '').toLowerCase().includes('new');

  // Only apply GST for new product sales
  const taxableAmount = isNewProduct ? grandTotal / 1.18 : grandTotal;
  const cgst = isNewProduct ? (grandTotal - taxableAmount) / 2 : 0;
  const sgst = cgst;

  const fmt = (n) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const getDate = (val) => {
    if (!val) return '';
    if (val?.seconds) return new Date(val.seconds * 1000).toLocaleDateString('en-IN');
    if (val?.toDate) return val.toDate().toLocaleDateString('en-IN');
    if (val instanceof Date) return val.toLocaleDateString('en-IN');
    return new Date(val).toLocaleDateString('en-IN');
  };

  const itemRows = items
    .map((item, i) => {
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0);
      const total = Number(item.total) || qty * unitPrice;
      return `
      <tr>
        <td class="col-sn">${i + 1}</td>
        <td class="col-desc">
          <div class="desc-main">${item.name || ''}</div>
          ${item.imei ? `<div class="desc-sub">IMEI No: ${item.imei}</div>` : ''}
          ${item.description ? `<div class="desc-sub">${item.description}</div>` : ''}
        </td>
        <td class="col-qty">${qty}</td>
        <td class="col-gst">${isNewProduct ? '18%' : 'N/A'}</td>
        <td class="col-price">&#8377;${fmt(unitPrice)}</td>
        <td class="col-amount">&#8377;${fmt(total)}</td>
      </tr>`;
    })
    .join('');

  const emptyCount = Math.max(0, 5 - items.length);
  const emptyRows = Array(emptyCount)
    .fill('<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>')
    .join('');

  return `
<style>
  #invoice-print-overlay * { margin: 0; padding: 0; box-sizing: border-box; }
  #invoice-print-overlay { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; background: #fff; }
  #invoice-print-overlay .page { max-width: 210mm; margin: 0 auto; background: #fff; }
  #invoice-print-overlay .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  #invoice-print-overlay .invoice-label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4px; }
  #invoice-print-overlay .shop-name { font-size: 24px; font-weight: 900; font-family: Arial Black, Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  #invoice-print-overlay .shop-address { font-size: 11px; line-height: 1.6; color: #333; }
  #invoice-print-overlay .shop-phone { font-size: 16px; font-weight: 900; font-family: Arial Black, Arial, sans-serif; letter-spacing: 1px; margin-top: 4px; }
  #invoice-print-overlay .details-row { display: flex; justify-content: space-between; border: 1px solid #000; padding: 8px 10px; margin-bottom: 10px; }
  #invoice-print-overlay .details-left { width: 55%; }
  #invoice-print-overlay .details-right { width: 42%; }
  #invoice-print-overlay .detail-line { display: flex; margin-bottom: 4px; font-size: 11px; }
  #invoice-print-overlay .detail-label { font-weight: bold; min-width: 70px; }
  #invoice-print-overlay .detail-value { border-bottom: 1px solid #000; flex: 1; padding-left: 4px; min-height: 16px; }
  #invoice-print-overlay .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  #invoice-print-overlay .items-table th { background: #f0f0f0; border: 1px solid #000; padding: 5px 6px; font-size: 11px; font-weight: bold; text-align: center; text-transform: uppercase; }
  #invoice-print-overlay .items-table td { border: 1px solid #000; padding: 5px 6px; font-size: 11px; vertical-align: top; }
  #invoice-print-overlay .col-sn { text-align: center; width: 30px; }
  #invoice-print-overlay .col-qty { text-align: center; width: 40px; }
  #invoice-print-overlay .col-gst { text-align: center; width: 45px; }
  #invoice-print-overlay .col-price { text-align: right; width: 90px; }
  #invoice-print-overlay .col-amount { text-align: right; width: 90px; }
  #invoice-print-overlay .desc-main { font-weight: bold; text-transform: uppercase; }
  #invoice-print-overlay .desc-sub { font-size: 10px; color: #333; margin-top: 2px; line-height: 1.5; }
  #invoice-print-overlay .empty-row td { height: 22px; }
  #invoice-print-overlay .totals-section { display: flex; justify-content: flex-end; margin-bottom: 10px; }
  #invoice-print-overlay .totals-table { width: 240px; border-collapse: collapse; }
  #invoice-print-overlay .totals-table td { padding: 3px 8px; font-size: 11px; border: 1px solid #ccc; }
  #invoice-print-overlay .total-label { font-weight: bold; }
  #invoice-print-overlay .total-value { text-align: right; }
  #invoice-print-overlay .grand-total td { font-size: 13px; font-weight: bold; border: 2px solid #000; }
  #invoice-print-overlay .tax-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
  #invoice-print-overlay .tax-table th { border: 1px solid #000; padding: 4px 6px; background: #f0f0f0; font-weight: bold; text-align: center; }
  #invoice-print-overlay .tax-table td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
  #invoice-print-overlay .warranty { border: 1px solid #000; padding: 6px 10px; margin-bottom: 10px; font-size: 10px; line-height: 1.6; }
  #invoice-print-overlay .warranty-title { font-weight: bold; margin-bottom: 3px; font-size: 11px; }
  #invoice-print-overlay .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px; }
  #invoice-print-overlay .footer-left { font-size: 11px; }
  #invoice-print-overlay .footer-right { text-align: right; font-size: 11px; font-weight: bold; }
  #invoice-print-overlay .signature-line { border-bottom: 1px solid #000; width: 160px; margin-top: 20px; margin-bottom: 4px; }
</style>
<div id="invoice-content" class="page">
  <div class="header">
    <div class="invoice-label">INVOICE</div>
    <div class="shop-name">THE FRENCH MOBILES</div>
    <div class="shop-address">
      225, Thiruvalluvar Salai, Puducherry
    </div>
    <div class="shop-phone">+91 99447 01436</div>
  </div>

  <div class="details-row">
    <div class="details-left">
      <div class="detail-line"><span class="detail-label">NAME :</span><span class="detail-value">${sale.customerName || ''}</span></div>
      <div class="detail-line"><span class="detail-label">ADD :</span><span class="detail-value">${sale.customerAddress || ''}</span></div>
      <div class="detail-line"><span class="detail-label">MOBILE :</span><span class="detail-value">${sale.customerPhone || ''}</span></div>
    </div>
    <div class="details-right">
      <div class="detail-line"><span class="detail-label">BILL NO :</span><span class="detail-value">${sale.invoiceNumber || ''}</span></div>
      <div class="detail-line"><span class="detail-label">DATE :</span><span class="detail-value">${getDate(sale.createdAt || sale.date)}</span></div>
      <div class="detail-line"><span class="detail-label">SUPPLY :</span><span class="detail-value">${sale.saleType || ''}</span></div>
      <div class="detail-line"><span class="detail-label">HSN :</span><span class="detail-value">8517</span></div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="col-sn">S.N.</th>
        <th class="col-desc">Description of Goods</th>
        <th class="col-qty">QTY</th>
        <th class="col-gst">GST%</th>
        <th class="col-price">PRICE</th>
        <th class="col-amount">AMOUNT (&#8377;)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${emptyRows}
    </tbody>
  </table>

  <div class="totals-section">
    <table class="totals-table">
      ${isNewProduct ? `
      <tr><td class="total-label">CGST :</td><td class="total-value">&#8377; ${fmt(cgst)}</td></tr>
      <tr><td class="total-label">SGST :</td><td class="total-value">&#8377; ${fmt(sgst)}</td></tr>
      ` : ''}
      ${discount > 0 ? `<tr><td class="total-label" style="font-style:italic;">Discount :</td><td class="total-value" style="font-style:italic;">- &#8377; ${fmt(discount)}</td></tr>` : ''}
      <tr class="grand-total"><td class="total-label">Grand Total :</td><td class="total-value">&#8377; ${fmt(grandTotal)}</td></tr>
      ${Number(sale.balanceDue) > 0 ? `<tr><td class="total-label" style="color:#c00;">Balance Due :</td><td class="total-value" style="color:#c00;">&#8377; ${fmt(sale.balanceDue)}</td></tr>` : ''}
    </table>
  </div>

  ${isNewProduct ? `
  <table class="tax-table">
    <thead><tr><th>Tax Rate</th><th>Taxable Amt</th><th>CGST Amt</th><th>SGST Amt</th><th>Total Tax</th></tr></thead>
    <tbody>
      <tr>
        <td>18%</td>
        <td>&#8377; ${fmt(taxableAmount)}</td>
        <td>&#8377; ${fmt(cgst)}</td>
        <td>&#8377; ${fmt(sgst)}</td>
        <td>&#8377; ${fmt(cgst + sgst)}</td>
      </tr>
    </tbody>
  </table>` : ''}

  <div class="warranty">
    <div class="warranty-title">Warranty:</div>
    Mobile handset &amp; Chargers are warranted for the period defined by the respective manufacturers.
    We are not giving warranty and does not hold out any warranty of product sold.
    Physical and liquid damages will not be covered under warranty terms.
  </div>

  <div class="footer">
    <div class="footer-left">
      <div>Customer's Signature :</div>
      <div class="signature-line"></div>
      <div>Goods received in good condition</div>
    </div>
    <div class="footer-right">
      For FRENCH MOBILES<br><br><br>
      Authorised Signatory
    </div>
  </div>
</div>`;
};
