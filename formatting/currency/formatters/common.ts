const commonBNOptions = {
  decimalSeparator: '.',
  groupSeparator: '',
};

/**
 * Formats a numerical quantity represented as a BigNumber into a string that
 * can be parsed by the built-in `Intl.NumberFormat.format()`.
 */
export function getStandardFormat(amount: BigNumber, maxDecimals: number): `${number}` {
  return amount.toFormat(maxDecimals, {
    ...commonBNOptions,
  }) as `${number}`;
}

/**
 * Formats a numerical quantity represented as a string parseable by
 * `Intl.NumberFormat.format()` into a locale-specific format.
 */
export function getIntlFormat(standardFormat: `${number}`, locale?: string | string[]): string {
  return new Intl.NumberFormat(locale, {
    // Set to a high value to ensure all decimals available in `standardFormat`
    // are used. It is expected that `standardFormat` has already imposed any
    // necessary limits on the decimals of the numerical value being formatted.
    maximumFractionDigits: 100,
    // Note: the types are correct, but xverse-core currently has Typescript's
    // `target` set to `"es2022"`, which doesn't support the formats available
    // in the present of 2025.
  }).format(standardFormat as any);
}
