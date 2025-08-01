import { Inscription } from '../ordinals';
import { NonFungibleToken } from '../stacks';
import { CollectionsListFilters } from './ordinals';

export type ListCollectionsRequest = {
  ordinalsAddress: string;
  stacksAddress: string;
  filters?: CollectionsListFilters;
  limit?: number;
  offset?: number;
  currency?: string;
};

export type CollectionPriceData = {
  fiat: {
    amount: number;
    currency: string;
    change24h?: number;
  };
  btc: {
    amount: number;
    change24h?: number;
  };
};

export enum CollectionType {
  ORDINAL = 'ORDINAL',
  STACKS_NFT = 'STACKS_NFT',
}

export type CollectionThumbnail = {
  type: string;
  ref: string;
  refType: 'id' | 'url';
};

export type Collection = {
  id: string;
  name: string;
  type: CollectionType;
  thumbnail?: CollectionThumbnail;
  itemsOwned: number;
  floorPrice: CollectionPriceData;
  portfolioValue: CollectionPriceData;
};

export type ListCollectionsResponse = {
  collections: Collection[];
  totalValue: CollectionPriceData;
  pagination: {
    total: number;
    offset: number;
    limit: number;
  };
};

export type CollectionDetailsResponse = {
  id: string;
  name: string;
  description?: string;
  type: CollectionType;

  // Market Data
  floorPrice: string;

  volume?: {
    '24h': number;
    '7d'?: number;
    '30d'?: number;
  };

  // Collection Stats
  stats?: {
    totalItems: number;
    uniqueHolders: number;
    holderDistribution?: {
      top10HoldersPercentage?: number;
      averageHolding?: number;
    };
  };

  // Social & Marketplace Links
  links?: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
};

export interface GetAddressCollectionOrdinalsResponse {
  collectionName: string;
  data: Inscription[];
  portfolioValue: CollectionPriceData;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}
export interface GetAddressCollectionStacksResponse {
  collectionName: string;
  data: NonFungibleToken[];
  portfolioValue: CollectionPriceData;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}
