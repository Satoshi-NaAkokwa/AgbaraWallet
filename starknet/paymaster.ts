import { AvnuApi, AvnuGasTokenPrice } from '../api/avnu';
import { AccountInterface, Call, num, validateAndParseAddress } from 'starknet';
import { XverseApi } from '../api';
import { StarknetTokenBalance } from '../types/api/xverse/starknet';
import { STARKNET_ETH_TOKEN_ADDRESS, STARKNET_STRK_TOKEN_ADDRESS } from './constants';
import { sanitizeFelt252 } from './utils';

export type FeeOption = {
  tokenAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  estimatedFee: string;
  userBalance: string;
  isNativeFee?: boolean;
  priceInUSD?: number;
  avnuRawPriceInETH?: string;
  imageUrl?: string;
};

/**
 * Estimates transaction fees and provides payment options for Starknet transactions.
 *
 * @param account The Starknet account interface for the user.
 * @param calls The array of calls to be executed in the transaction.
 * @param userAddress The Starknet address of the user (for fetching balances).
 * @param xverseApi An instance of XverseApi for fetching token balances.
 * @param avnuApi An instance of AvnuApi for fetching gas token prices.
 * @returns A promise that resolves to an array of FeeOption objects.
 */
export async function getStarknetFeeOptions(
  account: AccountInterface,
  calls: Call[],
  xverseApi: XverseApi,
  avnuApi: AvnuApi,
): Promise<FeeOption[]> {
  const feeOptions: FeeOption[] = [];

  // 1. Parallel fetching
  const [feeEstimateResponse, avnuGasTokens, userTokenBalancesResponse] = await Promise.all([
    account.estimateInvokeFee(calls),
    avnuApi.getGasTokenPrices(),
    xverseApi.starknet.getTokenBalances({
      walletAddress: account.address,
    }),
  ]);

  const nativeFeeEstimate = feeEstimateResponse;
  const nativeFeeAmount = nativeFeeEstimate.suggestedMaxFee;
  const nativeFeeUnit = nativeFeeEstimate.unit; // 'WEI' or 'FRI'

  // Map user balances for quick lookup
  const userBalancesMap = new Map<string, StarknetTokenBalance>();
  userTokenBalancesResponse.tokenBalances.forEach((balance: StarknetTokenBalance) => {
    userBalancesMap.set(sanitizeFelt252(balance.contractAddress), balance);
  });

  let totalFeeInEthEquivalentWei: bigint;
  const sanitizedEthAddress = sanitizeFelt252(STARKNET_ETH_TOKEN_ADDRESS);
  const sanitizedStrkAddress = sanitizeFelt252(STARKNET_STRK_TOKEN_ADDRESS);

  if (nativeFeeUnit === 'WEI') {
    // Native fee is already in ETH (WEI)
    totalFeeInEthEquivalentWei = nativeFeeAmount;
    const ethBalanceInfo = userBalancesMap.get(sanitizedEthAddress);
    const ethAvnuInfo = avnuGasTokens.find(
      (t: AvnuGasTokenPrice) => sanitizeFelt252(t.tokenAddress) === sanitizedEthAddress,
    );

    if (!ethBalanceInfo || !ethAvnuInfo) {
      throw new Error('Missing required ETH token info');
    }

    feeOptions.push({
      tokenAddress: STARKNET_ETH_TOKEN_ADDRESS,
      name: ethBalanceInfo.contractName,
      symbol: ethBalanceInfo.contractSymbol,
      decimals: parseInt(ethBalanceInfo.contractDecimals, 10),
      estimatedFee: nativeFeeAmount.toString(),
      userBalance: ethBalanceInfo.balance,
      isNativeFee: true,
      priceInUSD: ethAvnuInfo.priceInUSD,
      avnuRawPriceInETH: ethAvnuInfo.priceInETH,
      imageUrl: ethBalanceInfo.image,
    });
  } else if (nativeFeeUnit === 'FRI') {
    // Native fee is in STRK (FRI)
    const strkBalanceInfo = userBalancesMap.get(sanitizedStrkAddress);
    const strkAvnuInfo = avnuGasTokens.find(
      (t: AvnuGasTokenPrice) => sanitizeFelt252(t.tokenAddress) === sanitizedStrkAddress,
    );

    if (!strkBalanceInfo || !strkAvnuInfo) {
      throw new Error('Missing required STRK token info');
    }

    feeOptions.push({
      tokenAddress: STARKNET_STRK_TOKEN_ADDRESS,
      name: strkBalanceInfo.contractName,
      symbol: strkBalanceInfo.contractSymbol,
      decimals: parseInt(strkBalanceInfo.contractDecimals, 10),
      estimatedFee: nativeFeeAmount.toString(),
      userBalance: strkBalanceInfo.balance,
      isNativeFee: true,
      priceInUSD: strkAvnuInfo.priceInUSD,
      avnuRawPriceInETH: strkAvnuInfo.priceInETH,
      imageUrl: strkBalanceInfo.image,
    });

    if (strkAvnuInfo.priceInETH && typeof strkAvnuInfo.decimals === 'number') {
      totalFeeInEthEquivalentWei =
        (nativeFeeAmount * BigInt(strkAvnuInfo.priceInETH)) / 10n ** BigInt(strkAvnuInfo.decimals);
    } else {
      throw new Error('STRK price in ETH or decimals missing/invalid');
    }
  } else {
    throw new Error(`Unknown native fee unit: ${nativeFeeUnit}`);
  }

  // 3. Calculate fee for other ERC20 tokens the user has and are supported by AVNU
  for (const avnuToken of avnuGasTokens) {
    const sanitizedAvnuTokenAddress = sanitizeFelt252(avnuToken.tokenAddress);
    if (sanitizedAvnuTokenAddress === sanitizedEthAddress || sanitizedAvnuTokenAddress === sanitizedStrkAddress) {
      continue; // Skip native tokens already added
    }

    const userBalanceInfo = userBalancesMap.get(sanitizedAvnuTokenAddress);
    if (
      userBalanceInfo &&
      totalFeeInEthEquivalentWei > 0n &&
      avnuToken.priceInETH &&
      typeof avnuToken.decimals === 'number'
    ) {
      const priceOf1Erc20InEthWei = BigInt(avnuToken.priceInETH);
      const erc20Decimals = BigInt(avnuToken.decimals);
      const estimatedFeeInErc20 = (totalFeeInEthEquivalentWei * 10n ** erc20Decimals) / priceOf1Erc20InEthWei;

      feeOptions.push({
        tokenAddress: validateAndParseAddress(avnuToken.tokenAddress),
        name: userBalanceInfo.contractName,
        symbol: userBalanceInfo.contractSymbol,
        decimals: parseInt(userBalanceInfo.contractDecimals, 10),
        estimatedFee: estimatedFeeInErc20.toString(),
        userBalance: userBalanceInfo.balance,
        priceInUSD: avnuToken.priceInUSD,
        avnuRawPriceInETH: avnuToken.priceInETH,
        imageUrl: userBalanceInfo.image,
      });
    }
  }

  // 4. Sort options: Native options first, then by user balance (desc), then by name
  feeOptions.sort((a: FeeOption, b: FeeOption) => {
    if (a.isNativeFee && !b.isNativeFee) return -1;
    if (!a.isNativeFee && b.isNativeFee) return 1;
    const balanceA = BigInt(a.userBalance || '0');
    const balanceB = BigInt(b.userBalance || '0');
    if (balanceA !== balanceB) {
      return balanceB > balanceA ? 1 : -1; // Sort by balance descending
    }
    return a.name.localeCompare(b.name);
  });
  return feeOptions;
}

/**
 * Executes a transaction through AVNU Paymaster.
 * @param account The Starknet account interface for the user.
 * @param calls The array of calls to be executed in the transaction.
 * @param selectedOption The fee option selected by the user.
 * @param avnuApi An instance of AvnuApi for paymaster operations.
 * @returns A promise resolving to the transaction hash.
 */
export async function executePaymasterTransaction(
  account: AccountInterface,
  calls: Call[],
  selectedOption: FeeOption,
  avnuApi: AvnuApi,
): Promise<{ transactionHash: string }> {
  if (selectedOption.isNativeFee) {
    throw new Error('Native fee selected, paymaster not supported');
  }
  const callDtos = calls.map((call) => {
    if (!call.calldata) {
      throw new Error(`Call data is required for ${call.contractAddress}::${call.entrypoint}`);
    }
    return {
      contractAddress: call.contractAddress,
      entrypoint: call.entrypoint,
      calldata: Array.isArray(call.calldata)
        ? call.calldata.map((item: any) => num.toHex(item))
        : [num.toHex(call.calldata as any)],
    };
  });

  // Multiply estimated fee (in smallest unit) by a buffer factor of 3
  // 2 is sometimes not enough
  const estimatedFeeBigInt = BigInt(selectedOption.estimatedFee);
  const maxGasTokenAmount = num.toHex(estimatedFeeBigInt * 3n);

  // Build typed data for paymaster
  const typedData = await avnuApi.buildTypedData({
    userAddress: account.address,
    calls: callDtos,
    gasTokenAddress: selectedOption.tokenAddress,
    maxGasTokenAmount,
  });

  // Sign the typed data
  const signature = await account.signMessage(typedData);
  let signatureArray: string[];
  if (Array.isArray(signature)) {
    signatureArray = signature.map((s) => (typeof s === 'string' ? s : num.toHex(s)));
  } else {
    signatureArray = [num.toHex((signature as any).r), num.toHex((signature as any).s)];
  }

  // Execute via paymaster
  const result = await avnuApi.execute({
    userAddress: account.address,
    signature: signatureArray,
    typedData: JSON.stringify(typedData),
  });

  return { transactionHash: result.transactionHash };
}
