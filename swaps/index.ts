import type { FungibleToken, Quote, TokenBasic } from '../types';
import { CurrencyTypes, FungibleTokenProtocol, Protocol, Token } from '../types';
import { BigNumber } from '../utils/bignumber';

export const BAD_QUOTE_PERCENTAGE = 0.25;

export const supportedSwapProtocols: Protocol[] = ['runes', 'sip10']; // add more protocols here e.g. starknet in future

const protocolMap: Record<FungibleTokenProtocol, Protocol> = {
  runes: 'runes',
  stacks: 'sip10',
  starknet: 'starknet',
  'brc-20': 'brc20',
};

export const mapFtProtocolToProtocol = (ft: FungibleToken): Protocol => {
  if (ft.principal === 'BTC') return 'btc';
  if (ft.principal === 'STX') return 'stx';
  return protocolMap[ft.protocol];
};

export const mapFtToToken = (ft: FungibleToken): Token => ({
  ticker: ft.principal,
  protocol: mapFtProtocolToProtocol(ft),
  divisibility: ft.decimals ? Number(ft.decimals) : 0,
  symbol: ft.protocol === 'runes' ? ft.runeSymbol || undefined : ft.ticker || undefined,
  name: ft.name,
  logo: ft.image ?? ft.runeInscriptionId ?? ft.runeSymbol ?? undefined,
  ...(ft.protocol === 'stacks' && { contract: ft.principal }),
});

export const mapFtToTokenBasic = (token: FungibleToken): TokenBasic => ({
  ticker: token.principal,
  protocol: mapFtProtocolToProtocol(token),
});

export const getProtocolFromFtProtocolAndCurrencyTypes = (
  currency: CurrencyTypes,
  fungibleTokenProtocol?: FungibleTokenProtocol,
): Protocol => {
  if (fungibleTokenProtocol) {
    switch (fungibleTokenProtocol) {
      case 'stacks':
        return 'stx';
      case 'runes':
        return 'runes';
      case 'starknet':
        return 'starknet';
      case 'brc-20':
        return 'brc20';
      default:
    }
  }

  switch (currency) {
    case 'BTC':
      return 'btc';
    case 'STX':
      return 'stx';
    case 'FT':
    case 'NFT':
      return 'sip10';
    case 'brc20-Ordinal':
      return 'brc20';
    case 'Ordinal':
    case 'RareSat':
      return 'runes';
    case 'SN':
      return 'starknet';
    default:
      throw new Error('Unknown Currency', { cause: currency satisfies never });
  }
};

export const getProviderDetails = (amm: Quote) => {
  if (amm.provider.code === 'satsterminal') {
    return {
      name: amm.bestMarketplaceProvider?.name ?? amm.provider.name,
      logo: amm.bestMarketplaceProvider?.logo ?? amm.provider.logo,
    };
  }
  return {
    name: amm.provider.name,
    logo: amm.provider.logo,
  };
};

export const getProtocolSelectorLabel = (protocol?: Protocol, fromToken?: FungibleToken): string => {
  if (protocol === 'runes') {
    if (fromToken?.principal === 'BTC') {
      return 'Runes';
    }
    if (fromToken?.principal === 'STX') {
      return 'Bitcoin';
    }
    return 'Bitcoin & Runes';
  }
  if (protocol === 'sip10') {
    if (fromToken?.principal === 'BTC') {
      return 'Stacks';
    }
    if (fromToken?.principal === 'STX') {
      return 'SIP-10';
    }
    return 'Stacks & SIP-10';
  }
  return ''; // only runes and sip10 supported
};

export const getProtocolSelectorChain = (token: FungibleToken | undefined): Protocol => {
  if (!token) {
    return supportedSwapProtocols[0];
  }
  return protocolMap[token.protocol];
};

export const shouldResetSelectedFrom = (toProtocol: Protocol, fromToken?: FungibleToken): boolean => {
  if (fromToken) {
    const { protocol: fromProtocol, principal: fromPrincipal } = fromToken;
    if (fromProtocol === 'stacks' && toProtocol !== 'sip10' && fromPrincipal !== 'STX') {
      return true;
    }
    if (fromProtocol === 'runes' && toProtocol !== 'runes' && fromPrincipal !== 'BTC') {
      return true;
    }
  }
  return false;
};

/**
 * Generic function to calculate percentage difference between quotes.
 * Works for both regular quotes (receiveAmount) and UTXO quotes (floorRate).
 *
 * @param quotes - Array of quotes sorted appropriately for the quote type. Note that you NEED to sort your array FIRST. First index is ALWAYS the BEST.
 * @param index - Index of the quote to compare
 * @param valueKey - The property key to compare ('receiveAmount' or 'floorRate')
 * @param bestLabel - The label to return for the best quote
 * @param higherIsBetter - If true, higher values are better (receiveAmount). If false, lower values are better (floorRate)
 * @returns String indicating if it's the best quote or the percentage difference
 */
export const getQuotePercentageDifference = <T extends Record<string, string>>(
  quotes: T[],
  index: number,
  valueKey: keyof T,
  bestLabel: string = 'BEST',
  higherIsBetter = true,
): string => {
  // !quotes.length should never happen, since both FE only consume this when the array is not empty
  if (!quotes.length || index < 0 || index >= quotes.length) {
    return '0.00%';
  }

  if (quotes.length === 1) {
    return '';
  }

  if (index === 0) {
    return bestLabel;
  }

  const bestValue = new BigNumber(quotes[0]?.[valueKey] ?? 0);
  const currentValue = new BigNumber(quotes[index]?.[valueKey] ?? 0);

  let percentageDifference: BigNumber;
  if (higherIsBetter) {
    const difference = bestValue.minus(currentValue);
    percentageDifference = difference.div(bestValue).times(100);
  } else {
    const difference = currentValue.minus(bestValue);
    percentageDifference = difference.div(bestValue).times(100);
  }

  if (percentageDifference.isZero() || percentageDifference.isNaN() || !percentageDifference.isFinite()) {
    return '0.00%';
  }

  if (higherIsBetter) {
    return `-${percentageDifference.abs().toFixed(2)}%`;
  }

  return `+${percentageDifference.abs().toFixed(2)}%`;
};

/**
 * Convenience function for regular quotes (receiveAmount - higher is better)
 */
export const getReceiveAmountQuotePercentageDifference = (
  quotes: Array<{ receiveAmount: string }>,
  index: number,
  bestLabel: string = 'BEST',
): string => {
  return getQuotePercentageDifference(quotes, index, 'receiveAmount', bestLabel, true);
};

/**
 * Convenience function for UTXO quotes (floorRate - lower is better)
 */
export const getUtxoQuotePercentageDifference = (
  quotes: Array<{ floorRate: string }>,
  index: number,
  bestLabel: string = 'BEST',
): string => {
  return getQuotePercentageDifference(quotes, index, 'floorRate', bestLabel, false);
};
