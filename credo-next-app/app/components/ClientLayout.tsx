'use client';

import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ClientLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/connections', label: 'Connections' },
  { href: '/credentials', label: 'Credentials' },
  { href: '/dids', label: 'DIDs' },
  { href: '/schemas', label: 'Schemas' },
  { href: '/credential-definitions', label: 'Credential Defs' },
  { href: '/verifications', label: 'Verifications' },
  { href: '/profile', label: 'Profile' },
];

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { isAuthenticated, isLoading, logout, tenantId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const isPublicPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {

    if (isLoading) {
      return;
    }


    if (isAuthenticated && isPublicPage) {
      router.push('/');
    }

    else if (!isAuthenticated && !isPublicPage) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, isPublicPage, router]);


  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto border-4 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-700">Loading application...</p>
        </div>
      </div>
    );
  }


  if (isPublicPage) {
    return <>{children}</>;
  }


  if (isAuthenticated) {
    return (
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800 text-white flex flex-col">
          <div className="p-4 text-xl font-semibold border-b border-slate-700 bg-slate-900">
            Credo Tenant
            {tenantId && <span className='block text-xs font-normal text-slate-400 truncate'>ID: {tenantId}</span>}
          </div>
          <nav className="flex-1 mt-4">
            <ul>
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href} 
                    className={`block px-4 py-2 text-sm hover:bg-slate-700 ${
                      pathname === item.href ? 'bg-slate-600 font-semibold' : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t border-slate-700">
            <button 
              onClick={logout} 
              className="w-full px-4 py-2 text-sm bg-rose-700 rounded hover:bg-rose-800 transition-colors duration-200">
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }


  return null;
} 