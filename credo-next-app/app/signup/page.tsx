'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const [debugInfo, setDebugInfo] = useState<any>(null);

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
      // Basic validation
      if (!label.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        throw new Error('All fields are required');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Password strength validation
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Register the tenant with label, email and password
      const newTenantId = await register({
        label,
        email,
        password
      });
      
      // Save the tenant ID to display
      setTenantId(newTenantId);
      setIsRegistered(true);
      
    } catch (error: any) {
      setError(error.message || 'Failed to register tenant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tenantId);
    alert('Tenant ID copied to clipboard!');
  };

  const goToLogin = () => {
    router.push('/login');
  };

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

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <svg 
              className="mx-auto h-12 w-12 text-green-500" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
            <h2 className="mt-6 text-3xl font-bold text-slate-700">Registration Successful!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your wallet has been created. Make sure to save your tenant ID.
            </p>
          </div>
          
          <div className="mt-8">
            <div className="flex items-center justify-between p-4 bg-slate-100 rounded-md">
              <span className="text-sm font-medium text-slate-700 break-all">{tenantId}</span>
              <button
                onClick={copyToClipboard}
                className="ml-2 p-2 text-slate-500 hover:text-slate-700 transition-colors duration-200"
                title="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              This is your unique tenant ID. You'll need it to log in if you ever lose your session.
            </p>
              </div>
          
          <div className="mt-8">
            <button
              onClick={goToLogin}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-slate-700">Create a new wallet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Already have a wallet?{' '}
            <Link href="/login" className="font-medium text-slate-700 hover:text-slate-900">
              Sign in
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-700 p-4 mb-4">
            <p className="text-rose-700">{error}</p>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="wallet-label" className="block text-sm font-medium text-slate-700 mb-1">
                Wallet Label
              </label>
              <input
                id="wallet-label"
                name="label"
                type="text"
                required
                className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                placeholder="Enter a name for your wallet"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">This name will be used to identify your wallet.</p>
            </div>
            
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
          </div>
          
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Password must be at least 6 characters long.</p>
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-md focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
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
                  Creating wallet...
                </>
              ) : (
                'Create wallet'
              )}
            </button>
          </div>
        </form>
        
        <DebugInfo />
      </div>
    </div>
  );
} 