import { Router, Request, Response } from 'express';
import { getAgent } from '../services/agentService';
import { ProofExchangeRecord, AutoAcceptProof } from '@credo-ts/core';

const router = Router();

/**
 * Get all proof records for an agent
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
      const proofs = await agent.proofs.getAll();
      
      res.status(200).json({
        success: true,
        proofs: proofs.map((proof: ProofExchangeRecord) => ({
          id: proof.id,
          state: proof.state,
          createdAt: proof.createdAt,
          connectionId: proof.connectionId,
          threadId: proof.threadId,
          isVerified: proof.isVerified
        }))
      });
    } catch (error: any) {
      console.error('Failed to get proofs:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get proofs'
      });
    }
  });

/**
 * Send a proof request to a connection
 */
router.route('/request')
  .post(async (req: Request, res: Response) => {
    try {
      const { tenantId, connectionId, proofAttributes, credentialDefinitionId } = req.body;
      
      if (!tenantId || !connectionId || !proofAttributes) {
        res.status(400).json({ 
          success: false, 
          message: 'Tenant ID, connection ID, and proof attributes are required' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      
      // Format the requested attributes based on the new structure
      const requestedAttributes: Record<string, any> = {};
      
      // Handle both array format and object format
      if (Array.isArray(proofAttributes)) {
        // Convert array format to object format with restrictions
        proofAttributes.forEach((attr) => {
          const attrName = attr.name;
          
          requestedAttributes[attrName] = {
            name: attrName,
            restrictions: credentialDefinitionId ? 
              [{ cred_def_id: credentialDefinitionId }] : 
              (attr.restrictions || [])
          };
        });
      } else if (typeof proofAttributes === 'object') {
        // Use the object format directly
        Object.assign(requestedAttributes, proofAttributes);
      }
      
      console.log('Formatted requested attributes:', requestedAttributes);
      
      // Send the proof request
      const proofRecord = await agent.proofs.requestProof({
        connectionId,
        protocolVersion: 'v2',
        proofFormats: {
          anoncreds: {
            name: 'Proof Request',
            version: '1.0',
            requested_attributes: requestedAttributes
          }
        },
        autoAcceptProof: AutoAcceptProof.Always
      });
      
      res.status(200).json({
        success: true,
        proof: {
          id: proofRecord.id,
          state: proofRecord.state,
          connectionId: proofRecord.connectionId,
          threadId: proofRecord.threadId
        }
      });
    } catch (error: any) {
      console.error('Failed to request proof:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to request proof'
      });
    }
  });

/**
 * Accept a proof request
 */
router.route('/:proofId/accept')
  .post(async (req: Request, res: Response) => {
    try {
      const { proofId } = req.params;
      const { tenantId, selectedCredentials } = req.body;
      
      if (!tenantId || !selectedCredentials) {
        res.status(400).json({ 
          success: false, 
          message: 'Tenant ID and selected credentials are required' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      const proofRecord = await agent.proofs.findById(proofId);
      
      if (!proofRecord) {
        res.status(404).json({
          success: false,
          message: `Proof record with ID ${proofId} not found`
        });
        return;
      }
      
      // Try to automatically select credentials
      let requestedCredentials;
      try {
        console.log('Attempting automatic credential selection for proof:', proofId);
        requestedCredentials = await agent.proofs.selectCredentialsForRequest({
          proofRecordId: proofRecord.id,
        });
        console.log('Automatic credential selection successful:', JSON.stringify(requestedCredentials, null, 2));
      } catch (error: any) {
        console.log('Automatic credential selection failed:', error.message);
        
        // If automatic selection fails, try to use the manually selected credentials
        if (selectedCredentials.requestedAttributes || selectedCredentials.selfAttestedAttributes) {
          console.log('Using manually selected credentials');
          
          // Try to access the proof request message
          let requestAttachment;
          let proofRequest;
          
          try {
            // Try to get the message from the proof record directly
            // This depends on what properties are accessible in the ProofExchangeRecord
            const proofRecordAny = proofRecord as any;
            
            if (proofRecordAny.requestMessage?.attachments?.length > 0) {
              requestAttachment = proofRecordAny.requestMessage.attachments[0];
            }
            // Try to get from metadata
            else if (proofRecordAny.metadata) {
              const metadata = proofRecordAny.metadata;
              if (metadata.data && metadata.data.requestMessage) {
                requestAttachment = metadata.data.requestMessage.attachments?.[0];
              }
            }
          } catch (e) {
            console.error('Error accessing proof request message:', e);
          }
          
          if (requestAttachment?.data) {
            // Parse the proof request data
            if (typeof requestAttachment.data === 'string') {
              try {
                const decodedData = Buffer.from(requestAttachment.data, 'base64').toString();
                proofRequest = JSON.parse(decodedData);
              } catch (e) {
                console.error('Error decoding proof request data:', e);
              }
            } else if (requestAttachment.data.json) {
              proofRequest = requestAttachment.data.json;
            }
          }
          
          console.log('Extracted proof request:', JSON.stringify(proofRequest, null, 2));
          
          if (!proofRequest || !proofRequest.requested_attributes) {
            // If we couldn't extract the proof request format, create a simple one
            console.log('Could not extract requested attributes format, using simple format');
            
            // Create a simplified format - this is basically a fallback
            const requestedAttributesMap: Record<string, any> = {};
            const selfAttestedAttributesMap: Record<string, string> = {};
            
            // Process requested attributes (credentials selected from wallet)
            if (selectedCredentials.requestedAttributes) {
              for (const [referent, info] of Object.entries(selectedCredentials.requestedAttributes)) {
                const credInfo = info as { credentialId: string; revealed?: boolean };
                if (credInfo.credentialId) {
                  requestedAttributesMap[referent] = {
                    credential_id: credInfo.credentialId,
                    revealed: credInfo.revealed !== false // default to true if not specified
                  };
                }
              }
            }
            
            // Process self-attested attributes
            if (selectedCredentials.selfAttestedAttributes) {
              Object.assign(selfAttestedAttributesMap, selectedCredentials.selfAttestedAttributes);
            }
            
            // Build the proofFormats object
            requestedCredentials = {
              proofFormats: {
                anoncreds: {
                  requested_attributes: requestedAttributesMap,
                  requested_predicates: {},
                  self_attested_attributes: selfAttestedAttributesMap
                }
              }
            };
          } else {
            // We successfully extracted the proof request format
            // Prepare the requested credentials in the format expected by the AnonCreds proof format
            const requestedAttributesMap: Record<string, any> = {};
            const selfAttestedAttributesMap: Record<string, string> = {};
            
            // Process requested attributes (credentials selected from wallet)
            if (selectedCredentials.requestedAttributes) {
              for (const [referent, info] of Object.entries(selectedCredentials.requestedAttributes)) {
                const credInfo = info as { credentialId: string; revealed?: boolean };
                if (credInfo.credentialId) {
                  requestedAttributesMap[referent] = {
                    credential_id: credInfo.credentialId,
                    revealed: credInfo.revealed !== false // default to true if not specified
                  };
                }
              }
            }
            
            // Process self-attested attributes
            if (selectedCredentials.selfAttestedAttributes) {
              Object.assign(selfAttestedAttributesMap, selectedCredentials.selfAttestedAttributes);
            }
            
            // Build the proofFormats object
            requestedCredentials = {
              proofFormats: {
                anoncreds: {
                  requested_attributes: requestedAttributesMap,
                  requested_predicates: {},
                  self_attested_attributes: selfAttestedAttributesMap
                }
              }
            };
          }
          
          console.log('Constructed manual proof format:', JSON.stringify(requestedCredentials, null, 2));
        } else {
          // No automatic or manual credentials available
          throw new Error('No credentials available to satisfy the proof request');
        }
      }
      
      console.log('Final proof format for acceptRequest:', JSON.stringify(requestedCredentials, null, 2));
      console.log('Proof record:', JSON.stringify(proofRecord, null, 2));
      console.log('Proof ID:', proofId);
      // Accept the proof request with selected credentials
      await agent.proofs.acceptRequest({
        proofRecordId: proofId,
        proofFormats: requestedCredentials.proofFormats
      });
      
      // Get updated proof record
      const updatedProofRecord = await agent.proofs.findById(proofId);
      
      if (!updatedProofRecord) {
        res.status(404).json({
          success: false,
          message: `Updated proof record with ID ${proofId} not found`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        proof: {
          id: updatedProofRecord.id,
          state: updatedProofRecord.state,
          connectionId: updatedProofRecord.connectionId,
          threadId: updatedProofRecord.threadId
        }
      });
    } catch (error: any) {
      console.error(`Failed to accept proof request ${req.params.proofId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to accept proof request'
      });
    }
  });

/**
 * Get a proof record by ID
 */
router.route('/:proofId')
  .get(async (req: Request, res: Response) => {
    try {
      const { proofId } = req.params;
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
      const proof = await agent.proofs.findById(proofId);
      
      if (!proof) {
        res.status(404).json({
          success: false,
          message: `Proof with ID ${proofId} not found`
        });
        return;
      }
      
      // Safely include messages by accessing them through the record
      const proofData: any = {
        id: proof.id,
        state: proof.state,
        createdAt: proof.createdAt,
        connectionId: proof.connectionId,
        threadId: proof.threadId,
        isVerified: proof.isVerified
      };
      
      // Include request and presentation messages if available
      if ('requestMessage' in proof) {
        proofData.requestMessage = (proof as any).requestMessage;
        
        // Try to extract requested attributes from different possible locations
        try {
          const requestMessage = (proof as any).requestMessage;
          
          // Method 1: Try to get from formats and attachments
          if (requestMessage?.body?.formats?.[0]?.attachments?.[0]?.data) {
            const attachmentData = requestMessage.body.formats[0].attachments[0].data;
            
            if (typeof attachmentData === 'string') {
              try {
                // Try to decode base64
                const decodedData = Buffer.from(attachmentData, 'base64').toString();
                const parsedData = JSON.parse(decodedData);
                
                if (parsedData?.requested_attributes) {
                  proofData.requestedAttributes = parsedData.requested_attributes;
                }
              } catch (err) {
                console.error('Failed to parse base64 data:', err);
              }
            } else if (typeof attachmentData === 'object') {
              if (attachmentData.requested_attributes) {
                proofData.requestedAttributes = attachmentData.requested_attributes;
              }
            }
          }
          
          // Method 2: Try to get from direct attachments
          if (!proofData.requestedAttributes && requestMessage?.attachments?.length > 0) {
            for (const attachment of requestMessage.attachments) {
              if (attachment.data?.json?.requested_attributes) {
                proofData.requestedAttributes = attachment.data.json.requested_attributes;
                break;
              }
            }
          }
          
          // Method 3: Try to get from proofFormats
          if (!proofData.requestedAttributes && requestMessage?.proofFormats?.anoncreds?.requested_attributes) {
            proofData.requestedAttributes = requestMessage.proofFormats.anoncreds.requested_attributes;
          }
        } catch (err) {
          console.error('Error extracting requested attributes from request message:', err);
        }
      }
      
      if ('presentationMessage' in proof) {
        proofData.presentationMessage = (proof as any).presentationMessage;
        
        // Try to extract revealed attributes from the presentation
        try {
          const presentationMessage = (proof as any).presentationMessage;
          
          if (presentationMessage?.attachments?.length > 0) {
            for (const attachment of presentationMessage.attachments) {
              if (attachment.data) {
                let parsedData;
                
                if (typeof attachment.data === 'string') {
                  try {
                    const decodedData = Buffer.from(attachment.data, 'base64').toString();
                    parsedData = JSON.parse(decodedData);
                  } catch (err) {
                    console.error('Failed to parse presentation data:', err);
                  }
                } else if (attachment.data.json) {
                  parsedData = attachment.data.json;
                }
                
                if (parsedData?.requested_proof?.revealed_attrs) {
                  proofData.revealedAttributes = parsedData.requested_proof.revealed_attrs;
                }
              }
            }
          }
        } catch (err) {
          console.error('Error extracting revealed attributes from presentation message:', err);
        }
      }
      
      // Include metadata if available
      if (proof.metadata) {
        proofData.metadata = proof.metadata;
      }
      
      res.status(200).json({
        success: true,
        proof: proofData
      });
    } catch (error: any) {
      console.error(`Failed to get proof ${req.params.proofId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get proof'
      });
    }
  });

export default router; 