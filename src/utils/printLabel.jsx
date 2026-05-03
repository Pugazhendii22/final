import React from 'react';
import { createRoot } from 'react-dom/client';
import LabelPrint from '../components/labels/LabelPrint';

const waitForBarcode = (container) => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // wait max 3 seconds (20 × 150ms)

    const check = () => {
      attempts++;
      const svg = container.querySelector('svg');
      const hasContent = svg && svg.children.length > 0;

      if (hasContent) {
        // Extra 400ms buffer after barcode renders
        setTimeout(resolve, 400);
      } else if (attempts >= maxAttempts) {
        // Timeout fallback - print anyway after 3 seconds
        resolve();
      } else {
        setTimeout(check, 150);
      }
    };

    setTimeout(check, 150);
  });
};

export const printLabel = async (labelData) => {
  // Prevent duplicate calls
  if (document.getElementById("print-label-root")) {
    document.getElementById("print-label-root").remove();
  }

  // Create a hidden container for the label
  const printDiv = document.createElement('div');
  printDiv.id = 'print-label-root';
  printDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100mm;
    height: 50mm;
    z-index: 99999;
    background: white;
  `;
  document.body.appendChild(printDiv);

  const root = createRoot(printDiv);
  
  // Render the label component into the container
  root.render(<LabelPrint labelData={labelData} />);

  // Wait for barcode SVG to render properly
  await waitForBarcode(printDiv);

  // Inject label page size style
  const styleTag = document.createElement('style');
  styleTag.id = 'print-label-page-style';
  styleTag.textContent = '@media print { @page { size: 100mm 50mm; margin: 0; } }';
  document.head.appendChild(styleTag);

  // Now print
  window.print();
  
  // Cleanup after print dialog is closed or shown
  window.onafterprint = () => {
    root.unmount();
    printDiv.remove();
    styleTag.remove();
    window.onafterprint = null;
  };
};
