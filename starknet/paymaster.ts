import { AvnuApi, AvnuGasTokenPrice, DeploymentData } from '../api/avnu';
import { AccountInterface, Call, num, validateAndParseAddress, constants, encode, EstimateFeeResponse } from 'starknet';
import { XverseApi } from '../api';
import { StarknetTokenBalance } from '../types/api/xverse/starknet';
import { STARKNET_ETH_TOKEN_ADDRESS, STARKNET_STRK_TOKEN_ADDRESS, argentXContractClassHashV0_4_0 } from './constants';
import { sanitizeFelt252, checkIsDeployed, getPublicKey, createAX040W0GContractDescription } from './utils';

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

  // Check if account is deployed to handle fee estimation properly
  const deploymentStatus = await checkIsDeployed({
    address: account.address,
    network: constants.NetworkName.SN_MAIN,
  });

  let feeEstimateResponse: EstimateFeeResponse;
  if (deploymentStatus.isDeployed) {
    // Account is deployed, use normal fee estimation
    feeEstimateResponse = await account.estimateInvokeFee(calls);
  } else {
    // Account not deployed, estimate deployment + invoke fees
    const publicKey = getPublicKey((account as any).signer.pk);
    const contractDescription = createAX040W0GContractDescription({ publicKey });

    feeEstimateResponse = await account.estimateAccountDeployFee(
      {
        classHash: contractDescription.classHash,
        constructorCalldata: contractDescription.constructorCalldata,
        contractAddress: account.address,
        addressSalt: encode.sanitizeHex(encode.buf2hex(publicKey)),
      },
      { version: 3 },
    );
    feeEstimateResponse.suggestedMaxFee *= 3n; // FIXME work around estimation of only the deployment; the invoke fee is not estimated.
    // estimateInvokeFee fails, because the account is not deployed.
  }

  const [avnuGasTokens, userTokenBalancesResponse] = await Promise.all([
    avnuApi.getGasTokenPrices(),
    xverseApi.starknet.getTokenBalances({
      walletAddress: account.address,
    }),
  ]);

  // add buffer for Avnu Paymaster overhead
  // 1. transfer: fee token to Avnu.
  // 2. transfer: Avnu pays ETH to sequencer.
  // 3. transfer: what the user intended to transfer.
  // 4. transfer: Avnu refunds unused fee token.
  // What we estimate here is fee for one transfer,
  // including the transaction signature overhead.
  // Because of this signature overhead, 4x is just about the 'safe' zone.
  // This voodoo will hopefully all go away with a proper Paymaster API.
  const nativeFeeAmount = feeEstimateResponse.suggestedMaxFee * 4n;
  const nativeFeeUnit = feeEstimateResponse.unit; // 'WEI' or 'FRI'

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

    // Only add ETH as option if user has ETH balance
    if (ethBalanceInfo && ethAvnuInfo) {
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
    }
  } else if (nativeFeeUnit === 'FRI') {
    // Native fee is in STRK (FRI)
    const strkBalanceInfo = userBalancesMap.get(sanitizedStrkAddress);
    const strkAvnuInfo = avnuGasTokens.find(
      (t: AvnuGasTokenPrice) => sanitizeFelt252(t.tokenAddress) === sanitizedStrkAddress,
    );

    // Only add STRK as option if user has STRK balance
    if (strkBalanceInfo && strkAvnuInfo) {
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
    }

    if (strkAvnuInfo && strkAvnuInfo.priceInETH && typeof strkAvnuInfo.decimals === 'number') {
      totalFeeInEthEquivalentWei =
        (nativeFeeAmount * BigInt(strkAvnuInfo.priceInETH)) / 10n ** BigInt(strkAvnuInfo.decimals);
    } else {
      // If we can't get STRK price, use the fee amount directly as ETH equivalent
      totalFeeInEthEquivalentWei = nativeFeeAmount;
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
      let estimatedFeeInErc20 = (totalFeeInEthEquivalentWei * 10n ** erc20Decimals) / priceOf1Erc20InEthWei;
      const tokenAddress = validateAndParseAddress(avnuToken.tokenAddress);
      const bitcoinEquiv = [
        '0x04daa17763b286d1e59b97c283c0b8c949994c361e426a28f743c67bdfe9a32f',
        '0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac',
      ];
      if (bitcoinEquiv.includes(tokenAddress) && estimatedFeeInErc20 < 5n) {
        // correct for 1 satoshi being not divisible enough! ultrasound money!
        estimatedFeeInErc20 = 5n;
      }
      feeOptions.push({
        tokenAddress,
        name: userBalanceInfo.contractName,
        symbol: userBalanceInfo.contractSymbol,
        decimals: parseInt(userBalanceInfo.contractDecimals, 10),
        estimatedFee: estimatedFeeInErc20.toString(),
        userBalance: userBalanceInfo.balance,
        priceInUSD: avnuToken.priceInUSD,
        avnuRawPriceInETH: avnuToken.priceInETH,
        isNativeFee: false,
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
 * @param network Network to check account deployment on. Defaults to Mainnet.
 * @returns A promise resolving to the transaction hash.
 */
export async function executePaymasterTransaction(
  account: AccountInterface,
  calls: Call[],
  selectedOption: FeeOption,
  avnuApi: AvnuApi,
  network: constants.NetworkName = constants.NetworkName.SN_MAIN,
): Promise<{ transactionHash: string }> {
  if (selectedOption.isNativeFee) {
    throw new Error('Native fee selected, paymaster not supported');
  }

  // Check if account is deployed
  const deploymentStatus = await checkIsDeployed({
    address: account.address,
    network,
  });

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

  const estimatedFeeBigInt = BigInt(selectedOption.estimatedFee);
  const maxGasTokenAmount = num.toHex(estimatedFeeBigInt);

  // Build typed data for paymaster
  const buildTypedDataRequest = {
    userAddress: account.address,
    calls: callDtos,
    gasTokenAddress: selectedOption.tokenAddress,
    maxGasTokenAmount,
    ...(!deploymentStatus.isDeployed && { accountClassHash: argentXContractClassHashV0_4_0 }),
  };

  const typedData = await avnuApi.buildTypedData(buildTypedDataRequest);

  // Sign the typed data
  const signature = await account.signMessage(typedData);
  let signatureArray: string[];
  if (Array.isArray(signature)) {
    signatureArray = signature.map((s) => (typeof s === 'string' ? s : num.toHex(s)));
  } else {
    signatureArray = [num.toHex((signature as any).r), num.toHex((signature as any).s)];
  }

  // Prepare deployment data if account is not deployed
  let deploymentData: DeploymentData | undefined;
  if (!deploymentStatus.isDeployed) {
    // Generate real deployment data using the same logic as utils.ts
    const publicKey = getPublicKey((account as any).signer.pk);
    const contractDescription = createAX040W0GContractDescription({ publicKey });

    deploymentData = {
      class_hash: contractDescription.classHash,
      salt: encode.sanitizeHex(encode.buf2hex(publicKey)),
      unique: '0x0', // As per SNIP, unique must be 0 for UDC
      calldata: contractDescription.constructorCalldata.map((item) => {
        // Convert everything to hex string format
        if (typeof item === 'string') {
          // If it's already a hex string, use it as is
          if (item.startsWith('0x')) return item;
          // If it's a decimal string, convert to hex
          return `0x${BigInt(item).toString(16)}`;
        }
        // For numbers/bigints, convert to hex
        return `0x${BigInt(item).toString(16)}`;
      }),
    };
  }

  // Execute via paymaster
  const executeRequest = {
    userAddress: account.address,
    signature: signatureArray,
    typedData: JSON.stringify(typedData),
    ...(deploymentData && { deploymentData }),
  };

  const result = await avnuApi.execute(executeRequest);

  return { transactionHash: result.transactionHash };
}
