import { Router, Request, Response } from 'express';
import { getAgent } from '../services/agentService';
import { ConnectionRecord } from '@credo-ts/core';

const router = Router();


interface Message {
  connectionId: string;
  content: string;
  sender: 'me' | 'them';
  timestamp: Date;
}

const messages: Record<string, Message[]> = {};

/**
 * Get all connections for an agent
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
      const invitations = await agent.oob.getAll();
      console.log(`Invitations: ${JSON.stringify(invitations)}`);
      const connections = await agent.connections.getAll();
      console.log(`Connections: ${JSON.stringify(connections)}`);
      
      res.status(200).json({
        success: true,
        invitations: invitations.map((invitation: any) => ({
          id: invitation.id,
          createdAt: invitation.createdAt,
          state: invitation.state,
          role: invitation.role,
          invitationId: invitation.outOfBandInvitation['@id'],
          label: invitation.outOfBandInvitation.label,
          url: invitation.outOfBandInvitation.toUrl ? 
            invitation.outOfBandInvitation.toUrl({ domain: agent.config.endpoints[0] }) : 
            null
        })),
        connections: connections.map((connection: any) => ({
          id: connection.id,
          createdAt: connection.createdAt,
          state: connection.state,
          role: connection.role,
          theirLabel: connection.theirLabel
        }))
      });
    } catch (error: any) {
      console.error('Failed to get connections:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get connections'
      });
    }
  });

/**
 * Get a connection by ID
 */
router.route('/:connectionId')
  .get(async (req: Request, res: Response) => {
    try {
      const { connectionId } = req.params;
      const { walletId, walletKey, tenantId } = req.query as {
        walletId?: string;
        walletKey?: string;
        tenantId?: string;
      };
      
      if (!walletId || !walletKey) {
        res.status(400).json({ 
          success: false, 
          message: 'Wallet ID and key are required as query parameters' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      const connection = await agent.connections.findById(connectionId);
      
      if (!connection) {
        res.status(404).json({
          success: false,
          message: `Connection with ID ${connectionId} not found`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        connection: {
          id: connection.id,
          createdAt: connection.createdAt,
          state: connection.state,
          role: connection.role,
          theirLabel: connection.theirLabel,
          theirDid: connection.theirDid,
          threadId: connection.threadId,
          autoAcceptConnection: connection.autoAcceptConnection
        }
      });
    } catch (error: any) {
      console.error(`Failed to get connection ${req.params.connectionId}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get connection'
      });
    }
  });

/**
 * Create a new invitation
 */
router.route('/invitation')
  .post(async (req: Request, res: Response) => {
    try {
      const { walletId, walletKey, tenantId } = req.body;
      
      if (!walletId || !walletKey) {
        res.status(400).json({ 
          success: false, 
          message: 'Wallet ID and key are required' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      

      const { outOfBandInvitation } = await agent.oob.createInvitation();
      

      const invitationUrl = outOfBandInvitation.toUrl({ domain: agent.config.endpoints[0] });
      
      res.status(200).json({
        success: true,
        invitation: {
          id: outOfBandInvitation.id,
          url: invitationUrl,
          outOfBandInvitation
        }
      });
    } catch (error: any) {
      console.error('Failed to create invitation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create invitation'
      });
    }
  });

/**
 * Receive an invitation from a URL
 */
router.route('/receive-invitation')
  .post(async (req: Request, res: Response) => {
    try {
      const { walletId, walletKey, tenantId, invitationUrl } = req.body;
      
      if (!walletId || !walletKey || !invitationUrl) {
        res.status(400).json({ 
          success: false, 
          message: 'Wallet ID, key, and invitation URL are required' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      

      const { connectionRecord } = await agent.oob.receiveInvitationFromUrl(invitationUrl);
      
      if (!connectionRecord) {
        res.status(400).json({
          success: false,
          message: 'Failed to create connection from invitation'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        connection: {
          id: connectionRecord.id,
          state: connectionRecord.state,
          role: connectionRecord.role,
          theirLabel: connectionRecord.theirLabel,
          createdAt: connectionRecord.createdAt
        }
      });
    } catch (error: any) {
      console.error('Failed to receive invitation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to receive invitation'
      });
    }
  });

/**
 * Send a message to a connection
 */
router.route('/message')
  .post(async (req: Request, res: Response) => {
    try {
      const { tenantId, connectionId, message } = req.body;
      
      if (!tenantId || !connectionId || !message) {
        res.status(400).json({ 
          success: false, 
          message: 'Tenant ID, connection ID, and message are required' 
        });
        return;
      }

      const agent = await getAgent({ tenantId });
      

      const connection = await agent.connections.findById(connectionId);
      
      if (!connection) {
        res.status(404).json({
          success: false,
          message: `Connection with ID ${connectionId} not found`
        });
        return;
      }
      

      await agent.basicMessages.sendMessage(connection.id, message);
      console.log(`Message sent to connection ${connectionId}: ${message}`);

      if (!messages[connectionId]) {
        messages[connectionId] = [];
      }
      
      messages[connectionId].push({
        connectionId,
        content: message,
        sender: 'me',
        timestamp: new Date()
      });
      
      res.status(200).json({
        success: true,
        message: 'Message sent successfully'
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send message'
      });
    }
  });

/**
 * Get messages for a connection
 */
router.route('/messages/:connectionId')
  .get(async (req: Request, res: Response) => {
    try {
      const { connectionId } = req.params;
      const { tenantId } = req.query as {
        tenantId?: string;
      };
      
      if (!connectionId || !tenantId) {
        res.status(400).json({ 
          success: false, 
          message: 'Connection ID and tenant ID are required' 
        });
        return;
      }
      
      const agent = await getAgent({ tenantId });
      

      const connection = await agent.connections.findById(connectionId);
      console.log(`Connection: ${JSON.stringify(connection)}`);
      if (!connection) {
        res.status(404).json({
          success: false,
          message: `Connection with ID ${connectionId} not found`
        });
        return;
      }
      const threadId = connection.threadId;
      if (!threadId) {
        res.status(400).json({
          success: false,
          message: 'Thread ID is required'
        });
        return;
      }
      const messages = await agent.basicMessages.findAllByQuery({
        connectionId: connectionId
      })
      console.log(`Messages: ${JSON.stringify(messages)}`);
      
      res.status(200).json({
        success: true,
        messages: messages
      });
    } catch (error: any) {
      console.error('Failed to get messages:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get messages'
      });
    }
  });





export default router; 