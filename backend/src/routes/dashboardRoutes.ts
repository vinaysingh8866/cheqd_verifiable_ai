import { Router, Request, Response } from 'express';
import { getAgent, getMainAgent } from '../services/agentService';
import db from '../services/dbService';

const router = Router();


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
 * Get all verified AI credentials issued by main agents
 */
router.route('/verified-ai-credentials')
  .get(async (req: Request, res: Response) => {
    try {
      // Get main agent credentials only
      const mainAgent = await db.getMainAgent();
      
      if (!mainAgent) {
        res.status(200).json({
          success: true,
          credentials: [],
          message: 'No main agent configured'
        });
        return;
      }
      
      console.log('Main agent found:', mainAgent.tenant_id);
      
      // Get credentials issued by the main agent
      // const issuedCredentials = await db.getIssuedCredentialsByIssuer(mainAgent.tenant_id);
      const tenantId = mainAgent.tenant_id;
      const agent = await getAgent({ tenantId });
      const issuedCredentials = await agent.credentials.getAll();
      console.log('Issued credentials by main agent (raw):', JSON.stringify(issuedCredentials));
      console.log('Number of credentials found in database:', issuedCredentials.length);
      
      // Format credentials for the AI dashboard
      const aiCredentials = issuedCredentials.map(cred => {
        // Extract relevant information for display
        const attributes = typeof cred.attributes === 'string' 
          ? JSON.parse(cred.attributes) 
          : cred.attributes;
        
        return {
          id: cred.id,
          credential_id: cred.credential_id,
          issuer_tenant_id: cred.issuer_tenant_id,
          credential_definition_id: cred.credential_definition_id,
          schema_id: cred.schema_id,
          attributes: attributes,
          created_at: cred.created_at
        };
      });
      
      console.log('Formatted credentials for response:', JSON.stringify(aiCredentials));
      console.log('Number of credentials after formatting:', aiCredentials.length);
      
      res.status(200).json({
        success: true,
        credentials: aiCredentials
      });
    } catch (error: any) {
      console.error('Failed to get verified AI credentials:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get verified AI credentials'
      });
    }
  });

/**
 * Get dashboard stats endpoint
 */
router.route('/stats')
  .post(async (req: Request, res: Response) => {
    try {
      console.log('Received dashboard stats request');
      

      const { tenantId } = req.body;


      if (!tenantId) {
        console.error('Missing tenant ID');
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      console.log(`Processing request for tenant: ${tenantId}`);
      

      const defaultStats: DashboardStats = {
        connections: { total: 0, active: 0 },
        credentials: { total: 0, issued: 0, received: 0 },
        invitations: { pending: 0 },
        tenant: {
          id: tenantId
        }
      };
      
      try {

        const MAIN_WALLET_ID = process.env.MAIN_WALLET_ID || 'credo-main-wallet';
        const MAIN_WALLET_KEY = process.env.MAIN_WALLET_KEY || 'credo-main-wallet-key';

        console.log('Getting main agent for tenant ID:', tenantId);
        

        try {
          const mainAgent = await getMainAgent();
          

          const agent = await mainAgent.modules.tenants.getTenantAgent({
            tenantId
          });
          
          console.log('Tenant agent retrieved successfully');
          

          try {
            console.log('Fetching connections...');
            const connections = await agent.connections.getAll();
            console.log('Got connections:', connections?.length || 0);
            defaultStats.connections.total = connections?.length || 0;
            

            if (Array.isArray(connections)) {
              const activeConnections = connections.filter(conn => 
                conn && conn.state && ['complete', 'active', 'response-sent'].includes(String(conn.state))
              );
              defaultStats.connections.active = activeConnections.length;
            }
          } catch (error) {
            console.warn('Error getting connections:', error);
          }
          

          try {
            console.log('Fetching credentials...');
            const credentials = await agent.credentials.getAll();
            console.log('Got credentials:', credentials?.length || 0);
            defaultStats.credentials.total = credentials?.length || 0;
            

            if (Array.isArray(credentials)) {
              try {



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
          

          try {
            console.log('Fetching invitations...');
            const outOfBandRecords = await agent.oob.getAll();
            console.log('Got OOB records:', outOfBandRecords?.length || 0);
            
            if (Array.isArray(outOfBandRecords)) {

              const pendingInvitations = outOfBandRecords.filter(record => 
                record && record.state && !record.reusable
              );
              defaultStats.invitations.pending = pendingInvitations.length;
            }
          } catch (error) {
            console.warn('Error getting invitations:', error);
          }
          

          try {

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


        }
        

        console.log('Returning agent stats:', defaultStats);
        res.status(200).json(defaultStats);
      } catch (agentError: any) {
        console.error('Agent error:', agentError);
        


        res.status(200).json(defaultStats);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats: ' + (error.message || 'Unknown error') });
    }
  });

export default router; 