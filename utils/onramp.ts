import { currencySymbolMap, SupportedCurrency } from '../types/currency';
import {
  BuyQuote,
  BuyQuoteError,
  BuyQuoteSuccess,
  CurrencyTypes,
  FetchBuyQuotesResponse,
  FiatCurrency,
  FungibleToken,
  GetDefaultsResponse,
  PaymentMethodsResponse,
  QuoteError,
  SupportedCurrenciesResponse,
} from '../types';
import { BigNumber } from './bignumber';
import { getFiatBtcEquivalent, getStxTokenEquivalent } from '../currency';
import {
  STARKNET_STRK_TOKEN_ADDRESS,
  STARKNET_USDC_TOKEN_ADDRESS,
  STARKNET_WBTC_TOKEN_ADDRESS,
} from '../starknet/constants';

export const SUPPORTED_STARKNET_FT_TOKENS = {
  [STARKNET_WBTC_TOKEN_ADDRESS]: {
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    onramperId: 'wbtc_starknet',
    network: 'starknet',
    decimals: 8,
  },
  [STARKNET_STRK_TOKEN_ADDRESS]: {
    name: 'Starknet',
    symbol: 'STRK',
    onramperId: 'strk_starknet',
    network: 'starknet',
    decimals: 18,
  },
  [STARKNET_USDC_TOKEN_ADDRESS]: {
    name: 'USD Coin',
    symbol: 'USDC',
    onramperId: 'usdc_starknet',
    network: 'starknet',
    decimals: 6,
  },
};

export const SUPPORTED_CRYPTO_CURRENCIES = [
  { name: 'Bitcoin', symbol: 'BTC', onramperId: 'btc', network: 'bitcoin', decimals: 8 },
  { name: 'Stacks', symbol: 'STX', onramperId: 'stx_stacks', network: 'stacks', decimals: 6 },
  ...Object.values(SUPPORTED_STARKNET_FT_TOKENS),
] as const;

const PRESET_AMOUNTS: Record<FiatCurrency['code'], string[]> = {
  USD: ['100', '500', '1000'],
  EUR: ['100', '500', '1000'],
  CNY: ['700', '3500', '7000'],
  JPY: ['11000', '55000', '110000'],
  GBP: ['100', '450', '900'],
  INR: ['2000', '10000', '20000'],
  RUB: ['1500', '7500', '15000'],
  BRL: ['300', '1500', '3000'],
  KRW: ['130000', '650000', '1300000'],
  CAD: ['100', '550', '1100'],
  AUD: ['100', '600', '1200'],
  MXN: ['1200', '6000', '12000'],
  IDR: ['1400000', '7000000', '14000000'],
  TRY: ['1000', '5000', '10000'],
  SAR: ['400', '1900', '3800'],
  ZAR: ['1200', '6000', '12000'],
  CHF: ['100', '450', '900'],
};

export const REFETCH_QUOTES_INTERVAL_SECONDS = 30;

export const getPresetValuesByCurrencyCode = (code: FiatCurrency['code'] | string): string[] | null =>
  PRESET_AMOUNTS[code] ?? null;

export function isFiatCurrencyConversionSupported(
  buyingFiatCurrency: string | SupportedCurrency,
): buyingFiatCurrency is SupportedCurrency {
  return Object.keys(currencySymbolMap).includes(buyingFiatCurrency || '');
}

export function convertFiatToCrypto(
  buyAmount: string,
  btcFiatRate: BigNumber,
  stxBtcRate: BigNumber,
  selectedCrypto: (typeof SUPPORTED_CRYPTO_CURRENCIES)[number]['symbol'],
  ft?: FungibleToken,
) {
  const fiatValue = BigNumber(buyAmount || '0');

  if (fiatValue.lte(0) || btcFiatRate.lte(0) || stxBtcRate.lte(0)) {
    return '0';
  }

  if (selectedCrypto === 'BTC') {
    return getFiatBtcEquivalent(fiatValue, btcFiatRate).decimalPlaces(8).toFixed();
  }

  if (selectedCrypto === 'STX') {
    return getStxTokenEquivalent(fiatValue, btcFiatRate, stxBtcRate).decimalPlaces(6).toFixed();
  }

  const ftTokenSymbols = Object.values(SUPPORTED_STARKNET_FT_TOKENS).map((token) => token.symbol);
  if (ftTokenSymbols.includes(selectedCrypto) && ft?.tokenFiatRate && ft.tokenFiatRate > 0) {
    return fiatValue
      .dividedBy(ft.tokenFiatRate)
      .decimalPlaces(ft.decimals ?? 0)
      .toFixed();
  }
}

interface SplitQuotes {
  recommended: BuyQuoteSuccess[];
  other: BuyQuoteSuccess[];
}

// Type guard to check if a quote is a successful quote (not an error quote)
const isSuccessfulQuote = (quote: BuyQuote): quote is BuyQuoteSuccess =>
  !('errors' in quote && Array.isArray(quote.errors) && quote.errors.length > 0);

export const splitQuotes = (quotes: FetchBuyQuotesResponse) => {
  const validQuotes = quotes.filter(isSuccessfulQuote);

  const groupedQuotes = validQuotes.reduce<SplitQuotes>(
    (acc, quote) => {
      if (quote.recommendations && quote.recommendations.length > 0) {
        acc.recommended.push(quote);
      } else {
        acc.other.push(quote);
      }
      return acc;
    },
    { recommended: [], other: [] },
  );

  return { recommended: groupedQuotes.recommended, other: groupedQuotes.other };
};

export const getDefaultFiatCurrency = (
  defaults?: GetDefaultsResponse,
  supportedCurrencies?: SupportedCurrenciesResponse,
) => {
  const recommendedFiatCurrencyCode = defaults?.message.recommended.source;
  const fiatCurrencies = supportedCurrencies?.message.fiat;

  const defaultFiatCurrency = fiatCurrencies?.find((fiat) => fiat.code === recommendedFiatCurrencyCode);

  return defaultFiatCurrency || fiatCurrencies?.find((fiat) => fiat.code === 'USD') || fiatCurrencies?.[0];
};

export const getDefaultPaymentMethod = (
  defaultPaymentMethodId: GetDefaultsResponse['message']['recommended']['paymentMethod'],
  paymentMethods: PaymentMethodsResponse['message'],
): PaymentMethodsResponse['message'][number] | undefined => {
  const recommended = paymentMethods.find((item) => item.paymentTypeId === defaultPaymentMethodId);
  const creditCard = paymentMethods.find((item) => item.paymentTypeId === 'creditcard');

  return creditCard || recommended || paymentMethods[0];
};

const isErrorQuote = (quote: BuyQuote): quote is BuyQuoteError => {
  return Array.isArray((quote as BuyQuoteError).errors);
};

export const allQuotesAreErrors = (quotes: BuyQuote[]): boolean => {
  return quotes.length > 0 && quotes.every(isErrorQuote);
};

// Find a "limit" error if one exists
const findLimitError = (
  quotes: BuyQuoteError[],
): (QuoteError & { minAmount: number; maxAmount: number }) | undefined => {
  return quotes
    .flatMap((q) => q.errors)
    .find(
      (e): e is QuoteError & { minAmount: number; maxAmount: number } =>
        e.type === 'LimitMismatch' && 'minAmount' in e && 'maxAmount' in e,
    );
};

export const getQuotesErrorMessage = (
  quotes: BuyQuoteError[],
): { code: 'no_quotes_for_params' } | { code: 'no_quotes_between'; minBuyAmount: number; maxBuyAmount: number } => {
  // Everything is “no support at all”
  if (
    quotes.every((q) =>
      q.errors.every((e) => e.type === 'NoSupportedPaymentFound' || e.type === 'QuoteParameterMismatch'),
    )
  ) {
    return { code: 'no_quotes_for_params' };
  }

  // At least one provider says “you’re outside our limits”
  const limitErr = findLimitError(quotes.filter(isErrorQuote));
  if (limitErr) {
    return {
      code: 'no_quotes_between',
      minBuyAmount: limitErr.minAmount,
      maxBuyAmount: limitErr.maxAmount,
    };
  }

  return { code: 'no_quotes_for_params' };
};

export const getIsAllowedOnrampCurrency = (currency: CurrencyTypes, ft?: FungibleToken) => {
  const isChainToken = currency === 'BTC' || currency === 'STX';
  const isValidFT =
    (currency === 'SN' || currency === 'FT') &&
    ft &&
    SUPPORTED_STARKNET_FT_TOKENS[ft.principal as keyof typeof SUPPORTED_STARKNET_FT_TOKENS];

  return isChainToken || isValidFT;
};
