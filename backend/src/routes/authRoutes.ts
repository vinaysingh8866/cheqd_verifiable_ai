import { Router, Request, Response } from 'express';
import { getAgent, createTenant, getMainAgent } from '../services/agentService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// JWT secret key should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'verifiable-ai-jwt-secret-key';
const JWT_EXPIRES_IN = '24h';

const MAIN_WALLET_ID = process.env.MAIN_WALLET_ID || 'credo-main-wallet';
const MAIN_WALLET_KEY = process.env.MAIN_WALLET_KEY || 'credo-main-wallet-key';

// In-memory user store (should be replaced with database in production)
// Format: { email: string, password: string, tenantId: string }
const users = new Map();

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
      if (users.has(email)) {
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
        
        // Store user credentials
        users.set(email, {
          email,
          password: hashedPassword,
          tenantId: tenantRecord.id
        });

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

      // Check if user exists
      if (!users.has(email)) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Get stored user
      const user = users.get(email);

      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      const tenantId = user.tenantId;
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
            tenantId: tenantRecord.id 
          }, 
          JWT_SECRET, 
          { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(200).json({
          success: true,
          message: 'Login successful',
          tenantId: tenantRecord.id,
          label: tenantRecord.config.label,
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
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string, tenantId: string };
        
        const mainAgent = await getMainAgent();
        const tenantRecord = await mainAgent.modules.tenants.getTenantById(decoded.tenantId);
        
        if (!tenantRecord) {
          res.status(404).json({
            success: false,
            message: 'Tenant not found'
          });
          return;
        }

        res.status(200).json({
          success: true,
          message: 'Token is valid',
          email: decoded.email,
          tenantId: decoded.tenantId
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

export default router; 