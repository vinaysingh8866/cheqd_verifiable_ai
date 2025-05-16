import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeAgentSystem } from './services/agentService';
import agentRoutes from './routes/agentRoutes';
import connectionRoutes from './routes/connectionRoutes';
import credentialRoutes from './routes/credentialRoutes';
import schemaRoutes from './routes/schemaRoutes';
import credentialDefinitionRoutes from './routes/credentialDefinitionRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import authRoutes from './routes/authRoutes';
import didRoutes from './routes/didRoutes';
import proofRoutes from './routes/proofRoutes';
import { auth } from './middleware/authMiddleware';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './services/dbService';


dotenv.config();

// Set NODE_ENV to development by default for better error handling
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('NODE_ENV not set, defaulting to development mode');
}

const app = express();
const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3002;

// Configure CORS
const corsOptions = {
  origin: 'http://147.182.218.241:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Handle preflight requests separately
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser()); // Add cookie parser


app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Credo Express Backend is running' });
});


app.get('/git.new/:repoPath', (req: Request, res: Response) => {
  res.redirect(`https://git.new/${req.params.repoPath}`);
});

// Public access to verified AI credentials endpoint
app.get('/api/dashboard/verified-ai-credentials', (req: Request, res: Response, next: NextFunction) => {
  console.log('Public access to verified AI credentials');
  next();
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard/verified-ai-credentials', dashboardRoutes);

// Protected routes with auth middleware
app.use('/api/agent', auth);
app.use('/api/agent', agentRoutes);

app.use('/api/connections', auth);
app.use('/api/connections', connectionRoutes);

// Apply auth to credentials routes except for public endpoint
app.use('/api/credentials', (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for public credential details route
  if (req.path.startsWith('/public/')) {
    return next();
  }
  return auth(req, res, next);
});
app.use('/api/credentials', credentialRoutes);

app.use('/api/schemas', auth);
app.use('/api/schemas', schemaRoutes);

app.use('/api/credential-definitions', auth);
app.use('/api/credential-definitions', credentialDefinitionRoutes);

// Apply auth to all dashboard routes except verified-ai-credentials
app.use('/api/dashboard', (req: Request, res: Response, next: NextFunction) => {
  if (req.path !== '/verified-ai-credentials') {
    return auth(req, res, next);
  }
  next();
});
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/dids', auth);
app.use('/api/dids', didRoutes);

app.use('/api/proofs', auth);
app.use('/api/proofs', proofRoutes);


const startServer = async () => {
  let server;
  try {
    // Initialize database before anything else
    console.log('Initializing database...');
    try {
      await initializeDatabase();
      console.log('Database initialized successfully');
    } catch (dbError) {
      console.error('Failed to initialize database:', dbError);
      
      // For development, allow continuing even if database fails
      if (process.env.NODE_ENV === 'development') {
        console.warn('Running in development mode - continuing without database');
      } else {
        throw dbError;
      }
    }

    // Then initialize agent system
    console.log('Initializing agent system...');
    try {
      await initializeAgentSystem();
      console.log('Agent system initialized successfully');
    } catch (agentError) {
      console.error('Failed to initialize agent system:', agentError);
      // Continue even if agent system fails - might be able to access basic API
    }
    
    // Finally start the server
    server = app.listen(API_PORT, '0.0.0.0', () => {
      console.log(`Credo Express backend server running on port ${API_PORT}`);
      console.log(`Agent webhooks accessible at port ${process.env.AGENT_PORT || 3003}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    if (server) {
      server.close();
    }
    process.exit(1);
  }
};


process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  process.exit(0);
});


startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 