import type { ParsedDid } from "@credo-ts/core";

import { TypedArrayEncoder, utils } from "@credo-ts/core";
import { isBase58 } from "class-validator";

const ID_CHAR = "([a-z,A-Z,0-9,-])";
const NETWORK = "(testnet|mainnet)";
const IDENTIFIER = `((?:${ID_CHAR}*:)*(${ID_CHAR}+))`;
const PATH = `(/[^#?]*)?`;
const QUERY = `([?][^#]*)?`;
const VERSION_ID = `(.*?)`;
const FRAGMENT = `([#].*)?`;

export const kanonSdkAnonCredsRegistryIdentifierRegex = new RegExp(
  `^did:kanon:${NETWORK}:${IDENTIFIER}${PATH}${QUERY}${FRAGMENT}$`
);

export const kanonDidRegex = new RegExp(
  `^did:kanon:${NETWORK}:${IDENTIFIER}${QUERY}${FRAGMENT}$`
);
export const kanonDidVersionRegex = new RegExp(
  `^did:kanon:${NETWORK}:${IDENTIFIER}/version/${VERSION_ID}${QUERY}${FRAGMENT}$`
);
export const kanonDidVersionsRegex = new RegExp(
  `^did:kanon:${NETWORK}:${IDENTIFIER}/versions${QUERY}${FRAGMENT}$`
);
export const kanonDidMetadataRegex = new RegExp(
  `^did:kanon:${NETWORK}:${IDENTIFIER}/metadata${QUERY}${FRAGMENT}$`
);
export const kanonResourceRegex = new RegExp(
  `^did:kanon:${NETWORK}:${IDENTIFIER}/resources/${IDENTIFIER}${QUERY}${FRAGMENT}$`
);
export const kanonResourceMetadataRegex = new RegExp(
  `^did:kanon:${NETWORK}:${IDENTIFIER}/resources/${IDENTIFIER}/metadata${QUERY}${FRAGMENT}`
);

export type ParsedkanonDid = ParsedDid & { network: string };
export function parsekanonDid(didUrl: string): ParsedkanonDid | null {
  if (didUrl === "" || !didUrl) return null;
  const sections = didUrl.match(kanonSdkAnonCredsRegistryIdentifierRegex);
  if (sections) {
    if (
      !(
        utils.isValidUuid(sections[2]) ||
        (isBase58(sections[2]) &&
          TypedArrayEncoder.fromBase58(sections[2]).length == 16)
      )
    ) {
      return null;
    }
    const parts: ParsedkanonDid = {
      did: `did:kanon:${sections[1]}:${sections[2]}`,
      method: "kanon",
      network: sections[1],
      id: sections[2],
      didUrl,
    };
    if (sections[7]) {
      const params = sections[7].slice(1).split("&");
      parts.params = {};
      for (const p of params) {
        const kv = p.split("=");
        parts.params[kv[0]] = kv[1];
      }
    }
    if (sections[6]) parts.path = sections[6];
    if (sections[8]) parts.fragment = sections[8].slice(1);
    return parts;
  }
  return null;
}
