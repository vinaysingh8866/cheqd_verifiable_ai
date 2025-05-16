'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { apiGet, apiPost } from './utils/api';
import { receiveInvitation } from './utils/api';
import CreateInvitation from './components/CreateInvitation';
import InvitationQRCode from './components/InvitationQRCode';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VerifiedAICredentials from './components/VerifiedAICredentials';

// Main Agent Invitation URL
const MAIN_AGENT_INVITATION_URL = "http://147.182.218.241:3001?oob=eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMS4xL2ludml0YXRpb24iLCJAaWQiOiJlMzRjMmRhOS1lZWUzLTQwNTYtOThlYS1kZWU4NGQ5Mzc2MTAiLCJsYWJlbCI6IkFESkEiLCJhY2NlcHQiOlsiZGlkY29tbS9haXAxIiwiZGlkY29tbS9haXAyO2Vudj1yZmMxOSJdLCJoYW5kc2hha2VfcHJvdG9jb2xzIjpbImh0dHBzOi8vZGlkY29tbS5vcmcvZGlkZXhjaGFuZ2UvMS4xIiwiaHR0cHM6Ly9kaWRjb21tLm9yZy9jb25uZWN0aW9ucy8xLjAiXSwic2VydmljZXMiOlt7ImlkIjoiI2lubGluZS0wIiwic2VydmljZUVuZHBvaW50IjoiaHR0cDovLzE0Ny4xODIuMjE4LjI0MTozMDAxIiwidHlwZSI6ImRpZC1jb21tdW5pY2F0aW9uIiwicmVjaXBpZW50S2V5cyI6WyJkaWQ6a2V5Ono2TWtya0RpdERnazZjM0RLaHJMNnZra3pUeERxSmlidDd2azZiQjFEVHhVdUFZQiJdLCJyb3V0aW5nS2V5cyI6W119XX0";

interface IssuedCredential {
  id: number;
  credential_id: string;
  issuer_tenant_id: string;
  holder_connection_id: string;
  credential_definition_id: string;
  schema_id: string;
  attributes: any;
  created_at: string;
}

export default function HomePage() {
  const { tenantId, token, isMainAgent, mainAgentExists, setAsMainAgent, checkMainAgent, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<{ id: string; label: string } | null>(null);
  const [showSetMainAgentForm, setShowSetMainAgentForm] = useState(false);
  const [connectingToMainAgent, setConnectingToMainAgent] = useState(false);
  const [mainAgentConnectionSuccess, setMainAgentConnectionSuccess] = useState(false);
  const [invitationCopied, setInvitationCopied] = useState(false);
  const router = useRouter();

  // Function to fetch dashboard stats
  const getStats = async () => {
    if (!tenantId) return;
    
    try {
      const data = await apiPost('/api/dashboard/stats', { tenantId });
      setTenantInfo(data.tenant);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message || 'Unable to load dashboard statistics');
    }
  };

  // Function to handle setting this tenant as main agent
  const handleSetAsMainAgent = async () => {
    try {
      setIsLoading(true);
      await setAsMainAgent();
      await checkMainAgent();
      setShowSetMainAgentForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to set as main agent');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to connect with the main agent
  const handleConnectWithMainAgent = async () => {
    if (!tenantId) {
      setError('You need to be logged in to connect with the main agent');
      return;
    }
    
    try {
      setConnectingToMainAgent(true);
      setError(null);
      
      const response = await receiveInvitation(
        MAIN_AGENT_INVITATION_URL,
        'demo-wallet-id', 
        'demo-wallet-key',
        tenantId
      );
      
      console.log('Connection response:', response);
      
      setMainAgentConnectionSuccess(true);
      setTimeout(() => setMainAgentConnectionSuccess(false), 5000); // Show success message for 5 seconds
    } catch (err: any) {
      console.error('Error connecting with main agent:', err);
      setError(err.message || 'Failed to connect with main agent');
    } finally {
      setConnectingToMainAgent(false);
    }
  };

  // Function to handle copying invitation
  const handleCopyInvitation = () => {
    navigator.clipboard.writeText(MAIN_AGENT_INVITATION_URL);
    setInvitationCopied(true);
    setTimeout(() => setInvitationCopied(false), 2000);
  };

  useEffect(() => {
    // Redirect non-authenticated users to the verified-ai page
    if (!isAuthenticated) {
      router.push('/verified-ai');
      return;
    }
    
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    
    // Load data
    Promise.all([
      getStats(),
      checkMainAgent()
    ]).finally(() => {
      setIsLoading(false);
    });
  }, [tenantId, token, isAuthenticated, router]);

  // Show loading spinner while redirecting or loading data
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">{!isAuthenticated ? 'Redirecting...' : 'Loading...'}</p>
      </div>
    );
  }
  
  // For authenticated users: display their dashboard
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-700 mb-6">Verifiable AI Platform</h1>
      
      {/* Connect with Main Agent Card - Only for authenticated non-main agents */}
      {!isMainAgent && mainAgentExists && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Connect with Main Agent</h2>
          <p className="text-gray-600 mb-4">
            Connect with the main agent to receive credentials for your AI systems.
          </p>
          
          {mainAgentConnectionSuccess ? (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <p className="text-green-700 font-medium">
                Successfully connected with main agent! Check your connections page to view and manage this connection.
              </p>
            </div>
          ) : null}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <button 
                onClick={handleConnectWithMainAgent} 
                disabled={connectingToMainAgent}
                className={`flex items-center rounded-md px-4 py-2 text-white ${
                  connectingToMainAgent 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {connectingToMainAgent ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 105.656-5.656l-1.1-1.1" />
                    </svg>
                    Connect with Main Agent
                  </>
                )}
              </button>
              <p className="text-gray-500 text-sm mt-2">
                Click the button above to establish a secure connection with the main agent, allowing you to 
                request and receive credentials for your AI systems.
              </p>
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-2">Benefits of connecting:</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Receive verifiable credentials for your AI systems
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Establish trust between your organization and the main agent
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Participate in the verifiable AI ecosystem
                  </li>
                </ul>
              </div>
            </div>
            
            <div>
              <InvitationQRCode 
                invitationUrl={MAIN_AGENT_INVITATION_URL} 
                title="Main Agent Invitation"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Main Agent Setup Panel - shown only if no main agent exists */}
      {!mainAgentExists && !isMainAgent && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded mb-6">
          <h2 className="text-xl font-semibold text-amber-800 mb-2">Main Agent Not Configured</h2>
          <p className="mb-4 text-amber-700">
            No main agent has been configured for this system. The main agent has administrative privileges to create schemas and credential definitions.
          </p>
          
          {showSetMainAgentForm ? (
            <div>
              <p className="mb-4 font-semibold">Would you like to set this tenant as the main agent?</p>
              <div className="flex space-x-3">
                <button 
                  onClick={handleSetAsMainAgent}
                  className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Yes, Make This Tenant the Main Agent'}
                </button>
                <button 
                  onClick={() => setShowSetMainAgentForm(false)}
                  className="bg-slate-500 text-white px-4 py-2 rounded hover:bg-slate-600 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowSetMainAgentForm(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition-colors"
            >
              Configure Main Agent
            </button>
          )}
        </div>
      )}
      
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 mb-6">
          <p className="text-rose-700">{error}</p>
        </div>
      )}
      
      {/* Verified AI Credentials Preview */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-700">Available Verified AI</h2>
          <Link href="/verified-ai" className="text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        
        <VerifiedAICredentials />
      </div>
      
      {/* Quick Links Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link href="/connections" className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-500 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-slate-600">Manage Connections</h3>
          <p className="text-sm text-slate-500 mt-1">Connect with other agents and services</p>
        </Link>
        
        <Link href="/credentials" className="bg-white p-5 rounded-lg shadow border-l-4 border-green-500 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-slate-600">View Your Credentials</h3>
          <p className="text-sm text-slate-500 mt-1">See all credentials in your wallet</p>
        </Link>
        
        {isMainAgent && (
          <Link href="/schemas" className="bg-white p-5 rounded-lg shadow border-l-4 border-amber-500 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-slate-600">Create Schemas</h3>
            <p className="text-sm text-slate-500 mt-1">Define new credential types</p>
          </Link>
        )}
      </div>
    </div>
  );
} 