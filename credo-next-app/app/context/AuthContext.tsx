'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation'; // Using navigation from App Router
import { ToastContainer, toast } from 'react-toastify';

const API_BASE_URL = 'http://147.182.218.241:3002';

interface AuthContextType {
  tenantId: string | null;
  email: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isMainAgent: boolean;
  mainAgentExists: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { label: string; email: string; password: string }, autoLogin?: boolean) => Promise<string>;
  logout: () => void;
  setAsMainAgent: () => Promise<void>;
  checkMainAgent: () => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isMainAgent, setIsMainAgent] = useState<boolean>(false);
  const [mainAgentExists, setMainAgentExists] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedTenantId = localStorage.getItem('tenantId');
      const storedEmail = localStorage.getItem('email');
      const storedToken = localStorage.getItem('token');
      const storedIsMainAgent = localStorage.getItem('isMainAgent') === 'true';
      
      if (storedTenantId) {
        setTenantId(storedTenantId);
      }
      if (storedEmail) {
        setEmail(storedEmail);
      }
      if (storedToken) {
        setToken(storedToken);
        setIsMainAgent(storedIsMainAgent);
        
        // Check if main agent exists in the system
        checkMainAgent();
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
    if (email) {
      localStorage.setItem('email', email);
    }
    if (token) {
      localStorage.setItem('token', token);
    }
    localStorage.setItem('isMainAgent', isMainAgent.toString());
  }, [tenantId, email, token, isMainAgent]);

  const checkMainAgent = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/main-agent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to check main agent status');
        return false;
      }

      const data = await response.json();
      setMainAgentExists(data.exists);
      return data.exists;
    } catch (error) {
      console.error("Error checking main agent:", error);
      return false;
    }
  };

  const setAsMainAgent = async (): Promise<void> => {
    if (!tenantId || !token) {
      throw new Error('You must be logged in to become the main agent');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/set-main-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `Failed to set as main agent: Server responded with status ${response.status}`);
      }

      const data = await response.json();
      
      setIsMainAgent(true);
      localStorage.setItem('isMainAgent', 'true');
      setMainAgentExists(true);
      
      toast.success('You are now the main agent for this system');
    } catch (error) {
      console.error("Failed to set as main agent:", error);
      throw error;
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `Login failed: Server responded with status ${response.status}`);
      }

      const data = await response.json();
      
      // Save auth data
      localStorage.setItem('tenantId', data.tenantId);
      setTenantId(data.tenantId);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      
      if (credentials.email) {
        localStorage.setItem('email', credentials.email);
        setEmail(credentials.email);
      }

      // Set main agent status
      setIsMainAgent(data.isMainAgent || false);
      localStorage.setItem('isMainAgent', (data.isMainAgent || false).toString());
      
      // Check if main agent exists in the system
      await checkMainAgent();
      
      router.push('/');
    } catch (error) {
      console.error("Login failed:", error);
      setTenantId(null);
      setEmail(null);
      setToken(null);
      setIsMainAgent(false);
      localStorage.removeItem('tenantId');
      localStorage.removeItem('email');
      localStorage.removeItem('token');
      localStorage.removeItem('isMainAgent');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { label: string; email: string; password: string }, autoLogin: boolean = true): Promise<string> => {
    setIsLoading(true);
    try {
      console.log(`Registering tenant with label: ${data.label}`);
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseText = await response.text();
      console.log('Registration response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Registration failed: Invalid response format - ${responseText}`);
      }

      if (!response.ok || !responseData.success) {
        throw new Error(responseData?.message || `Registration failed: Server responded with status ${response.status}`);
      }

      const newTenantId = responseData.tenantId;
      
      console.log(`Registration successful. Tenant ID: ${newTenantId}`);
      toast.success(`Registration successful. Tenant ID: ${newTenantId}`);

      if (!newTenantId) {
        throw new Error('Registration completed but no tenant ID was returned from the server');
      }

      // Check if any main agent exists
      const mainAgentExists = await checkMainAgent();

      if (autoLogin) {
        localStorage.setItem('tenantId', newTenantId);
        setTenantId(newTenantId);
        
        if (responseData.token) {
          localStorage.setItem('token', responseData.token);
          setToken(responseData.token);
        }
        
        if (data.email) {
          localStorage.setItem('email', data.email);
          setEmail(data.email);
        }
        
        // Set main agent status if this is the first user
        if (!mainAgentExists) {
          setIsMainAgent(true);
          localStorage.setItem('isMainAgent', 'true');
          
          // If this is the first user, set them as main agent
          try {
            await setAsMainAgent();
          } catch (error) {
            console.error("Failed to set as main agent during registration:", error);
          }
        } else {
          setIsMainAgent(false);
          localStorage.setItem('isMainAgent', 'false');
        }
        
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
      localStorage.removeItem('email');
      localStorage.removeItem('token');
      localStorage.removeItem('isMainAgent');
      setTenantId(null);
      setEmail(null);
      setToken(null);
      setIsMainAgent(false);
      router.push('/login');
    } catch (error) {
      console.error("Error removing from localStorage:", error);
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ 
      tenantId, 
      email, 
      token, 
      isAuthenticated,
      isMainAgent,
      mainAgentExists,
      login, 
      register, 
      logout,
      setAsMainAgent,
      checkMainAgent,
      isLoading 
    }}>
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