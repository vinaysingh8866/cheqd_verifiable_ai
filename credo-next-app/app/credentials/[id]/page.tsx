'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getCredentialDetails } from '../../utils/api';
import Link from 'next/link';
import Image from 'next/image';
import InvitationQRCode from '../../components/InvitationQRCode';

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

export default function CredentialDetailsPage() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const credentialId = params.id as string;
  const tenantId = searchParams.get('tenantId') || '';
  
  const [credential, setCredential] = useState<CredentialDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  
  useEffect(() => {
    const fetchCredentialDetails = async () => {
      if (!credentialId || !tenantId) {
        setError('Credential ID and Tenant ID are required');
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await getCredentialDetails(credentialId, tenantId);
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
  }, [credentialId, tenantId]);
  
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
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center p-8">
          <div className="h-10 w-10 border-4 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 mb-6">
          <p className="text-rose-700">{error}</p>
          <Link href="/verified-ai" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Verified AI
          </Link>
        </div>
      </div>
    );
  }
  
  if (!credential) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <p className="text-amber-700">Credential not found</p>
          <Link href="/verified-ai" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Verified AI
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {credential.attributes.name || credential.attributes.ai_name || 'AI Credential Details'}
          </h1>
          <p className="text-gray-500 mt-1">Verified AI Credential</p>
        </div>
        <Link href="/verified-ai" className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded text-slate-700">
          Back to Verified AI
        </Link>
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Credential Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Credential Information</h2>
            
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
              <h2 className="text-xl font-semibold text-gray-700 mb-4">AI Description</h2>
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
                <div>
                  <p className="text-gray-500 mb-1">Connection ID</p>
                  <p className="font-mono text-xs break-all">{credential.connectionId}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Sidebar Info */}
        <div>
          {/* Icon/Logo Section */}
          {credential.iconUrl && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
              <div className="w-32 h-32 mx-auto mb-4 relative">
                <Image
                  src={credential.iconUrl}
                  alt="AI Icon"
                  fill
                  className="object-contain"
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <h3 className="font-medium text-lg text-gray-800">
                {credential.attributes.name || credential.attributes.ai_name || 'AI Agent'}
              </h3>
            </div>
          )}
          
          {/* Connection Information */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Connection Information</h3>
            
            <p className="text-gray-600 mb-4">
              To connect with this AI system and verify its credentials, please use the connection options on the Verified AI page.
            </p>
            
            <Link
              href="/verified-ai"
              className="w-full block text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Go to Connection Options
            </Link>
            
            {/* Show invitation QR code if directly available in this credential */}
            {credential.invitationUrl && credential.invitationUrl !== MAIN_AGENT_INVITATION_URL && (
              <div className="mt-6">
                <p className="font-medium text-gray-700 mb-2">Direct Invitation:</p>
                <InvitationQRCode 
                  invitationUrl={credential.invitationUrl}
                  title="Connect directly with this AI"
                />
              </div>
            )}
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
    </div>
  );
} 