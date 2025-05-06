import { Router, Request, Response } from 'express';
import { getAgent, getMainAgent } from '../services/agentService';

const router = Router();

// Define the dashboard stats interface
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

/**
 * Get dashboard stats endpoint
 */
router.route('/stats')
  .post(async (req: Request, res: Response) => {
    try {
      console.log('Received dashboard stats request');
      
      // Get tenant ID from request body
      const { tenantId } = req.body;

      // Validate required parameters
      if (!tenantId) {
        console.error('Missing tenant ID');
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      console.log(`Processing request for tenant: ${tenantId}`);
      
      // Default stats - returned even on error
      const defaultStats: DashboardStats = {
        connections: { total: 0, active: 0 },
        credentials: { total: 0, issued: 0, received: 0 },
        invitations: { pending: 0 },
        tenant: {
          id: tenantId
        }
      };
      
      try {
        // Get the main agent based on environment variables
        const MAIN_WALLET_ID = process.env.MAIN_WALLET_ID || 'credo-main-wallet';
        const MAIN_WALLET_KEY = process.env.MAIN_WALLET_KEY || 'credo-main-wallet-key';

        console.log('Getting main agent for tenant ID:', tenantId);
        
        // Get the main agent first
        try {
          const mainAgent = await getMainAgent();
          
          // Then get the tenant agent
          const agent = await mainAgent.modules.tenants.getTenantAgent({
            tenantId
          });
          
          console.log('Tenant agent retrieved successfully');
          
          // Get connections
          try {
            console.log('Fetching connections...');
            const connections = await agent.connections.getAll();
            console.log('Got connections:', connections?.length || 0);
            defaultStats.connections.total = connections?.length || 0;
            
            // Try to get active connections
            if (Array.isArray(connections)) {
              const activeConnections = connections.filter(conn => 
                conn && conn.state && ['complete', 'active', 'response-sent'].includes(String(conn.state))
              );
              defaultStats.connections.active = activeConnections.length;
            }
          } catch (error) {
            console.warn('Error getting connections:', error);
          }
          
          // Get credentials
          try {
            console.log('Fetching credentials...');
            const credentials = await agent.credentials.getAll();
            console.log('Got credentials:', credentials?.length || 0);
            defaultStats.credentials.total = credentials?.length || 0;
            
            // Try to count issued and received
            if (Array.isArray(credentials)) {
              try {
                // In AnonCreds, typically:
                // - Issued: we are the issuer
                // - Received: we are the holder
                const issuedCredentials = credentials.filter(cred => 
                  cred && cred.state === 'done' && 
                  Object.keys(cred.metadata || {}).some(key => key.includes('issuer'))
                );
                const receivedCredentials = credentials.filter(cred => 
                  cred && cred.state === 'done' && 
                  !Object.keys(cred.metadata || {}).some(key => key.includes('issuer'))
                );
                
                defaultStats.credentials.issued = issuedCredentials.length;
                defaultStats.credentials.received = receivedCredentials.length;
              } catch (error) {
                console.warn('Error counting credential types:', error);
              }
            }
          } catch (error) {
            console.warn('Error getting credentials:', error);
          }
          
          // Get pending invitations
          try {
            console.log('Fetching invitations...');
            const outOfBandRecords = await agent.oob.getAll();
            console.log('Got OOB records:', outOfBandRecords?.length || 0);
            
            if (Array.isArray(outOfBandRecords)) {
              // Count pending invitations (not yet accepted)
              const pendingInvitations = outOfBandRecords.filter(record => 
                record && record.state && !record.reusable
              );
              defaultStats.invitations.pending = pendingInvitations.length;
            }
          } catch (error) {
            console.warn('Error getting invitations:', error);
          }
          
          // Get tenant information
          try {
            // Get tenant record from main agent
            const tenantRecord = await mainAgent.modules.tenants.getTenantById(tenantId);
            if (tenantRecord && tenantRecord.config && tenantRecord.config.label) {
              defaultStats.tenant = {
                id: tenantId,
                label: tenantRecord.config.label
              };
            }
          } catch (error) {
            console.warn('Error getting tenant info:', error);
          }
        } catch (agentInitError: any) {
          console.error(`Error initializing agent: ${agentInitError.message}`);
          // If we can't initialize the agent, we'll return the default stats
          // This allows the dashboard to load with empty data instead of completely failing
        }
        
        // Always return stats, even if some parts failed
        console.log('Returning agent stats:', defaultStats);
        res.status(200).json(defaultStats);
      } catch (agentError: any) {
        console.error('Agent error:', agentError);
        
        // Still return default stats, but with a 200 status code
        // This allows the dashboard to load with empty data
        res.status(200).json(defaultStats);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats: ' + (error.message || 'Unknown error') });
    }
  });

export default router; 