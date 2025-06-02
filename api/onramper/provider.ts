import axios, { AxiosInstance } from 'axios';
import {
  FetchBuyQuotesParams,
  FetchBuyQuotesResponse,
  FetchOnrampMetadataResponse,
  GetDefaultsResponse,
  InitiateTransactionParams,
  InitiateTransactionResponse,
  PaymentMethodsResponse,
  SupportedCurrenciesResponse,
} from '../../types/api/onramper';
import { ONRAMPER_API_URL } from '../../constant';

export class OnramperApi {
  private client: AxiosInstance;

  constructor(publicApiKey: string) {
    this.client = axios.create({
      baseURL: ONRAMPER_API_URL,
      headers: {
        Authorization: publicApiKey,
      },
      timeout: 5000,
    });
  }

  fetchSupportedCurrencies = async () => {
    const response = await this.client.get<SupportedCurrenciesResponse>('/supported');
    return response.data;
  };

  fetchPaymentMethods = async (source: string, target: string) => {
    const response = await this.client.get<PaymentMethodsResponse>(`/supported/payment-types/${source}`, {
      params: { destination: target },
    });
    return response.data;
  };

  fetchDefaults = async () => {
    const response = await this.client.get<GetDefaultsResponse>('/supported/defaults/all');
    return response.data;
  };

  fetchOnrampMetadata = async () => {
    const response = await this.client.get<FetchOnrampMetadataResponse>('/supported/onramps/all');
    return response.data;
  };

  fetchBuyQuotes = async (params: FetchBuyQuotesParams) => {
    const response = await this.client.get<FetchBuyQuotesResponse>(`/quotes/${params.fiat}/${params.crypto}`, {
      params: {
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        uuid: params.uuid,
      },
    });
    return response.data;
  };

  initiateTransaction = async (params: InitiateTransactionParams) => {
    const response = await this.client.post<InitiateTransactionResponse>('/checkout/intent', {
      onramp: params.onramp,
      source: params.source,
      destination: params.destination,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      type: 'buy',
      network: params.network,
      uuid: params.uuid,
      wallet: {
        address: params.walletAddress,
      },
      supportedParams: {
        partnerData: {
          redirectUrl: {
            success: params.successRedirectUrl || null,
            failure: params.failureRedirectUrl || null,
          },
          offrampCashoutRedirectUrl: null,
        },
      },
    });
    return response.data;
  };
}
