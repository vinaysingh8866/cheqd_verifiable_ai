import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../services/dbService';

// JWT secret key should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'verifiable-ai-jwt-secret-key';

// Extend the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authentication middleware to verify JWT token
 */
export const auth = (req: Request, res: Response, next: NextFunction): void => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if token exists
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'No token provided, authentication required'
    });
    return;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user to request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is invalid or expired'
    });
  }
};

/**
 * Authorization middleware to verify tenant ID
 */
export const verifyTenant = (req: Request, res: Response, next: NextFunction): void => {
  // Check if user exists in request
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  // Check if tenantId exists in request params or body
  const requestedTenantId = req.params.tenantId || req.body.tenantId;
  
  if (!requestedTenantId) {
    next();
    return;
  }

  // Check if user has access to requested tenant
  if (req.user.tenantId !== requestedTenantId) {
    res.status(403).json({
      success: false,
      message: 'You are not authorized to access this tenant'
    });
    return;
  }

  next();
};

/**
 * Middleware to check if the user is the main agent
 */
export const requireMainAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if user exists in request
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const { tenantId } = req.user;
    
    // Get user from database
    const user = await db.getUserByTenantId(tenantId);
    
    if (!user || !user.is_main_agent) {
      res.status(403).json({
        success: false,
        message: 'Only main agent can perform this action'
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Main agent verification error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying main agent status'
    });
  }
}; 