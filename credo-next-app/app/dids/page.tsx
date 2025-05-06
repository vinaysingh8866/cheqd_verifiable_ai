'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { didApi } from '../../lib/api';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface Did {
  did: string;
  method: string;
  createdAt?: string;
}

export default function DidsPage() {
  const { tenantId } = useAuth();
  const [dids, setDids] = useState<Did[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [didMethod, setDidMethod] = useState<string>('cheqd');
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    const fetchDids = async () => {
      if (!tenantId) return;
      
      setLoading(true);
      try {
        const response = await didApi.getAll(tenantId);
        setDids(response.dids || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching DIDs:', err);
        setError(err.message || 'Failed to fetch DIDs');
      } finally {
        setLoading(false);
      }
    };

    fetchDids();
  }, [tenantId]);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const handleCreateDid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setCreating(true);
    setError(null);

    try {
      await didApi.create(tenantId, didMethod);
      
      // Reload DIDs
      const response = await didApi.getAll(tenantId);
      setDids(response.dids || []);
      
      // Reset form
      setDidMethod('cheqd');
      
      closeModal();
    } catch (err: any) {
      console.error('Error creating DID:', err);
      setError(err.message || 'Failed to create DID');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Decentralized Identifiers (DIDs)</h1>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create DID
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
      ) : dids.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dids.map((did, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-sm">{did.did}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{did.method}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {did.createdAt ? new Date(did.createdAt).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-8 text-center rounded-lg shadow">
          <p className="text-gray-500">No DIDs found. Create your first DID to get started.</p>
        </div>
      )}

      {/* Create DID Modal */}
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
                    Create New DID
                  </Dialog.Title>
                  
                  <form onSubmit={handleCreateDid} className="mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DID Method
                      </label>
                      <select
                        value={didMethod}
                        onChange={(e) => setDidMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                      >
                        <option value="cheqd">Cheqd</option>
                        <option value="kanon">Kanon</option>
                      </select>
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
                        {creating ? 'Creating...' : 'Create DID'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 