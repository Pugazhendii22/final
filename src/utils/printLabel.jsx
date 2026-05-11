import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import LabelPrint from '../components/labels/LabelPrint';

let isPrinting = false;

export const printLabel = async (labelData) => {
  if (isPrinting) return;
  isPrinting = true;

  try {
    // Create PDF at exact 50mm x 25mm
    const pdf = new jsPDF({
      unit: 'mm',
      format: [50, 25],
      orientation: 'landscape'
    });

    // Verify PDF page size
    console.log('PDF page size (mm):', pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());

    // Render label to hidden div first to get content
    const printDiv = document.createElement('div');
    printDiv.id = 'print-label-temp';
    printDiv.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 189px;
      height: 95px;
      background: white;
      overflow: hidden;
    `;
    document.body.appendChild(printDiv);

    const root = createRoot(printDiv);
    root.render(<LabelPrint labelData={labelData} />);

    // Wait for barcode to render
    await new Promise(resolve => {
      let attempts = 0;
      const check = () => {
        attempts++;
        const svg = printDiv.querySelector('svg');
        const hasContent = svg && svg.children.length > 3;
        if (hasContent) {
          setTimeout(resolve, 400);
        } else if (attempts >= 20) {
          resolve();
        } else {
          setTimeout(check, 150);
        }
      };
      setTimeout(check, 200);
    });

    // Use html2canvas to capture the rendered label
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(printDiv, {
      scale: 10,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 189,
      height: 95,
      windowWidth: 189,
      windowHeight: 95,
      scrollX: 0,
      scrollY: 0
    });

    const imgData = canvas.toDataURL('image/png');

    // Add image to PDF at exact size
    pdf.addImage(imgData, 'PNG', 0, 0, 50, 25);

    // Open PDF in new tab for printing
    // This auto-sets paper size to 50x25mm
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, '_blank');

    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.document.title = 'French Mobiles Label';
        setTimeout(() => {
          printWindow.print();
        }, 800);
      });
    }

    // Cleanup
    root.unmount();
    printDiv.remove();
    URL.revokeObjectURL(pdfUrl);

  } catch (error) {
    console.error('Print error:', error);
    alert('Print failed. Please try again.');
  } finally {
    isPrinting = false;
  }
};
