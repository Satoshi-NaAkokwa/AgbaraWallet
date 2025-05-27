export type AddressBookEntryChain = 'bitcoin' | 'stacks' | 'starknet';

export type AddressBookEntry = {
  id: string;
  address: string;
  name: string;
  chain: AddressBookEntryChain;
  unixDateAdded: number;
};
