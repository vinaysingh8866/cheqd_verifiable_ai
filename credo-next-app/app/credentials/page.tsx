'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { credentialApi, credentialDefinitionApi, connectionApi, schemaApi } from '../../lib/api';

interface Credential {
  id: string;
  state: string;
  createdAt: string;
  connectionId: string;
  credentialDefinitionId?: string;
}

interface Connection {
  id: string;
  state: string;
  role: string;
  theirLabel?: string;
  createdAt: string;
}

interface CredentialDefinition {
  id: string;
  credentialDefinitionId: string;
  createdAt?: string;
  schemaId?: string;
}

export default function CredentialsPage() {
  const { tenantId } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Issue credential states
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [credentialDefinitions, setCredentialDefinitions] = useState<CredentialDefinition[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [selectedCredDefId, setSelectedCredDefId] = useState<string>('');
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [schemaAttributes, setSchemaAttributes] = useState<string[]>([]);
  const [isIssuing, setIsIssuing] = useState<boolean>(false);
  const [issueSuccess, setIssueSuccess] = useState<boolean>(false);

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

  const fetchConnections = async () => {
    if (!tenantId) return;
    
    try {
      const response = await connectionApi.getAll(
        'demo-wallet-id', 
        'demo-wallet-key', 
        tenantId
      );
      // Filter for active connections
      setConnections(response.connections?.filter(
        (conn: Connection) => conn.state === 'completed'
      ) || []);
    } catch (err: any) {
      console.error('Error fetching connections:', err);
      setError(err.message || 'Failed to fetch connections');
    }
  };

  const fetchCredentialDefinitions = async () => {
    if (!tenantId) return;
    
    try {
      const response = await credentialDefinitionApi.getAll(tenantId);
      setCredentialDefinitions(response.credentialDefinitions || []);
    } catch (err: any) {
      console.error('Error fetching credential definitions:', err);
      setError(err.message || 'Failed to fetch credential definitions');
    }
  };

  const openIssueModal = async () => {
    if (!tenantId) return;
    
    setError(null);
    setIssueSuccess(false);
    setSelectedConnectionId('');
    setSelectedCredDefId('');
    setAttributes({});
    setSchemaAttributes([]);
    
    await Promise.all([
      fetchConnections(),
      fetchCredentialDefinitions()
    ]);
    
    setShowIssueModal(true);
  };

  const closeIssueModal = () => {
    setShowIssueModal(false);
    setSelectedConnectionId('');
    setSelectedCredDefId('');
    setAttributes({});
    setSchemaAttributes([]);
  };

  const handleCredDefChange = async (credDefId: string) => {
    if (!tenantId || !credDefId) {
      setSchemaAttributes([]);
      setAttributes({});
      return;
    }
    
    setSelectedCredDefId(credDefId);
    setError(null);
    
    try {
      console.log(`Fetching credential definition: ${credDefId}`);
      const credDefResponse = await credentialDefinitionApi.getById(credDefId, tenantId);
      console.log('Credential definition response:', credDefResponse);
      
      if (!credDefResponse || !credDefResponse.credentialDefinition || !credDefResponse.schemaId) {
        console.error('Invalid credential definition response:', credDefResponse);
        setError('Could not retrieve schema information from credential definition');
        return;
      }
      
      const schemaId = credDefResponse.schemaId;
      console.log(`Fetching schema: ${schemaId}`);
      
      try {
        const schemaData = await schemaApi.getBySchemaId(schemaId, tenantId);
        console.log('Schema data:', schemaData);
        
        if (schemaData.success && schemaData.schema) {
          const attrNames = schemaData.schema.schema.attrNames || [];
          console.log('Schema attributes:', attrNames);
          setSchemaAttributes(attrNames);
          
          // Initialize attributes with empty values
          const newAttributes: Record<string, string> = {};
          attrNames.forEach((attr: string) => {
            newAttributes[attr] = '';
          });
          
          setAttributes(newAttributes);
        } else {
          console.error('Schema data error:', schemaData);
          setError(`Could not retrieve schema attributes: ${schemaData.message || 'Unknown error'}`);
        }
      } catch (schemaErr: any) {
        console.error(`Error fetching schema with ID ${schemaId}:`, schemaErr);
        setError(`Failed to fetch schema: ${schemaErr.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error(`Error fetching credential definition ${credDefId}:`, err);
      setError(`Failed to fetch credential definition: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAttributeChange = (attr: string, value: string) => {
    setAttributes(prev => ({
      ...prev,
      [attr]: value
    }));
  };

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId || !selectedConnectionId || !selectedCredDefId) {
      setError('Connection and credential definition are required');
      return;
    }
    
    setIsIssuing(true);
    setError(null);
    
    try {
      await credentialApi.issue(
        tenantId,
        selectedConnectionId,
        selectedCredDefId,
        attributes
      );
      
      setIssueSuccess(true);
      
      // Refresh credentials list
      const response = await credentialApi.getAll(
        'demo-wallet-id', 
        'demo-wallet-key', 
        tenantId
      );
      
      setCredentials(response.credentials || []);
      
      // Close modal after short delay
      setTimeout(() => {
        closeIssueModal();
      }, 1500);
    } catch (err: any) {
      console.error('Error issuing credential:', err);
      setError(err.message || 'Failed to issue credential');
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Credentials</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={openIssueModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
          >
            Issue Credential
          </button>
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

      {/* Issue Credential Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Issue New Credential</h2>
            
            {issueSuccess ? (
              <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 mb-4">
                <p>Credential issued successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleIssueCredential}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection
                  </label>
                  <select
                    value={selectedConnectionId}
                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Connection</option>
                    {connections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.theirLabel || 'Unknown'} ({conn.id.substring(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credential Definition
                  </label>
                  <select
                    value={selectedCredDefId}
                    onChange={(e) => handleCredDefChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Credential Definition</option>
                    {credentialDefinitions.map((credDef) => (
                      <option key={credDef.id} value={credDef.credentialDefinitionId}>
                        {credDef.credentialDefinitionId}...
                      </option>
                    ))}
                  </select>
                </div>
                
                {schemaAttributes.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Credential Attributes
                    </h3>
                    
                    {schemaAttributes.map((attr) => (
                      <div key={attr} className="mb-2">
                        <label className="block text-sm text-gray-600 mb-1">
                          {attr}
                        </label>
                        <input
                          type="text"
                          value={attributes[attr] || ''}
                          onChange={(e) => handleAttributeChange(attr, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-end mt-6 space-x-2">
                  <button
                    type="button"
                    onClick={closeIssueModal}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isIssuing || !selectedConnectionId || !selectedCredDefId || schemaAttributes.length === 0}
                    className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
                      isIssuing || !selectedConnectionId || !selectedCredDefId || schemaAttributes.length === 0
                        ? 'bg-blue-300'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isIssuing ? 'Issuing...' : 'Issue Credential'}
                  </button>
                </div>
                
                {error && (
                  <div className="mt-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
                    <p>{error}</p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 