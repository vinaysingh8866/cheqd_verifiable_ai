import { Router, Request, Response } from 'express';
import { getAgent } from '../services/agentService';
import { requireMainAgent } from '../middleware/authMiddleware';
import { RegisterSchemaOptions, AnonCredsSchema } from '@credo-ts/anoncreds';
import { TypedArrayEncoder } from '@credo-ts/core';
import { KeyType } from '@credo-ts/core';

const router = Router();
const cheqdDid = 'did:cheqd:testnet:d37aba59-513d-42d3-8f9f-d1df0548b6a5'

/**
 * Get all schemas for an agent
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

      const schemas = await agent.modules.anoncreds.getCreatedSchemas({});
      
      res.status(200).json({
        success: true,
            schemas
      });
    } catch (error: any) {
      console.error('Failed to get schemas:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get schemas'
      });
    }
  })
  .post(async (req: Request, res: Response) => {
    try {
        const { tenantId, name, version, attributes, provider = 'kanon' } = req.body;
      
      if (!tenantId || !name || !version || !attributes) {
        res.status(400).json({ 
          success: false, 
                message: 'Tenant ID, schema name, version, and attributes are required'
        });
        return;
      }

      const agent = await getAgent({ tenantId });

        
      try {

            const dids = await agent.dids.getCreatedDids({});
            

            let schemaOptions: any;
            let issuerDid = '';

            if (dids && dids.length > 0) {

                const matchingDid = dids.find(did => 
                    (provider === 'cheqd' && did.did.startsWith('did:cheqd')) ||
                    (provider === 'kanon' && did.did.startsWith('did:kanon'))
                );
                
                if (matchingDid) {
                    issuerDid = matchingDid.did;
                }
            }
            console.log(provider, "provider", issuerDid, "issuerDid", attributes, "attributes", name, "name", version, "version");
            if (provider === 'kanon') {

                schemaOptions = {
                    network: "testnet", // Add the missing network property
                    options: {
                        methodSpecificIdAlgo: "uuid",
                        method: "kanon",
                        network: "testnet",
                    },
          schema: {
            attrNames: attributes,
                        issuerId: issuerDid,
                        name,
                        version
                    }
                };
            } else {


                schemaOptions = {
                    network: "testnet", // Add the missing network property
          options: {
                        network: "testnet",
                        methodSpecificIdAlgo: "uuid",
                        method: "cheqd",
                    },
          schema: {
                        attrNames: attributes,
                        issuerId: issuerDid,
                        name,
                        version
                    }
                };
            }
            
            console.log('Registering schema with options:', schemaOptions);
            const schemaResult = await agent.modules.anoncreds.registerSchema(schemaOptions);
            console.log('schemaResult', schemaResult);
            
            if (schemaResult.schemaState.state !== 'finished') {
        res.status(500).json({
          success: false,
                    message: 'Failed to register schema',
                    error: schemaResult.schemaState.reason
                });
                return;
            }

            res.status(201).json({
                success: true,
                message: 'Schema created successfully',
                schema: schemaResult.schemaState.schemaId,
                provider
            });
        } catch (error) {
            console.error(`Error creating schema: ${error}`);
            throw error;
      }

    } catch (error: any) {
      console.error('Failed to create schema:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create schema'
      });
    }
  });

/**
 * Get a schema by schema ID
 */
router.route('/schemaId')
  .get(async (req: Request, res: Response) => {
    try {
      const { tenantId, schemaId } = req.query as {
            tenantId?: string;
        schemaId?: string;
        };

        if (!tenantId) {
            res.status(400).json({   
                success: false,
                message: 'Tenant ID is required as query parameter'
            });
            return;
        }

        if (!schemaId) {
            res.status(400).json({
                success: false,
                message: 'Schema ID is required as query parameter'
            });
            return;
        }

        const agent = await getAgent({ tenantId });
      
      try {
        const schema = await agent.modules.anoncreds.getSchema(schemaId);
        
        if (!schema) {
            res.status(404).json({
                success: false,
                message: `Schema with ID ${schemaId} not found`
            });
            return;
        }

        res.status(200).json({
            success: true,
            schema
        });
    } catch (error: any) {
        console.error(`Failed to get schema with ID ${schemaId}:`, error);
        res.status(404).json({
            success: false,
          message: `Schema with ID ${schemaId} not found: ${error.message}`
        });
      }
    } catch (error: any) {
      console.error(`Failed to get schema by schema ID:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get schema by schema ID'
        });
    }
  });

/**
 * Get a schema by ID
 */
router.route('/:schemaId')
  .get(async (req: Request, res: Response) => {
    try {
      const { schemaId } = req.params;
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
        const schemas = await agent.modules.anoncreds.getCreatedSchemas({});
        const schema = schemas.find((s: any) => s.id === schemaId);
      if (!schema) {
        res.status(404).json({
          success: false,
          message: `Schema with ID ${schemaId} not found`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
            schema
      });
    } catch (error: any) {
      console.error(`Failed to get schema ${req.params.schemaId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get schema'
      });
    }
  });

export default router; 