import 'reflect-metadata';
import { Agent, ConsoleLogger, LogLevel, DidsModule, HttpOutboundTransport, WsOutboundTransport, ConnectionsModule, CredentialsModule, OutOfBandModule, AutoAcceptCredential, KeyType, TypedArrayEncoder } from '@credo-ts/core';
import { agentDependencies, HttpInboundTransport } from '@credo-ts/node';
import { AskarModule } from '@credo-ts/askar';
import { ariesAskar } from '@hyperledger/aries-askar-nodejs';
import { TenantsModule } from '@credo-ts/tenants';
import type { InitConfig } from '@credo-ts/core';
import type { AskarMultiWalletDatabaseScheme } from '@credo-ts/askar';
import { anoncreds } from '@hyperledger/anoncreds-nodejs'
import { AnonCredsModule } from '@credo-ts/anoncreds';
import { CheqdAnonCredsRegistry, CheqdDidRegistrar, CheqdDidResolver, CheqdModule, CheqdModuleConfig } from '@credo-ts/cheqd';
import { KanonDIDResolver } from '../plugins/kanon/dids/KanonDidResolver';
import { KanonDIDRegistrar } from '../plugins/kanon/dids/KanonDidRegistrar';
import { KanonModuleConfig } from '../plugins/kanon/KanonModuleConfig';
import { EthereumLedgerService } from '../plugins/kanon/ledger';
import { EthereumModule } from '../plugins/kanon/KanonModule';
import { KanonAnonCredsRegistry } from '../plugins/kanon/anoncreds/services/KanonAnonCredsRegistry';
import dotenv from 'dotenv';

dotenv.config();

const agentPort = process.env.AGENT_PORT ? parseInt(process.env.AGENT_PORT) : 3003;
const agentEndpoint = process.env.AGENT_ENDPOINT || `http://localhost:${agentPort}`;

const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545/";
const ethereumPrivateKey = process.env.ETHEREUM_PRIVATE_KEY || "";

let mainAgent: Agent | null = null;

const tenantAgentCache: Record<string, Agent> = {};

const cosmosPayerSeed = process.env.COSMOS_PAYER_SEED || 'rack finger orange small grab regular shy oyster spread history mechanic shock';

async function initializeAgent(walletId: string, walletKey: string, multiWalletDatabaseScheme?: AskarMultiWalletDatabaseScheme): Promise<Agent> {
    console.log(`Initializing agent for wallet: ${walletId}`);

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


        const agent = new Agent({
            config,
            dependencies: agentDependencies,
            modules: {
                tenants: new TenantsModule(),
                askar: new AskarModule({
                    ariesAskar: ariesAskar,
                    multiWalletDatabaseScheme
                }),
                dids: new DidsModule({
                    resolvers: [new CheqdDidResolver(), new KanonDIDResolver(ledgerService)],
                    registrars: [new CheqdDidRegistrar(), new KanonDIDRegistrar(ledgerService)],
                }),
                connections: new ConnectionsModule({
                    autoAcceptConnections: true,
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

/**
 * Get or create an agent for a wallet ID
 */
export async function getAgent({
    tenantId
}: {
    tenantId?: string
}): Promise<Agent> {
    console.log(`Getting agent for tenant: ${tenantId}`);
    console.log(`Main agent: ${mainAgent}`);
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
            const tenantAgent = await mainAgent.modules.tenants.getTenantAgent({
                tenantId
            });
            

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

        const tenantAgent = await agent.modules.tenants.getTenantAgent({
            tenantId
        });

        tenantAgentCache[tenantId] = tenantAgent;
        console.log(`Cached tenant agent for tenant: ${tenantId}`);

        return tenantAgent;
    } catch (error: any) {
        if (error.message?.includes('already exists')) {
            console.log(`Wallet already exists, trying to open it`);
            const walletId = process.env.MAIN_WALLET_ID || 'main-wallet';
            const walletKey = process.env.MAIN_WALLET_KEY || 'main-wallet-key';

            const agent = await initializeAgent(walletId, walletKey);

            const tenantAgent = await agent.modules.tenants.getTenantAgent({
                tenantId
            });

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
export async function createTenant(config: { label: string }): Promise<any> {
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

    const tenant = await mainAgent.modules.tenants.createTenant({ config });



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