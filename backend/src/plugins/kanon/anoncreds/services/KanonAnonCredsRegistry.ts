import {
  AnonCredsRegistry,
  GetCredentialDefinitionReturn,
  GetRevocationRegistryDefinitionReturn,
  GetRevocationStatusListReturn,
  GetSchemaReturn,
  RegisterCredentialDefinitionOptions,
  RegisterCredentialDefinitionReturn,
  RegisterRevocationRegistryDefinitionOptions,
  RegisterRevocationRegistryDefinitionReturn,
  RegisterRevocationStatusListOptions,
  RegisterRevocationStatusListReturn,
  RegisterSchemaOptions,
  RegisterSchemaReturn,
} from "@credo-ts/anoncreds";
import { AgentContext } from "@credo-ts/core";
import {
  parsekanonDid,
} from "../../utils/identifiers";
import { KanonDIDResolver } from "../../dids";
import {
  KanonCreateResourceOptions,
  KanonDIDRegistrar,
} from "../../dids/KanonDidRegistrar";
import { uuid } from "@credo-ts/core/build/utils/uuid";
import { EthereumLedgerService } from "../../ledger";

export class KanonAnonCredsRegistry implements AnonCredsRegistry {
  public supportedIdentifier: RegExp = new RegExp(".*");

  public methodName = "kanon";
  public async getSchema(
    agentContext: AgentContext,
    schemaId: string
  ): Promise<GetSchemaReturn> {
    try {
      const kanonDidResolver =
        agentContext.dependencyManager.resolve(KanonDIDResolver);
      console.log(schemaId);
      const parsedDid = parsekanonDid(schemaId);
      console.log(parsedDid, "parsedDiddssd");
      console.log(schemaId, "schemaId");


      const response = await kanonDidResolver.resolveResource(
        agentContext,
        schemaId
      );
      console.log(response, "responsesdlkjd");
      return {
        schema: {
          attrNames: response.didDocument.schema.attrNames,
          name: response.didDocument.schema.name,
          version: response.didDocument.schema.version,
          issuerId: response.didDocument.schema.issuerId,
        },
        schemaId,
        resolutionMetadata: {},
        schemaMetadata: {},
      };
    } catch (error: any) {
      console.log(error);
      agentContext.config.logger.error(
        `Error retrieving schema '${schemaId}'`,
        {
          error,
          schemaId,
        }
      );

      return {
        schemaId,
        resolutionMetadata: {
          error: "notFound",
          message: `unable to resolve schema: ${error.message}`,
        },
        schemaMetadata: {},
      };
    }
  }
  public async registerSchema(
    agentContext: AgentContext,
    options: RegisterSchemaOptions
  ): Promise<RegisterSchemaReturn> {
    console.log(options, "options register schema");
    try {
      const kanonDisRegistrar =
        agentContext.dependencyManager.resolve(KanonDIDRegistrar);
      const schema = options.schema;
      const schemaResource = {
        id: uuid(),
        name: `${schema.name}-Schema`,
        resourceType: "anonCredsSchema",
        data: {
          name: schema.name,
          version: schema.version,
          attrNames: schema.attrNames,
          issuerId: schema.issuerId,
        },
        version: schema.version,
      } as KanonCreateResourceOptions;

      console.log(schema, "schemadsfgdsf");
      const response = await kanonDisRegistrar.createResource(
        agentContext,
        `${schema.issuerId}/resources/${schemaResource.id}`,
        {
          data: schemaResource,
          // @ts-ignore 
          network: options.network,
          issuerId: schema.issuerId,

        }
      
      );
      console.log(response, "response anoncreds");
      if (response.didState?.state === "failed") {
        throw new Error("Failed to register schema");
      }

      return {
        schemaState: {
          state: "finished",
          schema,
          schemaId: `${schema.issuerId}/resources/${schemaResource.id}`,
        },
        registrationMetadata: {},
        schemaMetadata: {},
      };
    } catch (error: any) {
      agentContext.config.logger.debug(
        `Error registering schema for did '${options.schema.issuerId}'`,
        {
          error,
          did: options.schema.issuerId,
          schema: options,
        }
      );

      return {
        schemaMetadata: {},
        registrationMetadata: {},
        schemaState: {
          state: "failed",
          schema: options.schema,
          reason: `unknownError: ${error.message}`,
        },
      };
    }
  }
  public async getCredentialDefinition(
    agentContext: AgentContext,
    credentialDefinitionId: string
  ): Promise<GetCredentialDefinitionReturn> {

    const ledgerService = agentContext.dependencyManager.resolve(
      EthereumLedgerService
    );
    console.log(credentialDefinitionId, "credentialDefinitionIdsdsd");
    const credentialDefinition = await ledgerService.getCredentialDefinition(
      credentialDefinitionId
    );
    console.log(credentialDefinition, "credentialDefinitionjhgfjhgsdfs");
    console.log(credentialDefinition[0], "credentialDefinitionjhgfjhgsdfs");
    const schemaId = credentialDefinition[0]
    const issuerId = credentialDefinition[1]
    console.log(credentialDefinition, "credentialDefinitionjhgfjhg");
    return {
      credentialDefinition: {
        issuerId: issuerId,
        schemaId: schemaId,
        tag: "credentialDefinition.tag",
        type: 'CL',
        value: {
          primary: {
            name: 'primary',
            
          }
        }
      },
      credentialDefinitionId,
      credentialDefinitionMetadata: {},
      resolutionMetadata: {},
    };
  }
  public async registerCredentialDefinition(
    agentContext: AgentContext,
    options: RegisterCredentialDefinitionOptions
  ): Promise<RegisterCredentialDefinitionReturn> {
    const kanonDisRegistrar =
      agentContext.dependencyManager.resolve(KanonDIDRegistrar);

    const credentialDefinition = options.credentialDefinition;
    const credentialDefinitionResource = {
      id: uuid(),
      name: `${credentialDefinition.tag}-CredentialDefinition`,
      resourceType: "anonCredsCredentialDefinition",
      data: {
        schemaId: credentialDefinition.schemaId,
        issuerId: credentialDefinition.issuerId,
        tag: credentialDefinition.tag,
      },

      // @ts-ignore 
      network: options.network,
      issuerId: credentialDefinition.issuerId,
      version: uuid(),
    } as KanonCreateResourceOptions;
    console.log(credentialDefinitionResource, "credentialDefinitionResource");
    const response = await kanonDisRegistrar.createCredentialDefinition(
      agentContext,
      credentialDefinitionResource.id!,
      credentialDefinitionResource
    );
    console.log(response, "response anoncredsdsds");

    return {
      credentialDefinitionState: {
        state: "finished",
        credentialDefinition,
        credentialDefinitionId: `${credentialDefinition.issuerId}/resources/${credentialDefinitionResource.id}`,
      },
      registrationMetadata: {},
      credentialDefinitionMetadata: {},
    };
  }
  getRevocationRegistryDefinition(
    agentContext: AgentContext,
    revocationRegistryDefinitionId: string
  ): Promise<GetRevocationRegistryDefinitionReturn> {
    throw new Error("Method not implemented.");
  }
  registerRevocationRegistryDefinition(
    agentContext: AgentContext,
    options: RegisterRevocationRegistryDefinitionOptions
  ): Promise<RegisterRevocationRegistryDefinitionReturn> {
    throw new Error("Method not implemented.");
  }
  getRevocationStatusList(
    agentContext: AgentContext,
    revocationRegistryId: string,
    timestamp: number
  ): Promise<GetRevocationStatusListReturn> {
    throw new Error("Method not implemented.");
  }
  registerRevocationStatusList(
    agentContext: AgentContext,
    options: RegisterRevocationStatusListOptions
  ): Promise<RegisterRevocationStatusListReturn> {
    throw new Error("Method not implemented.");
  }
}
