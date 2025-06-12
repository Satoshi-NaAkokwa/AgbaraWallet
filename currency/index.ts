import { BigNumber } from '../utils/bignumber';
import { FungibleToken } from '../types';
import type { CurrencyTypes } from '../types/fungibleTokens';

const satsToBtc = (sats: BigNumber): BigNumber => sats.multipliedBy(0.00000001);

const btcToSats = (btc: BigNumber): BigNumber => btc.multipliedBy(100000000);

const microstacksToStx = (microstacks: BigNumber): BigNumber => microstacks.multipliedBy(0.000001);

const stxToMicrostacks = (stacks: BigNumber): BigNumber => stacks.multipliedBy(1000000);

const getStxFiatEquivalent = (stxAmount: BigNumber, stxBtcRate: BigNumber, btcFiatRate: BigNumber): BigNumber =>
  microstacksToStx(stxAmount).multipliedBy(stxBtcRate).multipliedBy(btcFiatRate);

const getBtcFiatEquivalent = (btcAmount: BigNumber, btcFiatRate: BigNumber): BigNumber =>
  satsToBtc(btcAmount).multipliedBy(btcFiatRate);

const getFiatBtcEquivalent = (fiatAmount: BigNumber, btcFiatRate: BigNumber): BigNumber =>
  new BigNumber(fiatAmount.dividedBy(btcFiatRate).toFixed(8));

const getStxTokenEquivalent = (fiatAmount: BigNumber, stxBtcRate: BigNumber, btcFiatRate: BigNumber): BigNumber =>
  fiatAmount.dividedBy(stxBtcRate).dividedBy(btcFiatRate);

/**
 * @deprecated Use getBtcFiatEquivalent instead
 */
const getBtcEquivalent = (fiatAmount: BigNumber, btcFiatRate: BigNumber): BigNumber =>
  fiatAmount.dividedBy(btcFiatRate);

/**
 * Calculates the fiat equivalent value for a given cryptocurrency amount
 * @param value - The amount in the specified currency type
 * @param currencyType - The type of currency (STX, BTC, FT, etc.)
 * @param stxBtcRate - Exchange rate from STX to BTC
 * @param btcFiatRate - Exchange rate from BTC to fiat currency
 * @param fungibleToken - Optional fungible token data (required for FT, SN)
 * @returns Fiat equivalent as a string with 2 decimal places ord 6 decimal places for SN, or '0' if calculation fails
 */
const getFiatEquivalent = (
  value: BigNumber | number,
  currencyType: CurrencyTypes,
  stxBtcRate: BigNumber,
  btcFiatRate: BigNumber,
  fungibleToken?: FungibleToken,
): string => {
  if (
    currencyType === 'NFT' ||
    currencyType === 'Ordinal' ||
    currencyType === 'brc20-Ordinal' ||
    currencyType === 'RareSat'
  ) {
    return '';
  }

  // Convert value to BigNumber for consistent calculations
  const bnValue = BigNumber.isBigNumber(value) ? value : new BigNumber(value || 0);

  if (bnValue.isZero() || bnValue.isNaN()) {
    return '0';
  }

  switch (currencyType) {
    case 'STX':
      return getStxFiatEquivalent(stxToMicrostacks(bnValue), stxBtcRate, btcFiatRate).toFixed(2);

    case 'BTC':
      return getBtcFiatEquivalent(btcToSats(bnValue), btcFiatRate).toFixed(2);

    case 'FT':
    case 'SN':
      if (!fungibleToken?.tokenFiatRate) {
        return '';
      }
      return bnValue.multipliedBy(fungibleToken.tokenFiatRate).toFixed(2);

    default:
      throw new Error('Unknown Currency', { cause: currencyType satisfies never });
  }
};

export {
  btcToSats,
  getBtcEquivalent,
  getBtcFiatEquivalent,
  getFiatBtcEquivalent,
  getStxFiatEquivalent,
  getStxTokenEquivalent,
  microstacksToStx,
  satsToBtc,
  stxToMicrostacks,
  getFiatEquivalent,
};
