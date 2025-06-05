import { constants, shortString } from 'starknet';
import { createERC20Contract } from './index';
import { STARKNET_STRK_TOKEN_ADDRESS, STARKNET_ETH_TOKEN_ADDRESS, STARKNET_WBTC_TOKEN_ADDRESS } from '../constants';

async function runExamples() {
  // Example 1: Get token decimals
  console.log('1. Getting STRK token decimals...');
  try {
    const strkContract = createERC20Contract({
      tokenAddress: STARKNET_STRK_TOKEN_ADDRESS,
      network: constants.NetworkName.SN_MAIN,
    });

    const decimals = await strkContract.decimals();
    console.log(`STRK Token Decimals: ${decimals}`);
  } catch (error) {
    console.error(`Error: ${error}\n`);
  }

  // Example 2: Get token name and symbol
  console.log('2. Getting ETH token info...');
  try {
    const ethContract = createERC20Contract({
      tokenAddress: STARKNET_ETH_TOKEN_ADDRESS,
      network: constants.NetworkName.SN_MAIN,
    });

    const [name, symbol, decimals] = await Promise.all([
      ethContract.name(),
      ethContract.symbol(),
      ethContract.decimals(),
    ]);

    const tokenInfo = {
      name: shortString.decodeShortString(name.toString()),
      symbol: shortString.decodeShortString(symbol.toString()),
      decimals: Number(decimals),
    };

    console.log('ETH Token Info:', tokenInfo);
  } catch (error) {
    console.error(`Error: ${error}\n`);
  }

  // Example 3: Get token balance for an address
  console.log('3. Getting WBTC token balance for multiple addresses...');
  try {
    const addressesToCheck = [
      {
        address: '0x059a943ca214c10234b9a3b61c558ac20c005127d183b86a99a8f3c60a08b4ff',
        description: 'Nostra: Interest Rate Model',
      },
      {
        address: '0x01583919ffd78e87fa28fdf6b6a805fe3ddf52f754a63721dcd4c258211129a6',
        description: 'Nostra: Pool WBTC/ETH',
      },
      {
        address: '0x073a2bc601562e1b8ec56a2110e31bb3ef40bbebdc68ed73f0f7c7327b359753',
        description: 'Random guy',
      },
      {
        address: '0x0000000000000000000000000000000000000000000000000000000000000001',
        description: 'Random wallet with no WBTC',
      },
    ];

    const wbtcContract = createERC20Contract({
      tokenAddress: STARKNET_WBTC_TOKEN_ADDRESS,
      network: constants.NetworkName.SN_MAIN,
    });

    const decimals = await wbtcContract.decimals();
    console.log(`WBTC Contract Decimals: ${decimals}\n`);

    for (const { address, description } of addressesToCheck) {
      try {
        const balance = await wbtcContract.balance_of(address);
        const balanceInfo = {
          address,
          description,
          raw: balance.toString(),
          decimals: Number(decimals),
          formatted: (Number(balance) / Math.pow(10, Number(decimals))).toFixed(8),
        };

        console.log(`WBTC Balance for ${description}:`);
        console.log(`  Address: ${address}`);
        console.log(`  Raw Balance: ${balanceInfo.raw}`);
        console.log(`  Formatted: ${balanceInfo.formatted} WBTC\n`);
      } catch (addressError) {
        console.error(`Error checking ${description} (${address}): ${addressError}\n`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error}\n`);
  }

  // Example 4: Get total supply of a token
  console.log('4. Getting STRK total supply...');
  try {
    const strkContract = createERC20Contract({
      tokenAddress: STARKNET_STRK_TOKEN_ADDRESS,
      network: constants.NetworkName.SN_MAIN,
    });

    const [totalSupply, decimals] = await Promise.all([strkContract.total_supply(), strkContract.decimals()]);

    const supplyInfo = {
      raw: totalSupply.toString(),
      decimals: Number(decimals),
      formatted: (Number(totalSupply) / Math.pow(10, Number(decimals))).toString(),
    };

    console.log('STRK Total Supply:', supplyInfo);
  } catch (error) {
    console.error(`Error: ${error}\n`);
  }

  // Example 5: Check allowance between owner and spender
  console.log('5. Getting ETH allowance...');
  try {
    const owner = '0x0123456789abcdef0123456789abcdef01234567';
    const spender = '0xabcdef0123456789abcdef0123456789abcdef01';
    const ethContract = createERC20Contract({
      tokenAddress: STARKNET_ETH_TOKEN_ADDRESS,
      network: constants.NetworkName.SN_MAIN,
    });

    const allowance = await ethContract.allowance(owner, spender);

    const allowanceInfo = {
      raw: allowance.toString(),
      owner,
      spender,
    };

    console.log('ETH Allowance:', allowanceInfo);
  } catch (error) {
    console.error(`Error: ${error}\n`);
  }

  // Example 6: Batch read multiple token properties
  console.log('6. Batch reading multiple tokens...');
  try {
    const tokens = [
      { name: 'STRK', address: STARKNET_STRK_TOKEN_ADDRESS },
      { name: 'ETH', address: STARKNET_ETH_TOKEN_ADDRESS },
      { name: 'WBTC', address: STARKNET_WBTC_TOKEN_ADDRESS },
    ];

    const tokenData = await Promise.all(
      tokens.map(async (token) => {
        const contract = createERC20Contract({
          tokenAddress: token.address,
          network: constants.NetworkName.SN_MAIN,
        });

        const [name, symbol, decimals, totalSupply] = await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.total_supply(),
        ]);

        return {
          expectedName: token.name,
          address: token.address,
          name: shortString.decodeShortString(name.toString()),
          symbol: shortString.decodeShortString(symbol.toString()),
          decimals: Number(decimals),
          totalSupply: totalSupply.toString(),
        };
      }),
    );

    console.log('Batch Token Data:', tokenData);
  } catch (error) {
    console.error(`Error: ${error}\n`);
  }
}

runExamples().catch(console.error);
