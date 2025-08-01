import {
  addressToString,
  hexToCV,
  PostCondition,
  PostConditionType,
  Pc,
  PostConditionWire,
  FungiblePostConditionWire,
  StacksTransactionWire,
  MultiSigHashMode,
  SingleSigHashMode,
  AddressHashMode,
  deserializePostConditionWire,
} from '@stacks/transactions';
import { PostConditionsOptions } from '../../types';

export function makeNonFungiblePostCondition(options: PostConditionsOptions): PostCondition {
  const { contractAddress, contractName, assetName, stxAddress, amount } = options;

  return Pc.principal(stxAddress)
    .willSendAsset()
    .nft(`${contractAddress}.${contractName}::${assetName}`, hexToCV(amount.toString()));
}

export function makeFungiblePostCondition(options: PostConditionsOptions): PostCondition {
  const { contractAddress, contractName, assetName, stxAddress, amount } = options;

  return Pc.principal(stxAddress).willSendEq(amount).ft(`${contractAddress}.${contractName}`, assetName);
}

function removeHexPrefix(hexString: string): string {
  if (typeof hexString !== 'string') return hexString;
  return hexString.startsWith('0x') ? hexString.replace('0x', '') : hexString;
}

export function hexStringToBuffer(hex: string): Buffer {
  return Buffer.from(removeHexPrefix(hex), 'hex');
}

function isStringArray(arr: unknown[]): arr is string[] {
  return arr.every((item) => typeof item === 'string');
}

export const extractFromPayload = (payload: any) => {
  const { functionArgs, postConditions } = payload;
  const funcArgs = functionArgs?.map((arg: string) => hexToCV(arg));

  let postConds: PostConditionWire[] = [];

  if (Array.isArray(postConditions)) {
    if (isStringArray(postConditions)) {
      postConds = postConditions.map((pc) => deserializePostConditionWire(pc));
    } else {
      postConds = postConditions as PostConditionWire[];
    }
  }

  return { funcArgs, postConds };
};

export const getFTInfoFromPostConditions = (postConds: PostConditionWire[]) =>
  (
    postConds?.filter(
      (postCond) => postCond.conditionType === PostConditionType.Fungible,
    ) as FungiblePostConditionWire[]
  )?.map(
    (postCond: FungiblePostConditionWire) =>
      `${addressToString(postCond.asset.address)}.${postCond.asset.contractName.content}`,
  );

export const isMultiSig = (tx: StacksTransactionWire): boolean => {
  const hashMode = tx.auth.spendingCondition.hashMode as MultiSigHashMode | SingleSigHashMode;
  const multiSigHashModes = [
    AddressHashMode.P2SH,
    AddressHashMode.P2WSH,
    AddressHashMode.P2SHNonSequential,
    AddressHashMode.P2WSHNonSequential,
  ];

  return multiSigHashModes.includes(hashMode);
};
