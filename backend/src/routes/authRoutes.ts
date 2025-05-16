import { Router, Request, Response } from 'express';
import { getAgent, createTenant, getMainAgent } from '../services/agentService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../services/dbService';

const router = Router();

// JWT secret key should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'verifiable-ai-jwt-secret-key';
const JWT_EXPIRES_IN = '24h';

const MAIN_WALLET_ID = process.env.MAIN_WALLET_ID || 'credo-main-wallet';
const MAIN_WALLET_KEY = process.env.MAIN_WALLET_KEY || 'credo-main-wallet-key';

/**
 * Register a new tenant with email and password
 */
router.route('/register')
  .post(async (req: Request, res: Response) => {
    try {
      console.log('Received tenant registration request');
      const { label, email, password } = req.body;

      if (!label) {
        res.status(400).json({
          success: false,
          message: 'Tenant label is required'
        });
        return;
      }

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      // Check if email already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
        return;
      }

      console.log(`Processing tenant registration for label: ${label}`);

      try {
        // Create tenant
        const tenantRecord = await createTenant({ label });
        console.log(`Created new tenant with ID: ${tenantRecord.id}`);
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Store user credentials in database
        const user = await db.createUser(email, hashedPassword, tenantRecord.id);

        // Check if this is the first user - if so, make them the main agent
        const allUsers = await db.getAllUsers();
        if (allUsers.length === 1) {
          await db.updateUserMainAgentStatus(tenantRecord.id, true);
        }

        // Generate JWT token
        const token = jwt.sign(
          { 
            email, 
            tenantId: tenantRecord.id 
          }, 
          JWT_SECRET, 
          { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
          success: true,
          message: 'Tenant registration successful',
          tenantId: tenantRecord.id,
          label: tenantRecord.config.label,
          token
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
 * Login with email and password
 */
router.route('/login')
  .post(async (req: Request, res: Response) => {
    try {
      console.log('Received login request');
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      // Check if user exists in database
      const user = await db.getUserByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      const tenantId = user.tenant_id;
      console.log(`Processing login for tenant ID: ${tenantId}`);

      try {
        const mainAgent = await getMainAgent();
        const tenantRecord = await mainAgent.modules.tenants.getTenantById(tenantId);
        
        if (!tenantRecord) {
          res.status(404).json({
            success: false,
            message: 'Tenant not found'
          });
          return;
        }

        await mainAgent.modules.tenants.getTenantAgent({
          tenantId
        });
        
        console.log(`Login successful for ID: ${tenantId}`);
        
        // Generate JWT token
        const token = jwt.sign(
          { 
            email, 
            tenantId: tenantRecord.id,
            isMainAgent: user.is_main_agent 
          }, 
          JWT_SECRET, 
          { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(200).json({
          success: true,
          message: 'Login successful',
          tenantId: tenantRecord.id,
          label: tenantRecord.config.label,
          isMainAgent: user.is_main_agent,
          token
        });
      } catch (error: any) {
        console.error('Tenant login error:', error);
        
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

/**
 * Verify JWT token
 */
router.route('/verify')
  .get(async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.status(401).json({
          success: false,
          message: 'No token provided'
        });
        return;
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string, tenantId: string, isMainAgent?: boolean };
        
        const mainAgent = await getMainAgent();
        const tenantRecord = await mainAgent.modules.tenants.getTenantById(decoded.tenantId);
        
        if (!tenantRecord) {
          res.status(404).json({
            success: false,
            message: 'Tenant not found'
          });
          return;
        }

        // Get updated user info from database
        const user = await db.getUserByTenantId(decoded.tenantId);

        res.status(200).json({
          success: true,
          message: 'Token is valid',
          email: decoded.email,
          tenantId: decoded.tenantId,
          isMainAgent: user?.is_main_agent || false
        });
      } catch (error) {
        res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
        return;
      }
    } catch (error: any) {
      console.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during token verification'
      });
    }
  });

/**
 * Get main agent status
 */
router.route('/main-agent')
  .get(async (req: Request, res: Response) => {
    try {
      const mainAgentUser = await db.getMainAgent();
      
      if (!mainAgentUser) {
        res.status(200).json({
          success: true,
          exists: false,
          message: 'No main agent exists'
        });
        return;
      }

      res.status(200).json({
        success: true,
        exists: true,
        email: mainAgentUser.email,
        tenantId: mainAgentUser.tenant_id
      });
    } catch (error: any) {
      console.error('Main agent check error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while checking for main agent: ' + (error.message || 'Unknown error')
      });
    }
  });

/**
 * Set user as main agent
 */
router.route('/set-main-agent')
  .post(async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.body;
      
      if (!tenantId) {
        res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
        return;
      }

      // Check if tenant exists
      const user = await db.getUserByTenantId(tenantId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
        return;
      }

      // Reset any existing main agent
      const existingMainAgent = await db.getMainAgent();
      if (existingMainAgent) {
        await db.updateUserMainAgentStatus(existingMainAgent.tenant_id, false);
      }

      // Set the new main agent
      const updatedUser = await db.updateUserMainAgentStatus(tenantId, true);

      res.status(200).json({
        success: true,
        message: 'Main agent set successfully',
        tenantId: updatedUser.tenant_id,
        email: updatedUser.email
      });
    } catch (error: any) {
      console.error('Set main agent error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while setting main agent: ' + (error.message || 'Unknown error')
      });
    }
  });

/**
 * Check database connection
 */
router.route('/check-db')
  .get(async (req: Request, res: Response) => {
    try {
      const users = await db.getAllUsers();
      const mainAgent = await db.getMainAgent();
      
      res.status(200).json({
        success: true,
        usersCount: users.length,
        hasMainAgent: !!mainAgent,
        message: 'Database connection successful'
      });
    } catch (error: any) {
      console.error('Database check error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while checking database connection: ' + (error.message || 'Unknown error')
      });
    }
  });

export default router; 