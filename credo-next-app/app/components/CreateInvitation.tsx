'use client';

import React, { useState } from 'react';
import { createInvitation } from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';

type Invitation = {
  invitationId: string;
  invitationUrl: string;
  invitation: Record<string, any>;
};

interface CreateInvitationProps {
  tenantId: string;
}

export default function CreateInvitation({ tenantId }: CreateInvitationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showDebug, setShowDebug] = useState(false);


  const MAIN_WALLET_ID = process.env.MAIN_WALLET_ID || 'credo-main-wallet';
  const MAIN_WALLET_KEY = process.env.MAIN_WALLET_KEY || 'credo-main-wallet-key';

  const handleCreateInvitation = async () => {
    if (!tenantId) {
      setError('Tenant ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result:any = await createInvitation(tenantId, MAIN_WALLET_ID, MAIN_WALLET_KEY);
      
      if (result.success && result.invitation) {
        setInvitation(result.invitation);
        setShowQR(true);
        

        console.log('Created invitation:', result);
      } else {
        throw new Error(result.message || 'Failed to create invitation');
      }
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      setError(err.message || 'Failed to create invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (invitation?.invitationUrl) {
      navigator.clipboard.writeText(invitation.invitationUrl)
        .then(() => {
          alert('Invitation URL copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy invitation URL:', err);
          setError('Failed to copy invitation URL');
        });
    }
  };

  const resetInvitation = () => {
    setInvitation(null);
    setShowQR(false);
    setShowDebug(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-slate-700 mb-4">Create Connection Invitation</h2>
      
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 mb-4">
          <p className="text-rose-700">{error}</p>
        </div>
      )}

      {!invitation ? (
        <div className="space-y-4">
          <button
            onClick={handleCreateInvitation}
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isLoading ? 'bg-slate-400' : 'bg-slate-700 hover:bg-slate-800'
            } transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500`}
          >
            {isLoading ? 'Creating...' : 'Create Invitation'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-center">
            {showQR && (
              <div className="border p-4 bg-white rounded-lg">
                <QRCodeSVG value={invitation.invitationUrl} size={200} />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Invitation URL:</p>
            <div className="bg-slate-50 p-3 border border-slate-300 rounded-md overflow-hidden">
              <p className="font-mono text-xs text-black break-all mb-2">{invitation.invitationUrl}</p>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyUrl}
                  className="bg-slate-200 text-slate-700 px-3 py-1 text-xs rounded hover:bg-slate-300 flex-shrink-0"
                >
                  Copy URL
                </button>
                <a 
                  href={invitation.invitationUrl} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-3 py-1 text-xs rounded hover:bg-blue-700 flex-shrink-0"
                >
                  Open URL
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={resetInvitation}
              className="flex-1 py-2 px-4 border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 transition duration-150"
            >
              Create New
            </button>
            <button 
              onClick={() => setShowQR(!showQR)}
              className="flex-1 py-2 px-4 bg-slate-700 rounded-md text-white hover:bg-slate-800 transition duration-150"
            >
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </button>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-slate-500">
              Invitation ID: <span className="font-mono">{invitation.invitationId}</span>
            </p>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-slate-500 underline mt-2"
            >
              {showDebug ? 'Hide Details' : 'Show Technical Details'}
            </button>
            
            {showDebug && (
              <div className="mt-2 p-3 bg-gray-100 rounded-md overflow-auto">
                <h4 className="text-xs font-semibold text-black mb-1">Raw Invitation Data:</h4>
                <pre className="text-xs text-black overflow-auto max-h-40 font-mono">
                  {JSON.stringify(invitation.invitation, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 