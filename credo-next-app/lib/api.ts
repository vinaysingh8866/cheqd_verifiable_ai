/**
 * API client for communicating with the Express backend
 */

const API_BASE_URL = 'http://147.182.218.241:3002';

/**
 * Get the JWT token from local storage
 */
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

/**
 * Generic fetch wrapper with error handling
 */
async function fetchWithErrorHandling(url: string, options: RequestInit = {}) {
  try {
    // Add authorization header if token exists
    const token = getToken();
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    
    return data;
  } catch (error: any) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Auth API functions
 */
export const authApi = {
  register: async (label: string, email: string, password: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, email, password })
    });
  },
  
  login: async (credentials: { email: string, password: string }) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
  },
  
  verify: async () => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Dashboard API functions
 */
export const dashboardApi = {
  getStats: async (tenantId: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/dashboard/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    });
  }
};

/**
 * Agent API functions
 */
export const agentApi = {

  initialize: async (walletId: string, walletKey: string, tenantId?: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/agent/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, walletKey, tenantId })
    });
  },
  
  validate: async (walletId: string, walletKey: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/agent/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, walletKey })
    });
  },
  
  createTenant: async (walletId: string, walletKey: string, label: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/agent/tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, walletKey, label })
    });
  }
};

/**
 * Connection API functions
 */
export const connectionApi = {

  getAll: async (walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/connections?${params.toString()}`);
  },
  
  getById: async (connectionId: string, walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/connections/${connectionId}?${params.toString()}`);
  },
  
  createInvitation: async (walletId: string, walletKey: string, tenantId?: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/connections/invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, walletKey, tenantId })
    });
  },
  
  receiveInvitation: async (walletId: string, walletKey: string, invitationUrl: string, tenantId?: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/connections/receive-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, walletKey, tenantId, invitationUrl })
    });
  }
};

/**
 * Credential API functions
 */
export const credentialApi = {

  getAll: async (walletId: string, walletKey: string, tenantId?: string) => {
    try {
      const params = new URLSearchParams();
      params.append('tenantId', tenantId || '');
      
      const response = await fetch(`${API_BASE_URL}/api/credentials?${params.toString()}`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch credentials');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error in credentialApi.getAll:', error);
      throw error;
    }
  },
  

  getById: async (credentialId: string, walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credentials/${credentialId}?${params.toString()}`);
  },
  
  issue: async (
    tenantId: string, 
    connectionId: string, 
    credentialDefinitionId: string, 
    attributes: Record<string, string>,
    invitationUrl?: string,
    iconUrl?: string,
    homepageUrl?: string,
    aiDescription?: string,
    additionalData?: Record<string, any>
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/credentials/issue`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          tenantId,
          connectionId,
          credentialDefinitionId,
          attributes,
          ...(invitationUrl && { invitationUrl }),
          ...(iconUrl && { iconUrl }),
          ...(homepageUrl && { homepageUrl }),
          ...(aiDescription && { aiDescription }),
          ...(additionalData && { additionalData })
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to issue credential');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error in credentialApi.issue:', error);
      throw error;
    }
  },
  
  getDetails: async (credentialId: string, tenantId: string) => {
    try {
      const params = new URLSearchParams();
      params.append('tenantId', tenantId);
      
      const response = await fetch(`${API_BASE_URL}/api/credentials/${credentialId}/details?${params.toString()}`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch credential details');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error in credentialApi.getDetails:', error);
      throw error;
    }
  }
};

/**
 * Schema API functions
 */
export const schemaApi = {

  getAll: async (tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/schemas?${params.toString()}`);
  },
  

  getById: async (schemaId: string, tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/schemas/${schemaId}?${params.toString()}`);
  },
  

  getBySchemaId: async (schemaId: string, tenantId: string) => {
    const params = new URLSearchParams({
      tenantId,
      schemaId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/schemas/schemaId?${params.toString()}`);
  },

  create: async (tenantId: string, name: string, version: string, attributes: string[], provider: string = 'cheqd') => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, name, version, attributes, provider })
    });
  }
};

/**
 * Credential Definition API functions
 */
export const credentialDefinitionApi = {

  getAll: async (tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credential-definitions?${params.toString()}`);
  },
  

  getById: async (credDefId: string, tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    console.log(`Fetching credential definition: ${credDefId}`);
    // Check if the credDefId contains a resource path format
    if (credDefId.includes('/resources/')) {
      // Parse issuer ID and resource ID from the format "issuerId/resources/resourceId"
      const parts = credDefId.split('/resources/');
      if (parts.length === 2) {
        const issuerId = parts[0];
        const resourceId = parts[1];
        return fetchWithErrorHandling(`${API_BASE_URL}/api/credential-definitions/${issuerId}/resources/${resourceId}?${params.toString()}`);
      }
    }
    
    // Use the regular endpoint for simple IDs
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credential-definitions/${credDefId}?${params.toString()}`);
  },
  

  create: async (tenantId: string, schemaId: string, tag: string, supportRevocation: boolean = false) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credential-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, schemaId, tag, supportRevocation })
    });
  }
};

/**
 * Proof API functions
 */
export const proofApi = {
  getAll: async (walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/proofs?${params.toString()}`);
  },
  
  getById: async (proofId: string, walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/proofs/${proofId}?${params.toString()}`);
  },
  
  requestProof: async (
    tenantId: string, 
    connectionId: string,
    proofAttributes: {name: string, restrictions?: any[]}[] | Record<string, any>,
    credentialDefinitionId?: string
  ) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/proofs/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tenantId, 
        connectionId, 
        proofAttributes,
        credentialDefinitionId
      })
    });
  },
  
  acceptProofRequest: async (
    proofId: string,
    tenantId: string,
    selectedCredentials: {
      requestedAttributes: Record<string, any>,
      selfAttestedAttributes?: Record<string, string>
    }
  ) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/proofs/${proofId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tenantId, 
        selectedCredentials 
      })
    });
  }
};

/**
 * DID API functions
 */
export const didApi = {

  getAll: async (tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/dids?${params.toString()}`);
  },
  

  create: async (tenantId: string, method: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/dids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, method })
    });
  }
};

// Helper function to get auth headers
const getAuthHeader = () => {
  // In a real app, you would get the token from localStorage or a state manager
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Use this in the fetch calls
const getHeaders = (contentType = 'application/json') => {
  const headers: Record<string, string> = {
    'Content-Type': contentType
  };
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}; 