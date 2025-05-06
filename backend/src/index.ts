import './shim';
import 'reflect-metadata';
import express, { Request, Response } from 'express';
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

// Load environment variables
dotenv.config();

// Express app configuration - use a different port than the agent
const app = express();
const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3002;

// Configure CORS properly to handle preflight requests
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allow all common methods
  allowedHeaders: ['*', 'Content-Type', 'Authorization', 'X-Requested-With', 'access-control-allow-origin', 'Access-Control-Allow-Origin', 'Origin', 'Accept'], // Allow all headers
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true, // Allow cookies
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Explicitly handle OPTIONS preflight requests
app.options('*', cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['*', 'Content-Type', 'Authorization', 'X-Requested-With', 'access-control-allow-origin', 'Access-Control-Allow-Origin', 'Origin', 'Accept'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Credo Express Backend is running' });
});

// Handle any git.new URLs properly with a named parameter to prevent path-to-regexp errors
app.get('/git.new/:repoPath', (req: Request, res: Response) => {
  res.redirect(`https://git.new/${req.params.repoPath}`);
});

// Register routes
app.use('/api/agent', agentRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/schemas', schemaRoutes);
app.use('/api/credential-definitions', credentialDefinitionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dids', didRoutes);

// Start the server
const startServer = async () => {
  try {
    // Initialize the agent system first
    console.log('Initializing agent system...');
    await initializeAgentSystem();
    console.log('Agent system initialized successfully');
    
    // Start Express server on a different port than the agent
    app.listen(API_PORT, () => {
      console.log(`Credo Express backend server running on port ${API_PORT}`);
      console.log(`Agent webhooks accessible at port ${process.env.AGENT_PORT || 3003}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  // Add any cleanup code here (e.g., closing database connections)
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 