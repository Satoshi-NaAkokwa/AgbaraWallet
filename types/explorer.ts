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
