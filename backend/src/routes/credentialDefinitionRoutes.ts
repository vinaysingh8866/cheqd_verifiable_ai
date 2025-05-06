import { Router, Request, Response } from 'express';
import { getAgent } from '../services/agentService';
import { RegisterCredentialDefinitionOptions } from '@credo-ts/anoncreds';

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
      
      res.status(200).json({
        success: true,
        credentialDefinitions
      });
    } catch (error: any) {
      console.error('Failed to get credential definitions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get credential definitions'
      });
    }
  })
  .post(async (req: Request, res: Response) => {
    try {
      const { tenantId, schemaId, tag, supportRevocation } = req.body;
      console.log(req.body, "req.body");
      if (!tenantId || !schemaId || !tag) {
        res.status(400).json({ 
          success: false, 
          message: 'Tenant ID, schema ID, and tag are required' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      agent.modules

      try {
        const schemaResult = await agent.modules.anoncreds.getCreatedSchemas({});
        const schema = schemaResult.find((schema: { id: any; }) => schema.id === schemaId);
        console.log(schemaResult, "schemaResult");
        if (!schemaResult || !schema) {
          res.status(404).json({
            success: false,
            message: `Schema with ID ${schemaId} not found`
          });
          return;
        }
        
        console.log('Using schema for credential definition:', schema);
        

        const schemaIdParts = schemaId.split(':');
        const network = schemaIdParts.length >= 3 ? schemaIdParts[2] : 'testnet';
        

        const options: RegisterCredentialDefinitionOptions = {
          options: {
            network: network,
            methodSpecificIdAlgo: 'uuid',
          },
          credentialDefinition: {
            issuerId: schema.schema.issuerId, // Use the issuer ID from the schema
            schemaId: schema.schemaId,
            tag,
            type: 'CL',
            value: {
              primary: {
                name: 'primary',
              }
            }
          },
          // @ts-ignore
          network: network,

          issuerId: schema.schema.issuerId
        };
        
        console.log('Registering credential definition with options:', JSON.stringify(options));
        const credDefResult = await agent.modules.anoncreds.registerCredentialDefinition(options);
        
        if (credDefResult.credentialDefinitionState.state !== 'finished') {
          res.status(500).json({
            success: false,
            message: 'Failed to register credential definition',
            error: credDefResult.credentialDefinitionState.reason
          });
          return;
        }
        
        res.status(201).json({
          success: true,
          message: 'Credential definition created successfully',
          credentialDefinition: credDefResult.credentialDefinitionState.credentialDefinitionId
        });
      } catch (schemaError: any) {
        console.error('Error retrieving schema:', schemaError);
        res.status(500).json({
          success: false,
          message: `Failed to retrieve schema: ${schemaError.message}`
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
 * Get a credential definition by ID
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
      const credDef = await agent.modules.anoncreds.getCredentialDefinition(credDefId);
      
      if (!credDef) {
        res.status(404).json({
          success: false,
          message: `Credential definition with ID ${credDefId} not found`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        credentialDefinition: credDef
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