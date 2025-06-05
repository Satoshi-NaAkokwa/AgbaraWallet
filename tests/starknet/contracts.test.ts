import { constants, shortString } from 'starknet';
import { describe, expect, it } from 'vitest';
import {
  STARKNET_ETH_TOKEN_ADDRESS,
  STARKNET_STRK_TOKEN_ADDRESS,
  STARKNET_WBTC_TOKEN_ADDRESS,
} from '../../starknet/constants';
import { createERC20Contract } from '../../starknet/contracts';

describe('Starknet Contracts Integration Tests', () => {
  describe('createERC20Contract', () => {
    it('should create an ERC20 contract with correct parameters', () => {
      const contract = createERC20Contract({
        tokenAddress: STARKNET_STRK_TOKEN_ADDRESS,
        network: constants.NetworkName.SN_MAIN,
      });

      expect(contract).toBeDefined();
      expect(typeof contract.balance_of).toBe('function');
      expect(typeof contract.decimals).toBe('function');
      expect(typeof contract.name).toBe('function');
      expect(typeof contract.symbol).toBe('function');
      expect(typeof contract.total_supply).toBe('function');
    });
  });

  describe('Get Token Information', () => {
    it('should get STRK token info', async () => {
      const contract = createERC20Contract({
        tokenAddress: STARKNET_STRK_TOKEN_ADDRESS,
        network: constants.NetworkName.SN_MAIN,
      });

      const [decimals, name, symbol, totalSupply] = await Promise.all([
        contract.decimals(),
        contract.name(),
        contract.symbol(),
        contract.total_supply(),
      ]);

      expect(Number(decimals)).toBe(18);
      expect(shortString.decodeShortString(name.toString())).toBe('Starknet Token');
      expect(shortString.decodeShortString(symbol.toString())).toBe('STRK');
      expect(Number(totalSupply)).toBeGreaterThan(0);
    });

    it('should get ETH token info', async () => {
      const contract = createERC20Contract({
        tokenAddress: STARKNET_ETH_TOKEN_ADDRESS,
        network: constants.NetworkName.SN_MAIN,
      });

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.total_supply(),
      ]);
      expect(shortString.decodeShortString(name.toString())).toBe('Ether');
      expect(shortString.decodeShortString(symbol.toString())).toBe('ETH');
      expect(Number(decimals)).toBe(18);
      expect(Number(totalSupply)).toBeGreaterThan(0);
    });

    it('should get WBTC token info', async () => {
      const contract = createERC20Contract({
        tokenAddress: STARKNET_WBTC_TOKEN_ADDRESS,
        network: constants.NetworkName.SN_MAIN,
      });

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.total_supply(),
      ]);

      expect(shortString.decodeShortString(name.toString())).toBe('Wrapped BTC');
      expect(shortString.decodeShortString(symbol.toString())).toBe('WBTC');
      expect(Number(decimals)).toBe(8);
      expect(Number(totalSupply)).toBeGreaterThan(0);
    });
  });
});
