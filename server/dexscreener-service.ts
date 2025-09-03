export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

export class DexscreenerService {
  private readonly authToken = 'jzZ8IvvhwmZhJwl842H-J3r_fQ5HTTB1';
  private readonly baseUrl = 'https://api.dexscreener.com/latest';
  
  async getLatestPairs(chainIds?: string[]): Promise<DexPair[]> {
    try {
      const endpoint = chainIds?.length 
        ? `/dex/pairs/${chainIds.join(',')}`
        : '/dex/pairs';
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Dexscreener API error: ${response.status}`);
      }

      const data = await response.json();
      return data.pairs || [];
    } catch (error) {
      console.error('Error fetching Dexscreener pairs:', error);
      return [];
    }
  }

  async getArbitrageOpportunities(minVolumeUsd = 10000, minLiquidityUsd = 50000): Promise<DexPair[]> {
    try {
      const pairs = await this.getLatestPairs(['ethereum', 'base', 'arbitrum', 'polygon']);
      
      return pairs.filter(pair => 
        pair.volume.h24 >= minVolumeUsd &&
        (pair.liquidity?.usd || 0) >= minLiquidityUsd &&
        Math.abs(pair.priceChange.h1) > 2 // Price volatility for arbitrage
      );
    } catch (error) {
      console.error('Error finding arbitrage opportunities:', error);
      return [];
    }
  }

  async searchPairsByToken(tokenAddress: string): Promise<DexPair[]> {
    try {
      const response = await fetch(`${this.baseUrl}/dex/search/?q=${tokenAddress}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Dexscreener search error: ${response.status}`);
      }

      const data = await response.json();
      return data.pairs || [];
    } catch (error) {
      console.error('Error searching pairs:', error);
      return [];
    }
  }
}

export const dexscreenerService = new DexscreenerService();