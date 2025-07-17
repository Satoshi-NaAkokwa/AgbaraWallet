import { BtcTransactionData, EnhancedTx } from '../../types';
import { formatDate, formatDateKey } from '../../utils';

export const groupBtcTxsByDate = (
  transactions: (BtcTransactionData | EnhancedTx)[],
): [Date, string, (BtcTransactionData | EnhancedTx)[]][] => {
  const pendingTransactions: BtcTransactionData[] = [];
  const processedTransactions: { [x: string]: EnhancedTx[] } = {};

  transactions.forEach((transaction) => {
    if ('txStatus' in transaction && transaction.txStatus === 'pending') {
      return pendingTransactions.push(transaction);
    }

    if ('blockTime' in transaction) {
      const txDateKey = formatDateKey(new Date(transaction.blockTime * 1000));
      if (!processedTransactions[txDateKey]) {
        processedTransactions[txDateKey] = [];
      }
      processedTransactions[txDateKey].push(transaction);
    }
  });

  const result: [Date, string, (BtcTransactionData | EnhancedTx)[]][] = [];

  Object.values(processedTransactions).forEach((grp) => {
    if (grp.length === 0) {
      return;
    }

    grp.sort((txA, txB) => {
      // sort by block height first
      const blockHeightDiff = txB.blockHeight - txA.blockHeight;
      if (blockHeightDiff !== 0) {
        return blockHeightDiff;
      }

      // if block height is the same, sort by txid for consistency
      return txB.id.localeCompare(txA.id);
    });

    result.push([new Date(grp[0].blockTime * 1000), formatDate(new Date(grp[0].blockTime * 1000)), grp]);
  });

  result.sort((a, b) => b[0].getTime() - a[0].getTime());

  if (pendingTransactions.length > 0) {
    result.unshift([new Date(), 'Pending', pendingTransactions]);
  }

  return result;
};
