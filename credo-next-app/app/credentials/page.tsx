'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { credentialApi } from '../../lib/api';

interface Credential {
  id: string;
  state: string;
  createdAt: string;
  connectionId: string;
  credentialDefinitionId?: string;
}

export default function CredentialsPage() {
  const { tenantId } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      if (!tenantId) return;
      
      setLoading(true);
      try {


        const response = await credentialApi.getAll(
          'demo-wallet-id', 
          'demo-wallet-key', 
          tenantId
        );
        setCredentials(response.credentials || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching credentials:', err);
        setError(err.message || 'Failed to fetch credentials');
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [tenantId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Credentials</h1>
        <div>
          <p className="text-sm text-gray-500">
            To issue credentials, you'll need to create schemas and credential definitions first.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : credentials.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Connection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credential Definition</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {credentials.map((credential) => (
                <tr key={credential.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-sm">{credential.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{credential.state}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(credential.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-sm">{credential.connectionId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-sm">{credential.credentialDefinitionId || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-8 text-center rounded-lg shadow">
          <p className="text-gray-500">No credentials found. You can issue or receive credentials after creating connections.</p>
        </div>
      )}
    </div>
  );
} 