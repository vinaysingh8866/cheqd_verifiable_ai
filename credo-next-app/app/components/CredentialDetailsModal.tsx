'use client';

import React, { useEffect, useState } from 'react';
import { getPublicCredentialDetails } from '../utils/api';
import InvitationQRCode from './InvitationQRCode';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

// Add MAIN_AGENT_INVITATION_URL constant
const MAIN_AGENT_INVITATION_URL = "http://147.182.218.241:3001?oob=eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMS4xL2ludml0YXRpb24iLCJAaWQiOiJlMzRjMmRhOS1lZWUzLTQwNTYtOThlYS1kZWU4NGQ5Mzc2MTAiLCJsYWJlbCI6IkFESkEiLCJhY2NlcHQiOlsiZGlkY29tbS9haXAxIiwiZGlkY29tbS9haXAyO2Vudj1yZmMxOSJdLCJoYW5kc2hha2VfcHJvdG9jb2xzIjpbImh0dHBzOi8vZGlkY29tbS5vcmcvZGlkZXhjaGFuZ2UvMS4xIiwiaHR0cHM6Ly9kaWRjb21tLm9yZy9jb25uZWN0aW9ucy8xLjAiXSwic2VydmljZXMiOlt7ImlkIjoiI2lubGluZS0wIiwic2VydmljZUVuZHBvaW50IjoiaHR0cDovLzE0Ny4xODIuMjE4LjI0MTozMDAxIiwidHlwZSI6ImRpZC1jb21tdW5pY2F0aW9uIiwicmVjaXBpZW50S2V5cyI6WyJkaWQ6a2V5Ono2TWtya0RpdERnazZjM0RLaHJMNnZra3pUeERxSmlidDd2azZiQjFEVHhVdUFZQiJdLCJyb3V0aW5nS2V5cyI6W119XX0";

interface CredentialDetails {
  id: string;
  state?: string;
  createdAt: string;
  connectionId: string;
  attributes: Record<string, string>;
  invitationUrl?: string;
  iconUrl?: string;
  homepageUrl?: string;
  aiDescription?: string;
  additionalData?: any;
  issuerTenantId?: string;
  credentialDefinitionId: string;
  schemaId: string;
}

interface CredentialDetailsModalProps {
  credentialId: string;
  tenantId: string;
  onClose: () => void;
  isOpen: boolean;
}

const CredentialDetailsModal: React.FC<CredentialDetailsModalProps> = ({
  credentialId,
  tenantId,
  onClose,
  isOpen
}) => {
  const [credential, setCredential] = useState<CredentialDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [invitationCopied, setInvitationCopied] = useState(false);
  const [showFullInvitation, setShowFullInvitation] = useState(false);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchCredentialDetails = async () => {
      if (!credentialId || !tenantId) {
        setError('Credential ID and Tenant ID are required');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await getPublicCredentialDetails(credentialId, tenantId);
        if (response.success) {
          setCredential(response.credential);
        } else {
          setError(response.message || 'Failed to load credential details');
        }
      } catch (err: any) {
        console.error('Error fetching credential details:', err);
        setError(err.message || 'An error occurred while fetching credential details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCredentialDetails();
  }, [credentialId, tenantId, isOpen]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const extractSchemaName = (schemaId: string) => {
    const parts = schemaId.split(':');
    return parts.length >= 4 ? parts[parts.length - 2] : schemaId;
  };

  // Helper to check if a value is true (as string)
  const isValueTrue = (value: string) => {
    return value.toLowerCase() === 'true';
  }
  
  // Helper to format attribute name
  const formatAttributeName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  const handleCopyInvitation = () => {
    navigator.clipboard.writeText(MAIN_AGENT_INVITATION_URL);
    setInvitationCopied(true);
    setTimeout(() => setInvitationCopied(false), 2000);
  };
  
  // Helper to shorten the invitation URL
  const getShortenedInvitation = (url: string) => {
    if (!url) return '';
    
    // Extract the base part and a short portion of the encoded data
    const urlParts = url.split('?');
    if (urlParts.length !== 2) return url.substring(0, 40) + '...';
    
    return urlParts[0] + '?...' + urlParts[1].substring(urlParts[1].length - 20);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {credential?.attributes?.name || credential?.attributes?.ai_name || 'AI Credential Details'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="h-10 w-10 border-4 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border-l-4 border-rose-600 p-4 mb-6">
              <p className="text-rose-700">{error}</p>
              <button onClick={onClose} className="text-blue-600 hover:underline mt-4">
                Close
              </button>
            </div>
          ) : !credential ? (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
              <p className="text-amber-700">Credential not found</p>
              <button onClick={onClose} className="text-blue-600 hover:underline mt-4">
                Close
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Credential Information */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-xl font-semibold text-gray-700 mb-4">Credential Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Schema Type</p>
                      <p className="font-medium">{extractSchemaName(credential.schemaId)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Issued On</p>
                      <p className="font-medium">{formatDate(credential.createdAt)}</p>
                    </div>
                    {credential.state && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Status</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          credential.state === 'done' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {credential.state === 'done' ? 'Verified' : credential.state}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <hr className="my-6" />
                  
                  <h3 className="font-semibold text-gray-700 mb-4">Verified Capabilities</h3>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {Object.entries(credential.attributes)
                      .filter(([key]) => !['name', 'ai_name'].includes(key))
                      .map(([key, value]) => (
                        <div 
                          key={key} 
                          className={`px-3 py-2 rounded-full text-sm font-medium flex items-center ${
                            isValueTrue(value as string) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isValueTrue(value as string) && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {formatAttributeName(key)}
                        </div>
                      ))
                    }
                  </div>
                </div>
                
                {/* AI Description Section */}
                {credential.aiDescription && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">AI Description</h3>
                    <div className="prose max-w-none">
                      <p>{credential.aiDescription}</p>
                    </div>
                  </div>
                )}
                
                {/* Technical Details - Collapsible */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <button 
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="w-full flex items-center justify-between text-xl font-semibold text-gray-700"
                  >
                    <span>Technical Details</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-5 w-5 transition-transform duration-200 ${showTechnicalDetails ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showTechnicalDetails && (
                    <div className="space-y-3 text-sm mt-4">
                      <div>
                        <p className="text-gray-500 mb-1">Credential ID</p>
                        <div className="flex items-center">
                          <p className="font-mono text-xs break-all mr-2">{credential.id}</p>
                          <button 
                            className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded"
                            onClick={() => navigator.clipboard.writeText(credential.id)}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Credential Definition ID</p>
                        <p className="font-mono text-xs break-all">{credential.credentialDefinitionId}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Schema ID</p>
                        <p className="font-mono text-xs break-all">{credential.schemaId}</p>
                      </div>
                      {credential.issuerTenantId && (
                        <div>
                          <p className="text-gray-500 mb-1">Issuer ID</p>
                          <p className="font-mono text-xs break-all">{credential.issuerTenantId}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Column - Sidebar Info */}
              <div>
                {/* Connect to Verified AI Platform */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Connect to Verified AI Platform</h3>
                  
                  {/* Direct QR code - now at the top */}
                  <div className="mb-6 text-center">
                    <h4 className="font-medium text-gray-700 mb-3">Scan QR Code</h4>
                    <div className="bg-white p-2 inline-block rounded border border-gray-200">
                      <QRCodeSVG
                        value={MAIN_AGENT_INVITATION_URL}
                        size={180}
                        level="H"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Scan with your mobile device</p>
                  </div>
                  
                  <p className="text-gray-600 mb-4">
                    To connect and verify this AI credential, use the connection options on the Verified AI page.
                  </p>
                  
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-3">
                    <p className="font-mono text-sm break-all select-all">{showFullInvitation ? MAIN_AGENT_INVITATION_URL : getShortenedInvitation(MAIN_AGENT_INVITATION_URL)}</p>
                    <div className="mt-2 flex justify-end">
                      <button 
                        onClick={() => setShowFullInvitation(!showFullInvitation)} 
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {showFullInvitation ? 'Show Less' : 'Show Full URL'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button 
                      onClick={handleCopyInvitation}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      {invitationCopied ? 'Copied!' : 'Copy'}
                    </button>
                    
                    <Link 
                      href="/verified-ai"
                      className="flex-1 bg-indigo-100 text-indigo-700 px-3 py-2 rounded hover:bg-indigo-200 transition-colors flex items-center justify-center"
                      onClick={onClose}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 105.656-5.656l-1.1-1.1" />
                      </svg>
                      View Options
                    </Link>
                  </div>
                  
                  <a 
                    href={`mailto:vinay@ajna.dev?subject=Verified%20AI%20Access%20for%20${encodeURIComponent(credential.attributes.name || credential.attributes.ai_name || 'AI Credential')}&body=Hello%2C%0A%0AI'd%20like%20to%20request%20access%20to%20the%20${encodeURIComponent(credential.attributes.name || credential.attributes.ai_name || 'AI Credential')}%20verified%20AI%20credential.%0A%0AName%3A%20%0AOrganization%3A%20%0AContact%20Information%3A%20%0A%0AInvitation%20Link%3A%20${encodeURIComponent(MAIN_AGENT_INVITATION_URL)}%0ACredential%20ID%3A%20${credential.id}%0A%0AThank%20you%2C%0A`} 
                    className="w-full text-center block text-blue-600 hover:underline mt-2"
                  >
                    Email Request
                  </a>
                </div>
                
                {/* Links Section */}
                {credential.homepageUrl && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="font-semibold text-gray-700 mb-4">Links</h3>
                    <ul className="space-y-3">
                      <li>
                        <a 
                          href={credential.homepageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          Visit AI Homepage
                        </a>
                      </li>
                    </ul>
                  </div>
                )}
                
                {/* Verification Badge */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h3 className="font-semibold text-green-800">Verified Credential</h3>
                  </div>
                  <p className="text-sm text-green-700">
                    This credential has been cryptographically verified and is authentic.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CredentialDetailsModal; 