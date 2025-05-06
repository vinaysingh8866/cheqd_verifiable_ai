'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { credentialDefinitionApi, schemaApi } from '../../lib/api';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface CredentialDefinition {
  id: string;
  credentialDefinitionId: string;
  schemaId: string;
  issuerId: string;
  tag: string;
  type?: string;
  methodName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CredentialDefinitionResponse {
  id: string;
  credentialDefinitionId: string;
  methodName?: string;
  createdAt?: string;
  updatedAt?: string;
  credentialDefinition?: {
    issuerId: string;
    schemaId: string;
    tag: string;
    type?: string;
    value?: any;
  };
}

interface Schema {
  id: string;
  name: string;
  version: string;
  issuerId?: string;
  attributes?: string[];
  schemaId?: string;
  methodName?: string;
  _rawSchema?: any;
}

interface SchemaDetails {
  id: string;
  schemaId: string;
  methodName?: string;
  createdAt?: string;
  updatedAt?: string;
  _tags?: {
    issuerId?: string;
    methodName?: string;
    schemaId?: string;
    schemaName?: string;
    schemaVersion?: string;
  };
  schema: {
    attrNames: string[];
    issuerId: string;
    name: string;
    version: string;
  };
}

export default function CredentialDefinitionsPage() {
  const { tenantId } = useAuth();
  const [credentialDefinitions, setCredentialDefinitions] = useState<CredentialDefinition[]>([]);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [supportRevocation, setSupportRevocation] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);


  const [selectedCredDef, setSelectedCredDef] = useState<CredentialDefinition | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [schemaDetails, setSchemaDetails] = useState<SchemaDetails | null>(null);
  const [loadingSchema, setLoadingSchema] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) return;

      setLoading(true);
      try {

        const credDefResponse = await credentialDefinitionApi.getAll(tenantId);
        console.log(credDefResponse, "credDefResponse");


        let credDefs = credDefResponse.credentialDefinitions || [];


        credDefs = credDefs.map((cd: CredentialDefinitionResponse) => {

          if (cd.credentialDefinition) {
            return {
              id: cd.id || '',
              credentialDefinitionId: cd.credentialDefinitionId || '',
              schemaId: cd.credentialDefinition.schemaId || '',
              issuerId: cd.credentialDefinition.issuerId || '',
              tag: cd.credentialDefinition.tag || '',
              type: cd.credentialDefinition.type,
              methodName: cd.methodName,
              createdAt: cd.createdAt,
              updatedAt: cd.updatedAt
            };
          }


          return cd as unknown as CredentialDefinition;
        });

        setCredentialDefinitions(credDefs);


        const schemasResponse = await schemaApi.getAll(tenantId);


        const enhancedSchemas = schemasResponse.schemas || [];


        const enhancedSchemasPromises = enhancedSchemas.map(async (schema: any) => {
          try {

            const detailedSchema = await schemaApi.getById(schema.id, tenantId);
            console.log('Got detailed schema:', detailedSchema);
            
            if (detailedSchema) {
              return {
                id: schema.id,
                name: detailedSchema.schema?.name || schema.schema?.name || schema._tags?.schemaName || '',
                version: detailedSchema.schema?.version || schema.schema?.version || schema._tags?.schemaVersion || '',
                issuerId: detailedSchema.schema?.issuerId || schema.schema?.issuerId || schema._tags?.issuerId || '',
                attributes: detailedSchema.schema?.attrNames || schema.schema?.attrNames || schema.attributes || [],
                schemaId: detailedSchema.schemaId || schema.schemaId || '',
                methodName: detailedSchema.methodName || schema.methodName || schema._tags?.methodName || '',
                _rawSchema: detailedSchema // Keep original data for debugging
              };
            }
          } catch (e) {
            console.warn(`Could not fetch details for schema ${schema.id}`, e);
          }
          

          return {
            id: schema.id,
            name: schema.schema?.name || schema._tags?.schemaName || '',
            version: schema.schema?.version || schema._tags?.schemaVersion || '',
            issuerId: schema.schema?.issuerId || schema._tags?.issuerId || '',
            attributes: schema.schema?.attrNames || schema.attributes || [],
            schemaId: schema.schemaId || '',
            methodName: schema.methodName || schema._tags?.methodName || '',
            _rawSchema: schema // Keep original data for debugging
          };
        });

        const resolvedSchemas = await Promise.all(enhancedSchemasPromises);
        setSchemas(resolvedSchemas);

        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId]);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const openDetailsModal = async (credDef: CredentialDefinition) => {
    setSelectedCredDef(credDef);
    setIsDetailsOpen(true);
    console.log('credDef', credDef);
    

    if (credDef.schemaId) {
      setLoadingSchema(true);
      try {
        const schemaResponse = await schemaApi.getBySchemaId(credDef.schemaId, tenantId || '');
        console.log('Schema details response:', schemaResponse);
        
        if (schemaResponse) {

          if (schemaResponse.schema) {

            setSchemaDetails(schemaResponse.schema);
          } else if (schemaResponse.schemaId) {

            setSchemaDetails(schemaResponse);
          } else {
            console.error('Unexpected schema response format', schemaResponse);
            setSchemaDetails(null);
          }
        } else {
          console.error('Schema not found or invalid response format');
          setSchemaDetails(null);
        }
      } catch (err) {
        console.error('Error fetching schema details:', err);
        setSchemaDetails(null);
      } finally {
        setLoadingSchema(false);
      }
    }
  };

  const closeDetailsModal = () => {
    setSelectedCredDef(null);
    setIsDetailsOpen(false);
    setSchemaDetails(null);
  };

  const handleCreateCredDef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !selectedSchemaId || !tag) return;

    setCreating(true);
    setError(null);

    try {

      const selectedSchema = schemas.find(s => s.id === selectedSchemaId);
      if (!selectedSchema) {
        throw new Error('Selected schema not found');
      }

      console.log('Creating credential definition with:', {
        tenantId,
        schemaId: selectedSchemaId,
        tag,
        supportRevocation
      });

      const response = await credentialDefinitionApi.create(tenantId, selectedSchemaId, tag, supportRevocation);
      console.log('Created credential definition:', response);


      const credDefResponse = await credentialDefinitionApi.getAll(tenantId);
      console.log('Updated credential definitions:', credDefResponse);
      setCredentialDefinitions(credDefResponse.credentialDefinitions || []);


      setSelectedSchemaId('');
      setTag('');
      setSupportRevocation(false);

      closeModal();
    } catch (err: any) {
      console.error('Error creating credential definition:', err);
      setError(err.message || 'Failed to create credential definition');
    } finally {
      setCreating(false);
    }
  };


  const formatSchemaName = (schemaId: string) => {
    if (!schemaId) return 'N/A';

    const schema = schemas.find(s => s.id === schemaId);
    if (!schema) return schemaId;
    return `${schema.name} (${schema.version})`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Credential Definitions</h1>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={schemas.length === 0}
        >
          Create Credential Definition
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
        </div>
      )}

      {schemas.length === 0 && !loading && (
        <div className="mb-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
          <p>You need to create a schema first before you can create credential definitions.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : credentialDefinitions.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issuer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schema</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {credentialDefinitions.map((credDef) => (
                <tr key={credDef.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetailsModal(credDef)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-sm"
                    title={credDef.credentialDefinitionId || ''}>
                    {credDef.credentialDefinitionId
                      ? credDef.credentialDefinitionId.split('/').pop() || credDef.id
                      : credDef.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs"
                    title={credDef.issuerId || ''}>
                    {credDef.issuerId
                      ? credDef.issuerId.split(':').slice(-1)[0]
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-xs"
                    title={credDef.schemaId || ''}>
                    {formatSchemaName(credDef.schemaId || '')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{credDef.tag || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{credDef.methodName || 'kanon'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {credDef.createdAt ? new Date(credDef.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-8 text-center rounded-lg shadow">
          <p className="text-gray-500">No credential definitions found. Create your first credential definition to get started.</p>
        </div>
      )}

      {/* Create Credential Definition Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Create New Credential Definition
                  </Dialog.Title>

                  <form onSubmit={handleCreateCredDef} className="mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Schema
                      </label>
                      <select
                        value={selectedSchemaId}
                        onChange={(e) => setSelectedSchemaId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                      >
                        <option value="">Select a schema</option>
                        {schemas.map((schema) => (
                          <option key={schema.id} value={schema.id}>
                            {schema.name} (v{schema.version}) - {schema.id.substring(0, 20)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSchemaId && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Schema Details</h4>
                        {(() => {
                          const schema = schemas.find(s => s.id === selectedSchemaId);
                          if (!schema) return <p className="text-sm text-red-500">Schema not found</p>;


                          console.log('Selected schema for CredDef:', schema);
                          
                          return (
                            <div className="space-y-1">
                              <p className="text-sm text-gray-700"><span className="font-medium">ID:</span> {schema.id}</p>
                              <p className="text-sm text-gray-700"><span className="font-medium">Schema ID:</span> {schema.schemaId || 'Unknown'}</p>
                              <p className="text-sm text-gray-700"><span className="font-medium">Name:</span> {schema.name || 'Unknown'}</p>
                              <p className="text-sm text-gray-700"><span className="font-medium">Version:</span> {schema.version || 'Unknown'}</p>
                              {schema.issuerId && (
                                <p className="text-sm text-gray-700"><span className="font-medium">Issuer:</span> {schema.issuerId}</p>
                              )}
                              <p className="text-sm text-gray-700"><span className="font-medium">Method:</span> {schema.methodName || 'Unknown'}</p>
                              {schema.attributes && schema.attributes.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium text-gray-700">Attributes:</p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {schema.attributes.map((attr, index) => (
                                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{attr}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tag
                      </label>
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                        placeholder="default"
                      />
                    </div>

                    <div className="mb-4 flex items-center">
                      <input
                        type="checkbox"
                        id="supportRevocation"
                        checked={supportRevocation}
                        onChange={(e) => setSupportRevocation(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="supportRevocation" className="ml-2 block text-sm text-gray-700">
                        Support Revocation
                      </label>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        disabled={creating || !selectedSchemaId}
                      >
                        {creating ? 'Creating...' : 'Create Credential Definition'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Credential Definition Details Modal */}
      <Transition appear show={isDetailsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeDetailsModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Credential Definition Details
                  </Dialog.Title>

                  {selectedCredDef && (
                    <div>
                      <div className="mb-6 grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">ID</h4>
                          <p className="text-sm text-gray-600 break-all">{selectedCredDef.credentialDefinitionId || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Internal ID</h4>
                          <p className="text-sm text-gray-600 break-all">{selectedCredDef.id}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Issuer DID</h4>
                          <p className="text-sm text-gray-600 break-all">{selectedCredDef.issuerId || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Schema ID</h4>
                          <p className="text-sm text-gray-600 break-all">{selectedCredDef.schemaId || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Tag</h4>
                          <p className="text-sm text-gray-600">{selectedCredDef.tag || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Method</h4>
                          <p className="text-sm text-gray-600">{selectedCredDef.methodName || 'kanon'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Created</h4>
                          <p className="text-sm text-gray-600">
                            {selectedCredDef.createdAt
                              ? new Date(selectedCredDef.createdAt).toLocaleString()
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Updated</h4>
                          <p className="text-sm text-gray-600">
                            {selectedCredDef.updatedAt
                              ? new Date(selectedCredDef.updatedAt).toLocaleString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Schema Details</h4>
                        {loadingSchema ? (
                          <div className="flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            <span className="ml-2 text-sm text-gray-600">Loading schema details...</span>
                          </div>
                        ) : schemaDetails ? (
                          <div className="bg-gray-50 p-4 rounded border border-gray-200">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Schema ID</h5>
                                <p className="text-sm text-gray-700 break-all">{schemaDetails.schemaId}</p>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Internal ID</h5>
                                <p className="text-sm text-gray-700">{schemaDetails.id}</p>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Name</h5>
                                <p className="text-sm text-gray-700">{schemaDetails.schema?.name || 'N/A'}</p>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Version</h5>
                                <p className="text-sm text-gray-700">{schemaDetails.schema?.version || 'N/A'}</p>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Issuer</h5>
                                <p className="text-sm text-gray-700 break-all">{schemaDetails.schema?.issuerId || 'N/A'}</p>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Method</h5>
                                <p className="text-sm text-gray-700">{schemaDetails.methodName || 'kanon'}</p>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Created</h5>
                                <p className="text-sm text-gray-700">
                                  {schemaDetails.createdAt ? new Date(schemaDetails.createdAt).toLocaleString() : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Updated</h5>
                                <p className="text-sm text-gray-700">
                                  {schemaDetails.updatedAt ? new Date(schemaDetails.updatedAt).toLocaleString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                            
                            {schemaDetails.schema?.attrNames && schemaDetails.schema.attrNames.length > 0 && (
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-2">Attributes</h5>
                                <div className="flex flex-wrap gap-2">
                                  {schemaDetails.schema.attrNames.map((attr, idx) => (
                                    <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                      {attr}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            {selectedCredDef?.schemaId ? 'Failed to load schema details' : 'No schema associated with this credential definition'}
                          </p>
                        )}
                      </div>

                      <div className="mt-6 flex justify-end">
                        <button
                          type="button"
                          onClick={closeDetailsModal}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 