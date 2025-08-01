import { BigNumber } from 'bignumber.js';
import { RunesApi } from '../api/runes/provider';
import { Account, AccountBtcAddresses, BtcTransactionData, EsploraTransaction, Rune } from '../types';
import {
  ApiAddressTransaction,
  AssetInTx,
  Brc20TxType,
  BtcTxHistory,
  BtcTxType,
  EnhancedRuneIO,
  EnhancedRunesOwnActivity,
  EnhancedTx,
  InscriptionEvent,
  InscriptionTxType,
  MultipleAssetsTxType,
  RuneInfo,
  RuneIO,
  RunesAllEvent,
  RunesTxType,
} from '../types/api/xverse/history';
import EsploraApiProvider from './esplora/esploraAPiProvider';
import { parseBtcTransactionData, parseOrdinalsBtcTransactions } from './helper';
import { XverseApi } from './xverse';

export async function fetchBtcOrdinalMempoolTransactions(ordinalsAddress: string, esploraProvider: EsploraApiProvider) {
  if (!ordinalsAddress) {
    return [];
  }

  const transactions: BtcTransactionData[] = [];
  const txResponse: EsploraTransaction[] = await esploraProvider.getAddressMempoolTransactions(ordinalsAddress);
  txResponse.forEach((tx) => {
    transactions.push(parseOrdinalsBtcTransactions(tx, ordinalsAddress));
  });
  return transactions.filter((tx) => tx.incoming);
}

export async function fetchBtcPaymentMempoolTransactions(
  btcAddress: string,
  ordinalsAddress: string,
  esploraProvider: EsploraApiProvider,
) {
  if (!btcAddress) {
    return [];
  }

  const transactions: BtcTransactionData[] = [];
  const txResponse: EsploraTransaction[] = await esploraProvider.getAddressMempoolTransactions(btcAddress);
  txResponse.forEach((tx) => {
    transactions.push(parseBtcTransactionData(tx, btcAddress, ordinalsAddress));
  });
  return transactions;
}

export async function fetchBtcMempoolTransactions(addresses: AccountBtcAddresses, esploraProvider: EsploraApiProvider) {
  const ordinalsAddress = addresses?.taproot.address ?? '';
  const transactionPromises: Promise<BtcTransactionData[]>[] = [];

  if (addresses.nested?.address) {
    transactionPromises.push(
      fetchBtcPaymentMempoolTransactions(addresses.nested?.address ?? '', ordinalsAddress, esploraProvider),
    );
  }

  if (addresses.native?.address) {
    transactionPromises.push(
      fetchBtcPaymentMempoolTransactions(addresses.native?.address ?? '', ordinalsAddress, esploraProvider),
    );
  }

  transactionPromises.push(fetchBtcOrdinalMempoolTransactions(ordinalsAddress, esploraProvider));

  const allTransactionResults = await Promise.all(transactionPromises);
  const allTransactions = allTransactionResults.flat();

  return allTransactions;
}

export async function fetchBtcTransaction(
  id: string,
  btcAddress: string,
  ordinalsAddress: string,
  esploraProvider: EsploraApiProvider,
  isOrdinal?: boolean,
) {
  const txResponse: EsploraTransaction = await esploraProvider.getTransaction(id);
  const transaction: BtcTransactionData = isOrdinal
    ? parseOrdinalsBtcTransactions(txResponse, ordinalsAddress)
    : parseBtcTransactionData(txResponse, btcAddress, ordinalsAddress);
  return transaction;
}

// for this tx types we don't need to show the addresses in the tx
const excludeAddressTxTypes = ['etch', 'mint', 'consolidate', 'burn', 'mintBurn'];

const getAddressesInTx = (
  tx: ApiAddressTransaction,
  addresses: AccountBtcAddresses,
  txType: BtcTxType | InscriptionTxType | RunesTxType | Brc20TxType | MultipleAssetsTxType,
) => {
  if (excludeAddressTxTypes.includes(txType)) {
    return null;
  }

  if (tx.addressList.hasMore) {
    return {
      hasMore: true,
      external: [],
      isOwnTaproot: false,
      isOwnNested: false,
      isOwnNative: false,
    };
  }

  const ownActivityAddressSet = new Set(tx.ownActivity.map((activity) => activity.address));

  const externalAddresses = tx.addressList.items.filter((item) => {
    const isExternalAddress = item.address && !ownActivityAddressSet.has(item.address);
    const isInputOrOutputAddressForSendOrReceiveTx =
      (txType !== 'send' && txType !== 'receive') ||
      (txType === 'send' && item.isOutput) ||
      (txType === 'receive' && item.isInput);
    return isExternalAddress && isInputOrOutputAddressForSendOrReceiveTx;
  });

  const onlyOwnAddresses = externalAddresses.length === 0;

  return {
    hasMore: false,
    external: externalAddresses,
    isOwnTaproot: onlyOwnAddresses && ownActivityAddressSet.has(addresses.taproot.address),
    isOwnNested:
      onlyOwnAddresses && addresses.nested?.address ? ownActivityAddressSet.has(addresses.nested.address) : false,
    isOwnNative:
      onlyOwnAddresses && addresses.native?.address ? ownActivityAddressSet.has(addresses.native.address) : false,
  };
};

const getAssetsInTx = (tx: ApiAddressTransaction): AssetInTx => {
  const hasRunesActivity = tx.runes.allActivity.items.length > 0;
  const hasBrc20Activity = tx.brc20.allActivity.items.length > 0;
  const hasInscriptionsActivity = tx.inscriptions.items.length > 0;

  const hasBrc20Action = tx.brc20.allActivity.items.some(
    (item) => item.action === 'deploy' || item.action === 'mint' || item.action === 'transfer',
  );
  const hasInscribeOnlyActivity = tx.inscriptions.items.every((inscription) => inscription.inscribed);
  const hasInscriptionSendOnlyActivity = tx.inscriptions.items.every(
    (inscription) => inscription.sent && !inscription.received && !inscription.inscribed,
  );
  const hasInscriptionReceiveOnlyActivity = tx.inscriptions.items.every(
    (inscription) => !inscription.sent && inscription.received && !inscription.inscribed,
  );

  if (hasRunesActivity && !hasBrc20Activity && !hasInscriptionsActivity) {
    return 'runes';
  }

  // each BRC-20 transaction is associated with an inscription, so we do the below check to not count
  // inscription actions if there are brc-20 actions
  if (
    hasBrc20Activity &&
    !hasRunesActivity &&
    ((hasBrc20Action && hasInscribeOnlyActivity) ||
      (!hasBrc20Action &&
        hasInscriptionSendOnlyActivity &&
        tx.brc20.ownActivity.items.length === tx.inscriptions.items.length) ||
      (!hasBrc20Action &&
        hasInscriptionReceiveOnlyActivity &&
        tx.brc20.ownActivity.items.length === tx.inscriptions.items.length))
  ) {
    return 'brc20';
  }

  if (hasInscriptionsActivity && !hasBrc20Activity && !hasRunesActivity) {
    return 'inscriptions';
  }

  if (!hasInscriptionsActivity && !hasBrc20Activity && !hasRunesActivity) {
    return 'btc';
  }

  return 'multipleAssets';
};

// this can be negative if amount is leaving the wallet or positive if amount is entering the wallet
const calculateSatsOwnActivity = (tx: ApiAddressTransaction) => {
  const movements = tx.ownActivity.reduce(
    (acc, activity) => {
      acc.incoming += activity.incoming;
      acc.outgoing += activity.outgoing;
      acc.nett += activity.received - activity.sent;
      return acc;
    },
    {
      incoming: 0,
      outgoing: 0,
      nett: 0,
    },
  );

  return movements;
};

const getTypeFromInscription = (inscription: InscriptionEvent): InscriptionTxType => {
  // v2 will also have recover tx type

  // the following order of early returns is important cuz we can have combinations in a same inscription

  if (inscription.inscribed) {
    return 'inscribe';
  }

  if (inscription.burned) {
    return 'burn';
  }

  if (inscription.received) {
    return 'receive';
  }

  return 'send';
};

const getInscriptionsTxType = (tx: ApiAddressTransaction): InscriptionTxType => {
  const { inscriptions } = tx;

  const { nett: totalBtcReceived, outgoing: ownOutgoingSats, incoming: ownIncomingSats } = calculateSatsOwnActivity(tx);

  // when there are more inscriptions in the tx we treated it as a trade cuz we can't know the type of each inscription
  // a trade is also only true if the user sent AND received sats
  if (inscriptions.hasMore && ownOutgoingSats > 0 && ownIncomingSats > 0) {
    return 'trade';
  }

  const firstInscriptionType = getTypeFromInscription(inscriptions.items[0]);

  const hasMultipleInscriptionTypes = inscriptions.items.some(
    (inscription) => getTypeFromInscription(inscription) !== firstInscriptionType,
  );

  if (hasMultipleInscriptionTypes) {
    return 'trade';
  }

  if (
    // sending inscription and getting more btc back than sent is likely a sell
    (firstInscriptionType === 'send' && totalBtcReceived > 546) ||
    // receiving an inscription and sending more btc than receiving is likely a buy
    (firstInscriptionType === 'receive' && totalBtcReceived < -546)
  ) {
    return 'trade';
  }

  return firstInscriptionType;
};

const getTypeFromRune = (runeIO: RuneIO | undefined, allActivity: RunesAllEvent[]): RunesTxType => {
  // v2 will also have recover tx type

  // if runeIO is nullish, it means that ownActivity is empty hence it's an etch or a mint & burn,
  // if there is at least one etch in allActivity, we treat it as an etch
  // for the rest we treat it as a mint & burn
  if (!runeIO) {
    return allActivity.some((activity) => activity.isEtch) ? 'etch' : 'mintBurn';
  }

  // we grab this info to know if mint or burn
  const runeFromAllActivity = allActivity.find((activity) => activity.runeId === runeIO.runeId);

  // the following order of early returns is important cuz we can have combinations in a same rune

  // 1. check for etch in case of pre-mining
  if (runeFromAllActivity?.isEtch) {
    return 'etch';
  }

  // 2. check for mint in case of mint with partial burn
  if (runeFromAllActivity?.isMint) {
    return 'mint';
  }

  // 3. check for burn in case of burn
  if (runeFromAllActivity?.isBurn) {
    return 'burn';
  }

  // 4. check if balances are equal for split/consolidate
  // we can't actually know if this was a split or consolidation for now we just return consolidate
  if (BigInt(runeIO.sent) === BigInt(runeIO.received)) {
    return 'consolidate';
  }

  // 5. return receive or send based on the balance
  return BigInt(runeIO.received) - BigInt(runeIO.sent) > 0n ? 'receive' : 'send';
};

const getRunesTxType = (tx: ApiAddressTransaction): RunesTxType => {
  const { runes } = tx;

  const { nett: totalBtcReceived, outgoing: ownOutgoingSats, incoming: ownIncomingSats } = calculateSatsOwnActivity(tx);

  // when there are more runes in the tx we treated it as a trade cuz we can't know the type of each rune
  // a trade is also only true if the user sent AND received sats
  if (runes.ownActivity.hasMore && ownOutgoingSats > 0 && ownIncomingSats > 0) {
    return 'trade';
  }

  const firstRuneType = getTypeFromRune(runes.ownActivity.items[0], runes.allActivity.items);

  // we check for 1 or 0 cuz when etching, own activity can be empty is there is no minting
  if (runes.ownActivity.items.length === 0) {
    return firstRuneType;
  }

  const runeTypes = new Set<RunesTxType>(
    runes.ownActivity.items.map((rune) => getTypeFromRune(rune, runes.allActivity.items)),
  );

  let runeType = firstRuneType;

  // when one or multiple runes are leaving the wallet and there is also consolidations/splits
  // we want to return the type of the rune that is leaving the wallet
  if (runeTypes.size === 2 && runeTypes.has('consolidate') && (runeTypes.has('send') || runeTypes.has('burn'))) {
    if (runeTypes.has('burn')) {
      return 'burn';
    } else {
      runeType = 'send';
    }
  } else if (runeTypes.size > 1) {
    return 'trade';
  }

  if (
    // if rune is sent and we get more btc back than sent, it's likely a sell
    (runeType === 'send' && totalBtcReceived > 546) ||
    // if rune is received and we send more btc than received, it's likely a buy
    (runeType === 'receive' && totalBtcReceived < -546)
  ) {
    return 'trade';
  }

  return runeType;
};

const getBrc20TxType = (tx: ApiAddressTransaction): Brc20TxType => {
  const { brc20: brc20Activity } = tx;

  const { nett: totalBtcReceived, outgoing: ownOutgoingSats, incoming: ownIncomingSats } = calculateSatsOwnActivity(tx);

  // when there are more brc20 in the tx we treated it as a trade cuz we can't know the type of each brc20
  // a trade is also only true if the user sent AND received sats
  if (brc20Activity.ownActivity.hasMore && ownOutgoingSats > 0 && ownIncomingSats > 0) {
    return 'trade';
  }

  if (brc20Activity.allActivity.items.length === 1 && brc20Activity.allActivity.items[0].action === 'deploy') {
    return 'deploy';
  }

  if (brc20Activity.allActivity.items.length === 1 && brc20Activity.allActivity.items[0].action === 'mint') {
    return 'mint';
  }

  if (brc20Activity.allActivity.items.length === 1 && brc20Activity.allActivity.items[0].action === 'transfer') {
    return 'transfer';
  }

  if (brc20Activity.ownActivity.items.every((item) => item.incoming === item.outgoing)) {
    return 'consolidate';
  }

  // brc20 has no concept of change, so we check if only all events have same type for send/receive
  if (brc20Activity.ownActivity.items.every((item) => BigNumber(item.incoming).gt(0) && item.outgoing === '0')) {
    if (totalBtcReceived > 546) {
      return 'receive';
    }
  }
  if (brc20Activity.ownActivity.items.every((item) => BigNumber(item.outgoing).gt(0) && item.incoming === '0')) {
    if (totalBtcReceived < -546) {
      return 'send';
    }
  }

  return 'trade';
};

export const mapRuneToRuneInfo = (rune: Rune): RuneInfo => ({
  symbol: rune.entry.symbol,
  name: rune.entry.spaced_rune,
  divisibility: rune.entry.divisibility,
  inscriptionId: rune.parent ?? '',
});

const getRuneMetadata = (runeId: string, runesInfoDictionary: Map<string, RuneInfo> | Record<string, Rune>) => {
  return runesInfoDictionary instanceof Map
    ? runesInfoDictionary.get(runeId)
    : mapRuneToRuneInfo(runesInfoDictionary[runeId]);
};

const getRunesObjectForTxWithRuneAssets = (
  tx: ApiAddressTransaction,
  runesInfoDictionary: Map<string, RuneInfo> | Record<string, Rune>,
  txType: RunesTxType,
): EnhancedRunesOwnActivity => {
  const ownRuneIdsSet = new Set<string>();

  const ownItems = tx.runes.ownActivity.items
    // if txType is of runes leaving the wallet, we want to avoid runes that are consolidate/split
    .filter((rune) => (txType !== 'send' && txType !== 'burn') || BigInt(rune.received) !== BigInt(rune.sent))
    .map((rune) => {
      ownRuneIdsSet.add(rune.runeId);
      return {
        ...rune,
        ...getRuneMetadata(rune.runeId, runesInfoDictionary),
      };
    });

  const allItems: EnhancedRuneIO[] = [];
  tx.runes.allActivity.items.forEach((rune) => {
    const isEtchOrMintBurnedRune = rune.isEtch || (rune.isBurn && rune.isMint);
    const isDuplicate = ownRuneIdsSet.has(rune.runeId);
    if (isEtchOrMintBurnedRune && !isDuplicate) {
      allItems.push({
        runeId: rune.runeId,
        address: '',
        sent: '0',
        received: '0',
        outgoing: '0',
        incoming: '0',
        ...getRuneMetadata(rune.runeId, runesInfoDictionary),
      });
    }
  });

  return {
    ...tx.runes.ownActivity,
    items: [...ownItems, ...allItems],
  };
};

const getMultipleAssetsTxType = (tx: ApiAddressTransaction): MultipleAssetsTxType => {
  const inscriptionsTxType = getInscriptionsTxType(tx);
  const runesTxType = getRunesTxType(tx);
  const brc20TxType = getBrc20TxType(tx);
  // etch with inscribed inscription
  if (runesTxType === 'etch' && inscriptionsTxType === 'inscribe') {
    return 'etch';
  }

  if ((brc20TxType === 'deploy' || brc20TxType === 'mint') && inscriptionsTxType === 'inscribe') {
    return brc20TxType;
  }

  return inscriptionsTxType === runesTxType ? inscriptionsTxType : 'trade';
};

const getBtcTxType = (tx: ApiAddressTransaction): BtcTxType => {
  const { nett: satsAmount } = calculateSatsOwnActivity(tx);

  // v2 will discriminate between consolidate and recovers
  const hasNoExternalActivity = satsAmount + (tx.totalIn - tx.totalOut) === 0;
  if (hasNoExternalActivity) {
    return 'consolidate';
  }
  return satsAmount > 0 ? 'receive' : 'send';
};

export const enhanceTx = ({
  tx,
  addresses,
  runesInfoDictionary,
}: {
  tx: ApiAddressTransaction;
  addresses: AccountBtcAddresses;
  runesInfoDictionary: Map<string, RuneInfo> | Record<string, Rune>;
}): EnhancedTx => {
  const assetInTx = getAssetsInTx(tx);
  const baseTxObject = {
    id: tx.txid,
    fees: tx.totalIn - tx.totalOut,
    satsAmount: calculateSatsOwnActivity(tx).nett,
    blockHeight: tx.blockHeight,
    blockTime: tx.blockTime,
  };

  // inscriptions
  if (assetInTx === 'inscriptions') {
    const txType = getInscriptionsTxType(tx);
    return {
      ...baseTxObject,
      assetInTx,
      txType: getInscriptionsTxType(tx),
      inscriptions: tx.inscriptions,
      addressesInTx: getAddressesInTx(tx, addresses, txType),
    };
  }

  // runes
  if (assetInTx === 'runes') {
    const txType = getRunesTxType(tx);
    return {
      ...baseTxObject,
      assetInTx,
      txType,
      runes: getRunesObjectForTxWithRuneAssets(tx, runesInfoDictionary, txType),
      addressesInTx: getAddressesInTx(tx, addresses, txType),
    };
  }

  // brc20
  if (assetInTx === 'brc20') {
    const txType = getBrc20TxType(tx);
    return {
      ...baseTxObject,
      assetInTx,
      txType,
      brc20: tx.brc20,
      addressesInTx: getAddressesInTx(tx, addresses, txType),
    };
  }

  // multiple assets
  if (assetInTx === 'multipleAssets') {
    const runeTxType = getRunesTxType(tx);
    const txType = getMultipleAssetsTxType(tx);
    return {
      ...baseTxObject,
      assetInTx,
      txType,
      inscriptions: tx.inscriptions,
      brc20: tx.brc20,
      runes: getRunesObjectForTxWithRuneAssets(tx, runesInfoDictionary, runeTxType),
      addressesInTx: getAddressesInTx(tx, addresses, txType),
    };
  }

  // by default return btc tx till we can handle any new tx types
  const txType = getBtcTxType(tx);
  return {
    ...baseTxObject,
    assetInTx: 'btc',
    txType,
    addressesInTx: getAddressesInTx(tx, addresses, txType),
  };
};

export const getRunesInfoDictionary = async ({
  txs,
  clientRunesInfo,
  runesApiClient,
}: {
  txs: ApiAddressTransaction[];
  clientRunesInfo: Map<string, RuneInfo>;
  runesApiClient: RunesApi;
}) => {
  const txRunesIdsSet = new Set<string>();
  txs.forEach((item) => {
    item.runes.allActivity.items.forEach((rune) => {
      if (!clientRunesInfo.has(rune.runeId)) {
        txRunesIdsSet.add(rune.runeId);
      }
    });
  });

  const runeInfoDictionary = new Map<string, RuneInfo>();

  const runeIds = Array.from(txRunesIdsSet);
  const runesInfo = await Promise.allSettled(runeIds.map((runeId) => runesApiClient.getRuneInfo(runeId)));

  runesInfo.forEach((runeInfo) => {
    if (runeInfo.status === 'fulfilled' && runeInfo.value) {
      runeInfoDictionary.set(runeInfo.value.id, mapRuneToRuneInfo(runeInfo.value));
    }
  });

  return new Map([...clientRunesInfo, ...runeInfoDictionary]);
};

export const fetchPastBtcTransactions = async ({
  account,
  offset,
  limit,
  clientRunesInfo,
  runesApiClient,
  xverseApiClient,
  token,
}: {
  account: Account;
  offset: number;
  limit: number;
  clientRunesInfo: Map<string, RuneInfo>;
  runesApiClient: RunesApi;
  xverseApiClient: XverseApi;
  token?: {
    type: 'brc20' | 'rune';
    id: string;
  };
}): Promise<BtcTxHistory> => {
  const { transactions: txs } = await xverseApiClient.account.fetchAccountBtcHistory(account, {
    offset,
    limit,
    token,
  });
  const runesInfoDictionary = await getRunesInfoDictionary({ txs, clientRunesInfo, runesApiClient });
  const enhancedTxs = txs.map((tx) => enhanceTx({ tx, addresses: account.btcAddresses, runesInfoDictionary }));
  return {
    transactions: enhancedTxs,
    offset,
    limit,
  };
};
