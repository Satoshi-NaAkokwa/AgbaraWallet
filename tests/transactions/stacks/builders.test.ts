import * as StacksTransactions from '@stacks/transactions';
import { describe, expect, it, vi } from 'vitest';
import * as TransactionUtils from '../../../transactions';
import { AppInfo } from '../../../types';

vi.mock('./fees');
vi.mock('@stacks/transactions');

vi.mock('../../api');

describe('stxFeeReducer', () => {
  describe('TokenTransfer', () => {
    it('returns initialFee when no appInfo', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: null,
          txType: StacksTransactions.PayloadType.TokenTransfer,
        }),
      ).toEqual(4321n);
    });

    it('returns initialFee when no send multiplier and no threshold', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            stxSendTxMultiplier: undefined,
            thresholdHighStacksFee: undefined,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.TokenTransfer,
        }),
      ).toEqual(4321n);
    });

    it('returns fee with multiplier applied if under threshold', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 2000n,
          appInfo: {
            stxSendTxMultiplier: 3,
            thresholdHighStacksFee: 10_000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.TokenTransfer,
        }),
      ).toEqual(6000n);
    });

    it('returns intialFee unmodified if multiplier is not an integer', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            stxSendTxMultiplier: 0.5,
            thresholdHighStacksFee: 10_000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.TokenTransfer,
        }),
      ).toEqual(4321n);
    });

    it('returns threshold fee if initialFee is higher', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            stxSendTxMultiplier: 1,
            thresholdHighStacksFee: 4000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.TokenTransfer,
        }),
      ).toEqual(4000n);
    });

    it('returns threshold fee if fee after multiplier is higher', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 3999n,
          appInfo: {
            stxSendTxMultiplier: 4,
            thresholdHighStacksFee: 4000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.TokenTransfer,
        }),
      ).toEqual(4000n);
    });

    it('returns absolute min fee if fee is lower than it for token transfer', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 1n,
          appInfo: {
            stxSendTxMultiplier: 1,
            thresholdHighStacksFee: 6,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.TokenTransfer,
        }),
      ).toEqual(3000n);
    });
  });

  describe('ContractCall', () => {
    it('returns initialFee when no appInfo', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: null,
          txType: StacksTransactions.PayloadType.ContractCall,
        }),
      ).toEqual(4321n);
    });

    it('returns initialFee when no other multiplier and no threshold', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            otherTxMultiplier: undefined,
            thresholdHighStacksFee: undefined,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.ContractCall,
        }),
      ).toEqual(4321n);
    });

    it('returns fee with multiplier applied if under threshold', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 2000n,
          appInfo: {
            otherTxMultiplier: 3,
            thresholdHighStacksFee: 10_000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.ContractCall,
        }),
      ).toEqual(6000n);
    });

    it('returns intialFee unmodified if multiplier is not an integer', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            otherTxMultiplier: 0.5,
            thresholdHighStacksFee: 10_000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.ContractCall,
        }),
      ).toEqual(4321n);
    });

    it('returns threshold fee if initialFee is higher', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            otherTxMultiplier: 1,
            thresholdHighStacksFee: 4000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.ContractCall,
        }),
      ).toEqual(4000n);
    });

    it('returns threshold fee if fee after multiplier is higher', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 3999n,
          appInfo: {
            otherTxMultiplier: 4,
            thresholdHighStacksFee: 4000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.ContractCall,
        }),
      ).toEqual(4000n);
    });

    it('returns absolute min fee if fee is lower than it for contract call', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 1n,
          appInfo: {
            otherTxMultiplier: 1,
            thresholdHighStacksFee: 6,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.ContractCall,
        }),
      ).toEqual(3000n);
    });
  });

  describe('SmartContract', () => {
    it('returns initialFee when no appInfo', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: null,
          txType: StacksTransactions.PayloadType.SmartContract,
        }),
      ).toEqual(4321n);
    });

    it('returns initialFee when no other multiplier and no threshold', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            stxSendTxMultiplier: undefined,
            thresholdHighStacksFee: undefined,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.SmartContract,
        }),
      ).toEqual(4321n);
    });

    it('returns fee with multiplier applied if under threshold', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 2000n,
          appInfo: {
            stxSendTxMultiplier: 3,
            thresholdHighStacksFee: 10_000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.SmartContract,
        }),
      ).toEqual(6000n);
    });

    it('returns intialFee unmodified if multiplier is not an integer', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            stxSendTxMultiplier: 0.5,
            thresholdHighStacksFee: 10_000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.SmartContract,
        }),
      ).toEqual(4321n);
    });

    it('returns threshold fee if initialFee is higher', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 4321n,
          appInfo: {
            stxSendTxMultiplier: 1,
            thresholdHighStacksFee: 4000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.SmartContract,
        }),
      ).toEqual(4000n);
    });

    it('returns threshold fee if fee after multiplier is higher', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 3999n,
          appInfo: {
            stxSendTxMultiplier: 4,
            thresholdHighStacksFee: 4000,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.SmartContract,
        }),
      ).toEqual(4000n);
    });

    it('returns absolute min fee if fee is lower than it for contract deploy', () => {
      expect(
        TransactionUtils.stxFeeReducer({
          initialFee: 1n,
          appInfo: {
            stxSendTxMultiplier: 1,
            thresholdHighStacksFee: 6,
          } as unknown as AppInfo,
          txType: StacksTransactions.PayloadType.SmartContract,
        }),
      ).toEqual(3000n);
    });
  });
});
