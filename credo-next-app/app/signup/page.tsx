'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredTenantId, setRegisteredTenantId] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const { register, login } = useAuth();
  const router = useRouter();

  // Debug state
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Prevent form resubmission on page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLoading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setDebugInfo(null);

    try {
      // Simple validation
      if (!label.trim()) {
        throw new Error('Tenant label is required');
      }

      // Show a more detailed message about waiting for tenant creation
      console.log('Creating tenant, please wait...');
      
      // Register the tenant, but don't auto-login
      const tenantId = await register(label, false);
      console.log(`Tenant created successfully with ID: ${tenantId}`);
      
      // Store debug info
      setDebugInfo({
        receivedTenantId: tenantId,
        timestamp: new Date().toISOString()
      });
      
      // Ensure we have a valid tenant ID before showing the success screen
      if (!tenantId) {
        throw new Error('Registration completed but no tenant ID was returned');
      }

      // Show the tenant ID to the user
      setRegisteredTenantId(tenantId);
      
      // Double-check to ensure state was updated
      console.log(`Set registeredTenantId to: ${tenantId}`);
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      setError(error.message || 'Failed to create tenant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (registeredTenantId) {
      navigator.clipboard.writeText(registeredTenantId)
        .then(() => {
          setCopiedToClipboard(true);
          setTimeout(() => setCopiedToClipboard(false), 3000); // Reset after 3 seconds
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          setError('Failed to copy to clipboard. Please try again or copy manually.');
        });
    }
  };

  const handleProceedToLogin = () => {
    if (registeredTenantId) {
      setIsLoading(true);
      login(registeredTenantId);
    }
  };

  // Debug display - helps troubleshoot issues with the registration process
  const DebugInfo = () => {
    if (!debugInfo) return null;
    
    return (
      <div className="mt-4 p-3 bg-slate-100 rounded-md text-xs">
        <h4 className="font-semibold">Debug Info:</h4>
        <pre className="mt-1 overflow-auto max-h-24">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    );
  };

  // Show the registration form if no tenant has been registered yet
  if (!registeredTenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-slate-700">Create new tenant</h2>
            <p className="mt-2 text-sm text-slate-600">
              Or{' '}
              <Link href="/login" className="font-medium text-slate-700 hover:text-slate-900">
                sign in to an existing tenant
              </Link>
            </p>
          </div>
          
          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-700 p-4 mb-4">
              <p className="text-rose-700">{error}</p>
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm">
              <div>
                <label htmlFor="tenant-label" className="block text-sm font-medium text-slate-700 mb-1">
                  Tenant Label
                </label>
                <input
                  id="tenant-label"
                  name="tenant-label"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500 focus:z-10 sm:text-sm"
                  placeholder="My Organization"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-slate-500">This label will identify your tenant in the system</p>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200`}
              >
                {isLoading ? (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <svg className="animate-spin h-5 w-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                    Creating Tenant...
                  </>
                ) : (
                  'Create Tenant'
                )}
              </button>
            </div>
            
            {isLoading && (
              <div className="text-center text-sm text-slate-600 animate-pulse">
                <p>Creating your tenant environment...</p>
                <p className="text-xs mt-1">This may take a few seconds</p>
              </div>
            )}
          </form>
          
          <DebugInfo />
        </div>
      </div>
    );
  }

  // Show the tenant ID and options if registration was successful
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-700">Tenant Created Successfully!</h2>
          <p className="mt-2 text-sm text-slate-600">
            Please save your tenant ID. You'll need it to log in to your environment.
          </p>
        </div>
        
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-700 p-4 mb-4">
            <p className="text-rose-700">{error}</p>
          </div>
        )}
        
        <div className="mt-4">
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-slate-500">Your Tenant ID:</p>
              <span className={`text-xs px-2 py-0.5 rounded ${copiedToClipboard ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                {copiedToClipboard ? 'Copied!' : 'Click button below to copy'}
              </span>
            </div>
            <p className="font-mono text-sm break-all bg-white p-2 border border-slate-200 rounded">{registeredTenantId}</p>
            <p className="mt-2 text-xs text-amber-600">
              <svg className="inline-block h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Important: Store this ID securely. You cannot recover it if lost.
            </p>
          </div>
          
          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={handleCopyToClipboard}
              className="w-full flex justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copiedToClipboard ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
            </button>
            
            <button
              onClick={handleProceedToLogin}
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                "I've Saved It, Proceed to Login"
              )}
            </button>
            
            <Link href="/login" className="text-center text-sm text-slate-600 hover:text-slate-900 mt-2">
              I'll Login Later
            </Link>
          </div>
        </div>
        
        <DebugInfo />
      </div>
    </div>
  );
} 