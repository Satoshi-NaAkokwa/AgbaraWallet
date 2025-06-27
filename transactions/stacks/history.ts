import { type MempoolTransaction, type Transaction } from '@stacks/blockchain-api-client';
import { type StacksTransactionEvent, type StacksResponseTransaction } from '../../types';
import { formatDateKey } from '../../utils';

export type CompatibleMempoolTransaction = {
  tx: MempoolTransaction;
  stx_sent: string;
  stx_received: string;
  events: StacksTransactionEvent[];
};
export type StacksHistoryDirection = 'receive' | 'send' | 'multi';
export type UnifiedStacksResponseTransaction = Omit<StacksResponseTransaction, 'data'> & {
  data: StacksResponseTransaction['data'] | CompatibleMempoolTransaction;
};

export type EnhancedStacksResponseTransaction = UnifiedStacksResponseTransaction & {
  aggregated: {
    directionType: StacksHistoryDirection;
    viewerAddress: string;
    originalEvents: StacksTransactionEvent[];
    sendEvents: StacksTransactionEvent[];
    receiveEvents: StacksTransactionEvent[];
    assetEvents: StacksTransactionEvent[];
  };
};

function getHistoryDirection(hasSend: boolean, hasReceive: boolean): StacksHistoryDirection {
  if (hasSend && hasReceive) {
    return 'multi';
  }

  if (hasReceive) {
    return 'receive';
  }

  return 'send';
}

const sortAddressTransactionEventByTypeOrAmount = (a: StacksTransactionEvent, b: StacksTransactionEvent) => {
  if (a.type !== b.type) {
    return a.type === 'nft' ? 1 : -1;
  }

  if ((a.type === 'ft' || a.type === 'stx') && (b.type === 'ft' || b.type === 'stx')) {
    return Number(b.data.amount) - Number(a.data.amount);
  }

  return 0;
};

export const getEnhancedStacksResponseTransaction = (
  transaction: UnifiedStacksResponseTransaction,
  stxAddress: string,
): EnhancedStacksResponseTransaction => {
  let totalSTXTransferred = 0;
  const sortedEvents = transaction.events.sort(sortAddressTransactionEventByTypeOrAmount);
  const result: EnhancedStacksResponseTransaction = {
    ...transaction,
    aggregated: {
      directionType: 'send',
      viewerAddress: stxAddress,
      originalEvents: transaction.events,
      assetEvents: [],
      sendEvents: [],
      receiveEvents: [],
    },
  };

  for (let i = 0; i < sortedEvents.length; i += 1) {
    const e = sortedEvents[i];
    const isReceiving = e.data.recipient === stxAddress;

    if (e.type === 'stx') {
      const parsedAmount = Number(e.data.amount);
      totalSTXTransferred += isReceiving ? parsedAmount : -parsedAmount;
    }

    if (e.type === 'nft') {
      result.aggregated.assetEvents.push(e);
    }

    if (e.type === 'ft') {
      if (e.data.type === 'transfer') {
        const existed = result.aggregated.assetEvents.find(
          (item) => (item as any).data?.asset_identifier === e.data.asset_identifier,
        ) as Extract<StacksTransactionEvent, { type: 'ft' }>;

        if (existed) {
          const isCurrentReceiving = existed.data.recipient === stxAddress;
          const existingAmount = Number(existed.data.amount) * (isCurrentReceiving ? 1 : -1);
          const currentAmount = Number(e.data.amount) * (isReceiving ? 1 : -1);
          const nextAmount = existingAmount + currentAmount;
          existed.data.amount = String(Math.abs(nextAmount));
          existed.data.sender = nextAmount < 0 ? stxAddress : '';
          existed.data.recipient = nextAmount > 0 ? stxAddress : '';
        } else {
          result.aggregated.assetEvents.push(e);
        }
      }

      if (e.data.type === 'mint') {
        result.aggregated.assetEvents.push(e);
      }

      if (e.data.type === 'burn') {
        result.aggregated.assetEvents.push(e);
      }
    }
  }

  if (result.events.length === 1 && result.events[0]?.type === 'stx') {
    /* if the only event is STX transfer, this is a Stacks Transfer history */
    result.aggregated.assetEvents.push(result.events[0]);
  } else if (totalSTXTransferred !== 0) {
    result.aggregated.assetEvents.push({
      event_index: 9999,
      type: 'stx',
      data: {
        type: 'transfer',
        amount: Math.abs(totalSTXTransferred).toString(),
        recipient: totalSTXTransferred > 0 ? stxAddress : '',
        sender: totalSTXTransferred < 0 ? stxAddress : '',
      },
    });
  }

  const hasSend = result.aggregated.assetEvents.some((e) => e.data.sender === stxAddress);
  const hasReceive = result.aggregated.assetEvents.some((e) => e.data.recipient === stxAddress);
  result.aggregated.directionType = getHistoryDirection(hasSend, hasReceive);
  result.aggregated.receiveEvents = result.aggregated.assetEvents.filter((e) => e.data.recipient === stxAddress);
  result.aggregated.sendEvents = result.aggregated.assetEvents.filter((e) => e.data.sender === stxAddress);

  return result;
};

const getTxDate = (tx?: Transaction) => new Date(tx?.block_time_iso || tx?.burn_block_time_iso || '');

export const makeCompatibleMempoolTransaction = (tx: MempoolTransaction): CompatibleMempoolTransaction => {
  const events = [] as StacksTransactionEvent[];

  if (tx.tx_type === 'token_transfer') {
    events.push({
      type: 'stx',
      event_index: 0,
      data: {
        type: 'transfer',
        amount: tx.token_transfer.amount,
        recipient: tx.token_transfer.recipient_address,
        sender: tx.sender_address,
      },
    });
  }

  return { tx, stx_sent: '0', stx_received: '0', events };
};

export const unifiedStacksResponseTransactionFromMempoolTransaction = (
  tx: MempoolTransaction,
): UnifiedStacksResponseTransaction => {
  const transaction = makeCompatibleMempoolTransaction(tx);
  return { type: 'stacks', data: transaction, events: transaction.events };
};

type GroupedStacksResponseResult = {
  title: string;
  data: UnifiedStacksResponseTransaction[];
};

export const groupStacksTxByDate = (
  transactions: UnifiedStacksResponseTransaction[],
): GroupedStacksResponseResult[] => {
  const result: GroupedStacksResponseResult[] = [];
  const pendings: UnifiedStacksResponseTransaction[] = [];
  const grouped: Record<string, UnifiedStacksResponseTransaction[]> = {};

  transactions.forEach((transaction) => {
    if (transaction.data?.tx?.tx_status === 'pending') {
      return pendings.push(transaction);
    }

    const txDate = getTxDate(transaction.data?.tx as Transaction);
    const txDateKey = formatDateKey(txDate);

    if (!grouped[txDateKey]) {
      grouped[txDateKey] = [];
    }

    grouped[txDateKey].push(transaction);
  });

  Object.keys(grouped).forEach((key) => {
    const group = grouped[key];

    group.sort((a, b) => {
      const dateA = getTxDate(a.data?.tx as Transaction);
      const dateB = getTxDate(b.data?.tx as Transaction);
      const blockHeightDiff = dateB.getTime() - dateA.getTime();

      if (blockHeightDiff !== 0) return blockHeightDiff;
      return b.data?.tx.tx_id.localeCompare(b.data?.tx.tx_id);
    });

    result.push({ title: key, data: group });
  });

  result.sort((a, b) => new Date(b.title).getTime() - new Date(a.title).getTime());

  if (pendings.length > 0) {
    result.unshift({
      title: 'PENDING',
      data: pendings,
    });
  }

  return result;
};

export const filterStacksHistoryByFtKey = (items: UnifiedStacksResponseTransaction[], ftKey?: string) =>
  items.filter((i) =>
    i.events.some((e) => {
      if (e.type === 'stx') {
        return !ftKey;
      }

      if (e.type === 'ft') {
        const assetKey = e.data?.asset_identifier?.split('::')[0];
        return assetKey === ftKey;
      }

      return false;
    }),
  );
