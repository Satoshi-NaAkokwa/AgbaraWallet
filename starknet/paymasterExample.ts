import * as bip39 from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import {
  getAccountDerivationPath,
  sanitizeFelt252,
  getPublicKey,
  createAX040W0GContractDescription,
  getExpectedAccountContractAddress,
} from './utils';
import { num, CallData, Account, AccountInterface, Call, cairo, RpcProvider, constants } from 'starknet';
import { grindKey } from '@scure/starknet';
import { getStarknetFeeOptions, FeeOption, executePaymasterTransaction } from './paymaster';
import { AvnuApi, CallDto } from '../api/avnu';
import { networkNameToApi, STARKNET_STRK_TOKEN_ADDRESS } from './constants';
import { NetworkType } from '../types';
import { StarknetTokenBalancesRequest, StarknetTokenBalancesResponse } from '../types/api/xverse/starknet';
import axios from 'axios';
import { BigNumber } from '../utils/bignumber';
import { XverseApi } from '../api/xverse';

// bun run starknet/paymasterExample.ts

/**
 * A minimal mock of XverseApi that only implements the methods used by getStarknetFeeOptions
 */
class MockXverseApi {
  private network: NetworkType;

  starknet = {
    getTokenBalances: async (body: StarknetTokenBalancesRequest): Promise<StarknetTokenBalancesResponse> => {
      const baseURL = 'http://localhost:3001'; //'https://api-3.xverse.app';
      const endpoint = '/starknet/v1/tokenBalances';
      try {
        const response = await axios.get<StarknetTokenBalancesResponse>(baseURL + endpoint, {
          params: body,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(`Error fetching token balances: ${error.message}`);
          console.error('Axios error details:', {
            code: error.code,
            config: error.config,
            request: error.request ? 'Request object present' : 'No request object',
            response: error.response ? { status: error.response.status, data: error.response.data } : 'No response',
          });
        } else {
          console.error(`Unexpected error fetching token balances:`, error);
        }
        return {
          walletAddress: body.walletAddress,
          count: 0,
          nextPageKey: '',
          tokenBalances: [],
        };
      }
    },
  };

  constructor(network: NetworkType) {
    this.network = network;
  }
}

async function getOptions(
  account: AccountInterface,
  calls: Call[],
  xverseApi: MockXverseApi,
  avnuApi: AvnuApi,
): Promise<{ options: FeeOption[]; callDtos: CallDto[] }> {
  // 1. Get fee options
  const options = await getStarknetFeeOptions(account, calls, xverseApi as unknown as XverseApi, avnuApi);

  // 2. Prepare call DTOs with proper type checking
  const callDtos = calls.map((call) => {
    if (!call.calldata) {
      throw new Error(`Call data is required for ${call.contractAddress}::${call.entrypoint}`);
    }
    return {
      contractAddress: call.contractAddress,
      entrypoint: call.entrypoint,
      calldata: Array.isArray(call.calldata)
        ? call.calldata.map((item: any) => num.toHex(item))
        : [num.toHex(call.calldata as any)], // Assumes non-array is a single BigNumberish value
    };
  });

  return { options, callDtos };
}

async function main() {
  const seed = await bip39.mnemonicToSeed(process.env.XVERSE_DEV_SEED!);
  const rootNode = HDKey.fromMasterSeed(seed);
  const accountNode = rootNode.derive(getAccountDerivationPath({ accountIndex: 0n }));
  const privateKeyHD = accountNode.privateKey;

  if (!privateKeyHD) throw new Error('Expected `privateKeyHD` to be defined.');

  const privateKey = num.hexToBytes(sanitizeFelt252(grindKey(privateKeyHD)));
  const privateKeyHex = `0x${Buffer.from(privateKey).toString('hex')}`;

  const provider = new RpcProvider({
    nodeUrl: networkNameToApi.SN_MAIN,
  });

  // Derive the Starknet account address deterministically using the same
  // utilities the wallet uses in production. This avoids relying on a
  // hard-coded address and always matches the account calculated from the
  // given seed/private key.
  const publicKey = getPublicKey(privateKey);
  const contractDescription = createAX040W0GContractDescription({ publicKey });
  const derivedAccountAddress = getExpectedAccountContractAddress({
    publicKey,
    contractDescription,
  });

  const account = new Account(provider, derivedAccountAddress, privateKeyHex);
  console.log(`Using Starknet account address: ${account.address}`);

  // Check if account is deployed
  const deploymentStatus = await account
    .getClassHashAt(account.address)
    .then(() => true)
    .catch(() => false);
  console.log(`Account deployed: ${deploymentStatus}`);

  // Create mock XverseApi and real AvnuApi
  const mockXverseApi = new MockXverseApi('Mainnet');
  const avnuApi = new AvnuApi();

  const STARKNET_USDC_TOKEN_ADDRESS = '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
  // Define a simple test transaction (transfer 1 wei of USDC to self)
  // This ensures the transaction is valid, as the user has a USDC balance.
  const calls: Call[] = [
    {
      contractAddress: STARKNET_USDC_TOKEN_ADDRESS,
      entrypoint: 'transfer',
      calldata: CallData.compile([account.address, cairo.uint256(1)]),
    },
  ];

  const { options } = await getOptions(account, calls, mockXverseApi, avnuApi);

  // Pretty print options
  console.log('\nFetched Fee Options:');
  options.forEach((opt, i) => {
    console.log(`Option ${i + 1}:`);
    console.log(`  Token: ${opt.symbol} (${opt.name})`);
    console.log(`  Address: ${opt.tokenAddress}`);
    console.log(`  Estimated Fee: ${new BigNumber(opt.estimatedFee).dividedBy(10 ** opt.decimals)} ${opt.symbol}`);
    console.log(`  User Balance: ${new BigNumber(opt.userBalance).dividedBy(10 ** opt.decimals)} ${opt.symbol}`);
    console.log(`  Native Fee: ${opt.isNativeFee ? 'Yes' : 'No'}`);
    if (opt.priceInUSD) console.log(`  Price (1 ${opt.symbol}): $${opt.priceInUSD}`);
    if (opt.priceInUSD)
      console.log(
        `  Estimated Fee in USD: $${new BigNumber(opt.estimatedFee)
          .dividedBy(10 ** opt.decimals)
          .multipliedBy(opt.priceInUSD)
          .toFixed(4)}`,
      );
  });
  // Execute with selected option (default to first non-native option)
  const selectedOption = options.find((opt) => !opt.isNativeFee);

  if (!selectedOption) {
    console.error(
      'Could not find a valid non-native fee option. Please ensure the account has sufficient balance of a token supported by the paymaster.',
    );
    return;
  }

  // Test with real deployment data
  try {
    console.log('\nSelected option for payment:', selectedOption.symbol);
    console.log('About to execute paymaster transaction...');

    const result = await executePaymasterTransaction(
      account,
      calls,
      selectedOption,
      avnuApi,
      constants.NetworkName.SN_MAIN,
    );
    console.log('Paymaster executed transaction hash:', result.transactionHash);
  } catch (error) {
    console.log('Paymaster execution error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.config) {
      console.log('Request URL:', error.config.url);
      console.log('Request data:', JSON.stringify(JSON.parse(error.config.data), null, 2));
    }
  }
}

// Run the example
main();
