import { Router, Request, Response } from 'express';
import { getAgent } from '../services/agentService';
import { requireMainAgent } from '../middleware/authMiddleware';
import { AnonCredsCredentialDefinitionPrivateRecord, AnonCredsCredentialDefinitionPrivateRepository, AnonCredsCredentialDefinitionRecord, AnonCredsCredentialDefinitionRepository, AnonCredsKeyCorrectnessProofRecord, AnonCredsKeyCorrectnessProofRepository, RegisterCredentialDefinitionOptions } from '@credo-ts/anoncreds';

const router = Router();

/**
 * Get all credential definitions for an agent
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
      const credentialDefinitions = await agent.modules.anoncreds.getCreatedCredentialDefinitions({});
      
      // Prepare response data
      const credDefData = credentialDefinitions.map((credDef: any) => ({
        id: credDef.credentialDefinitionId,
        schemaId: credDef.credentialDefinition.schemaId,
        issuerId: credDef.credentialDefinition.issuerId,
        tag: credDef.credentialDefinition.tag
      }));
      
      res.status(200).json({
        success: true,
        credentialDefinitions: credDefData
      });
    } catch (error: any) {
      console.error('Failed to get credential definitions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get credential definitions'
      });
    }
  });

/**
 * Create a new credential definition - restricted to main agent only
 */
router.route('/create')
  .post(requireMainAgent, async (req: Request, res: Response) => {
    try {
      const { tenantId, schemaId, tag } = req.body;
      
      if (!tenantId || !schemaId) {
        res.status(400).json({ 
          success: false, 
          message: 'Tenant ID and schema ID are required' 
        });
        return;
      }

      console.log(`Creating credential definition for tenant ${tenantId} with schema ${schemaId}`);
      const agent = await getAgent({ tenantId });

      try {
        // Get schema
        const schema = await agent.modules.anoncreds.getSchema(schemaId);
        
        if (!schema) {
          res.status(404).json({
            success: false,
            message: `Schema with ID ${schemaId} not found`
          });
          return;
        }
        
        // Create credential definition
        const credentialDefinitionResult = await agent.modules.anoncreds.registerCredentialDefinition({
          credentialDefinition: {
            issuerId: schema.schema.issuerId,
            schemaId: schemaId,
            tag: tag || 'default'
          },
          options: {
            supportRevocation: false
          }
        });

        console.log(`Created credential definition with ID: ${credentialDefinitionResult.credentialDefinitionId}`);

        res.status(201).json({
          success: true,
          credentialDefinition: {
            id: credentialDefinitionResult.credentialDefinitionId,
            schemaId: schemaId,
            issuerId: schema.schema.issuerId,
            tag: tag || 'default'
          }
        });
      } catch (credDefError: any) {
        console.error('Credential definition creation error:', credDefError);
        
        res.status(500).json({
          success: false,
          message: `Credential definition creation error: ${credDefError.message || 'Unknown error'}`
        });
      }
    } catch (error: any) {
      console.error('Failed to create credential definition:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create credential definition'
      });
    }
  });

/**
 * Get a credential definition by full path
 * This handles paths like: /credential-definitions/did:cheqd:testnet:123/resources/456
 */
router.route('/:issuerId/resources/:resourceId')
  .get(async (req: Request, res: Response) => {
    try {
      const { issuerId, resourceId } = req.params;
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

      const credentialDefinitionId = `${issuerId}/resources/${resourceId}`;
      
      try {
        const agent = await getAgent({ tenantId });
        const credDefs = await agent.modules.anoncreds.getCreatedCredentialDefinitions({
          credentialDefinitionId: credentialDefinitionId
        });
        console.log(credDefs, "credDefsfgfgg");
        const credDef = credDefs[0]
        console.log(credDef, "credDef");
        if (!credDef) {
          res.status(404).json({
            success: false,
            message: `Credential definition with ID ${credentialDefinitionId} not found`
          });
          return;
        }
        
        res.status(200).json({
          success: true,
          credentialDefinition: credDef,
          schemaId: credDef.credentialDefinition.schemaId
        });
      } catch (error: any) {
        console.error(`Failed to get credential definition ${credentialDefinitionId}:`, error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to get credential definition'
        });
      }
    } catch (error: any) {
      console.error(`Failed to get credential definition:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get credential definition'
      });
    }
  });

/**
 * Get credential definition by ID
 */
router.route('/:credDefId')
  .get(async (req: Request, res: Response) => {
    try {
      const { credDefId } = req.params;
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
      const credentialDefinition = await agent.modules.anoncreds.getCredentialDefinition(credDefId);
      
      if (!credentialDefinition) {
        res.status(404).json({
          success: false,
          message: `Credential definition with ID ${credDefId} not found`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        credentialDefinition: {
          id: credentialDefinition.credentialDefinitionId,
          schemaId: credentialDefinition.credentialDefinition.schemaId,
          issuerId: credentialDefinition.credentialDefinition.issuerId,
          tag: credentialDefinition.credentialDefinition.tag
        }
      });
    } catch (error: any) {
      console.error(`Failed to get credential definition ${req.params.credDefId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get credential definition'
      });
    }
  });

export default router; 