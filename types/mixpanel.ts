import { AccountType } from './account';
import { SupportedCurrency } from './currency';

export enum AnalyticsEvents {
  OptOut = 'Opt Out',
  CreateNewWallet = 'Create new wallet',
  RestoreWallet = 'Restore wallet',
  ClickApp = 'click_app',
  AppConnected = 'app_connected',
  TransactionConfirmed = 'transaction_confirmed',
  WalletMigrated = 'wallet_migrated',
  WalletSkippedMigration = 'wallet_skipped_migration',
  InitiateSwapFlow = 'initiate_swap_flow',
  FetchSwapQuote = 'fetch_swap_quote',
  SelectSwapQuote = 'select_swap_quote',
  ConfirmSwap = 'confirm_swap',
  SignSwap = 'sign_swap',
  SelectTokenToSwapFrom = 'select_token_to_swap_from',
  SelectTokenToSwapTo = 'select_token_to_swap_to',
  ListRuneInitiated = 'list_rune_initiated',
  ListRuneSigned = 'list_rune_signed',
  SetupWallet = 'setup_wallet',
  BackupWallet = 'backup_wallet',
  BackupWalletLater = 'backup_wallet_later',
  InitiateBuyFlow = 'initiate_buy_flow',
  InitiateSendFlow = 'initiate_send_flow',
  SetTokenSendRecipient = 'set_token_send_recipient',
  SetTokenSendAmountFee = 'set_token_send_amount_fee',
  InitiateReceiveFlow = 'initiate_receive_flow',
  VisitCollectiblesTab = 'visit_collectibles_tab',
  VisitStackingTab = 'visit_stacking_tab',
  VisitExplorePage = 'visit_explore_page',

  // Fiat on-ramp flow events
  ClickQuickAmountButton = 'click_quick_amount_button',
  ClickPayWithCryptoTokens = 'click_pay_with_crypto_tokens',
  ClickQuoteOption = 'click_quote_option',
  OnrampSuccessful = 'onramp_successful',
  OnrampFailure = 'onramp_failure',

  // Revamped Receive flow events
  ClickCopyAccountButton = 'click_copy_account_button',
  ClickShowAllAddresses = 'click_show_all_addresses',
  ClickHideAddresses = 'click_hide_addresses',
  ClickCopyAddress = 'click_copy_address',
  ClickReceiveOption = 'click_receive_option',
  ClickCopyQrAddress = 'click_copy_qr_address',
  ClickShareQrButton = 'click_share_qr_button',

  // Feature announcement
  FeatureAnnouncementCTAClick = 'feature_announcement_cta_click',
  FeatureAnnouncementDismissClick = 'feature_announcement_dismiss_click',
}

type CommonProps = {
  wallet_type: AccountType;
};

type WalletBackupType = 'manual' | 'cloud';

type SetupWalletProps = {
  source: 'create' | 'restore';
};

type BackupWalletProps = {
  source?: 'onboarding' | 'settings';
  backupType: WalletBackupType;
};

type RestoreWalletProps = {
  backupType: WalletBackupType;
};

type TokenSelection = {
  principal?: string;
  selectedToken?: string;
};

type BaseSwapEvent = {
  fromTokenUsdValue: string | number;
  to?: string;
  from?: string;
  provider?: string;
  toPrincipal?: string;
  fromPrincipal?: string;
};

export type AddressType = 'stx' | 'btc_payment' | 'btc_ordinals' | 'starknet';
export type BaseSource = 'dashboard' | 'token';

interface SwapAmountEvent extends BaseSwapEvent {
  toTokenAmount?: string;
  fromTokenAmount?: string;
}

interface SelectSwapQuoteEvent {
  provider: string;
  from: string;
  to: string;
  fromPrincipal?: string;
  toPrincipal?: string;
}

export type AnalyticsEventProperties = {
  [AnalyticsEvents.ClickApp]: {
    link: string;
    source: string;
    title?: string;
    section?: string;
  };
  [AnalyticsEvents.AppConnected]: {
    requestedAddress: string[];
  } & CommonProps;
  [AnalyticsEvents.TransactionConfirmed]: {
    protocol:
      | 'brc20'
      | 'sip10'
      | 'bitcoin'
      | 'stacks'
      | 'runes'
      | 'ordinals'
      | 'rare_sats'
      | 'stacks_nfts'
      | 'starknet_erc20';
    action: 'inscribe' | 'transfer' | 'sign_message' | 'sign_psbt' | 'sign_batch_psbt';
    repeat?: number;
    batch?: number;
    selectedToken_principal?: string;
    selectedToken_name?: string;
    source?: BaseSource | 'qr_scan';
    usedAddressBook?: boolean;
  } & CommonProps;
  [AnalyticsEvents.InitiateSwapFlow]: TokenSelection;
  [AnalyticsEvents.FetchSwapQuote]: SwapAmountEvent;
  [AnalyticsEvents.ConfirmSwap]: SwapAmountEvent;
  [AnalyticsEvents.SignSwap]: SwapAmountEvent;
  [AnalyticsEvents.SelectSwapQuote]: SelectSwapQuoteEvent;
  [AnalyticsEvents.SelectTokenToSwapFrom]: TokenSelection;
  [AnalyticsEvents.SelectTokenToSwapTo]: TokenSelection;
  [AnalyticsEvents.SetupWallet]: SetupWalletProps;
  [AnalyticsEvents.BackupWallet]: BackupWalletProps;
  [AnalyticsEvents.RestoreWallet]: RestoreWalletProps;
  [AnalyticsEvents.InitiateBuyFlow]: {
    source: BaseSource | 'send_stx' | 'send_btc' | 'send_sn';
    selectedToken: string;
  };
  [AnalyticsEvents.InitiateSendFlow]: {
    source: BaseSource | 'qr_scan';
    addressType: AddressType;
    selectedToken_principal: string;
    selectedToken_name: string;
  };
  [AnalyticsEvents.SetTokenSendRecipient]: {
    source: BaseSource | 'qr_scan';
    selectedToken_principal: string;
    selectedToken_name: string;
    usedAddressBook: boolean;
  };
  [AnalyticsEvents.SetTokenSendAmountFee]: {
    source: BaseSource | 'qr_scan';
    selectedToken_principal: string;
    selectedToken_name: string;
  };
  [AnalyticsEvents.InitiateReceiveFlow]: {
    source: BaseSource | 'collectibles' | 'activity' | 'earn';
    addressType: AddressType;
    selectedToken_principal?: string;
    selectedToken_name?: string;
  };
  [AnalyticsEvents.ClickQuickAmountButton]: {
    amount: number;
  };
  [AnalyticsEvents.ClickPayWithCryptoTokens]: {
    token: string;
  };
  [AnalyticsEvents.ClickQuoteOption]: {
    provider: string;
    method: string;
    tags: string[];
    amount: number;
    currency: SupportedCurrency;
    crypto: string;
  };
  [AnalyticsEvents.ClickCopyAccountButton]: {
    source?: BaseSource | 'collectibles' | 'activity' | 'earn';
  };
  [AnalyticsEvents.ClickCopyAddress]: {
    address_type: AddressType | undefined;
    source?: BaseSource | 'collectibles' | 'activity' | 'earn';
  };
  [AnalyticsEvents.ClickReceiveOption]: {
    option: 'coins_and_tokens' | 'collectibles';
  };
  [AnalyticsEvents.ClickCopyQrAddress]: {
    asset_type: AddressType | undefined;
  };
  [AnalyticsEvents.ClickShareQrButton]: {
    asset_type: AddressType | undefined;
  };
  [AnalyticsEvents.FeatureAnnouncementCTAClick]: {
    feature: string;
  };
  [AnalyticsEvents.FeatureAnnouncementDismissClick]: {
    feature: string;
  };
};
