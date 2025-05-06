// import 'reflect-metadata';
// import type { InitConfig, ModulesMap } from '@credo-ts/core';
// import type { AskarMultiWalletDatabaseScheme } from '@credo-ts/askar';

// import {
//     Agent,
//     ConsoleLogger,
//     LogLevel,
//     DidsModule,
//     HttpOutboundTransport,
//     WsOutboundTransport,
//     ConnectionsModule,
//     CredentialsModule,
//     OutOfBandModule,
//     AutoAcceptCredential
// } from '@credo-ts/core';
// import { agentDependencies, HttpInboundTransport } from '@credo-ts/node';
// import { AskarModule } from '@credo-ts/askar';
// import { ariesAskar } from '@hyperledger/aries-askar-nodejs';
// import { TenantsModule } from '@credo-ts/tenants';

// // Agent endpoint configuration
// const agentPort = process.env.AGENT_PORT ? parseInt(process.env.AGENT_PORT) : 3001;
// const agentEndpoint = process.env.AGENT_ENDPOINT || `http://localhost:${agentPort}`;

// // In-memory cache for agents
// const agentCache = new Map<string, Agent>();

// /**
//  * Initialize a single agent instance for a wallet
//  */
// async function initializeAgent(walletId: string, walletKey: string, multiWalletDatabaseScheme?: AskarMultiWalletDatabaseScheme): Promise<Agent> {
//     console.log(`Initializing agent for wallet: ${walletId}`);

//     // Create agent configuration
//     const config: InitConfig = {
//         label: `CredoAgent-${walletId}`,
//         walletConfig: {
//             id: walletId,
//             key: walletKey,
//         },
//         endpoints: [agentEndpoint],
//         logger: new ConsoleLogger(LogLevel.debug),
//     };

//     try {
//         // Create agent with basic modules
//         const agent = new Agent({
//             config,
//             dependencies: agentDependencies,
//             modules: {
//                 tenants: new TenantsModule(),
//                 askar: new AskarModule({ 
//                     // @ts-ignore: Type compatibility issue with askar
//                     ariesAskar: ariesAskar,
//                     multiWalletDatabaseScheme
//                 }),
//                 connections: new ConnectionsModule({
//                     autoAcceptConnections: true,
//                 }),
//                 credentials: new CredentialsModule({
//                     autoAcceptCredentials: AutoAcceptCredential.Always,
//                 }),
//                 oob: new OutOfBandModule(),
//                 dids: new DidsModule(),
//             },
//         });

//         // Register transports
//         agent.registerOutboundTransport(new HttpOutboundTransport());
//         agent.registerOutboundTransport(new WsOutboundTransport());
        
//         // Add HTTP inbound transport to receive messages
//         agent.registerInboundTransport(new HttpInboundTransport({ port: agentPort }));

//         // Initialize the agent (this creates the wallet)
//         await agent.initialize();
//         console.log(`Agent initialized successfully for wallet: ${walletId}`);
        
//         // Store in cache
//         agentCache.set(walletId, agent);
        
//         return agent;
//     } catch (error) {
//         console.error(`Failed to initialize agent: ${error}`);
//         throw error;
//     }
// }

// /**
//  * Get or create an agent for a wallet ID
//  */
// export async function getAgent({ 
//     walletId, 
//     walletKey, 
//     tenantId
// }: { 
//     walletId: string, 
//     walletKey: string, 
//     tenantId?: string 
// }): Promise<Agent> {
//     // Check if agent already exists in cache
//     const cachedAgent = agentCache.get(walletId);
    
//     if (cachedAgent && cachedAgent.isInitialized) {
//         console.log(`Using cached agent for wallet: ${walletId}`);
        
//         // If tenant ID is provided, get the tenant agent
//         if (tenantId) {
//             console.log(`Getting tenant agent for tenant: ${tenantId}`);
//             return await cachedAgent.modules.tenants.getTenantAgent({
//                 tenantId
//             });
//         }
        
//         return cachedAgent;
//     }
    
//     // Initialize a new agent
//     try {
//         console.log(`Creating new agent for wallet: ${walletId}`);
//         const agent = await initializeAgent(walletId, walletKey);
        
//         // If tenant ID is provided, get the tenant agent
//         if (tenantId) {
//             console.log(`Getting tenant agent for tenant: ${tenantId}`);
//             return await agent.modules.tenants.getTenantAgent({
//                 tenantId
//             });
//         }
        
//         return agent;
//     } catch (error: any) {
//         // Check if wallet already exists
//         if (error.message?.includes('already exists')) {
//             // Attempt to open the existing wallet
//             console.log(`Wallet ${walletId} already exists, trying to open it`);
//             const agent = await initializeAgent(walletId, walletKey);
            
//             // If tenant ID is provided, get the tenant agent
//             if (tenantId) {
//                 console.log(`Getting tenant agent for tenant: ${tenantId}`);
//                 return await agent.modules.tenants.getTenantAgent({
//                     tenantId
//                 });
//             }
            
//             return agent;
//         }
        
//         console.error(`Failed to get agent for wallet ${walletId}:`, error);
//         throw error;
//     }
// }

// /**
//  * Create a tenant for an agent
//  */
// export async function createTenant(agent: Agent, config: { label: string }): Promise<any> {
//     return await agent.modules.tenants.createTenant({
//         config
//     });
// }

// /**
//  * Validate wallet credentials by attempting to initialize an agent
//  */
// export async function validateCredentials(walletId: string, walletKey: string): Promise<boolean> {
//     try {
//         await getAgent({ walletId, walletKey });
//         return true;
//     } catch (error) {
//         console.error(`Invalid credentials for wallet ${walletId}:`, error);
//         return false;
//     }
// } 