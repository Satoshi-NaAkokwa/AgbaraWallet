import type { FungibleToken, Quote, TokenBasic } from '../types';
import { CurrencyTypes, FungibleTokenProtocol, Protocol, Token } from '../types';

export const BAD_QUOTE_PERCENTAGE = 0.25;

export const mapFtProtocolToProtocol = (ft: FungibleToken): Protocol => {
  if (ft.principal === 'BTC') return 'btc';
  if (ft.principal === 'STX') return 'stx';
  const protocolMap: Record<FungibleTokenProtocol, Protocol> = {
    runes: 'runes',
    stacks: 'sip10',
    starknet: 'starknet',
    'brc-20': 'brc20',
  };
  return protocolMap[ft.protocol];
};

export const mapFtToToken = (ft: FungibleToken): Token => ({
  ticker: ft.principal,
  protocol: mapFtProtocolToProtocol(ft),
  divisibility: ft.decimals ? Number(ft.decimals) : 0,
  symbol: ft.protocol === 'runes' ? ft.runeSymbol || undefined : ft.ticker || undefined,
  name: ft.name,
  logo: ft.image ?? ft.runeInscriptionId ?? ft.runeSymbol ?? undefined,
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
