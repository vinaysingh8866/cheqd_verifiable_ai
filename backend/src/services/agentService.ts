import 'reflect-metadata';
import { Agent, ConsoleLogger, LogLevel, DidsModule, HttpOutboundTransport, WsOutboundTransport, ConnectionsModule, CredentialsModule, OutOfBandModule, AutoAcceptCredential, KeyType, TypedArrayEncoder, V2CredentialProtocol, ProofsModule, AutoAcceptProof, V2ProofProtocol } from '@credo-ts/core';
import { agentDependencies, HttpInboundTransport } from '@credo-ts/node';
import { AskarModule } from '@credo-ts/askar';
import { ariesAskar } from '@hyperledger/aries-askar-nodejs';
import { TenantsModule } from '@credo-ts/tenants';
import type { InitConfig } from '@credo-ts/core';
import { AskarMultiWalletDatabaseScheme } from '@credo-ts/askar';
import { anoncreds } from '@hyperledger/anoncreds-nodejs'
import { CheqdAnonCredsRegistry, CheqdDidRegistrar, CheqdDidResolver, CheqdModule, CheqdModuleConfig } from '@credo-ts/cheqd';
import { KanonDIDResolver } from '../plugins/kanon/dids/KanonDidResolver';
import { KanonDIDRegistrar } from '../plugins/kanon/dids/KanonDidRegistrar';
import { KanonModuleConfig } from '../plugins/kanon/KanonModuleConfig';
import { EthereumLedgerService } from '../plugins/kanon/ledger';
import { EthereumModule } from '../plugins/kanon/KanonModule';
import { KanonAnonCredsRegistry } from '../plugins/kanon/anoncreds/services/KanonAnonCredsRegistry';
import dotenv from 'dotenv';
import {
    AnonCredsCredentialFormatService,
    AnonCredsModule,
    AnonCredsProofFormatService,
    LegacyIndyCredentialFormatService,
    LegacyIndyProofFormatService,
    V1CredentialProtocol,
    V1ProofProtocol,
} from '@credo-ts/anoncreds'
dotenv.config();

const agentPort = process.env.AGENT_PORT ? parseInt(process.env.AGENT_PORT) : 3003;
const agentEndpoint = process.env.AGENT_ENDPOINT || `http://147.182.218.241:${agentPort}`;

const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545/";
const ethereumPrivateKey = process.env.ETHEREUM_PRIVATE_KEY || "";

// Increased session timeout (from default 1000ms to 5000ms)
const AGENT_SESSION_TIMEOUT = process.env.AGENT_SESSION_TIMEOUT ? parseInt(process.env.AGENT_SESSION_TIMEOUT) : 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

let mainAgent: Agent | null = null;

interface Tenant {
    id: string;
    tenantId: string;
    config: any;
}

const tenantAgentCache: Record<string, Agent<any>> = {};

const cosmosPayerSeed = process.env.COSMOS_PAYER_SEED || 'rack finger orange small grab regular shy oyster spread history mechanic shock';

async function initializeAgent(walletId: string, walletKey: string, multiWalletDatabaseScheme?: AskarMultiWalletDatabaseScheme): Promise<Agent> {

    const config: InitConfig = {
        label: `CredoAgent-${walletId}`,
        walletConfig: {
            id: walletId,
            key: walletKey,
        },
        endpoints: [agentEndpoint],
        logger: new ConsoleLogger(LogLevel.debug),
    };
    const ethConfig = new KanonModuleConfig({
        networks: [
            {
                network: "testnet",
                rpcUrl: ethereumRpcUrl,
                privateKey: ethereumPrivateKey,
            },
        ],
    });
    const ledgerService = new EthereumLedgerService(ethConfig);
    try {

        // did:cheqd:testnet:e6a2015b-3d0e-462a-bf8b-88872553867d/resources/d99ac606-ab4b-4957-97c5-bf97438b2180
        const agent = new Agent({
            config,
            dependencies: agentDependencies,
            modules: {
                tenants: new TenantsModule({
                    sessionAcquireTimeout: AGENT_SESSION_TIMEOUT
                }),
                askar: new AskarModule({
                    ariesAskar: ariesAskar,
                    // Database per wallet
                    multiWalletDatabaseScheme: AskarMultiWalletDatabaseScheme.DatabasePerWallet
                }),
                dids: new DidsModule({
                    resolvers: [new CheqdDidResolver(), new KanonDIDResolver(ledgerService)],
                    registrars: [new CheqdDidRegistrar(), new KanonDIDRegistrar(ledgerService)],
                }),
                connections: new ConnectionsModule({
                    autoAcceptConnections: true,
                }),
                proofs: new ProofsModule({
                    autoAcceptProofs: AutoAcceptProof.Always,
                    proofProtocols: [
                      new V2ProofProtocol({
                        proofFormats: [new AnonCredsProofFormatService()],
                      }),
                    ],
                  }),
                kanon: new EthereumModule(ethConfig),
                cheqd: new CheqdModule(
                    new CheqdModuleConfig({
                        networks: [
                            {
                                network: 'testnet',
                                cosmosPayerSeed,
                            },
                        ],
                    })
                ),
                credentials: new CredentialsModule({
                    autoAcceptCredentials: AutoAcceptCredential.Always,
                    credentialProtocols: [
                        new V2CredentialProtocol({
                            credentialFormats: [new AnonCredsCredentialFormatService()],
                        }),
                    ],
                }),
                oob: new OutOfBandModule(),
                anoncreds: new AnonCredsModule({
                    registries: [new CheqdAnonCredsRegistry(), new KanonAnonCredsRegistry()],
                    anoncreds,
                }),
            },
        });

        agent.registerOutboundTransport(new HttpOutboundTransport());
        agent.registerOutboundTransport(new WsOutboundTransport());


        console.log(`Registering HTTP inbound transport on port ${agentPort}`);
        agent.registerInboundTransport(new HttpInboundTransport({ port: agentPort }));

        await agent.initialize();
        console.log(`Agent initialized successfully for wallet: ${walletId}`);

        mainAgent = agent;

        return agent;
    } catch (error) {
        console.error(`Failed to initialize agent: ${error}`);
        throw error;
    }
}

// Helper function to implement retries with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries <= 0 || !error.message?.includes('Failed to acquire an agent context session')) {
            throw error;
        }
        
        console.log(`Operation failed, retrying in ${delay}ms (${retries} retries left): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 1.5); // Exponential backoff
    }
}

/**
 * Get or create an agent for a wallet ID
 */
export async function getAgent({
    tenantId
}: {
    tenantId?: string
}): Promise<Agent<any>> {
    console.log(`Getting agent for tenant: ${tenantId}`);
    
    if (!tenantId) {
        throw new Error('Tenant ID is required');
    }

    if (tenantAgentCache[tenantId]) {
        console.log(`Using cached tenant agent for tenant: ${tenantId}`);
        return tenantAgentCache[tenantId];
    }
    
    if (mainAgent) {
        console.log(`Using existing main agent for tenant: ${tenantId}`);

        try {
            const tenantAgent = await withRetry(() => mainAgent!.modules.tenants.getTenantAgent({
                tenantId
            })) as Agent<any>;

            tenantAgentCache[tenantId] = tenantAgent;
            console.log(`Cached tenant agent for tenant: ${tenantId}`);

            return tenantAgent;
        } catch (error) {
            console.error(`Error getting tenant agent: ${error}`);
            throw error;
        }
    }

    try {
        console.log(`Main agent not initialized. Creating new main agent.`);
        const walletId = process.env.MAIN_WALLET_ID || 'main-wallet';
        const walletKey = process.env.MAIN_WALLET_KEY || 'main-wallet-key';

        const agent = await initializeAgent(walletId, walletKey);

        const tenantAgent = await withRetry(() => agent.modules.tenants.getTenantAgent({
            tenantId
        })) as Agent<any>;

        tenantAgentCache[tenantId] = tenantAgent;
        console.log(`Cached tenant agent for tenant: ${tenantId}`);

        return tenantAgent;
    } catch (error: any) {
        if (error.message?.includes('already exists')) {
            console.log(`Wallet already exists, trying to open it`);
            const walletId = process.env.MAIN_WALLET_ID || 'main-wallet';
            const walletKey = process.env.MAIN_WALLET_KEY || 'main-wallet-key';

            const agent = await initializeAgent(walletId, walletKey);

            const tenantAgent = await withRetry(() => agent.modules.tenants.getTenantAgent({
                tenantId
            })) as Agent<any>;

            tenantAgentCache[tenantId] = tenantAgent;
            console.log(`Cached tenant agent for tenant: ${tenantId}`);

            return tenantAgent;
        }

        console.error(`Failed to get agent for tenant ${tenantId}:`, error);
        throw error;
    }
}

/**
 * Get the main agent
 */
export async function getMainAgent(): Promise<Agent> {
    if (!mainAgent) {
        throw new Error('Main agent not initialized');
    }
    return mainAgent;
}

/**
 * Create a tenant for an agent
 */
export async function createTenant(config: { label: string }): Promise<Tenant> {
    if (!mainAgent || !mainAgent.isInitialized) {
        console.log(`Initializing main agent for tenant creation`);

        await initializeAgent(
            process.env.MAIN_WALLET_ID || 'main-wallet',
            process.env.MAIN_WALLET_KEY || 'main-wallet-key'
        );
    }

    if (!mainAgent) {
        throw new Error('Failed to initialize main agent');
    }

    const tenant = await withRetry(() => mainAgent!.modules.tenants.createTenant({ config })) as Tenant;

    if (tenant && tenant.tenantId && tenantAgentCache[tenant.tenantId]) {
        delete tenantAgentCache[tenant.tenantId];
        console.log(`Cleared cached tenant agent for recreated tenant: ${tenant.tenantId}`);
    }

    return tenant;
}

/**
 * Validate wallet credentials by attempting to initialize an agent
 */
export async function validateCredentials(tenantId: string): Promise<boolean> {
    try {
        await getAgent({ tenantId });
        return true;
    } catch (error) {
        console.error(`Invalid credentials for tenant ${tenantId}:`, error);
        return false;
    }
}

/**
 * Initialize the agent system - should be called once when the Express server starts
 */
export async function initializeAgentSystem(): Promise<void> {

    if (mainAgent) {
        return;
    }
    if (process.env.DEFAULT_ADMIN_WALLET_ID && process.env.DEFAULT_ADMIN_WALLET_KEY) {
        try {
            console.log('Initializing default admin agent...');
            await initializeAgent(
                process.env.DEFAULT_ADMIN_WALLET_ID,
                process.env.DEFAULT_ADMIN_WALLET_KEY
            );
            console.log('Default admin agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize default admin agent:', error);
        }
    } else {

        try {
            console.log('Initializing default main agent...');
            await initializeAgent('main-wallet', 'main-wallet-key');
            console.log('Default main agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize default main agent:', error);
        }
    }
} 