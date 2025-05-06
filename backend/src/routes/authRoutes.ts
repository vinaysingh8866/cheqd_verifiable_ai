import { Router, Request, Response } from 'express';
import { getAgent, createTenant,  getMainAgent } from '../services/agentService';

const router = Router();

// Main agent wallet info - this will be the parent for all tenants
const MAIN_WALLET_ID = process.env.MAIN_WALLET_ID || 'credo-main-wallet';
const MAIN_WALLET_KEY = process.env.MAIN_WALLET_KEY || 'credo-main-wallet-key';

/**
 * Register a new tenant
 */
router.route('/register')
  .post(async (req: Request, res: Response) => {
    try {
      console.log('Received tenant registration request');
      const { label } = req.body;

      // Basic validation
      if (!label) {
        res.status(400).json({
          success: false,
          message: 'Tenant label is required'
        });
        return;
      }

      console.log(`Processing tenant registration for label: ${label}`);

      try {
        // Create a new tenant
        const tenantRecord = await createTenant({ label });
        
        console.log(`Created new tenant with ID: ${tenantRecord.id}`);
        
        // Return success response with tenant info
        res.status(201).json({
          success: true,
          message: 'Tenant registration successful',
          tenantId: tenantRecord.id,
          label: tenantRecord.config.label
        });
      } catch (error: any) {
        console.error('Tenant registration error:', error);
        
        res.status(500).json({
          success: false,
          message: `Tenant registration error: ${error.message || 'Unknown error'}`
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during tenant registration: ' + (error.message || 'Unknown error')
      });
    }
  });

/**
 * Login with tenant ID
 */
router.route('/login')
  .post(async (req: Request, res: Response) => {
    try {
      console.log('Received tenant login request');
      const { tenantId } = req.body;

      // Basic validation
      if (!tenantId) {
        res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
        return;
      }

      console.log(`Processing login for tenant ID: ${tenantId}`);

      try {
        // Get the main agent
        const mainAgent = await getMainAgent();
        
        // Verify the tenant exists by trying to get it
        const tenantRecord = await mainAgent.modules.tenants.getTenantById(tenantId);
        
        if (!tenantRecord) {
          res.status(404).json({
            success: false,
            message: 'Tenant not found'
          });
          return;
        }
        
        // Get the tenant agent
        await mainAgent.modules.tenants.getTenantAgent({
          tenantId
        });
        
        console.log(`Tenant login successful for ID: ${tenantId}`);
        
        // Return success response with tenant info
        res.status(200).json({
          success: true,
          message: 'Login successful',
          tenantId: tenantRecord.id,
          label: tenantRecord.config.label
        });
      } catch (error: any) {
        console.error('Tenant login error:', error);
        
        // If tenant not found, return appropriate error
        if (error.message?.includes('not found')) {
          res.status(404).json({
            success: false,
            message: 'Tenant not found'
          });
          return;
        }
        
        res.status(500).json({
          success: false,
          message: `Tenant login error: ${error.message || 'Unknown error'}`
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during login: ' + (error.message || 'Unknown error')
      });
    }
  });

export default router; 