'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { apiPost, DashboardStats } from './utils/api';
import CreateInvitation from './components/CreateInvitation';
import Link from 'next/link';

export default function DashboardPage() {
  const { tenantId, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvitationPanel, setShowInvitationPanel] = useState(false);

  useEffect(() => {
    async function getStats() {
      if (!tenantId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await apiPost('/api/dashboard/stats', { tenantId });
        setStats(data);
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message || 'Unable to load dashboard statistics');
      } finally {
        setIsLoading(false);
      }
    }
    
    getStats();
    
    const intervalId = setInterval(getStats, 60000);
    
    return () => clearInterval(intervalId);
  }, [tenantId, token]);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-700 mb-6">Dashboard</h1>
      
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6 rounded-lg shadow-lg mb-6">
        {stats?.tenant ? (
          <div>
            <p className="text-lg text-slate-100">
              Welcome to <span className="font-semibold text-slate-200">{stats.tenant.label || 'Your Tenant'}</span>
            </p>
            <p className="text-sm text-slate-300 mt-1">
              Tenant ID: <span className="font-mono">{stats.tenant.id}</span>
            </p>
          </div>
        ) : tenantId ? (
          <p className="text-lg text-slate-100">
            Welcome, Tenant ID: <span className="font-semibold text-slate-200">{tenantId}</span>!
          </p>
        ) : (
          <p className="text-lg text-slate-100">Loading tenant information...</p>
        )}
        <p className="mt-4 text-slate-200">
          This is your main dashboard. Use the sidebar to navigate through different sections.
        </p>
      </div>
      
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 mb-6">
          <p className="text-rose-700">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow border-l-4 border-slate-500">
          <h3 className="font-semibold text-slate-600">Connections</h3>
          {isLoading ? (
            <div className="animate-pulse h-8 bg-slate-200 rounded mt-2"></div>
          ) : (
            <div className="flex flex-col">
              <p className="text-2xl font-bold text-slate-700">{stats?.connections.total || 0}</p>
             
              <Link href="/connections" className="text-sm text-blue-600 hover:text-blue-800 mt-2">
                View all connections →
              </Link>
            </div>
          )}
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow border-l-4 border-teal-700">
          <h3 className="font-semibold text-slate-600">Credentials</h3>
          {isLoading ? (
            <div className="animate-pulse h-8 bg-slate-200 rounded mt-2"></div>
          ) : (
            <div className="flex flex-col">
              <p className="text-2xl font-bold text-teal-700">{stats?.credentials.total || 0}</p>
            </div>
          )}
        </div>
        
      </div>
      
      
      {showInvitationPanel && tenantId && (
        <CreateInvitation tenantId={tenantId} />
      )}
    </div>
  );
} 