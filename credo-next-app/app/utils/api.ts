const API_BASE_URL = 'http://147.182.218.241:3002';


export interface DashboardStats {
  connections: {
    total: number;
    active: number;
  };
  credentials: {
    total: number;
    issued: number;
    received: number;
  };
  invitations: {
    pending: number;
  };
  tenant?: {
    id: string;
    label?: string;
  };
}


type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  cache?: RequestCache;
  credentials?: RequestCredentials;
};


const defaultOptions: ApiOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'same-origin',
};

/**
 * Fetches data from an API endpoint
 * @param url The URL to fetch from
 * @param options Additional fetch options
 * @returns The response data
 */
export async function fetchAPI<T>(url: string, options: ApiOptions = {}): Promise<T> {

  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
      'Access-Control-Allow-Origin': '*',
    },
  };


  if (options.body && typeof options.body === 'object') {
    mergedOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, mergedOptions);


  if (!response.ok) {
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {

    }
    
    throw new Error(errorMessage);
  }


  return response.json();
}

/**
 * Fetches dashboard statistics
 * @param tenantId The tenant ID to fetch statistics for
 * @returns The dashboard statistics
 */
export async function fetchDashboardStats(tenantId: string): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>(`${API_BASE_URL}/api/dashboard/stats`, {
    method: 'POST',
    body: { tenantId },
  });
}

/**
 * Creates a new invitation
 * @param tenantId The tenant ID to create the invitation for
 * @param walletId The wallet ID to use
 * @param walletKey The wallet key to use
 * @returns The created invitation
 */
export async function createInvitation(tenantId: string, walletId: string, walletKey: string) {
  return fetchAPI(`${API_BASE_URL}/api/connections/invitation`, {
    method: 'POST',
    body: { tenantId, walletId, walletKey },
  });
}

/**
 * Receive an invitation
 * @param invitationUrl The invitation URL to receive
 * @param walletId The wallet ID to use
 * @param walletKey The wallet key to use
 * @param tenantId The tenant ID to use
 * @returns The connection record details
 */
export async function receiveInvitation(invitationUrl: string, walletId: string, walletKey: string, tenantId?: string) {
  return fetchAPI(`${API_BASE_URL}/api/connections/receive-invitation`, {
    method: 'POST',
    body: { 
      invitationUrl,
      walletId,
      walletKey,
      tenantId
    },
  });
}

/**
 * Get all connections
 * @param walletId The wallet ID to use
 * @param walletKey The wallet key to use
 * @param tenantId The tenant ID to use
 * @returns The connections
 */
export async function getConnections(tenantId: string) {
  const params = new URLSearchParams({
    tenantId,
  });
  
  return fetchAPI(`${API_BASE_URL}/api/connections?${params.toString()}`);
}

/**
 * Get messages for a connection
 * @param connectionId The connection ID to get messages for
 * @param tenantId The tenant ID to use
 * @returns The messages for the connection
 */
export async function getMessages(connectionId: string, tenantId: string) {
  const params = new URLSearchParams({
    tenantId,
  });
  
  return fetchAPI(`${API_BASE_URL}/api/connections/messages/${connectionId}?${params.toString()}`);
}

/**
 * Send a message to a connection
 * @param connectionId The connection ID to send the message to
 * @param message The message to send
 * @param tenantId The tenant ID to use
 * @returns The result of sending the message
 */
export async function sendMessage(connectionId: string, message: string, tenantId: string) {
  return fetchAPI(`${API_BASE_URL}/api/connections/message`, {
    method: 'POST',
    body: {
      connectionId,
      message,
      tenantId
    },
  });
}

/**
 * Get all credentials
 * @param walletId The wallet ID to use
 * @param walletKey The wallet key to use
 * @param tenantId The tenant ID to use
 * @returns The credentials
 */
export async function getCredentials(walletId: string, walletKey: string, tenantId?: string) {
  const params = new URLSearchParams({
    walletId,
    walletKey,
    ...(tenantId ? { tenantId } : {})
  });
  
  return fetchAPI(`${API_BASE_URL}/api/credentials?${params.toString()}`);
}

/**
 * Issues a credential
 * @param tenantId The tenant ID to issue the credential from
 * @param data The credential data
 * @returns The issued credential
 */
export async function issueCredential(tenantId: string, data: any) {
  return fetchAPI(`${API_BASE_URL}/api/credentials/issue`, {
    method: 'POST',
    body: { tenantId, ...data },
  });
}

/**
 * Verifies a credential
 * @param tenantId The tenant ID to verify the credential with
 * @param data The verification data
 * @returns The verification result
 */
export async function verifyCredential(tenantId: string, data: any) {
  return fetchAPI(`${API_BASE_URL}/api/credentials/verify`, {
    method: 'POST',
    body: { tenantId, ...data },
  });
} 