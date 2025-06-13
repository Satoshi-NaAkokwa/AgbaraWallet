export interface StarknetHistoryRequest {
  walletAddress: string;
  contractAddress?: string;
  pageKey?: string;
  pageSize?: string;
}

export interface StarknetTransaction {
  contractAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  blockNumber: number;
  blockTimestamp: string;
  transactionHash: string;
}

// https://docs.blastapi.io/blast-documentation/apis-documentation/builder-api/starknet/transaction/gettransaction-1
export interface StarknetHistoryResponse {
  walletAddress: string;
  tokenTransfers: StarknetTransaction[];
  count: number;
  nextPageKey: string;
}

export interface StarknetTokenBalancesRequest {
  walletAddress: string;
  currency?: string;
}

// htps://docs.blastapi.io/blast-documentation/apis-documentation/builder-api/starknet/wallet/getwallettokenbalances
export interface StarknetTokenBalance {
  contractAddress: string;
  contractDecimals: string;
  contractName: string;
  contractSymbol: string;
  balance: string;
  blockHash: string;
  blockTimestamp: string;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  // avnu data
  image: string;
  tokenFiatRate: number;
  tokenFiatRateCurrency: string;
  priceChangePercentage24h: number;
}

export interface StarknetTokenBalancesResponse {
  walletAddress: string;
  count: number;
  nextPageKey: string;
  tokenBalances: StarknetTokenBalance[];
}
