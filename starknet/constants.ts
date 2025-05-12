// https://github.com/argentlabs/argent-contracts-starknet/blob/main/deployments/account.txt

import { constants } from 'starknet';

// The account contract can be recompiled for cheaper gas (Cairo Native).
// Argent hasn't done so yet, on 17th April the ETA on their side was 3+ months out
// eslint-disable-next-line @typescript-eslint/naming-convention
export const argentXContractClassHashV0_4_0 = '0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f';

// https://github.com/satoshilabs/slips/blob/master/slip-0044.md
export const starknetCoinType = "9004'";

export const STARKNET_STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
export const STARKNET_ETH_TOKEN_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
export const STARKNET_EKUBO_TOKEN_ADDRESS = '0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87';
export const STARKNET_WBTC_TOKEN_ADDRESS = '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac';

export const networkNameToApi: Record<constants.NetworkName, string> = {
  [constants.NetworkName.SN_MAIN]: 'https://free-rpc.nethermind.io/mainnet-juno/v0_8', // api-3.xverse.app/starknet/rpc
  [constants.NetworkName.SN_SEPOLIA]: 'https://free-rpc.nethermind.io/sepolia-juno/v0_8',
};
