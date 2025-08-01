import type { NetworkType } from './network';

export type BlockchainType = 'btc' | 'stx' | 'starknet';
export type ExplorerType = 'mempool' | 'ordiscan' | 'blockchain' | 'hiro' | 'voyager' | 'starkscan' | 'custom';

export type UserExplorerStorage = Record<
  BlockchainType,
  | {
      id: ExplorerType;
      url?: never;
    }
  | {
      id: 'custom';
      url: string;
    }
>;

export type UserExplorerMap = Record<
  BlockchainType,
  {
    name: string;
    allowCustom?: boolean;
    fallback: string;
    singleTestnet?: boolean;
    // for chains that only have one testnet, eg. STACKS
    // instead of listing all network type just to have the same url, this variable will unify everything
    // so if user network.type is on Signet, this chain will always fall back to the Testnet's explorer
    explorers: Partial<
      Record<
        NetworkType,
        Partial<
          Record<
            ExplorerType,
            {
              name?: string;
              url: string;
            }
          >
        >
      >
    >;
  }
>;

export type GetExplorerForNetworkParams = {
  chain: BlockchainType;
  explorerId?: ExplorerType;
  txId?: string;
  network?: NetworkType;
};
