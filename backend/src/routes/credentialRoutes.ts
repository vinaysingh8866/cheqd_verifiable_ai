import { Router, Request, Response } from 'express';
import { getAgent } from '../services/agentService';
import { CredentialExchangeRecord } from '@credo-ts/core';

const router = Router();

/**
 * Get all credentials for an agent
 */
router.route('/')
  .get(async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query as {
        tenantId?: string;
      };
      
      if (!tenantId) {
        res.status(400).json({ 
          success: false, 
          message: 'Tenant ID is required as query parameter' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      const credentials = await agent.credentials.getAll();
      
      res.status(200).json({
        success: true,
        credentials: credentials.map((credential: CredentialExchangeRecord) => ({
          id: credential.id,
          state: credential.state,
          createdAt: credential.createdAt,
          connectionId: credential.connectionId,
          ...(credential.metadata.data?.credentialDefinitionId && {
            credentialDefinitionId: credential.metadata.data.credentialDefinitionId
          })
        }))
      });
    } catch (error: any) {
      console.error('Failed to get credentials:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get credentials'
      });
    }
  });

/**
 * Get a credential by ID
 */
router.route('/:credentialId')
  .get(async (req: Request, res: Response) => {
    try {
      const { credentialId } = req.params;
      const { tenantId } = req.query as {
        tenantId?: string;
      };
      
      if (!tenantId) {
        res.status(400).json({ 
          success: false, 
          message: 'Tenant ID is required as query parameter' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      const credential = await agent.credentials.findById(credentialId);
      
      if (!credential) {
        res.status(404).json({
          success: false,
          message: `Credential with ID ${credentialId} not found`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        credential: {
          id: credential.id,
          state: credential.state,
          createdAt: credential.createdAt,
          connectionId: credential.connectionId,
          attributes: credential.credentialAttributes,
          ...(credential.metadata.data?.credentialDefinitionId && {
            credentialDefinitionId: credential.metadata.data.credentialDefinitionId
          })
        }
      });
    } catch (error: any) {
      console.error(`Failed to get credential ${req.params.credentialId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get credential'
      });
    }
  });

export default router; 