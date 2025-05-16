'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation'; // Using navigation from App Router
import { ToastContainer, toast } from 'react-toastify';

const API_BASE_URL = 'http://147.182.218.241:3002';

interface AuthContextType {
  tenantId: string | null;
  isAuthenticated: boolean;
  login: (id: string) => void;
  register: (label: string, autoLogin?: boolean) => Promise<string>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {

    try {
      const storedTenantId = localStorage.getItem('tenantId');
      if (storedTenantId) {
        setTenantId(storedTenantId);
      }
    } catch (error) {
        console.error("Error accessing localStorage:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    if (tenantId) {
      localStorage.setItem('tenantId', tenantId);
    }
  }, [tenantId]);

  const login = async (id: string) => {
    setIsLoading(true);
    try {

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `Login failed: Server responded with status ${response.status}`);
      }


      localStorage.setItem('tenantId', id);
      setTenantId(id);
      router.push('/');

    } catch (error) {
        console.error("Login failed:", error);
        setTenantId(null);
        localStorage.removeItem('tenantId');
        throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (label: string, autoLogin: boolean = true): Promise<string> => {
    setIsLoading(true);
    try {

      console.log(`Registering tenant with label: ${label}`);
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label }),
      });


      const responseText = await response.text();
      console.log('Registration response:', responseText);
      

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Registration failed: Invalid response format - ${responseText}`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data?.message || `Registration failed: Server responded with status ${response.status}`);
      }

      const newTenantId = data.tenantId;
      

      console.log(`Registration successful. Tenant ID: ${newTenantId}`);

      toast.success(`Registration successful. Tenant ID: ${newTenantId}`);

      if (!newTenantId) {
        throw new Error('Registration completed but no tenant ID was returned from the server');
      }


      if (autoLogin) {
        localStorage.setItem('tenantId', newTenantId);
        setTenantId(newTenantId);
        router.push('/');
      }
      
      return newTenantId;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
        localStorage.removeItem('tenantId');
        setTenantId(null);
        router.push('/login');
    } catch (error) {
        console.error("Error removing from localStorage:", error);
    }
  };

  const isAuthenticated = !!tenantId;

  return (
    <AuthContext.Provider value={{ tenantId, isAuthenticated, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 