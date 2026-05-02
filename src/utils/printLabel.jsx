import React from 'react';
import { createRoot } from 'react-dom/client';
import LabelPrint from '../components/labels/LabelPrint';

export const printLabel = (labelData) => {
  // Create a hidden container for the label
  const printContainer = document.createElement('div');
  printContainer.id = 'print-label-root';
  document.body.appendChild(printContainer);

  const root = createRoot(printContainer);
  
  // Render the label component into the container
  root.render(<LabelPrint labelData={labelData} />);

  // Wait a short moment for jsbarcode to render the SVG, then print
  setTimeout(() => {
    window.print();
    // Cleanup after print dialog is closed or shown
    setTimeout(() => {
      root.unmount();
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
    }, 1000); // Wait a bit before unmounting to ensure print dialog grabs it
  }, 300);
};
