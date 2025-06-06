import { describe, expect, it } from 'vitest';
import { getValidatedStarknetAddress } from '../../starknet/address-validation';
import { validateStarknetAddress } from '../../wallet';
import { CoreError } from '../../utils/coreError';
import { ErrorCodes } from '../../addressBook/errors';

describe('Starknet Address Validation', () => {
  describe('getValidatedStarknetAddress', () => {
    describe('valid addresses', () => {
      it('should return full-length address unchanged', () => {
        const address = '0x059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff';
        const result = getValidatedStarknetAddress(address);
        console.log(result, address);
        expect(result).toBe(address);
      });

      it('should add 0x prefix when missing', () => {
        const address = '059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff';
        const result = getValidatedStarknetAddress(address);
        expect(result).toBe('0x059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff');
      });

      it('should convert uppercase 0X prefix to lowercase 0x', () => {
        const testCases = [
          {
            input: '0X059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff',
            expected: '0x059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff',
          },
          { input: '0X123', expected: '0x' + '123'.padStart(64, '0') },
          { input: '0X1a2b3c', expected: '0x' + '1a2b3c'.padStart(64, '0') },
          { input: '0X0', expected: '0x' + '0'.padStart(64, '0') },
        ];

        testCases.forEach(({ input, expected }) => {
          const result = getValidatedStarknetAddress(input);
          expect(result).toBe(expected);
        });
      });

      it('should left pad short addresses with zeros', () => {
        const testCases = [
          { input: '0x1', expected: '0x' + '1'.padStart(64, '0') },
          { input: '0x123', expected: '0x' + '123'.padStart(64, '0') },
          { input: '0x1a2b3c', expected: '0x' + '1a2b3c'.padStart(64, '0') },
          { input: '123', expected: '0x' + '123'.padStart(64, '0') },
          { input: '1a2b3c', expected: '0x' + '1a2b3c'.padStart(64, '0') },
        ];

        testCases.forEach(({ input, expected }) => {
          const result = getValidatedStarknetAddress(input);
          expect(result).toBe(expected);
        });
      });

      it('should trim whitespace and normalize', () => {
        const testCases = [
          { input: '  0x123  ', expected: '0x' + '123'.padStart(64, '0') },
          { input: '\t\n123\t\n', expected: '0x' + '123'.padStart(64, '0') },
          {
            input: ' 059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff ',
            expected: '0x059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff',
          },
        ];

        testCases.forEach(({ input, expected }) => {
          const result = getValidatedStarknetAddress(input);
          expect(result).toBe(expected);
        });
      });

      it('should handle edge case minimum valid address', () => {
        const address = '0x0';
        const result = getValidatedStarknetAddress(address);
        expect(result).toBe('0x' + '0'.padStart(64, '0'));
      });
    });

    describe('invalid addresses', () => {
      it('should throw error for empty address', () => {
        expect(() => getValidatedStarknetAddress('')).toThrow(
          new CoreError('Address cannot be empty', ErrorCodes.InvalidAddress),
        );
      });

      it('should throw error for whitespace-only address', () => {
        expect(() => getValidatedStarknetAddress('   ')).toThrow(
          new CoreError('Address cannot be empty', ErrorCodes.InvalidAddress),
        );
      });

      it('should throw error for addresses too long', () => {
        const tooLongAddress = '0x' + 'f'.repeat(65); // 67 characters total
        expect(() => getValidatedStarknetAddress(tooLongAddress)).toThrow(
          new CoreError('Address is invalid', ErrorCodes.InvalidAddress),
        );
      });

      it('should throw error for invalid hex characters', () => {
        const invalidAddresses = [
          '0x123g', // contains 'g'
          '0x123z', // contains 'z'
          '0x123!', // contains '!'
          '0x123 456', // contains space
          '0x123-456', // contains dash
          'random_string', // not hex at all
          '0xHELLO', // contains non-hex letters
        ];

        invalidAddresses.forEach((address) => {
          expect(() => getValidatedStarknetAddress(address)).toThrow(
            new CoreError('Address is invalid', ErrorCodes.InvalidAddress),
          );
        });
      });

      it('should throw error for addresses that fail starknet.js validation', () => {
        // This will pass format validation but fail starknet.js validation (exceeds felt252 range)
        const invalidStarknetAddress = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        expect(() => getValidatedStarknetAddress(invalidStarknetAddress)).toThrow(
          new CoreError('Address is invalid', ErrorCodes.InvalidAddress),
        );
      });
    });
  });

  describe('validateStarknetAddress', () => {
    describe('valid addresses', () => {
      it('should return true for valid Starknet addresses', () => {
        const validAddresses = [
          '0x059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff',
          '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH token
          '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK token
          '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8', // USDC token
        ];

        validAddresses.forEach((address) => {
          expect(validateStarknetAddress(address)).toBe(true);
        });
      });

      it('should return true for addresses without 0x prefix', () => {
        const addressWithoutPrefix = '059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff';
        expect(validateStarknetAddress(addressWithoutPrefix)).toBe(true);
      });

      it('should return true for short addresses that need padding', () => {
        const shortAddresses = ['0x1', '0x123', '0x1a2b3c', '123', '1a2b3c'];

        shortAddresses.forEach((address) => {
          expect(validateStarknetAddress(address)).toBe(true);
        });
      });

      it('should return true for uppercase 0X prefix', () => {
        const uppercaseAddress = '0X059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff';
        expect(validateStarknetAddress(uppercaseAddress)).toBe(true);
      });

      it('should return true for mixed case hex characters', () => {
        const mixedCaseAddress = '0x059A943Ca214C10234B9a3B61C558AC20C005127D183B86A99A8F3C60A08B4FF';
        expect(validateStarknetAddress(mixedCaseAddress)).toBe(true);
      });
    });

    describe('invalid addresses', () => {
      it('should return false for empty address', () => {
        expect(validateStarknetAddress('')).toBe(false);
      });

      it('should return false for whitespace-only address', () => {
        expect(validateStarknetAddress('   ')).toBe(false);
      });

      it('should return false for addresses too long', () => {
        const tooLongAddress = '0x' + 'f'.repeat(65); // 67 characters total
        expect(validateStarknetAddress(tooLongAddress)).toBe(false);
      });

      it('should return false for invalid hex characters', () => {
        const invalidAddresses = [
          '0x123g', // contains 'g'
          '0x123z', // contains 'z'
          '0x123!', // contains '!'
          '0x123 456', // contains space
          '0x123-456', // contains dash
          'random_string', // not hex at all
          '0xHELLO', // contains non-hex letters
        ];

        invalidAddresses.forEach((address) => {
          expect(validateStarknetAddress(address)).toBe(false);
        });
      });

      it('should return false for addresses that fail starknet.js validation', () => {
        // This will pass format validation but fail starknet.js validation
        // Using a malformed address that's technically hex but invalid
        const invalidStarknetAddress = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        expect(validateStarknetAddress(invalidStarknetAddress)).toBe(false);
      });

      it('should return false for addresses exceeding felt range', () => {
        // Address that's too large for felt252
        const tooLargeAddress = '0x0800000000000011000000000000000000000000000000000000000000000000';
        expect(validateStarknetAddress(tooLargeAddress)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return true for minimum valid address', () => {
        expect(validateStarknetAddress('0x0')).toBe(true);
        expect(validateStarknetAddress('0')).toBe(true);
      });

      it('should handle addresses with leading zeros correctly', () => {
        const addressWithLeadingZeros = '0x000000000000000000000000000000000000000000000000000000000001';
        expect(validateStarknetAddress(addressWithLeadingZeros)).toBe(true);
      });
    });
  });

  describe('integration tests', () => {
    it('should work with real Starknet addresses from mainnet', () => {
      const realAddresses = [
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH token
        '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK token
        '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8', // USDC token
        '0x059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff', // Nostra interest rate
      ];

      realAddresses.forEach((address) => {
        expect(() => getValidatedStarknetAddress(address)).not.toThrow();
        expect(validateStarknetAddress(address)).toBe(true);
      });
    });
  });
});
