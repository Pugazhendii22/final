export const generateServiceFinalBill = (order, shopDetails) => {
  const shop = shopDetails || {}
  const finalAmount = order.estimatedPrice || 0
  const advance = order.advancePaid || 0
  const balance = finalAmount - advance

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Final Bill - ${order.orderNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; background: #fff; }
        @page { size: A4 portrait; margin: 8mm; }
        .page { width: 210mm; min-height: 148mm; padding: 0; margin: 0 auto; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header-left { flex: 1; }
        .header-center { flex: 1; text-align: center; }
        .header-right { flex: 1; text-align: right; font-size: 10px; }
        .doc-title { font-size: 18px; font-weight: bold; text-align: center; }
        .shop-name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
        .shop-info { font-size: 9px; line-height: 1.6; color: #333; margin-top: 2px; }
        .two-col { display: flex; border: 1px solid #000; margin-bottom: 6px; }
        .col-left { flex: 1; padding: 8px; border-right: 1px solid #000; }
        .col-right { flex: 1; padding: 8px; }
        .section-title { font-size: 11px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 6px; }
        .field-row { display: flex; margin-bottom: 4px; font-size: 10px; }
        .field-label { font-weight: bold; min-width: 100px; flex-shrink: 0; }
        .field-value { flex: 1; border-bottom: 1px solid #ccc; padding-left: 4px; min-height: 14px; }
        .fault-solution { display: flex; border: 1px solid #000; margin-bottom: 6px; }
        .fault-col { flex: 1; padding: 8px; border-right: 1px solid #000; }
        .solution-col { flex: 1; padding: 8px; }
        .content-text { font-size: 10px; line-height: 1.6; min-height: 30px; }
        .notice-contact { display: flex; border: 1px solid #000; margin-bottom: 6px; }
        .notice-col { flex: 1; padding: 8px; border-right: 1px solid #000; }
        .contact-col { flex: 1; padding: 8px; }
        .notice-item { font-size: 9px; line-height: 1.6; margin-bottom: 2px; }
        .contact-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 9px; }
        .contact-label { font-weight: bold; min-width: 70px; }
        .signature-section { display: flex; border: 1px solid #000; }
        .sig-col { flex: 1; padding: 8px; border-right: 1px solid #000; font-size: 9px; }
        .sig-col:last-child { border-right: none; }
        .sig-line { border-bottom: 1px solid #000; margin-top: 20px; margin-bottom: 4px; width: 80%; }
        .shop-stamp { text-align: right; font-size: 10px; font-weight: bold; padding: 8px; flex: 1; }
        .thank-you { text-align: center; font-size: 10px; padding: 6px; border: 1px solid #000; border-top: none; font-style: italic; }
        .payment-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        .payment-table td { border: 1px solid #000; padding: 5px 8px; font-size: 10px; }
        .payment-table .total-row td { font-weight: bold; font-size: 12px; }
        .payment-table .balance-row td { font-weight: bold; font-size: 11px; color: ${balance > 0 ? 'red' : 'green'}; }
      </style>
    </head>
    <body>
      <div class="page">

        <div class="header">
          <div class="header-left">
            <div class="shop-name">${shop.name || 'THE FRENCH MOBILES'}</div>
            <div class="shop-info">
              Business hours: ${shop.hours || '10:00 AM - 9:00 PM'}<br>
              Address: ${shop.address || '225, Thiruvalluvar Salai, Puducherry - 605013'}<br>
              Contact: ${shop.phone || '+91 99447 01436'}
            </div>
            ${shop.gstin ? `<div style="font-size:9px;margin-top:3px;">GSTIN: ${shop.gstin}</div>` : ''}
          </div>
          <div class="header-center">
            <div class="doc-title">Service Invoice</div>
            <div style="font-size:10px;color:#555;margin-top:2px;">Final Bill</div>
          </div>
          <div class="header-right">
            <div style="font-weight:bold;font-size:10px;">NO: ${order.orderNumber}</div>
            <div style="font-size:9px;margin-top:4px;">
              Received: ${order.receivedAt?.toDate?.()?.toLocaleDateString('en-IN') || ''}
            </div>
            <div style="font-size:9px;margin-top:2px;">
              Completed: ${order.actualCompletedAt?.toDate?.()?.toLocaleDateString('en-IN') || new Date().toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        <div class="two-col">
          <div class="col-left">
            <div class="section-title">Customer Info</div>
            <div class="field-row">
              <span class="field-label">Name</span>
              <span class="field-value">${order.customerName || ''}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Mobile</span>
              <span class="field-value">${order.customerPhone || ''}</span>
            </div>
          </div>
          <div class="col-right">
            <div class="section-title">Device Info</div>
            <div class="field-row">
              <span class="field-label">Brand / Model</span>
              <span class="field-value">${order.brand || ''} ${order.model || ''}</span>
            </div>
            <div class="field-row">
              <span class="field-label">IMEI</span>
              <span class="field-value">${order.imei1 || ''}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Technician</span>
              <span class="field-value">${order.technicianName || ''}</span>
            </div>
          </div>
        </div>

        <div class="fault-solution">
          <div class="fault-col">
            <div class="section-title">Issues Reported</div>
            <div class="content-text">
              ${(order.complaintTypes || []).map(c => `\u2022 ${c}`).join('<br>')}
              ${order.otherComplaint ? `<br>\u2022 ${order.otherComplaint}` : ''}
            </div>
          </div>
          <div class="solution-col">
            <div class="section-title">Work Done / Solution</div>
            <div class="content-text">
              ${order.suggestions || 'Service completed successfully.'}
            </div>
          </div>
        </div>

        <div style="border: 1px solid #000; margin-bottom: 6px;">
          <div style="padding: 6px 8px; border-bottom: 1px solid #000; font-weight: bold; font-size: 11px;">
            Payment Summary
          </div>
          <table class="payment-table" style="border: none; margin: 0;">
            <tr>
              <td style="border-top:none;border-left:none;">Service Charge</td>
              <td style="border-top:none;border-right:none;text-align:right;">Rs. ${order.estimatedPrice || 0}</td>
            </tr>
            ${order.rawMaterialCost > 0 ? `
            <tr>
              <td style="border-left:none;">Parts / Material Cost</td>
              <td style="border-right:none;text-align:right;">Rs. ${order.rawMaterialCost}</td>
            </tr>` : ''}
            ${order.outsideLabourCost > 0 ? `
            <tr>
              <td style="border-left:none;">Outside Labour</td>
              <td style="border-right:none;text-align:right;">Rs. ${order.outsideLabourCost}</td>
            </tr>` : ''}
            <tr class="total-row">
              <td style="border-left:none;">Total Amount</td>
              <td style="border-right:none;text-align:right;">Rs. ${finalAmount}</td>
            </tr>
            ${advance > 0 ? `
            <tr>
              <td style="border-left:none;">Advance Paid</td>
              <td style="border-right:none;text-align:right;color:green;">- Rs. ${advance}</td>
            </tr>` : ''}
            <tr class="balance-row">
              <td style="border-left:none;border-bottom:none;">
                ${balance > 0 ? 'Balance Due' : 'Fully Paid'}
              </td>
              <td style="border-right:none;border-bottom:none;text-align:right;">
                ${balance > 0 ? `Rs. ${balance}` : '\u2713 PAID'}
              </td>
            </tr>
          </table>
        </div>

        <div style="border: 1px solid #000; padding: 6px 8px; margin-bottom: 6px; font-size: 9px;">
          <strong>Warranty: </strong>${shop.warranty_text || 'Physical and liquid damages will not be covered under warranty terms.'}
        </div>

        <div class="notice-contact">
          <div class="notice-col">
            <div class="section-title">User Notice</div>
            ${(shop.user_notice || [
              'Please inspect your device carefully when collecting.',
              'Physical and liquid damage not covered under warranty.',
              'Keep this invoice for future reference.'
            ]).map((n, i) => `<div class="notice-item">${i+1}. ${n}</div>`).join('')}
          </div>
          <div class="contact-col">
            <div class="section-title">Contact Us</div>
            <div class="contact-item">
              <span>\uD83D\uDCDE</span><span class="contact-label">Phone</span>
              <span>${shop.phone || ''}</span>
            </div>
            <div class="contact-item">
              <span>\uD83D\uDCAC</span><span class="contact-label">WhatsApp</span>
              <span>${shop.whatsapp || ''}</span>
            </div>
            <div class="contact-item">
              <span>\uD83D\uDCD8</span><span class="contact-label">Facebook</span>
              <span style="font-size:8px;">${shop.facebook || ''}</span>
            </div>
            <div class="contact-item">
              <span>\uD83D\uDCF7</span><span class="contact-label">Instagram</span>
              <span style="font-size:8px;">${shop.instagram || ''}</span>
            </div>
          </div>
        </div>

        <div class="signature-section">
          <div class="sig-col" style="flex:2">
            <div>Customer Signature:</div>
            <div class="sig-line"></div>
            <div style="font-size:9px;">Goods received in good condition</div>
          </div>
          <div class="sig-col">
            <div>${shop.technician_label || 'Repair Engineer'}:</div>
            <div style="font-size:10px;font-weight:bold;margin-top:4px;">${order.technicianName || ''}</div>
            <div class="sig-line"></div>
          </div>
          <div class="shop-stamp">
            <div>${shop.name || 'THE FRENCH MOBILES'}</div>
            <div style="font-size:9px;font-weight:normal;margin-top:2px;">Authorised Signature</div>
            <div style="width:60px;height:60px;border:1px solid #ccc;border-radius:50%;margin:4px 0 0 auto;display:flex;align-items:center;justify-content:center;font-size:8px;color:#ccc;">SEAL</div>
          </div>
        </div>

        <div class="thank-you">
          ${shop.footer_message || 'Thank you for choosing The French Mobiles!'}
        </div>

      </div>
    </body>
    </html>
  `
}
