import axios, { AxiosInstance, AxiosResponse } from 'axios';

export type StarknetAvnuTokenDto = {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  logoUri?: string | null;
  coingeckoId?: string;
  verified: boolean;
  market: {
    currentPrice: number;
    marketCap: number;
    fullyDilutedValuation?: number | null;
    starknetTvl: number;
    priceChange1h: number;
    priceChangePercentage1h?: number | null;
    priceChange24h: number;
    priceChangePercentage24h?: number | null;
    priceChange7d: number;
    priceChangePercentage7d?: number | null;
    marketCapChange24h?: number | null;
    marketCapChangePercentage24h?: number | null;
    starknetVolume24h: number;
    starknetTradingVolume24h: number;
  };
  tags: string[];
};

export type AvnuGasTokenPrice = {
  tokenAddress: string;
  priceInETH: string;
  priceInUSD: number;
  decimals: number;
};

export type AvnuGasTokenPricesResponse = AvnuGasTokenPrice[];

export type CallDto = {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
};

export type BuildTypedDataRequest = {
  userAddress: string;
  calls: CallDto[];
  gasTokenAddress?: string;
  maxGasTokenAmount?: string;
  accountClassHash?: string;
};

export type TypedData = {
  types: Record<string, Array<{ name: string; type: string }>>;
  domain: Record<string, any>;
  primaryType: string;
  message: Record<string, any>;
};

export type ExecuteRequest = {
  userAddress: string;
  signature: string[];
  typedData: string; // YES, string. JSONified TypedData
  deploymentData?: Record<string, any>;
};

export type ExecuteResponse = {
  transactionHash: string;
};

export class AvnuApi {
  private marketsClient: AxiosInstance;

  private paymasterClient: AxiosInstance;

  constructor(marketsBaseUrl = 'https://starknet.impulse.avnu.fi', paymasterBaseUrl = 'https://starknet.api.avnu.fi') {
    this.marketsClient = axios.create({
      baseURL: marketsBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.paymasterClient = axios.create({
      baseURL: paymasterBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get detailed information of a token.
   * @param tokenAddress The Starknet token address (hex format).
   * @returns Promise resolving to the token details.
   */
  async getTokenInfo(tokenAddress: string): Promise<StarknetAvnuTokenDto> {
    const response: AxiosResponse<StarknetAvnuTokenDto> = await this.marketsClient.get(`/v1/tokens/${tokenAddress}`);
    return response.data;
  }

  /**
   * Fetches the list of tokens supported by AVNU for gasless/paymaster transactions,
   * along with their prices in ETH and USD.
   * @returns A promise that resolves to an array of supported gas tokens and their prices.
   */
  public async getGasTokenPrices(): Promise<AvnuGasTokenPricesResponse> {
    const response = await this.paymasterClient.get<AvnuGasTokenPricesResponse>('/paymaster/v1/gas-token-prices');
    return response.data;
  }

  public async buildTypedData(request: BuildTypedDataRequest, askSignature = false): Promise<TypedData> {
    const headers: Record<string, string> = {};
    if (askSignature) headers['ask-signature'] = 'true';
    const response = await this.paymasterClient.post<TypedData>('/paymaster/v1/build-typed-data', request, { headers });
    return response.data;
  }

  public async execute(request: ExecuteRequest, askSignature = false): Promise<ExecuteResponse> {
    const headers: Record<string, string> = {};
    if (askSignature) headers['ask-signature'] = 'true';
    const response = await this.paymasterClient.post<ExecuteResponse>('/paymaster/v1/execute', request, { headers });
    return response.data;
  }
}
