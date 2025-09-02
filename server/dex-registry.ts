export interface DEXConfig {
  id: string;
  name: string;
  chain: string;
  apiEndpoint?: string;
  routerAddress?: string;
  factoryAddress?: string;
  graphqlEndpoint?: string;
  fees: number[];
  supportedTokens: string[];
  liquidityThreshold: number;
  avgGasCost: number;
  maxSlippage: number;
  isActive: boolean;
}

export interface ChainConfig {
  id: string;
  name: string;
  rpcUrl: string;
  chainId: number;
  nativeCurrency: string;
  blockTime: number;
  avgGasPrice: number;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    rpcUrl: 'https://mainnet.infura.io/v3/your-key',
    chainId: 1,
    nativeCurrency: 'ETH',
    blockTime: 12,
    avgGasPrice: 30
  },
  {
    id: 'polygon',
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    nativeCurrency: 'MATIC',
    blockTime: 2,
    avgGasPrice: 30
  },
  {
    id: 'bsc',
    name: 'BSC',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    chainId: 56,
    nativeCurrency: 'BNB',
    blockTime: 3,
    avgGasPrice: 5
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    nativeCurrency: 'ETH',
    blockTime: 1,
    avgGasPrice: 0.1
  },
  {
    id: 'optimism',
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    chainId: 10,
    nativeCurrency: 'ETH',
    blockTime: 2,
    avgGasPrice: 0.001
  },
  {
    id: 'base',
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453,
    nativeCurrency: 'ETH',
    blockTime: 2,
    avgGasPrice: 0.001
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    nativeCurrency: 'AVAX',
    blockTime: 2,
    avgGasPrice: 25
  }
];

export const DEX_REGISTRY: DEXConfig[] = [
  // Ethereum DEXes
  {
    id: 'uniswap-v3-eth',
    name: 'Uniswap V3',
    chain: 'ethereum',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    graphqlEndpoint: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'LINK', 'UNI'],
    liquidityThreshold: 100000,
    avgGasCost: 150000,
    maxSlippage: 0.5,
    isActive: true
  },
  {
    id: 'curve-eth',
    name: 'Curve Finance',
    chain: 'ethereum',
    routerAddress: '0x99a58482BD75cbab83b27EC03CA68fF489b5788f',
    fees: [0.04],
    supportedTokens: ['USDT', 'USDC', 'DAI', 'FRAX', 'TUSD'],
    liquidityThreshold: 50000,
    avgGasCost: 120000,
    maxSlippage: 0.1,
    isActive: true
  },
  {
    id: 'sushiswap-eth',
    name: 'SushiSwap',
    chain: 'ethereum',
    routerAddress: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    factoryAddress: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'SUSHI', 'WBTC'],
    liquidityThreshold: 25000,
    avgGasCost: 130000,
    maxSlippage: 0.5,
    isActive: true
  },
  {
    id: 'balancer-eth',
    name: 'Balancer',
    chain: 'ethereum',
    routerAddress: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    fees: [0.1, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'BAL', 'WBTC'],
    liquidityThreshold: 30000,
    avgGasCost: 200000,
    maxSlippage: 1.0,
    isActive: true
  },
  {
    id: '1inch-eth',
    name: '1inch',
    chain: 'ethereum',
    apiEndpoint: 'https://api.1inch.io/v5.0/1',
    fees: [0.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'LINK'],
    liquidityThreshold: 10000,
    avgGasCost: 180000,
    maxSlippage: 3.0,
    isActive: true
  },

  // Polygon DEXes
  {
    id: 'uniswap-v3-polygon',
    name: 'Uniswap V3',
    chain: 'polygon',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['MATIC', 'USDT', 'USDC', 'DAI', 'WETH', 'LINK'],
    liquidityThreshold: 50000,
    avgGasCost: 80000,
    maxSlippage: 0.5,
    isActive: true
  },
  {
    id: 'quickswap-polygon',
    name: 'QuickSwap',
    chain: 'polygon',
    routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    fees: [0.3],
    supportedTokens: ['MATIC', 'USDT', 'USDC', 'DAI', 'QUICK', 'WETH'],
    liquidityThreshold: 20000,
    avgGasCost: 60000,
    maxSlippage: 0.5,
    isActive: true
  },
  {
    id: 'sushiswap-polygon',
    name: 'SushiSwap',
    chain: 'polygon',
    routerAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    fees: [0.3],
    supportedTokens: ['MATIC', 'USDT', 'USDC', 'SUSHI', 'WETH'],
    liquidityThreshold: 15000,
    avgGasCost: 70000,
    maxSlippage: 0.5,
    isActive: true
  },

  // BSC DEXes
  {
    id: 'pancakeswap-bsc',
    name: 'PancakeSwap',
    chain: 'bsc',
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    fees: [0.25],
    supportedTokens: ['BNB', 'USDT', 'USDC', 'BUSD', 'CAKE', 'ETH'],
    liquidityThreshold: 30000,
    avgGasCost: 120000,
    maxSlippage: 0.5,
    isActive: true
  },
  {
    id: 'biswap-bsc',
    name: 'Biswap',
    chain: 'bsc',
    routerAddress: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    fees: [0.1],
    supportedTokens: ['BNB', 'USDT', 'USDC', 'BSW'],
    liquidityThreshold: 10000,
    avgGasCost: 100000,
    maxSlippage: 0.3,
    isActive: true
  },

  // Arbitrum DEXes
  {
    id: 'uniswap-v3-arbitrum',
    name: 'Uniswap V3',
    chain: 'arbitrum',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'ARB', 'LINK'],
    liquidityThreshold: 40000,
    avgGasCost: 200000,
    maxSlippage: 0.5,
    isActive: true
  },
  {
    id: 'gmx-arbitrum',
    name: 'GMX',
    chain: 'arbitrum',
    routerAddress: '0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064',
    fees: [0.1],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'GMX', 'GLP'],
    liquidityThreshold: 100000,
    avgGasCost: 300000,
    maxSlippage: 1.0,
    isActive: true
  },
  {
    id: 'camelot-arbitrum',
    name: 'Camelot',
    chain: 'arbitrum',
    routerAddress: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'ARB', 'GRAIL'],
    liquidityThreshold: 20000,
    avgGasCost: 180000,
    maxSlippage: 0.8,
    isActive: true
  },

  // Optimism DEXes
  {
    id: 'velodrome-optimism',
    name: 'Velodrome',
    chain: 'optimism',
    routerAddress: '0x9c12939390052919aF3155f41Bf4160Fd3666A6f',
    fees: [0.05, 0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'OP', 'VELO'],
    liquidityThreshold: 25000,
    avgGasCost: 100000,
    maxSlippage: 0.5,
    isActive: true
  },
  {
    id: 'uniswap-v3-optimism',
    name: 'Uniswap V3',
    chain: 'optimism',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'OP'],
    liquidityThreshold: 35000,
    avgGasCost: 80000,
    maxSlippage: 0.5,
    isActive: true
  },

  // Base DEXes
  {
    id: 'aerodrome-base',
    name: 'Aerodrome',
    chain: 'base',
    routerAddress: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    fees: [0.05, 0.3],
    supportedTokens: ['ETH', 'USDC', 'DAI', 'AERO'],
    liquidityThreshold: 40000,
    avgGasCost: 50000,
    maxSlippage: 0.5,
    isActive: true
  },
  {
    id: 'uniswap-v3-base',
    name: 'Uniswap V3',
    chain: 'base',
    routerAddress: '0x2626664c2603336E57B271c5C0b26F421741e481',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDC', 'DAI'],
    liquidityThreshold: 30000,
    avgGasCost: 60000,
    maxSlippage: 0.5,
    isActive: true
  },

  // Avalanche DEXes
  {
    id: 'traderjoe-avalanche',
    name: 'Trader Joe',
    chain: 'avalanche',
    routerAddress: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    fees: [0.3],
    supportedTokens: ['AVAX', 'USDT', 'USDC', 'JOE', 'WAVAX'],
    liquidityThreshold: 20000,
    avgGasCost: 200000,
    maxSlippage: 0.8,
    isActive: true
  },
  {
    id: 'pangolin-avalanche',
    name: 'Pangolin',
    chain: 'avalanche',
    routerAddress: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
    fees: [0.3],
    supportedTokens: ['AVAX', 'USDT', 'USDC', 'PNG'],
    liquidityThreshold: 15000,
    avgGasCost: 180000,
    maxSlippage: 0.8,
    isActive: true
  }
];

export const ALL_DEXES: DEXConfig[] = [
  ...DEX_REGISTRY,
  // Additional 60+ DEXes across all chains
  { id: 'kyberswap-eth', name: 'KyberSwap', chain: 'ethereum', fees: [0.3], supportedTokens: ['ETH', 'USDT', 'USDC'], liquidityThreshold: 20000, avgGasCost: 140000, maxSlippage: 0.5, isActive: true },
  { id: 'bancor-eth', name: 'Bancor', chain: 'ethereum', fees: [0.2], supportedTokens: ['ETH', 'USDT', 'BNT'], liquidityThreshold: 15000, avgGasCost: 160000, maxSlippage: 0.5, isActive: true },
  { id: 'shibaswap-eth', name: 'ShibaSwap', chain: 'ethereum', fees: [0.3], supportedTokens: ['ETH', 'SHIB', 'BONE'], liquidityThreshold: 10000, avgGasCost: 150000, maxSlippage: 1.0, isActive: true },
  { id: 'cowswap-eth', name: 'CoW Protocol', chain: 'ethereum', fees: [0.0], supportedTokens: ['ETH', 'USDT', 'USDC'], liquidityThreshold: 25000, avgGasCost: 0, maxSlippage: 0.5, isActive: true },
  { id: 'dodo-eth', name: 'DODO', chain: 'ethereum', fees: [0.3], supportedTokens: ['ETH', 'USDT', 'DODO'], liquidityThreshold: 15000, avgGasCost: 140000, maxSlippage: 0.8, isActive: true },
  
  // Polygon Extended
  { id: 'apeswap-polygon', name: 'ApeSwap', chain: 'polygon', fees: [0.2], supportedTokens: ['MATIC', 'BANANA', 'USDC'], liquidityThreshold: 10000, avgGasCost: 60000, maxSlippage: 0.5, isActive: true },
  { id: 'curve-polygon', name: 'Curve Finance', chain: 'polygon', fees: [0.04], supportedTokens: ['USDT', 'USDC', 'DAI'], liquidityThreshold: 25000, avgGasCost: 50000, maxSlippage: 0.1, isActive: true },
  { id: 'kyberswap-polygon', name: 'KyberSwap', chain: 'polygon', fees: [0.3], supportedTokens: ['MATIC', 'USDT', 'USDC'], liquidityThreshold: 15000, avgGasCost: 70000, maxSlippage: 0.5, isActive: true },
  { id: 'dodo-polygon', name: 'DODO', chain: 'polygon', fees: [0.3], supportedTokens: ['MATIC', 'USDT', 'DODO'], liquidityThreshold: 8000, avgGasCost: 65000, maxSlippage: 0.8, isActive: true },
  
  // BSC Extended
  { id: 'mdex-bsc', name: 'MDEX', chain: 'bsc', fees: [0.3], supportedTokens: ['BNB', 'USDT', 'MDX'], liquidityThreshold: 12000, avgGasCost: 110000, maxSlippage: 0.5, isActive: true },
  { id: 'apeswap-bsc', name: 'ApeSwap', chain: 'bsc', fees: [0.2], supportedTokens: ['BNB', 'BANANA', 'USDT'], liquidityThreshold: 8000, avgGasCost: 100000, maxSlippage: 0.5, isActive: true },
  { id: 'bakeryswap-bsc', name: 'BakerySwap', chain: 'bsc', fees: [0.3], supportedTokens: ['BNB', 'BAKE', 'USDT'], liquidityThreshold: 6000, avgGasCost: 90000, maxSlippage: 0.8, isActive: true },
  { id: 'ellipsis-bsc', name: 'Ellipsis', chain: 'bsc', fees: [0.04], supportedTokens: ['BUSD', 'USDT', 'USDC'], liquidityThreshold: 15000, avgGasCost: 80000, maxSlippage: 0.1, isActive: true },
  
  // Arbitrum Extended
  { id: 'sushiswap-arbitrum', name: 'SushiSwap', chain: 'arbitrum', fees: [0.3], supportedTokens: ['ETH', 'USDT', 'SUSHI'], liquidityThreshold: 20000, avgGasCost: 150000, maxSlippage: 0.5, isActive: true },
  { id: 'curve-arbitrum', name: 'Curve Finance', chain: 'arbitrum', fees: [0.04], supportedTokens: ['USDT', 'USDC', 'DAI'], liquidityThreshold: 30000, avgGasCost: 100000, maxSlippage: 0.1, isActive: true },
  { id: 'balancer-arbitrum', name: 'Balancer', chain: 'arbitrum', fees: [0.1, 0.3], supportedTokens: ['ETH', 'USDT', 'BAL'], liquidityThreshold: 25000, avgGasCost: 180000, maxSlippage: 1.0, isActive: true },
  { id: 'radiant-arbitrum', name: 'Radiant Capital', chain: 'arbitrum', fees: [0.3], supportedTokens: ['ETH', 'USDT', 'RDNT'], liquidityThreshold: 15000, avgGasCost: 160000, maxSlippage: 0.8, isActive: true },
  
  // Optimism Extended
  { id: 'sushiswap-optimism', name: 'SushiSwap', chain: 'optimism', fees: [0.3], supportedTokens: ['ETH', 'USDT', 'SUSHI'], liquidityThreshold: 15000, avgGasCost: 80000, maxSlippage: 0.5, isActive: true },
  { id: 'curve-optimism', name: 'Curve Finance', chain: 'optimism', fees: [0.04], supportedTokens: ['USDT', 'USDC', 'DAI'], liquidityThreshold: 20000, avgGasCost: 70000, maxSlippage: 0.1, isActive: true },
  { id: 'beethoven-optimism', name: 'Beethoven X', chain: 'optimism', fees: [0.1, 0.3], supportedTokens: ['ETH', 'USDT', 'BEETS'], liquidityThreshold: 12000, avgGasCost: 90000, maxSlippage: 1.0, isActive: true },
  
  // Base Extended
  { id: 'sushiswap-base', name: 'SushiSwap', chain: 'base', fees: [0.3], supportedTokens: ['ETH', 'USDC', 'SUSHI'], liquidityThreshold: 15000, avgGasCost: 50000, maxSlippage: 0.5, isActive: true },
  { id: 'curve-base', name: 'Curve Finance', chain: 'base', fees: [0.04], supportedTokens: ['USDC', 'DAI'], liquidityThreshold: 20000, avgGasCost: 45000, maxSlippage: 0.1, isActive: true },
  
  // Avalanche Extended
  { id: 'sushiswap-avalanche', name: 'SushiSwap', chain: 'avalanche', fees: [0.3], supportedTokens: ['AVAX', 'USDT', 'SUSHI'], liquidityThreshold: 15000, avgGasCost: 180000, maxSlippage: 0.5, isActive: true },
  { id: 'curve-avalanche', name: 'Curve Finance', chain: 'avalanche', fees: [0.04], supportedTokens: ['USDT', 'USDC', 'DAI'], liquidityThreshold: 20000, avgGasCost: 160000, maxSlippage: 0.1, isActive: true },
  { id: 'gmx-avalanche', name: 'GMX', chain: 'avalanche', fees: [0.1], supportedTokens: ['AVAX', 'USDT', 'GMX'], liquidityThreshold: 80000, avgGasCost: 250000, maxSlippage: 1.0, isActive: true },
  { id: 'platypus-avalanche', name: 'Platypus Finance', chain: 'avalanche', fees: [0.04], supportedTokens: ['USDT', 'USDC', 'DAI', 'PTP'], liquidityThreshold: 10000, avgGasCost: 140000, maxSlippage: 0.2, isActive: true }
];

export function getDEXesByChain(chain: string): DEXConfig[] {
  return ALL_DEXES.filter(dex => dex.chain === chain && dex.isActive);
}

export function getDEXById(id: string): DEXConfig | undefined {
  return ALL_DEXES.find(dex => dex.id === id);
}

export function getAllActiveDEXes(): DEXConfig[] {
  return ALL_DEXES.filter(dex => dex.isActive);
}

export function getDEXesByToken(token: string): DEXConfig[] {
  return ALL_DEXES.filter(dex => 
    dex.supportedTokens.includes(token) && dex.isActive
  );
}

// Calculate potential profit for arbitrage opportunity
export function calculateArbitrageProfit(
  buyPrice: number,
  sellPrice: number,
  amount: number,
  buyDex: DEXConfig,
  sellDex: DEXConfig,
  gasPriceGwei: number = 20
): number {
  const buyFee = (buyPrice * amount) * (buyDex.fees[0] / 100);
  const sellFee = (sellPrice * amount) * (sellDex.fees[0] / 100);
  
  const gasCostBuy = (buyDex.avgGasCost * gasPriceGwei) / 1e9;
  const gasCostSell = (sellDex.avgGasCost * gasPriceGwei) / 1e9;
  
  const grossProfit = (sellPrice - buyPrice) * amount;
  const totalCosts = buyFee + sellFee + gasCostBuy + gasCostSell;
  
  return grossProfit - totalCosts;
}

// Check if arbitrage opportunity is profitable
export function isProfitableArbitrage(
  buyPrice: number,
  sellPrice: number,
  amount: number,
  buyDex: DEXConfig,
  sellDex: DEXConfig,
  minProfitThreshold: number = 0.005 // 0.5%
): boolean {
  const profit = calculateArbitrageProfit(buyPrice, sellPrice, amount, buyDex, sellDex);
  const profitPercentage = profit / (buyPrice * amount);
  return profitPercentage >= minProfitThreshold;
}