'use client';

import React, { useState } from 'react';
import VerifiedAICredentials from '../components/VerifiedAICredentials';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import InvitationQRCode from '../components/InvitationQRCode';

// Add MAIN_AGENT_INVITATION_URL constant
const MAIN_AGENT_INVITATION_URL = "http://147.182.218.241:3001?oob=eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMS4xL2ludml0YXRpb24iLCJAaWQiOiJlMzRjMmRhOS1lZWUzLTQwNTYtOThlYS1kZWU4NGQ5Mzc2MTAiLCJsYWJlbCI6IkFESkEiLCJhY2NlcHQiOlsiZGlkY29tbS9haXAxIiwiZGlkY29tbS9haXAyO2Vudj1yZmMxOSJdLCJoYW5kc2hha2VfcHJvdG9jb2xzIjpbImh0dHBzOi8vZGlkY29tbS5vcmcvZGlkZXhjaGFuZ2UvMS4xIiwiaHR0cHM6Ly9kaWRjb21tLm9yZy9jb25uZWN0aW9ucy8xLjAiXSwic2VydmljZXMiOlt7ImlkIjoiI2lubGluZS0wIiwic2VydmljZUVuZHBvaW50IjoiaHR0cDovLzE0Ny4xODIuMjE4LjI0MTozMDAxIiwidHlwZSI6ImRpZC1jb21tdW5pY2F0aW9uIiwicmVjaXBpZW50S2V5cyI6WyJkaWQ6a2V5Ono2TWtya0RpdERnazZjM0RLaHJMNnZra3pUeERxSmlidDd2azZiQjFEVHhVdUFZQiJdLCJyb3V0aW5nS2V5cyI6W119XX0";

export default function VerifiedAIPage() {
  const { isAuthenticated } = useAuth();
  const [invitationCopied, setInvitationCopied] = useState(false);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [showFullInvitation, setShowFullInvitation] = useState(false);
  
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

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-700 mb-6">Verified AI Platform</h1>
      
      {/* Welcome Panel */}

      {/* Request Connection Section - as Collapsible Dropdown */}
      <div className="mb-8 bg-white rounded-lg shadow-md relative">
        {!showConnectionDetails && (
          <div className="absolute inset-0 pointer-events-none rounded-lg bg-blue-50 bg-opacity-0 pulse-animation"></div>
        )}
        <style jsx>{`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.2); }
            70% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          }
          .pulse-animation {
            animation: pulse 2s infinite;
          }
        `}</style>
        <button 
          onClick={() => setShowConnectionDetails(!showConnectionDetails)}
          className={`w-full p-6 flex justify-between items-center focus:outline-none transition-colors relative
            ${showConnectionDetails ? 'hover:bg-gray-50' : 'bg-gradient-to-r from-blue-50 to-white hover:from-blue-100'}`}
          aria-expanded={showConnectionDetails}
        >
          <div className="flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 mr-3 text-blue-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 105.656-5.656l-1.1-1.1" />
            </svg>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Connect with Verified AI Platform</h3>
              {!showConnectionDetails && (
                <p className="text-sm text-gray-500 mt-1">Click to see connection options</p>
              )}
            </div>
          </div>
          <div className="flex items-center text-gray-500">
            <span className="mr-2 text-sm font-medium">{showConnectionDetails ? 'Collapse' : 'Expand'}</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-6 w-6 transition-transform duration-200 ${showConnectionDetails ? 'transform rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showConnectionDetails ? 'max-h-[2000px] border-t border-gray-100' : 'max-h-0'
          }`}
        >
          <div className="p-6">
            <div className="grid grid-cols-1 gap-8">
              {/* QR Code Section - now shown for both mobile and desktop */}
              <div className="text-center">
                <h4 className="font-semibold text-gray-700 mb-3">Scan QR Code to Connect</h4>
                <InvitationQRCode 
                  invitationUrl={MAIN_AGENT_INVITATION_URL} 
                  title="Main Agent Connection"
                  showCopyButton={false}
                />
              </div>
              
              <div>
                <p className="text-gray-600 mb-4">
                  To access verified AI credentials and establish a connection with AI systems, you'll need to:
                </p>
                
                <ol className="list-decimal list-inside space-y-3 text-gray-700 mb-4">
                  <li>Copy the invitation link below</li>
                  <li>Email your request to <span className="font-semibold">vinay@ajna.dev</span> with your details</li>
                  <li>Wait for approval and follow the connection instructions</li>
                </ol>
                
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
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleCopyInvitation}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    {invitationCopied ? 'Copied!' : 'Copy Invitation'}
                  </button>
                  
                  <a 
                    href={`mailto:vinay@ajna.dev?subject=Verified%20AI%20Connection%20Request&body=Hello%2C%0A%0AI'd%20like%20to%20request%20a%20connection%20to%20the%20Verified%20AI%20platform.%0A%0AName%3A%20%0AOrganization%3A%20%0AContact%20Information%3A%20%0AUse%20Case%3A%20%0A%0AInvitation%20Link%3A%20${encodeURIComponent(MAIN_AGENT_INVITATION_URL)}%0A%0AThank%20you%2C%0A`} 
                    className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-200 transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Open Pre-filled Email
                  </a>
                </div>
                
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-6">
                  <h4 className="font-semibold text-amber-800 mb-1">What happens next?</h4>
                  <p className="text-amber-700 text-sm">
                    After your request is approved, you'll be able to establish secure connections with verified AI systems 
                    and access their credentials through your digital wallet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* How to Use Panel - for non-logged in users */}
      {!isAuthenticated && (
        <div className="mb-8 bg-indigo-50 p-6 rounded-lg shadow border-l-4 border-indigo-500">
          <h3 className="text-xl font-semibold text-indigo-800 mb-3">How to Access Credentials</h3>
          <p className="text-indigo-700 mb-4">
            You don't need an account to explore and access verified AI credentials. Just follow these steps:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2">1</div>
                <h4 className="font-semibold text-gray-800">Browse Credentials</h4>
              </div>
              <p className="text-gray-600 text-sm">
                Explore the list of verified AI systems below and click on any credential to view its details.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2">2</div>
                <h4 className="font-semibold text-gray-800">Request Connection</h4>
              </div>
              <p className="text-gray-600 text-sm">
                Use the connection request section above to establish a connection with the AI verification platform.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2">3</div>
                <h4 className="font-semibold text-gray-800">Verify Credentials</h4>
              </div>
              <p className="text-gray-600 text-sm">
                Once connected, you can cryptographically verify AI credentials with your preferred digital wallet.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Verified AI Credentials List */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Available Verified AI</h2>
        <VerifiedAICredentials />
      </div>
      
      {/* Information Panel */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg shadow border-l-4 border-blue-500">
        <h3 className="text-xl font-semibold text-blue-800 mb-2">About Verified AI</h3>
        <p className="text-blue-700 mb-4">
          Verified AI credentials are issued by trusted organizations to certify AI capabilities, 
          safety measures, and compliance with standards. These credentials use verifiable 
          credential technology to ensure tamper-proof verification.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">Benefits of Verified AI</h4>
            <ul className="space-y-2 text-blue-700">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Cryptographic verification of AI capabilities
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Tamper-proof credential verification
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Transparency about AI capabilities and limitations
              </li>
            </ul>
          </div>
          
          {!isAuthenticated && (
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Want to issue your own AI credentials?</h4>
              <p className="text-blue-700 mb-3">
                Create an account to issue and manage your own verifiable AI credentials. 
                Join our trusted network of AI providers.
              </p>
              <div className="mt-2 space-x-4">
                <Link 
                  href="/login" 
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Log In
                </Link>
                <Link 
                  href="/signup" 
                  className="inline-block bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 