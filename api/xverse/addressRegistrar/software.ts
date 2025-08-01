import { AddressType } from 'bitcoin-address-validation';
import { signMessageBip322 } from '../../../connect';
import { BTC_SEGWIT_PATH_PURPOSE, BTC_TAPROOT_PATH_PURPOSE, BTC_WRAPPED_SEGWIT_PATH_PURPOSE } from '../../../constant';
import { Account, NetworkType } from '../../../types';
import { DerivationType, MasterVault } from '../../../vaults';
import { BaseAddressRegistrar } from './base';
import { HDKey } from '@scure/bip32';

export class SoftwareAddressRegistrar extends BaseAddressRegistrar {
  private vault: MasterVault;

  constructor(accessToken: string, network: NetworkType, vault: MasterVault) {
    super(accessToken, network);
    this.vault = vault;
  }

  batchHydrate = async (
    accounts: Account[],
    config?: {
      rootNode: HDKey;
      derivationType: DerivationType;
    },
  ): Promise<void> => {
    // check walletId matches in all accounts
    const walletId = accounts[0].walletId;
    const isThereAnyAccountWithDifferentWalletId = accounts.some((account) => account.walletId !== walletId);
    if (!walletId || isThereAnyAccountWithDifferentWalletId) {
      throw new Error('All accounts must belong to the same wallet');
    }

    const { rootNode, derivationType } = config ?? (await this.vault.SeedVault.getWalletRootNode(walletId));

    for (const account of accounts) {
      await this.hydrateInternal(account, AddressType.p2sh, { rootNode, derivationType });
      await this.hydrateInternal(account, AddressType.p2wpkh, { rootNode, derivationType });
      await this.hydrateInternal(account, AddressType.p2tr, { rootNode, derivationType });
    }

    this.IsFinalized = true;
  };

  hydrate = async (account: Account): Promise<void> => {
    await this.hydrateInternal(account, AddressType.p2sh);
    await this.hydrateInternal(account, AddressType.p2wpkh);
    await this.hydrateInternal(account, AddressType.p2tr);

    this.IsFinalized = true;
  };

  private hydrateInternal = async (
    account: Account,
    type: AddressType.p2sh | AddressType.p2wpkh | AddressType.p2tr,
    config?: {
      rootNode: HDKey;
      derivationType: DerivationType;
    },
  ): Promise<void> => {
    if (account.accountType !== 'software') {
      throw new Error('Invalid account type for software registrar');
    }

    const registrationKey = `${account.walletId}:${account.id}:${type}`;

    if (this.registrationData[registrationKey]) {
      return;
    }

    if (this.IsFinalized) throw new Error('Address registrar is already finalized');

    const path =
      type === AddressType.p2sh
        ? BTC_WRAPPED_SEGWIT_PATH_PURPOSE
        : type === AddressType.p2wpkh
          ? BTC_SEGWIT_PATH_PURPOSE
          : BTC_TAPROOT_PATH_PURPOSE;

    const { rootNode, derivationType } = config ?? (await this.vault.SeedVault.getWalletRootNode(account.walletId));

    if (!rootNode || !derivationType) {
      throw new Error('Root node or derivation type not found');
    }

    const chain = this.network === 'Mainnet' ? 0 : 1;
    const accountIndex = derivationType === 'account' ? account.id : 0;
    const addressIndex = derivationType === 'index' ? account.id : 0;
    const accountPath = `${path}${chain}'/${accountIndex}'/0/${addressIndex}`;

    const accountNode = rootNode.derive(accountPath);
    const xpub = accountNode.publicExtendedKey;
    const pathSuffix = 'm/42';
    const signNode = accountNode.derive(pathSuffix);

    const { signature } = await signMessageBip322({
      addressType: type,
      message: this.challenge + pathSuffix,
      network: this.network,
      privateKey: signNode.privateKey!,
    });

    this.registrationData[registrationKey] = {
      pathSuffix,
      xPubKey: xpub,
      signature,
      type,
    };
  };
}
