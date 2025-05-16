import { Router, Request, Response } from 'express';
import { getAgent } from '../services/agentService';
import { CredentialExchangeRecord, AutoAcceptCredential } from '@credo-ts/core';

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
 * Issue a credential to a connection
 */
router.route('/issue')
  .post(async (req: Request, res: Response) => {
    try {
      const { tenantId, connectionId, credentialDefinitionId, attributes } = req.body;
      
      if (!tenantId || !connectionId || !credentialDefinitionId || !attributes) {
        res.status(400).json({ 
          success: false, 
          message: 'Tenant ID, connection ID, credential definition ID, and attributes are required' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });

      const credentialDefinition = await agent.modules.anoncreds.getCredentialDefinition(credentialDefinitionId);

      if (!credentialDefinition) {
        res.status(404).json({
          success: false,
          message: `Credential definition with ID ${credentialDefinitionId} not found`
        });
        return;
      }
      
      const schemaId = credentialDefinition.credentialDefinition.schemaId;
      
      const schema = await agent.modules.anoncreds.getSchema(schemaId);
      
      if (!schema) {
        res.status(404).json({
          success: false,
          message: `Schema with ID ${schemaId} not found`
        });
        return;
      }
      console.log(schema, "schema");
      // Prepare credential attributes
      const credentialAttributes = schema.schema.attrNames.map((attrName: string) => ({
        name: attrName,
        value: attributes[attrName] || '',
      }));
      console.log(credentialAttributes, credentialDefinitionId, connectionId);
      // Issue the credential
      const credDef = await agent.modules.anoncreds.getCreatedCredentialDefinitions({
        credentialDefinitionId
      });
      const credentialRecord = await agent.credentials.offerCredential({
        connectionId,
        protocolVersion: 'v2',
        credentialFormats: {
          anoncreds: {
            type: 'CL',
            credentialDefinitionId:credDef[0].credentialDefinitionId,
            attributes: credentialAttributes
          }  
        },
        autoAcceptCredential: AutoAcceptCredential.Always
      });
      
      res.status(200).json({
        success: true,
        credential: {
          id: credentialRecord.id,
          state: credentialRecord.state,
          connectionId: credentialRecord.connectionId,
          threadId: credentialRecord.threadId,
          credentialDefinitionId
        }
      });
    } catch (error: any) {
      console.error('Failed to issue credential:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to issue credential'
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