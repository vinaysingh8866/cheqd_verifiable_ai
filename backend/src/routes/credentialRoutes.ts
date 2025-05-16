import { Router, Request, Response } from 'express';
import { getAgent } from '../services/agentService';
import { CredentialExchangeRecord, AutoAcceptCredential } from '@credo-ts/core';
import db from '../services/dbService';
import { requireMainAgent } from '../middleware/authMiddleware';

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
 * Get all issued credentials (for verified AI home page)
 */
router.route('/issued')
  .get(async (req: Request, res: Response) => {
    try {
      const issuedCredentials = await db.getAllIssuedCredentials();
      
      // Debug log to see what's actually returned from the database
      console.log('Issued credentials from database:', JSON.stringify(issuedCredentials));
      console.log('Number of issued credentials:', issuedCredentials.length);
      
      res.status(200).json({
        success: true,
        credentials: issuedCredentials
      });
    } catch (error: any) {
      console.error('Failed to get issued credentials:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get issued credentials'
      });
    }
  });

/**
 * Get all credentials issued by a specific tenant
 */
router.route('/issued/:issuerTenantId')
  .get(async (req: Request, res: Response) => {
    try {
      const { issuerTenantId } = req.params;
      
      const issuedCredentials = await db.getIssuedCredentialsByIssuer(issuerTenantId);
      
      // Debug log to see what's actually returned from the database for a specific issuer
      console.log(`Issued credentials for issuer ${issuerTenantId}:`, JSON.stringify(issuedCredentials));
      console.log('Number of credentials for this issuer:', issuedCredentials.length);
      
      res.status(200).json({
        success: true,
        credentials: issuedCredentials
      });
    } catch (error: any) {
      console.error('Failed to get issued credentials for issuer:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get issued credentials for issuer'
      });
    }
  });

/**
 * Issue a credential to a connection
 */
router.route('/issue')
  .post(async (req: Request, res: Response) => {
    try {
      const { 
        tenantId, 
        connectionId, 
        credentialDefinitionId, 
        attributes, 
        invitationUrl,
        iconUrl,
        homepageUrl,
        aiDescription,
        additionalData
      } = req.body;
      
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
        // @ts-ignore
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
      
      // Log the credential record after creation
      console.log('Credential record created:', {
        id: credentialRecord.id,
        state: credentialRecord.state,
        connectionId: credentialRecord.connectionId
      });
      
      // Store the issued credential in the database with additional information
      try {
        const storedCredential = await db.storeIssuedCredential(
          credentialRecord.id,
          tenantId,
          connectionId,
          credentialDefinitionId,
          schemaId,
          attributes,
          invitationUrl,
          iconUrl,
          homepageUrl,
          aiDescription,
          additionalData
        );
        
        console.log('Credential stored in database with ID:', storedCredential.id);
        
        res.status(200).json({
          success: true,
          credential: {
            id: credentialRecord.id,
            state: credentialRecord.state,
            connectionId: credentialRecord.connectionId,
            threadId: credentialRecord.threadId,
            credentialDefinitionId,
            additionalInfo: {
              invitationUrl,
              iconUrl,
              homepageUrl,
              aiDescription
            }
          }
        });
      } catch (dbError) {
        console.error('Failed to store credential in database:', dbError);
        
        // Still return success for the credential issuance as it was successful in the agent
        // But include a warning about the database storage
        res.status(200).json({
          success: true,
          warning: 'Credential was issued but could not be stored in database for additional metadata',
          credential: {
            id: credentialRecord.id,
            state: credentialRecord.state,
            connectionId: credentialRecord.connectionId,
            threadId: credentialRecord.threadId,
            credentialDefinitionId
          }
        });
      }
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

/**
 * Get detailed information about a credential by ID
 * This includes the additional data stored during issuance
 */
router.route('/:credentialId/details')
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

      // Get both the agent credential info and our stored additional info
      const agent = await getAgent({ tenantId });
      
      try {
        const credentialRecord = await agent.credentials.findById(credentialId);
        
        if (!credentialRecord) {
          res.status(404).json({
            success: false,
            message: `Credential with ID ${credentialId} not found in agent wallet`
          });
          return;
        }
        
        // Query our database for additional stored data
        const sql = `SELECT * FROM issued_credentials WHERE credential_id = $1`;
        const storedCredential = await db.db.oneOrNone(sql, [credentialId]);
        
        if (!storedCredential) {
          // Return just the agent credential data if no additional data was stored
          res.status(200).json({
            success: true,
            credential: {
              id: credentialRecord.id,
              state: credentialRecord.state,
              createdAt: credentialRecord.createdAt,
              connectionId: credentialRecord.connectionId,
              attributes: credentialRecord.credentialAttributes,
              ...(credentialRecord.metadata.data?.credentialDefinitionId && {
                credentialDefinitionId: credentialRecord.metadata.data.credentialDefinitionId
              })
            }
          });
          return;
        }
        
        // Parse JSON fields if they're stored as strings
        const attributes = typeof storedCredential.attributes === 'string' 
          ? JSON.parse(storedCredential.attributes) 
          : storedCredential.attributes;
          
        const additionalData = storedCredential.additional_data && typeof storedCredential.additional_data === 'string'
          ? JSON.parse(storedCredential.additional_data)
          : storedCredential.additional_data || {};
        
        // Return combined data
        res.status(200).json({
          success: true,
          credential: {
            id: credentialRecord.id,
            state: credentialRecord.state,
            createdAt: credentialRecord.createdAt,
            connectionId: credentialRecord.connectionId,
            attributes: attributes,
            invitationUrl: storedCredential.invitation_url,
            iconUrl: storedCredential.icon_url,
            homepageUrl: storedCredential.homepage_url,
            aiDescription: storedCredential.ai_description,
            additionalData: additionalData,
            issuerTenantId: storedCredential.issuer_tenant_id,
            credentialDefinitionId: storedCredential.credential_definition_id,
            schemaId: storedCredential.schema_id
          }
        });
      } catch (error) {
        console.error(`Error getting credential ${credentialId}:`, error);
        
        // If agent lookup fails, try to fetch from our database only
        const sql = `SELECT * FROM issued_credentials WHERE credential_id = $1`;
        const storedCredential = await db.db.oneOrNone(sql, [credentialId]);
        
        if (!storedCredential) {
          res.status(404).json({
            success: false,
            message: `Credential with ID ${credentialId} not found`
          });
          return;
        }
        
        // Parse JSON fields
        const attributes = typeof storedCredential.attributes === 'string' 
          ? JSON.parse(storedCredential.attributes) 
          : storedCredential.attributes;
          
        const additionalData = storedCredential.additional_data && typeof storedCredential.additional_data === 'string'
          ? JSON.parse(storedCredential.additional_data)
          : storedCredential.additional_data || {};
        
        // Return data from our database only
        res.status(200).json({
          success: true,
          credential: {
            id: storedCredential.credential_id,
            attributes: attributes,
            invitationUrl: storedCredential.invitation_url,
            iconUrl: storedCredential.icon_url,
            homepageUrl: storedCredential.homepage_url,
            aiDescription: storedCredential.ai_description,
            additionalData: additionalData,
            issuerTenantId: storedCredential.issuer_tenant_id,
            connectionId: storedCredential.holder_connection_id,
            credentialDefinitionId: storedCredential.credential_definition_id,
            schemaId: storedCredential.schema_id,
            createdAt: storedCredential.created_at
          }
        });
      }
    } catch (error: any) {
      console.error(`Failed to get credential details ${req.params.credentialId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get credential details'
      });
    }
  });

/**
 * Public endpoint to get credential details without authentication
 * Uses only the database, not the agent wallet
 */
router.route('/public/:credentialId')
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

      console.log(`Public credential details request for credential ${credentialId} with tenant ${tenantId}`);
      
      // Query our database for credential data - no agent wallet access needed
      const sql = `SELECT * FROM issued_credentials WHERE credential_id = $1`;
      const storedCredential = await db.db.oneOrNone(sql, [credentialId]);
      
      if (!storedCredential) {
        res.status(404).json({
          success: false,
          message: `Credential with ID ${credentialId} not found`
        });
        return;
      }
      
      // Parse JSON fields
      const attributes = typeof storedCredential.attributes === 'string' 
        ? JSON.parse(storedCredential.attributes) 
        : storedCredential.attributes;
        
      const additionalData = storedCredential.additional_data && typeof storedCredential.additional_data === 'string'
        ? JSON.parse(storedCredential.additional_data)
        : storedCredential.additional_data || {};
      
      // Return data from our database only
      res.status(200).json({
        success: true,
        credential: {
          id: storedCredential.credential_id,
          attributes: attributes,
          invitationUrl: storedCredential.invitation_url,
          iconUrl: storedCredential.icon_url,
          homepageUrl: storedCredential.homepage_url,
          aiDescription: storedCredential.ai_description,
          additionalData: additionalData,
          issuerTenantId: storedCredential.issuer_tenant_id,
          connectionId: storedCredential.holder_connection_id,
          credentialDefinitionId: storedCredential.credential_definition_id,
          schemaId: storedCredential.schema_id,
          createdAt: storedCredential.created_at
        }
      });
    } catch (error: any) {
      console.error(`Failed to get public credential details ${req.params.credentialId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get credential details'
      });
    }
  });

export default router; 