import { FungibleTokenWithStates } from '../types';
import { microstacksToStx, satsToBtc } from '../currency';
import { getFtBalance } from '../fungibleTokens';

export const calculateTotalBalance = ({
  stxBalance,
  btcBalance,
  sipCoinsList,
  brcCoinsList,
  runesCoinList,
  stxBtcRate,
  btcFiatRate,
  hideStx,
  starknetCoinList,
}: {
  stxBalance?: string;
  btcBalance?: string;
  sipCoinsList?: FungibleTokenWithStates[];
  brcCoinsList?: FungibleTokenWithStates[];
  runesCoinList?: FungibleTokenWithStates[];
  starknetCoinList?: FungibleTokenWithStates[];
  stxBtcRate: string;
  btcFiatRate: string;
  hideStx: boolean;
}) => {
  let totalBalance = new BigNumber(0);

  if (stxBalance && !hideStx) {
    const stxFiatEquiv = microstacksToStx(new BigNumber(stxBalance))
      .multipliedBy(new BigNumber(stxBtcRate))
      .multipliedBy(new BigNumber(btcFiatRate));
    totalBalance = totalBalance.plus(stxFiatEquiv);
  }

  if (btcBalance) {
    const btcFiatEquiv = satsToBtc(new BigNumber(btcBalance)).multipliedBy(new BigNumber(btcFiatRate));
    totalBalance = totalBalance.plus(btcFiatEquiv);
  }

  if (sipCoinsList) {
    totalBalance = sipCoinsList.reduce((acc, coin) => {
      if (coin.isEnabled && coin.tokenFiatRate && coin.decimals) {
        const tokenUnits = new BigNumber(10).exponentiatedBy(new BigNumber(coin.decimals));
        const coinFiatValue = new BigNumber(coin.balance)
          .dividedBy(tokenUnits)
          .multipliedBy(new BigNumber(coin.tokenFiatRate));
        return acc.plus(coinFiatValue);
      }

      return acc;
    }, totalBalance);
  }

  if (brcCoinsList) {
    totalBalance = brcCoinsList.reduce((acc, coin) => {
      if (coin.isEnabled && coin.tokenFiatRate) {
        const coinFiatValue = new BigNumber(coin.balance).multipliedBy(new BigNumber(coin.tokenFiatRate));
        return acc.plus(coinFiatValue);
      }

      return acc;
    }, totalBalance);
  }

  if (runesCoinList) {
    totalBalance = runesCoinList.reduce((acc, coin) => {
      if (coin.isEnabled && coin.tokenFiatRate) {
        const coinFiatValue = new BigNumber(getFtBalance(coin)).multipliedBy(new BigNumber(coin.tokenFiatRate));
        return acc.plus(coinFiatValue);
      }

      return acc;
    }, totalBalance);
  }

  if (starknetCoinList) {
    totalBalance = starknetCoinList.reduce((acc, coin) => {
      if (coin.isEnabled && coin.tokenFiatRate) {
        const coinFiatValue = new BigNumber(getFtBalance(coin)).multipliedBy(new BigNumber(coin.tokenFiatRate));
        return acc.plus(coinFiatValue);
      }
      return acc;
    }, totalBalance);
  }

  return totalBalance.toNumber().toFixed(2);
};
