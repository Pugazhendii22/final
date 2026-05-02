import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';

const ScannerPage = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: {width: 250, height: 150},
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128]
      },
      false
    );

    scanner.render(
      (decodedText) => {
        const numberMatch = decodedText.match(/\d+/);
        if (numberMatch && numberMatch[0]) {
          scanner.clear();
          navigate(`/scan/${numberMatch[0]}`);
        } else {
          setError('Invalid barcode format. Expected a numeric label.');
        }
      },
      (errorMessage) => {
        // Ignore background failures
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [navigate]);

  return (
    <Layout title="Internal Scanner">
      <div className="flex flex-col items-center">

      <div className="w-full max-w-md bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="bg-indigo-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Internal Scanner</h1>
          <p className="text-indigo-100 mt-1">Scan French Mobiles Barcode Label</p>
        </div>

        <div className="p-6">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center">{error}</div>}
          <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
        </div>
      </div>
      </div>
    </Layout>
  );
};

export default ScannerPage;
