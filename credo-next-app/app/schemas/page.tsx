'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { schemaApi } from '../../lib/api';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface Schema {
  id: string;
  schemaId: string;
  methodName: string;
  createdAt: string;
  updatedAt: string;
  schema: {
    name: string;
    version: string;
    attrNames: string[];
    issuerId: string;
  };
  _tags?: {
    issuerId: string;
    methodName: string;
    schemaId: string;
    schemaName: string;
    schemaVersion: string;
  };
  metadata: Record<string, any>;
}

export default function SchemasPage() {
  const { tenantId } = useAuth();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [schemaName, setSchemaName] = useState<string>('');
  const [schemaVersion, setSchemaVersion] = useState<string>('1.0');
  const [attributes, setAttributes] = useState<string[]>(['']);
  const [creating, setCreating] = useState<boolean>(false);
  const [provider, setProvider] = useState<string>('cheqd');
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchSchemas = async () => {
      if (!tenantId) return;
      
      setLoading(true);
      try {
        const response = await schemaApi.getAll(tenantId);
        console.log('response', response);

        setSchemas(Array.isArray(response) ? response : (response.schemas || []));
        setError(null);
      } catch (err: any) {
        console.error('Error fetching schemas:', err);
        setError(err.message || 'Failed to fetch schemas');
      } finally {
        setLoading(false);
      }
    };

    fetchSchemas();
  }, [tenantId]);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  
  const openDetailsModal = (schema: Schema) => {
    setSelectedSchema(schema);
    setDetailsModalOpen(true);
  };
  
  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedSchema(null);
  };

  const addAttribute = () => {
    setAttributes([...attributes, '']);
  };

  const removeAttribute = (index: number) => {
    const newAttributes = [...attributes];
    newAttributes.splice(index, 1);
    setAttributes(newAttributes);
  };

  const handleAttributeChange = (index: number, value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index] = value;
    setAttributes(newAttributes);
  };

  const handleCreateSchema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    const filteredAttributes = attributes.filter(attr => attr.trim() !== '');
    if (filteredAttributes.length === 0) {
      setError('At least one attribute is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await schemaApi.create(tenantId, schemaName, schemaVersion, filteredAttributes, provider);
      

      const response = await schemaApi.getAll(tenantId);

      setSchemas(Array.isArray(response) ? response : (response.schemas || []));
      

      setSchemaName('');
      setSchemaVersion('1.0');
      setAttributes(['']);
      setProvider('cheqd');
      
      closeModal();
    } catch (err: any) {
      console.error('Error creating schema:', err);
      setError(err.message || 'Failed to create schema');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Schemas</h1>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Schema
        </button>
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
      ) : schemas.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schema ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attributes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schemas.map((schema) => (
                <tr key={schema.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-sm">{schema.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-sm">{schema.schemaId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schema.schema?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schema.schema?.version}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {schema.schema?.attrNames ? schema.schema.attrNames.join(', ') : 'No attributes'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{schema.methodName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      onClick={() => openDetailsModal(schema)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-8 text-center rounded-lg shadow">
          <p className="text-gray-500">No schemas found. Create your first schema to get started.</p>
        </div>
      )}

      {/* Create Schema Modal */}
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
                    Create New Schema
                  </Dialog.Title>
                  
                  <form onSubmit={handleCreateSchema} className="mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Schema Name
                      </label>
                      <input
                        type="text"
                        value={schemaName}
                        onChange={(e) => setSchemaName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Version
                      </label>
                      <input
                        type="text"
                        value={schemaVersion}
                        onChange={(e) => setSchemaVersion(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                        placeholder="1.0"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider
                      </label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                      >
                        <option value="cheqd">Cheqd</option>
                        <option value="kanon">Kanon</option>
                      </select>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Attributes
                      </label>
                      {attributes.map((attr, index) => (
                        <div key={index} className="flex mb-2">
                          <input
                            type="text"
                            value={attr}
                            onChange={(e) => handleAttributeChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            placeholder="Attribute name"
                            required={index === 0}
                          />
                          {attributes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAttribute(index)}
                              className="ml-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              -
                            </button>
                          )}
                          {index === attributes.length - 1 && (
                            <button
                              type="button"
                              onClick={addAttribute}
                              className="ml-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              +
                            </button>
                          )}
                        </div>
                      ))}
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
                        disabled={creating}
                      >
                        {creating ? 'Creating...' : 'Create Schema'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Schema Details Modal */}
      <Transition appear show={detailsModalOpen} as={Fragment}>
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Schema Details
                  </Dialog.Title>
                  
                  {selectedSchema && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">ID</p>
                          <p className="mt-1 text-sm text-gray-900 break-all">{selectedSchema.id}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Schema ID</p>
                          <p className="mt-1 text-sm text-gray-900 break-all">{selectedSchema.schemaId}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Name</p>
                          <p className="mt-1 text-sm text-gray-900">{selectedSchema.schema?.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Version</p>
                          <p className="mt-1 text-sm text-gray-900">{selectedSchema.schema?.version}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Provider</p>
                          <p className="mt-1 text-sm text-gray-900">{selectedSchema.methodName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Issuer ID</p>
                          <p className="mt-1 text-sm text-gray-900 break-all">{selectedSchema.schema?.issuerId}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Created At</p>
                          <p className="mt-1 text-sm text-gray-900">{new Date(selectedSchema.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Updated At</p>
                          <p className="mt-1 text-sm text-gray-900">{new Date(selectedSchema.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-500">Attributes</p>
                        <div className="mt-2 border border-gray-200 rounded-md p-3">
                          {selectedSchema.schema?.attrNames && selectedSchema.schema.attrNames.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {selectedSchema.schema.attrNames.map((attr, index) => (
                                <li key={index} className="text-sm text-gray-900">{attr}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No attributes</p>
                          )}
                        </div>
                      </div>
                      
                      {selectedSchema.metadata && Object.keys(selectedSchema.metadata).length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-500">Metadata</p>
                          <div className="mt-2 border border-gray-200 rounded-md p-3 bg-gray-50">
                            <pre className="text-xs text-gray-900 overflow-auto max-h-40">
                              {JSON.stringify(selectedSchema.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={closeDetailsModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 