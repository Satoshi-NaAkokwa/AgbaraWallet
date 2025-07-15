import { BtcTransactionData, EnhancedTx, ResponseTransaction } from '../types';
import { UnifiedStacksResponseTransaction } from './stacks';
import { formatDate, formatDateKey } from '../utils';

export type GlobalTx =
  | Exclude<ResponseTransaction, { type: 'bitcoin' }>
  | { type: 'bitcoin'; data: EnhancedTx }
  | UnifiedStacksResponseTransaction;

const getTxDate = (tx: GlobalTx) => {
  if (tx.type === 'bitcoin') {
    return new Date(tx.data.blockTime * 1000);
  }
  if (tx.type === 'stacks') {
    const transaction = tx.data.tx as any;
    return new Date(transaction.block_time_iso || transaction.receipt_time_iso);
  }
  return new Date(tx.data.blockTimestamp);
};

const getTxId = (tx: GlobalTx) => {
  if (tx.type === 'bitcoin') {
    return tx.data.id;
  }
  if (tx.type === 'stacks') {
    return tx.data.tx.tx_id;
  }
  return tx.data.transactionHash;
};

export const groupTxsByDate = (
  transactions: (BtcTransactionData | GlobalTx)[],
): [Date, string, (BtcTransactionData | GlobalTx)[]][] => {
  const pendingTransactions: (BtcTransactionData | GlobalTx)[] = [];
  const processedTransactions: {
    [x: string]: GlobalTx[];
  } = {};

  transactions.forEach((transaction) => {
    const isBtcPending = 'txStatus' in transaction && transaction.txStatus === 'pending';
    const isStxPending =
      'type' in transaction && transaction.type === 'stacks' && transaction.data.tx.tx_status === 'pending';

    if (isBtcPending || isStxPending) {
      return pendingTransactions.push(transaction);
    }

    if ('type' in transaction && transaction.data) {
      const txDate = getTxDate(transaction);
      const txDateKey = formatDateKey(txDate);
      if (!processedTransactions[txDateKey]) {
        processedTransactions[txDateKey] = [];
      }
      processedTransactions[txDateKey].push(transaction);
    }
  });

  const result: [Date, string, (BtcTransactionData | GlobalTx)[]][] = [];

  Object.values(processedTransactions).forEach((grp) => {
    if (grp.length === 0) {
      return;
    }

    grp.sort((txA, txB) => {
      const txADate = getTxDate(txA);
      const txBDate = getTxDate(txB);

      // sort by block height first
      const blockHeightDiff = txBDate.getTime() - txADate.getTime();
      if (blockHeightDiff !== 0) {
        return blockHeightDiff;
      }

      const txAId = getTxId(txA);
      const txBId = getTxId(txB);

      // if date is the same, sort by txid for consistency
      return txBId.localeCompare(txAId);
    });

    result.push([new Date(getTxDate(grp[0])), formatDate(getTxDate(grp[0])), grp]);
  });

  result.sort((a, b) => b[0].getTime() - a[0].getTime());

  // this ensures pending transactions are at the top of the list
  if (pendingTransactions.length > 0) {
    result.unshift([new Date(), 'Pending', pendingTransactions]);
  }

  return result;
};
