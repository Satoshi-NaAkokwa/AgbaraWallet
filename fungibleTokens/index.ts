import { BigNumber } from '../utils/bignumber';
import {
  CurrencyTypes,
  type FungibleToken,
  FungibleTokenProtocol,
  type FungibleTokenStates,
  Protocol,
  type RuneBalance,
  Token,
} from '../types';

export const runeTokenToFungibleToken = (runeBalance: RuneBalance): FungibleToken => ({
  name: runeBalance.runeName,
  decimals: runeBalance.divisibility,
  principal: runeBalance.id,
  balance: runeBalance.amount.toFixed(),
  total_sent: '',
  total_received: '',
  assetName: runeBalance.runeName,
  ticker: '',
  runeSymbol: runeBalance.symbol,
  runeInscriptionId: runeBalance.inscriptionId,
  protocol: 'runes',
  supported: true, // all runes are supported
  priceChangePercentage24h: runeBalance.priceChangePercentage24h?.toString(),
  currentPrice: runeBalance.currentPrice?.toString(),
});

/**
 * Logic for determining the derived UI state of a fungible token
 *
 * Extend this if any of the business logic changes around when a token shows
 * up in spam, in manage tokens, is included in account balance etc.
 */
export const getFungibleTokenStates = ({
  fungibleToken,
  manageTokens,
  spamTokens,
  showSpamTokens,
}: {
  fungibleToken: FungibleToken;
  manageTokens?: Record<string, boolean | undefined>;
  spamTokens?: string[];
  showSpamTokens?: boolean;
}): FungibleTokenStates => {
  const hasBalance = new BigNumber(fungibleToken.balance).gt(0);
  const isSpam = showSpamTokens ? false : !!spamTokens?.includes(fungibleToken.principal);
  const isUserEnabled = manageTokens?.[fungibleToken.principal]; // true=enabled, false=disabled, undefined=not set
  const isDefaultEnabled = fungibleToken.supported && hasBalance && !isSpam;
  const isEnabled = isUserEnabled || !!(isUserEnabled === undefined && isDefaultEnabled);
  const showToggle = isEnabled || (hasBalance && !isSpam);

  return {
    isSpam,
    isEnabled,
    showToggle,
  };
};

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

export const mapProtocolToFtProtocol = (protocol: Protocol): FungibleTokenProtocol => {
  const protocolMap: Record<Protocol, FungibleTokenProtocol> = {
    btc: 'runes',
    stx: 'stacks',
    runes: 'runes',
    sip10: 'stacks',
    starknet: 'starknet',
    brc20: 'brc-20',
  };
  return protocolMap[protocol];
};

export const mapTokenToFt = (token: Token): FungibleToken => ({
  protocol: mapProtocolToFtProtocol(token.protocol),
  ticker: token.symbol,
  name: token.name ?? token.ticker,
  assetName: token.name ?? token.ticker,
  principal: token.ticker,
  balance: '0',
  decimals: token.divisibility,
  image: token.logo,
  total_received: '0',
  total_sent: '0',
  runeSymbol: token.symbol,
  runeInscriptionId: token.logo,
});

export const mapFtToToken = (ft: FungibleToken): Token => ({
  ticker: ft.principal,
  protocol: mapFtProtocolToProtocol(ft),
  divisibility: ft.decimals ? Number(ft.decimals) : 0,
  symbol: ft.protocol === 'runes' ? ft.runeSymbol || undefined : ft.ticker || undefined,
  name: ft.name,
  logo: ft.image ?? ft.runeInscriptionId ?? ft.runeSymbol ?? undefined,
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
