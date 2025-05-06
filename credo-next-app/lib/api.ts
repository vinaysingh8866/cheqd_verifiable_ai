/**
 * API client for communicating with the Express backend
 */

// Base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchWithErrorHandling(url: string, options: RequestInit = {}) {
  try {
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
  // Register a new tenant
  register: async (label: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label })
    });
  },
  
  // Login with tenant ID
  login: async (tenantId: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
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
  // Initialize or get an agent
  initialize: async (walletId: string, walletKey: string, tenantId?: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/agent/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, walletKey, tenantId })
    });
  },
  
  // Validate wallet credentials
  validate: async (walletId: string, walletKey: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/agent/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, walletKey })
    });
  },
  
  // Create a tenant
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
  // Get all connections
  getAll: async (walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/connections?${params.toString()}`);
  },
  
  // Get a connection by ID
  getById: async (connectionId: string, walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/connections/${connectionId}?${params.toString()}`);
  },
  
  // Create a new invitation
  createInvitation: async (walletId: string, walletKey: string, tenantId?: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/connections/invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletId, walletKey, tenantId })
    });
  },
  
  // Receive an invitation from URL
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
  // Get all credentials
  getAll: async (walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credentials?${params.toString()}`);
  },
  
  // Get a credential by ID
  getById: async (credentialId: string, walletId: string, walletKey: string, tenantId?: string) => {
    const params = new URLSearchParams({
      walletId,
      walletKey,
      ...(tenantId ? { tenantId } : {})
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credentials/${credentialId}?${params.toString()}`);
  }
};

/**
 * Schema API functions
 */
export const schemaApi = {
  // Get all schemas
  getAll: async (tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/schemas?${params.toString()}`);
  },
  
  // Get a schema by ID
  getById: async (schemaId: string, tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/schemas/${schemaId}?${params.toString()}`);
  },
  
  // Get a schema by Schema ID (different from internal ID)
  getBySchemaId: async (schemaId: string, tenantId: string) => {
    const params = new URLSearchParams({
      tenantId,
      schemaId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/schemas/schemaId?${params.toString()}`);
  },
  // Create a new schema
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
  // Get all credential definitions
  getAll: async (tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credential-definitions?${params.toString()}`);
  },
  
  // Get a credential definition by ID
  getById: async (credDefId: string, tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credential-definitions/${credDefId}?${params.toString()}`);
  },
  
  // Create a new credential definition
  create: async (tenantId: string, schemaId: string, tag: string, supportRevocation: boolean = false) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/credential-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, schemaId, tag, supportRevocation })
    });
  }
};

/**
 * DID API functions
 */
export const didApi = {
  // Get all DIDs
  getAll: async (tenantId: string) => {
    const params = new URLSearchParams({
      tenantId
    });
    
    return fetchWithErrorHandling(`${API_BASE_URL}/api/dids?${params.toString()}`);
  },
  
  // Create a new DID
  create: async (tenantId: string, method: string) => {
    return fetchWithErrorHandling(`${API_BASE_URL}/api/dids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, method })
    });
  }
}; 