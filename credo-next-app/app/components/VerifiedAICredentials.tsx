'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import InvitationQRCode from './InvitationQRCode';
import CredentialDetailsModal from './CredentialDetailsModal';

// Add MAIN_AGENT_INVITATION_URL constant
const MAIN_AGENT_INVITATION_URL = "http://147.182.218.241:3001?oob=eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMS4xL2ludml0YXRpb24iLCJAaWQiOiJlMzRjMmRhOS1lZWUzLTQwNTYtOThlYS1kZWU4NGQ5Mzc2MTAiLCJsYWJlbCI6IkFESkEiLCJhY2NlcHQiOlsiZGlkY29tbS9haXAxIiwiZGlkY29tbS9haXAyO2Vudj1yZmMxOSJdLCJoYW5kc2hha2VfcHJvdG9jb2xzIjpbImh0dHBzOi8vZGlkY29tbS5vcmcvZGlkZXhjaGFuZ2UvMS4xIiwiaHR0cHM6Ly9kaWRjb21tLm9yZy9jb25uZWN0aW9ucy8xLjAiXSwic2VydmljZXMiOlt7ImlkIjoiI2lubGluZS0wIiwic2VydmljZUVuZHBvaW50IjoiaHR0cDovLzE0Ny4xODIuMjE4LjI0MTozMDAxIiwidHlwZSI6ImRpZC1jb21tdW5pY2F0aW9uIiwicmVjaXBpZW50S2V5cyI6WyJkaWQ6a2V5Ono2TWtya0RpdERnazZjM0RLaHJMNnZra3pUeERxSmlidDd2azZiQjFEVHhVdUFZQiJdLCJyb3V0aW5nS2V5cyI6W119XX0";

interface VerifiedAICredential {
  id: number;
  credential_id: string;
  issuer_tenant_id: string;
  credential_definition_id: string;
  schema_id: string;
  attributes: any;
  created_at: string;
}

const VerifiedAICredentials: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [credentials, setCredentials] = useState<VerifiedAICredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<{id: string, tenantId: string} | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setIsLoading(true);
        const response = await apiGet('/api/dashboard/verified-ai-credentials');
        if (response.success) {
          setCredentials(response.credentials);
        } else {
          setError(response.message || 'Failed to load AI credentials');
        }
      } catch (err: any) {
        console.error('Error fetching verified AI credentials:', err);
        // Don't show error messages for auth issues when not logged in
        if (isAuthenticated || err.message !== 'Unauthorized') {
          setError(err.message || 'An error occurred while fetching AI credentials');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredentials();
    
    // Only set up refresh interval if authenticated
    if (isAuthenticated) {
      const intervalId = setInterval(fetchCredentials, 30000);
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const extractSchemaName = (schemaId: string) => {
    const parts = schemaId.split(':');
    return parts.length >= 4 ? parts[parts.length - 2] : schemaId;
  };
  
  const openCredentialModal = (credentialId: string, tenantId: string) => {
    setSelectedCredential({ id: credentialId, tenantId });
    setShowModal(true);
  };
  
  const closeCredentialModal = () => {
    setShowModal(false);
    setSelectedCredential(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="h-10 w-10 border-4 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-l-4 border-rose-600 p-4 mb-6">
        <p className="text-rose-700">{error}</p>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-slate-600 mb-4">No verified AI credentials found.</p>
        {isAuthenticated ? (
          <Link href="/credentials" className="text-blue-600 hover:underline">
            Issue your first credential →
          </Link>
        ) : (
          <div className="mt-4">
            <p>Want to issue your own AI credentials?</p>
            <div className="mt-3 space-x-3">
              <Link href="/login" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="inline-block bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="py-3 px-4 text-left">AI Name</th>
              <th className="py-3 px-4 text-left">Schema</th>
              <th className="py-3 px-4 text-left">Capabilities</th>
              <th className="py-3 px-4 text-left">Verified On</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {credentials.map((credential) => (
              <tr key={credential.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-semibold">
                  {credential.attributes.name || credential.attributes.ai_name || 'AI Agent'}
                </td>
                <td className="py-3 px-4">{extractSchemaName(credential.schema_id)}</td>
                <td className="py-3 px-4">
                  {Object.entries(credential.attributes)
                    .filter(([key]) => !['name', 'ai_name'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-semibold">{key}:</span> {value as string}
                      </div>
                    ))}
                </td>
                <td className="py-3 px-4 text-sm">{formatDate(credential.created_at)}</td>
                <td className="py-3 px-4">
                  {isAuthenticated ? (
                    <Link 
                      href={`/credentials/${credential.credential_id}?tenantId=${credential.issuer_tenant_id}`}
                      className="text-blue-600 hover:underline text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </Link>
                  ) : (
                    <button 
                      onClick={() => openCredentialModal(credential.credential_id, credential.issuer_tenant_id)}
                      className="text-blue-600 hover:underline text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Credential Details Modal */}
      {selectedCredential && (
        <CredentialDetailsModal
          credentialId={selectedCredential.id}
          tenantId={selectedCredential.tenantId}
          isOpen={showModal}
          onClose={closeCredentialModal}
        />
      )}
    </>
  );
};

export default VerifiedAICredentials; 