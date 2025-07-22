import { UserExplorerStorage } from '../../types';
import { UserDefaultExplorers } from '../../utils/explorer';
import { inferStoreDefinition } from '../types';

export type WalletOptionsStore = {
  balanceHidden: boolean;
  showBalanceInBtc: boolean;
  hasBackedUpWallet: boolean;
  hideStx: boolean;
  hasActivatedOrdinalsKey: boolean;
  hasActivatedRareSatsKey: boolean;
  hasActivatedRBFKey: boolean;
  rareSatsNoticeDismissed: boolean;
  showDataCollectionAlert: boolean;
  preferredExplorers: UserExplorerStorage;
};

const defaultValue: WalletOptionsStore = {
  balanceHidden: false,
  showBalanceInBtc: false,
  hasBackedUpWallet: false,
  hideStx: false,
  hasActivatedOrdinalsKey: false,
  hasActivatedRareSatsKey: false,
  hasActivatedRBFKey: false,
  rareSatsNoticeDismissed: false,
  showDataCollectionAlert: true,
  preferredExplorers: UserDefaultExplorers,
};

const storeName = 'walletOptions' as const;

export const walletOptionsStore = inferStoreDefinition({
  name: storeName,
  defaultValue,
  activeVersion: 0,
  migrate: {},
  createMutators: (storeManager) => ({
    updateOptions: async (newOptions: Partial<WalletOptionsStore>) => {
      await storeManager.updateStoreValue(storeName, newOptions);
    },
    updatePreferredExplorers: async (newExplorers: UserExplorerStorage) => {
      await storeManager.updateStoreValue(storeName, { preferredExplorers: newExplorers });
    },
  }),
  utils: {},
});
