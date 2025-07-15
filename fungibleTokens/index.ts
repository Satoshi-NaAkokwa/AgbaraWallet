import { BigNumber } from '../utils/bignumber';
import {
  Brc20Token,
  CurrencyTypes,
  type FungibleToken,
  FungibleTokenProtocol,
  type FungibleTokenStates,
  Protocol,
  type RuneBalance,
  Token,
} from '../types';
import { STARKNET_WBTC_TOKEN_ADDRESS } from '../starknet/constants';

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
 * Determines if a token should have its balance constraint removed
 * This function can be extended to add more tokens that don't require balance
 */
const shouldRemoveBalanceConstraintForToken = (fungibleToken: FungibleToken): boolean => {
  const tokensWithoutBalanceConstraint: string[] = [STARKNET_WBTC_TOKEN_ADDRESS];

  return tokensWithoutBalanceConstraint.includes(fungibleToken.principal);
};

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

  // Determine if this token should have balance constraint removed
  const shouldRemoveBalanceConstraint = shouldRemoveBalanceConstraintForToken(fungibleToken);

  const isDefaultEnabled = fungibleToken.supported && (shouldRemoveBalanceConstraint || hasBalance) && !isSpam;

  const isEnabled = isUserEnabled || !!(isUserEnabled === undefined && isDefaultEnabled);
  const showToggle = isEnabled || ((hasBalance || shouldRemoveBalanceConstraint) && !isSpam);

  return {
    isSpam,
    isEnabled,
    showToggle,
  };
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

export const ftDecimals = (value: number | string | BigNumber, decimals: number): string => {
  return new BigNumber(value).shiftedBy(-decimals).toFixed();
};

export function getFtBalance(ft: FungibleToken) {
  if (ft && ft.decimals) {
    return ftDecimals(ft.balance, ft.decimals);
  }
  return BigNumber(ft?.balance).toFixed();
}

export const mapFtToCurrencyType = (ft?: FungibleToken): CurrencyTypes => {
  const principalToCurrencyTypeMap: Record<string, CurrencyTypes> = {
    BTC: 'BTC',
    STX: 'STX',
  };
  return ft ? (principalToCurrencyTypeMap[ft.principal] ?? 'FT') : 'FT';
};

export const isRunesTx = ({ fromToken, toToken }: { fromToken: FungibleToken; toToken: FungibleToken }): boolean =>
  (fromToken.protocol === 'runes' || toToken.protocol === 'runes') &&
  (fromToken.principal === 'BTC' || toToken.principal === 'BTC');

export const isStxTx = ({ fromToken, toToken }: { fromToken?: FungibleToken; toToken?: FungibleToken }): boolean =>
  fromToken?.protocol === 'stacks' ||
  fromToken?.principal === 'STX' ||
  toToken?.protocol === 'stacks' ||
  toToken?.principal === 'STX';

export const isMotherToken = (token?: FungibleToken) => {
  const identifier = token?.principal;
  return identifier === 'BTC' || identifier === 'STX';
};

export const getTrackingIdentifier = (token?: FungibleToken): string => {
  if (!token) return '';

  const identifier = token.principal;

  if (isMotherToken(token)) {
    return identifier;
  }

  if (token.protocol === 'stacks') {
    return token.ticker || token.name || identifier;
  }

  return token.name || identifier;
};

export const brc20TokenToFungibleToken = (coin: Brc20Token): FungibleToken => ({
  name: coin.name,
  principal: coin.ticker ?? coin.name,
  balance: '0',
  total_sent: '',
  total_received: '',
  assetName: coin.name ?? coin.ticker,
  ticker: coin.ticker,
  protocol: 'brc-20',
  supported: coin.supported,
});
