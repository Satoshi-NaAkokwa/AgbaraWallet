import { GetExplorerForNetworkParams, UserExplorerMap, UserExplorerStorage } from '../types';
import { objectEntries } from './objectEntries';

export const DefaultExplorerMapping: UserExplorerMap = {
  btc: {
    name: 'Bitcoin',
    allowCustom: true,
    fallback: 'https://mempool.space/tx/{txId}',
    explorers: {
      Mainnet: {
        mempool: {
          name: 'Mempool',
          url: 'https://mempool.space/tx/{txId}',
        },
        ordiscan: {
          name: 'Ordiscan',
          url: 'https://ordiscan.com/tx/{txId}',
        },
        blockchain: {
          name: 'Blockchain',
          url: 'https://www.blockchain.com/explorer/transactions/btc/{txId}',
        },
      },
      Testnet: {
        mempool: {
          name: 'Mempool',
          url: 'https://mempool.space/testnet/tx/{txId}',
        },
      },
      Testnet4: {
        mempool: {
          url: 'https://mempool.space/testnet4/tx/{txId}',
        },
      },
      Signet: {
        mempool: {
          url: 'https://mempool.space/signet/tx/{txId}',
        },
      },
      Regtest: {
        mempool: {
          url: 'https://mempool.bitcoin.regtest.hiro.so/tx/{txId}',
        },
      },
    },
  },
  stx: {
    name: 'Stacks',
    allowCustom: true,
    fallback: 'https://explorer.hiro.so/txid/{txId}',
    singleTestnet: true,
    explorers: {
      Mainnet: {
        hiro: {
          name: 'Hiro',
          url: 'https://explorer.hiro.so/txid/{txId}',
        },
      },
      Testnet: {
        hiro: {
          url: 'https://explorer.hiro.so/txid/{txId}?chain=testnet',
        },
      },
    },
  },
  starknet: {
    name: 'Starknet',
    allowCustom: true,
    fallback: 'https://voyager.online/tx/{txId}',
    explorers: {
      Mainnet: {
        voyager: {
          name: 'Voyager',
          url: 'https://voyager.online/tx/{txId}',
        },
        starkscan: {
          name: 'Starkscan',
          url: 'https://starkscan.co/tx/{txId}',
        },
      },
    },
  },
};

export const UserDefaultExplorers: UserExplorerStorage = {
  btc: {
    id: 'mempool',
  },
  stx: {
    id: 'hiro',
  },
  starknet: {
    id: 'voyager',
  },
};

export const getExplorerForNetworkChain = (params: GetExplorerForNetworkParams) => {
  const { chain, explorerId, txId, network = 'Mainnet' } = params;
  let networkExplorers;
  if (network !== 'Mainnet' && DefaultExplorerMapping[chain].singleTestnet) {
    networkExplorers = DefaultExplorerMapping[chain].explorers['Testnet'];
  } else {
    networkExplorers = DefaultExplorerMapping[chain].explorers[network];
  }

  let url;
  if (explorerId) {
    // we first return what user has set their preferred explorer
    url = networkExplorers?.[explorerId]?.url;

    // if the user explorer doesn't exist, we try to fetch the closest so at least they can open the tx in an explorer.
    if (!url && !networkExplorers?.[explorerId] && networkExplorers) {
      // if the current network doesn't have the explorer BUT other explorers are present
      // let's use other explorer for this network
      const otherExplorer = objectEntries(networkExplorers);
      url = networkExplorers[otherExplorer[0][0]]?.url;
    }
  }

  // worst case scenario when there's no preferred explorer for this network
  // we use the fallback
  return `${(url ?? DefaultExplorerMapping[chain].fallback)?.replace('{txId}', txId ?? '')}`;
};
