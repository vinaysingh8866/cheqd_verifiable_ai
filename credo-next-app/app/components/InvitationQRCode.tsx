'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';

interface InvitationQRCodeProps {
  invitationUrl: string;
  title?: string;
  showCopyButton?: boolean;
}

const InvitationQRCode: React.FC<InvitationQRCodeProps> = ({ 
  invitationUrl, 
  title = 'Connection Invitation',
  showCopyButton = true
}) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="bg-white p-3 rounded-md inline-block mb-3">
        <QRCode
          value={invitationUrl}
          size={180}
          level="H"
        />
      </div>
      <p className="text-sm text-gray-600 mb-3">Scan this QR code to connect</p>
      <div className="flex flex-wrap justify-center gap-2">
        <a 
          href={invitationUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline text-sm flex items-center px-3 py-1 bg-blue-50 rounded-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open Link
        </a>
        
        {showCopyButton && (
          <button 
            onClick={handleCopy}
            className="text-blue-600 hover:bg-blue-100 text-sm flex items-center px-3 py-1 bg-blue-50 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        )}
      </div>
    </div>
  );
};

export default InvitationQRCode; 