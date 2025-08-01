import { CoreError } from '../utils/coreError';
import { ErrorCodes } from '../addressBook/errors';
import { validateAndParseAddress } from 'starknet';
import { safeCall } from '../utils';

/**
 * https://www.notion.so/xverseapp/Starknet-Support-on-Xverse-INTERNAL-1765520b9dee80d6a8aefca799b4339e?source=copy_link#1ff5520b9dee8090ac5ee29e025d0079
 * validates and normalizes a Starknet address using starknet.js
 * - trims whitespace
 * - converts uppercase 0X to lowercase 0x for starknet.js compatibility
 * - uses starknet.js validateAndParseAddress for all validation and normalization
 *
 */
export function getValidatedStarknetAddress(address: string): string {
  const trimmedAddress = address.trimStart().trimEnd();

  if (trimmedAddress.length === 0) {
    throw new CoreError('Address cannot be empty', ErrorCodes.InvalidAddress);
  }

  let normalizedAddress = trimmedAddress;
  // Convert uppercase 0X to lowercase 0x for starknet.js compatibility
  if (normalizedAddress.startsWith('0X')) {
    normalizedAddress = `0x${normalizedAddress.slice(2)}`;
  }

  const [error, validatedAddress] = safeCall(() => validateAndParseAddress(normalizedAddress));

  if (error) {
    throw new CoreError('Address is invalid', ErrorCodes.InvalidAddress);
  }

  return validatedAddress;
}
