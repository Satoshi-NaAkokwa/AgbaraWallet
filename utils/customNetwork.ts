import * as v from 'valibot';
import { SettingsNetwork } from '../types';
import { defaultMainnet, defaultRegtest, defaultSignet, defaultTestnet, defaultTestnet4 } from '../constant';

export const customNetworkSchema = v.object({
  /* For easier discrimination with xverse-core's `SettingsNetwork`s */
  _type: v.literal('custom-network'),
  id: v.string(),
  name: v.string(),
  chain: v.picklist(['btc', 'stx']), // we need this to properly show it on the Custom Network
  type: v.literal('Regtest'),
  address: v.optional(v.string(), ''),
  // NOTE: when chain is btc, address is not required.
  // previously done with "chain" variant but typing had issues
  // also, kept it optional since we dont need STACKS custom explorer for now
  btcApiUrl: v.string(),
  fallbackBtcApiUrl: v.optional(v.string(), ''),
  indexerUrl: v.string(),
  blockExplorerUrl: v.optional(v.string(), ''),
});

// Based on xverse-core's `SettingsNetwork type.`
export const settingsNetworkSchema = v.strictObject({
  type: v.picklist(['Mainnet', 'Testnet', 'Testnet4', 'Signet', 'Regtest']),
  address: v.string(),
  btcApiUrl: v.string(),
  fallbackBtcApiUrl: v.string(),
});

export const customNetworksSchema = v.array(customNetworkSchema);

export type CustomNetwork = v.InferOutput<typeof customNetworkSchema>;

export function isSettingsNetwork(n: unknown): n is SettingsNetwork {
  const parseResult = v.safeParse(settingsNetworkSchema, n);
  return parseResult.success;
}

export function isCustomNetwork(n: unknown): n is CustomNetwork {
  const parseResult = v.safeParse(customNetworkSchema, n);
  return parseResult.success;
}

export type GenericNetwork = SettingsNetwork | CustomNetwork;

export type CustomChainId = 'btc' | 'stx';

export type CustomNetworkInputs = Omit<CustomNetwork, 'type' | '_type' | 'id'>;

export const DefaultNetworkConfig: Record<SettingsNetwork['type'], SettingsNetwork> = {
  Mainnet: defaultMainnet,
  Testnet: defaultTestnet,
  Testnet4: defaultTestnet4,
  Signet: defaultSignet,
  Regtest: defaultRegtest,
};
