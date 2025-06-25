import { FormatterArg } from '..';
import { BNCrypto } from '../helpers';
import { getIntlFormat, getStandardFormat } from './common';

export function cryptoStarknetGenericFormatter({
  amount,
  options,
}: FormatterArg<'default', { unitName: string; decimals: number }>): string {
  const unit = options?.unitName;
  const decimals = options?.decimals ?? 0;
  const amountString = amount.toString();
  const amountBN = BNCrypto(amountString);

  const divisorBN = BNCrypto(10).pow(BNCrypto(decimals));

  const amountBNGenericToken = amountBN.dividedBy(divisorBN);
  const standardFormat = getStandardFormat(amountBNGenericToken, decimals);
  const intlFormat = getIntlFormat(standardFormat, options?.locale);
  return `${intlFormat}${unit ? ' ' + unit : ''}`;
}
