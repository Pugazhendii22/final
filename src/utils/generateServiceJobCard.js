export const generateServiceJobCard = (order, shopDetails) => {
  const shop = shopDetails || {}

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Job Card - ${order.orderNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          color: #000;
          background: #fff;
        }
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        .page {
          width: 210mm;
          min-height: 148mm;
          padding: 0;
          margin: 0 auto;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .header-left { flex: 1; }
        .header-center { flex: 1; text-align: center; }
        .header-right { flex: 1; text-align: right; font-size: 10px; }
        .doc-title { font-size: 18px; font-weight: bold; text-align: center; }
        .shop-name { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
        .shop-info { font-size: 9px; line-height: 1.6; color: #333; margin-top: 2px; }
        .order-no { font-size: 10px; font-weight: bold; }
        .two-col { display: flex; gap: 0; border: 1px solid #000; margin-bottom: 6px; }
        .col-left { flex: 1; padding: 8px; border-right: 1px solid #000; }
        .col-right { flex: 1; padding: 8px; }
        .section-title { font-size: 11px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 6px; }
        .field-row { display: flex; margin-bottom: 4px; font-size: 10px; }
        .field-label { font-weight: bold; min-width: 100px; flex-shrink: 0; }
        .field-value { flex: 1; border-bottom: 1px solid #ccc; padding-left: 4px; min-height: 14px; }
        .barcode-section { margin-top: 8px; display: flex; align-items: center; gap: 10px; }
        .barcode-img { height: 35px; }
        .fault-solution { display: flex; gap: 0; border: 1px solid #000; margin-bottom: 6px; }
        .fault-col { flex: 1; padding: 8px; border-right: 1px solid #000; }
        .solution-col { flex: 1; padding: 8px; }
        .content-text { font-size: 10px; line-height: 1.6; min-height: 40px; }
        .accessories-list { font-size: 10px; line-height: 1.8; }
        .notice-contact { display: flex; gap: 0; border: 1px solid #000; margin-bottom: 6px; }
        .notice-col { flex: 1; padding: 8px; border-right: 1px solid #000; }
        .contact-col { flex: 1; padding: 8px; }
        .notice-item { font-size: 9px; line-height: 1.6; margin-bottom: 2px; }
        .contact-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 9px; }
        .contact-label { font-weight: bold; min-width: 70px; }
        .signature-section { display: flex; gap: 0; border: 1px solid #000; }
        .sig-col { flex: 1; padding: 8px; border-right: 1px solid #000; font-size: 9px; }
        .sig-col:last-child { border-right: none; }
        .sig-line { border-bottom: 1px solid #000; margin-top: 20px; margin-bottom: 4px; width: 80%; }
        .shop-stamp { text-align: right; font-size: 10px; font-weight: bold; padding: 8px; flex: 1; }
        .thank-you { text-align: center; font-size: 10px; padding: 6px; border: 1px solid #000; border-top: none; font-style: italic; }
        .amount-box { border: 2px solid #000; padding: 6px 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
        .amount-label { font-size: 12px; font-weight: bold; }
        .amount-value { font-size: 14px; font-weight: bold; }
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
            <div class="doc-title">Job Card</div>
            <div style="font-size:10px;color:#555;margin-top:2px;">Service Receipt</div>
          </div>
          <div class="header-right">
            <div class="order-no">NO: ${order.orderNumber}</div>
            <div style="margin-top:4px;font-size:9px;">
              Date: ${order.receivedAt?.toDate?.()?.toLocaleDateString('en-IN') || new Date().toLocaleDateString('en-IN')}
            </div>
            <div style="margin-top:4px;font-size:9px;">
              Time: ${order.receivedAt?.toDate?.()?.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) || new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        </div>

        <div class="two-col">
          <div class="col-left">
            <div class="section-title">Service Center Info</div>
            <div class="field-row">
              <span class="field-label">Customer Name</span>
              <span class="field-value">${order.customerName || ''}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Mobile</span>
              <span class="field-value">${order.customerPhone || ''}</span>
            </div>
            ${order.alternatePhone ? `
            <div class="field-row">
              <span class="field-label">Alt. Mobile</span>
              <span class="field-value">${order.alternatePhone}</span>
            </div>` : ''}
            <div class="barcode-section">
              <div style="font-size:9px;color:#555;">Order Barcode:</div>
              ${order.assignedLabelNumber ? `
                <svg id="barcode-svg"></svg>
                <div style="font-size:9px;">#${order.assignedLabelNumber}</div>
              ` : `<div style="font-size:9px;color:#999;">No label assigned</div>`}
            </div>
          </div>
          <div class="col-right">
            <div class="section-title">Device Info</div>
            <div class="field-row">
              <span class="field-label">Brand / Model</span>
              <span class="field-value">${order.brand || ''} ${order.model || ''}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Colour</span>
              <span class="field-value">${order.colour || ''}</span>
            </div>
            <div class="field-row">
              <span class="field-label">IMEI 1</span>
              <span class="field-value">${order.imei1 || ''}</span>
            </div>
            ${order.imei2 ? `
            <div class="field-row">
              <span class="field-label">IMEI 2</span>
              <span class="field-value">${order.imei2}</span>
            </div>` : ''}
            <div class="field-row">
              <span class="field-label">Lock Type</span>
              <span class="field-value">${order.lockType || 'None'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Technician</span>
              <span class="field-value">${order.technicianName || ''}</span>
            </div>
          </div>
        </div>

        <div class="fault-solution">
          <div class="fault-col">
            <div class="section-title">Fault / Issues Reported</div>
            <div class="content-text">
              ${(order.complaintTypes || []).map(c => `\u2022 ${c}`).join('<br>')}
              ${order.otherComplaint ? `<br>\u2022 ${order.otherComplaint}` : ''}
              ${order.problemDetails ? `<br><br><strong>Details:</strong> ${order.problemDetails}` : ''}
            </div>
          </div>
          <div class="solution-col">
            <div class="section-title">Accessories Collected</div>
            <div class="accessories-list">
              ${(order.accessoriesCollected || order.accessories || []).map(a => `\u2022 ${a}`).join('<br>')}
              ${(!order.accessoriesCollected && !order.accessories) || ((order.accessoriesCollected || order.accessories || []).length === 0) ? 'None' : ''}
            </div>
            <div style="margin-top:10px;">
              <div class="section-title">Estimated Amount</div>
              <div style="font-size:14px;font-weight:bold;margin-top:4px;">
                Rs. ${order.estimatedPrice || 0}
              </div>
              ${order.advancePaid > 0 ? `
              <div style="font-size:10px;margin-top:2px;">
                Advance Paid: Rs. ${order.advancePaid}
              </div>` : ''}
            </div>
          </div>
        </div>

        <div class="notice-contact">
          <div class="notice-col">
            <div class="section-title">User Notice</div>
            ${(shop.user_notice || [
              'Please inspect your device carefully when collecting it.',
              'Physical and liquid damage will not be covered under warranty.',
              'Please keep this receipt and present it when collecting your device.',
              'We are not responsible for any data loss during repair.'
            ]).map((notice, i) => `
              <div class="notice-item">${i+1}. ${notice}</div>
            `).join('')}
          </div>
          <div class="contact-col">
            <div class="section-title">Contact Us</div>
            <div class="contact-item">
              <span style="font-size:12px;">\uD83D\uDCDE</span>
              <span class="contact-label">Phone</span>
              <span>${shop.phone || '+91 99447 01436'}</span>
            </div>
            <div class="contact-item">
              <span style="font-size:12px;">\uD83D\uDCAC</span>
              <span class="contact-label">WhatsApp</span>
              <span>${shop.whatsapp || '+91 99447 01436'}</span>
            </div>
            <div class="contact-item">
              <span style="font-size:12px;">\uD83D\uDCD8</span>
              <span class="contact-label">Facebook</span>
              <span style="font-size:8px;">${shop.facebook || ''}</span>
            </div>
            <div class="contact-item">
              <span style="font-size:12px;">\uD83D\uDCF7</span>
              <span class="contact-label">Instagram</span>
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

      ${order.assignedLabelNumber ? `
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script>
        window.onload = function() {
          JsBarcode("#barcode-svg", "${order.assignedLabelNumber}", {
            format: "CODE128",
            width: 1.5,
            height: 30,
            displayValue: false,
            margin: 0
          })
        }
      </script>` : ''}
    </body>
    </html>
  `
}
