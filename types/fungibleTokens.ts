export interface BaseToken {
  name: string;
  ticker?: string;
  image?: string;
}

export type CurrencyTypes = 'STX' | 'BTC' | 'FT' | 'NFT' | 'Ordinal' | 'brc20-Ordinal' | 'RareSat' | 'SN';

export type FungibleTokenProtocol = 'runes' | 'stacks' | 'starknet' | 'brc-20';

export type FungibleToken = BaseToken & {
  /**
   * Originally used to identify the Stacks contract issuing a token, and is now
   * used as a context-specific general-purpose ID of the token's definition:
   *
   * - Stacks: the [contract
   *   principal](https://github.com/stacksgov/sips/blob/main/sips/sip-005/sip-005-blocks-and-transactions.md)
   *   issuing the token.
   * - Starknet: the
   *   [CAIP-10](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md)
   *   designation of the contract issuing the token.
   * - Runes: the rune ID. E.g., DOG•GO•TO•THE•MOON is 840000:3.
   * - BRC-20: The ticker, as defined by the protocol's `tick` property.
   */
  principal: string;
  protocol: FungibleTokenProtocol;
  balance: string;
  total_sent: string;
  total_received: string;
  assetName: string;
  decimals?: number;
  /**
   * @deprecated - use FungibleTokenStates instead
   */
  visible?: boolean;
  supported?: boolean;
  tokenFiatRate?: number | null;
  runeSymbol?: string | null;
  runeInscriptionId?: string | null;
  priceChangePercentage24h?: string | null;
  currentPrice?: string | null;
};

export type FungibleTokenStates = {
  isSpam: boolean;
  isEnabled: boolean;
  showToggle: boolean;
};

export type FungibleTokenWithStates = FungibleToken & FungibleTokenStates;
