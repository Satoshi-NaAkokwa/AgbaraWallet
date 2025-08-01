import { FormatterArg } from '..';
import { BNCrypto } from '../helpers';
import { getIntlFormat, getStandardFormat } from './common';

export function cryptoStarknetStarknetFormatter({ amount, options }: FormatterArg<'starknet' | 'fri'>): string {
  const unit = options?.unit ?? 'starknet';
  const amountString = amount.toString();
  const amountBN = BNCrypto(amountString);

  switch (unit) {
    case 'fri': {
      const standardFormat = getStandardFormat(amountBN, 0);
      const intlFormat = getIntlFormat(standardFormat, options?.locale);
      return intlFormat + ' fri';
    }
    case 'starknet': {
      const amountBNStrk = amountBN.dividedBy(1e18);
      const standardFormat = getStandardFormat(amountBNStrk, 18);
      const intlFormat = getIntlFormat(standardFormat, options?.locale);
      return intlFormat + ' STRK';
    }
    default:
      throw new Error(`Unexpected unit: "${unit satisfies never}"`);
  }
}
