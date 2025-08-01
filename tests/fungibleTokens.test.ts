import { describe, expect, it } from 'vitest';
import { getFungibleTokenStates } from '../fungibleTokens';
import { type FungibleToken } from '../types';
import { STARKNET_WBTC_TOKEN_ADDRESS } from '../starknet/constants';

const sip10Token: FungibleToken = {
  assetName: 'odin-tkn',
  balance: '0',
  decimals: 6,
  image: 'https://SP2X2Z28NXZVJFCJPBR9Q3NBVYBK3GPX8PXA3R83C.odin-tkn/1-thumb.png',
  name: 'Odin',
  principal: 'SP2X2Z28NXZVJFCJPBR9Q3NBVYBK3GPX8PXA3R83C.odin-tkn',
  protocol: 'stacks',
  ticker: 'ODIN',
  total_received: '',
  total_sent: '',
};

const brc20Token: FungibleToken = {
  name: 'ORDI',
  principal: 'ORDI',
  balance: '0',
  total_sent: '',
  total_received: '',
  assetName: 'ORDI',
  ticker: 'ORDI',
  protocol: 'brc-20',
};

const runesToken: FungibleToken = {
  assetName: 'DOG•GO•TO•THE•MOON',
  balance: '3142748244',
  decimals: 5,
  name: 'DOG•GO•TO•THE•MOON',
  principal: '840000:3',
  protocol: 'runes',
  runeInscriptionId: 'e79134080a83fe3e0e06ed6990c5a9b63b362313341745707a2bff7d788a1375i0',
  runeSymbol: '🐕',
  ticker: '',
  tokenFiatRate: 0.00256291,
  total_received: '',
  total_sent: '',
};

describe('getFungibleTokenStates', () => {
  [
    {
      name: 'should default a supported sip10 token with balance to enabled',
      inputs: {
        fungibleToken: {
          ...sip10Token,
          supported: true,
          balance: '100',
        },
        manageTokens: {},
        spamTokens: [],
        showSpamTokens: false,
      },
      expected: {
        isSpam: false,
        isEnabled: true,
        showToggle: true,
      },
    },
    {
      name: 'should default an unsupported sip10 token with balance to disabled - scam tokens',
      inputs: {
        fungibleToken: {
          ...sip10Token,
          supported: false,
          balance: '100',
        },
        manageTokens: {},
        spamTokens: [],
        showSpamTokens: false,
      },
      expected: {
        isSpam: false,
        isEnabled: false,
        showToggle: true,
      },
    },
    {
      name: 'should disable and hide any token with balance if in spam tokens',
      inputs: {
        fungibleToken: {
          ...sip10Token,
          supported: true,
          balance: '100',
        },
        manageTokens: {},
        spamTokens: [sip10Token.principal],
        showSpamTokens: false,
      },
      expected: {
        isSpam: true,
        isEnabled: false,
        showToggle: false,
      },
    },
    {
      name: 'should show toggle if token has balance, in spam tokens, but user pressed show spam tokens',
      inputs: {
        fungibleToken: {
          ...sip10Token,
          supported: false,
          balance: '100',
        },
        manageTokens: {},
        spamTokens: [sip10Token.principal],
        showSpamTokens: true,
      },
      expected: {
        isSpam: false,
        isEnabled: false,
        showToggle: true,
      },
    },
    {
      name: 'should default any supported brc20 token with balance to enabled, if not in spam tokens',
      inputs: {
        fungibleToken: {
          ...brc20Token,
          balance: '100',
          supported: true,
        },
        manageTokens: {},
        spamTokens: [],
        showSpamTokens: false,
      },
      expected: {
        isSpam: false,
        isEnabled: true,
        showToggle: true,
      },
    },
    {
      name: 'should default any supported runes token with balance to enabled, if not in spam tokens',
      inputs: {
        fungibleToken: {
          ...runesToken,
          balance: '100',
          supported: true,
        },
        manageTokens: {},
        spamTokens: [],
        showSpamTokens: false,
      },
      expected: {
        isSpam: false,
        isEnabled: true,
        showToggle: true,
      },
    },
    {
      name: 'should show toggle if token is in spam tokens but user enabled it',
      inputs: {
        fungibleToken: {
          ...runesToken,
          balance: '100',
        },
        manageTokens: { [runesToken.principal]: true },
        spamTokens: [runesToken.principal],
        showSpamTokens: false,
      },
      expected: {
        isSpam: true,
        isEnabled: true,
        showToggle: true,
      },
    },
    {
      name: 'should enable WBTC without balance due to balance constraint removal',
      inputs: {
        fungibleToken: {
          name: 'Wrapped Bitcoin',
          principal: STARKNET_WBTC_TOKEN_ADDRESS,
          balance: '0',
          total_sent: '',
          total_received: '',
          assetName: 'Wrapped Bitcoin',
          ticker: 'WBTC',
          protocol: 'starknet' as const,
          tokenFiatRate: 45000,
          supported: true,
        },
        manageTokens: {},
        spamTokens: [],
        showSpamTokens: false,
      },
      expected: {
        isSpam: false,
        isEnabled: true,
        showToggle: true,
      },
    },
    {
      name: 'should enable unsupported Starknet token when user explicitly enables it',
      inputs: {
        fungibleToken: {
          name: 'Some Starknet Token',
          principal: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          balance: '1000000',
          total_sent: '',
          total_received: '',
          assetName: 'Some Starknet Token',
          ticker: 'SST',
          protocol: 'starknet' as const,
          tokenFiatRate: null,
          supported: false,
        },
        manageTokens: { '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef': true },
        spamTokens: [],
        showSpamTokens: false,
      },
      expected: {
        isSpam: false,
        isEnabled: true,
        showToggle: true,
      },
    },
    {
      name: 'should show toggle for WBTC even when explicitly disabled by user',
      inputs: {
        fungibleToken: {
          name: 'Wrapped Bitcoin',
          principal: STARKNET_WBTC_TOKEN_ADDRESS,
          balance: '0',
          total_sent: '',
          total_received: '',
          assetName: 'Wrapped Bitcoin',
          ticker: 'WBTC',
          protocol: 'starknet' as const,
          tokenFiatRate: null,
          supported: true,
        },
        manageTokens: { [STARKNET_WBTC_TOKEN_ADDRESS]: false },
        spamTokens: [],
        showSpamTokens: false,
      },
      expected: {
        isSpam: false,
        isEnabled: false,
        showToggle: true,
      },
    },
  ].forEach(({ name, inputs, expected }) => {
    it(name, () => {
      expect(getFungibleTokenStates(inputs)).toEqual(expected);
    });
  });
});
