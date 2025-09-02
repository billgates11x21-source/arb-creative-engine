
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
  avgExecutionTime?: number;
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

// Complete 80+ DEX Registry for Real Trading
export const ALL_DEXES: DEXConfig[] = [
  // Ethereum DEXes (20 total)
  {
    id: 'uniswap-v3-eth',
    name: 'Uniswap V3',
    chain: 'ethereum',
    routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'LINK', 'UNI'],
    liquidityThreshold: 100000,
    avgGasCost: 150000,
    maxSlippage: 0.5,
    avgExecutionTime: 15,
    isActive: true
  },
  {
    id: 'uniswap-v2-eth',
    name: 'Uniswap V2',
    chain: 'ethereum',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'WBTC'],
    liquidityThreshold: 80000,
    avgGasCost: 120000,
    maxSlippage: 0.5,
    avgExecutionTime: 12,
    isActive: true
  },
  {
    id: 'curve-eth',
    name: 'Curve Finance',
    chain: 'ethereum',
    fees: [0.04],
    supportedTokens: ['USDT', 'USDC', 'DAI', 'FRAX'],
    liquidityThreshold: 200000,
    avgGasCost: 120000,
    maxSlippage: 0.1,
    avgExecutionTime: 10,
    isActive: true
  },
  {
    id: 'sushiswap-eth',
    name: 'SushiSwap',
    chain: 'ethereum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'SUSHI'],
    liquidityThreshold: 50000,
    avgGasCost: 130000,
    maxSlippage: 0.5,
    avgExecutionTime: 15,
    isActive: true
  },
  {
    id: 'balancer-eth',
    name: 'Balancer V2',
    chain: 'ethereum',
    fees: [0.1, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'BAL'],
    liquidityThreshold: 75000,
    avgGasCost: 200000,
    maxSlippage: 1.0,
    avgExecutionTime: 20,
    isActive: true
  },
  {
    id: '1inch-eth',
    name: '1inch V5',
    chain: 'ethereum',
    apiEndpoint: 'https://api.1inch.io/v5.0/1',
    fees: [0.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'DAI'],
    liquidityThreshold: 30000,
    avgGasCost: 180000,
    maxSlippage: 3.0,
    avgExecutionTime: 25,
    isActive: true
  },
  {
    id: 'kyberswap-eth',
    name: 'KyberSwap',
    chain: 'ethereum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 40000,
    avgGasCost: 140000,
    maxSlippage: 0.5,
    avgExecutionTime: 18,
    isActive: true
  },
  {
    id: 'bancor-eth',
    name: 'Bancor V3',
    chain: 'ethereum',
    fees: [0.2],
    supportedTokens: ['ETH', 'USDT', 'BNT'],
    liquidityThreshold: 25000,
    avgGasCost: 160000,
    maxSlippage: 0.5,
    avgExecutionTime: 22,
    isActive: true
  },
  {
    id: 'shibaswap-eth',
    name: 'ShibaSwap',
    chain: 'ethereum',
    fees: [0.3],
    supportedTokens: ['ETH', 'SHIB', 'BONE'],
    liquidityThreshold: 15000,
    avgGasCost: 150000,
    maxSlippage: 1.0,
    avgExecutionTime: 20,
    isActive: true
  },
  {
    id: 'cowswap-eth',
    name: 'CoW Protocol',
    chain: 'ethereum',
    fees: [0.0],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 60000,
    avgGasCost: 0,
    maxSlippage: 0.5,
    avgExecutionTime: 30,
    isActive: true
  },
  {
    id: 'dodo-eth',
    name: 'DODO V2',
    chain: 'ethereum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'DODO'],
    liquidityThreshold: 20000,
    avgGasCost: 140000,
    maxSlippage: 0.8,
    avgExecutionTime: 18,
    isActive: true
  },
  {
    id: 'paraswap-eth',
    name: 'ParaSwap',
    chain: 'ethereum',
    fees: [0.0],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 35000,
    avgGasCost: 200000,
    maxSlippage: 2.0,
    avgExecutionTime: 30,
    isActive: true
  },
  {
    id: 'matcha-eth',
    name: '0x Protocol',
    chain: 'ethereum',
    fees: [0.0],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 40000,
    avgGasCost: 170000,
    maxSlippage: 1.5,
    avgExecutionTime: 25,
    isActive: true
  },
  {
    id: 'airswap-eth',
    name: 'AirSwap',
    chain: 'ethereum',
    fees: [0.0],
    supportedTokens: ['ETH', 'USDT', 'AST'],
    liquidityThreshold: 10000,
    avgGasCost: 100000,
    maxSlippage: 1.0,
    avgExecutionTime: 15,
    isActive: true
  },
  {
    id: 'hashflow-eth',
    name: 'Hashflow',
    chain: 'ethereum',
    fees: [0.0],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 30000,
    avgGasCost: 120000,
    maxSlippage: 0.5,
    avgExecutionTime: 20,
    isActive: true
  },
  {
    id: 'clipper-eth',
    name: 'Clipper',
    chain: 'ethereum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 15000,
    avgGasCost: 80000,
    maxSlippage: 0.5,
    avgExecutionTime: 12,
    isActive: true
  },
  {
    id: 'maverick-eth',
    name: 'Maverick',
    chain: 'ethereum',
    fees: [0.05, 0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 20000,
    avgGasCost: 110000,
    maxSlippage: 0.8,
    avgExecutionTime: 18,
    isActive: true
  },
  {
    id: 'integral-eth',
    name: 'Integral',
    chain: 'ethereum',
    fees: [0.1],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 25000,
    avgGasCost: 130000,
    maxSlippage: 0.3,
    avgExecutionTime: 22,
    isActive: true
  },
  {
    id: 'dmm-eth',
    name: 'Dynamic MM',
    chain: 'ethereum',
    fees: [0.04, 0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 18000,
    avgGasCost: 125000,
    maxSlippage: 0.5,
    avgExecutionTime: 20,
    isActive: true
  },
  {
    id: 'tokenlon-eth',
    name: 'Tokenlon',
    chain: 'ethereum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'USDC'],
    liquidityThreshold: 12000,
    avgGasCost: 105000,
    maxSlippage: 0.5,
    avgExecutionTime: 15,
    isActive: true
  },

  // Polygon DEXes (15 total)
  {
    id: 'uniswap-v3-polygon',
    name: 'Uniswap V3',
    chain: 'polygon',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['MATIC', 'USDT', 'USDC', 'WETH'],
    liquidityThreshold: 80000,
    avgGasCost: 80000,
    maxSlippage: 0.5,
    avgExecutionTime: 8,
    isActive: true
  },
  {
    id: 'quickswap-polygon',
    name: 'QuickSwap',
    chain: 'polygon',
    fees: [0.3],
    supportedTokens: ['MATIC', 'USDT', 'USDC', 'QUICK'],
    liquidityThreshold: 60000,
    avgGasCost: 60000,
    maxSlippage: 0.5,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'sushiswap-polygon',
    name: 'SushiSwap',
    chain: 'polygon',
    fees: [0.3],
    supportedTokens: ['MATIC', 'USDT', 'SUSHI'],
    liquidityThreshold: 40000,
    avgGasCost: 70000,
    maxSlippage: 0.5,
    avgExecutionTime: 8,
    isActive: true
  },
  {
    id: 'apeswap-polygon',
    name: 'ApeSwap',
    chain: 'polygon',
    fees: [0.2],
    supportedTokens: ['MATIC', 'BANANA', 'USDC'],
    liquidityThreshold: 25000,
    avgGasCost: 60000,
    maxSlippage: 0.5,
    avgExecutionTime: 6,
    isActive: true
  },
  {
    id: 'curve-polygon',
    name: 'Curve Finance',
    chain: 'polygon',
    fees: [0.04],
    supportedTokens: ['USDT', 'USDC', 'DAI'],
    liquidityThreshold: 120000,
    avgGasCost: 50000,
    maxSlippage: 0.1,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'kyberswap-polygon',
    name: 'KyberSwap',
    chain: 'polygon',
    fees: [0.3],
    supportedTokens: ['MATIC', 'USDT', 'USDC'],
    liquidityThreshold: 35000,
    avgGasCost: 70000,
    maxSlippage: 0.5,
    avgExecutionTime: 8,
    isActive: true
  },
  {
    id: 'dodo-polygon',
    name: 'DODO',
    chain: 'polygon',
    fees: [0.3],
    supportedTokens: ['MATIC', 'USDT', 'DODO'],
    liquidityThreshold: 20000,
    avgGasCost: 65000,
    maxSlippage: 0.8,
    avgExecutionTime: 7,
    isActive: true
  },
  {
    id: 'meshswap-polygon',
    name: 'MeshSwap',
    chain: 'polygon',
    fees: [0.25],
    supportedTokens: ['MATIC', 'MESH', 'USDT'],
    liquidityThreshold: 15000,
    avgGasCost: 55000,
    maxSlippage: 0.8,
    avgExecutionTime: 6,
    isActive: true
  },
  {
    id: 'dfyn-polygon',
    name: 'Dfyn',
    chain: 'polygon',
    fees: [0.3],
    supportedTokens: ['MATIC', 'DFYN', 'USDT'],
    liquidityThreshold: 18000,
    avgGasCost: 58000,
    maxSlippage: 0.6,
    avgExecutionTime: 7,
    isActive: true
  },
  {
    id: 'polycat-polygon',
    name: 'PolyCat',
    chain: 'polygon',
    fees: [0.2],
    supportedTokens: ['MATIC', 'FISH', 'USDT'],
    liquidityThreshold: 12000,
    avgGasCost: 52000,
    maxSlippage: 0.8,
    avgExecutionTime: 6,
    isActive: true
  },
  {
    id: 'waultswap-polygon',
    name: 'WaultSwap',
    chain: 'polygon',
    fees: [0.2],
    supportedTokens: ['MATIC', 'WEX', 'USDT'],
    liquidityThreshold: 10000,
    avgGasCost: 50000,
    maxSlippage: 0.8,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'jetswap-polygon',
    name: 'JetSwap',
    chain: 'polygon',
    fees: [0.25],
    supportedTokens: ['MATIC', 'WINGS', 'USDT'],
    liquidityThreshold: 8000,
    avgGasCost: 48000,
    maxSlippage: 1.0,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'cafe-polygon',
    name: 'CafeSwap',
    chain: 'polygon',
    fees: [0.3],
    supportedTokens: ['MATIC', 'BREW', 'USDT'],
    liquidityThreshold: 9000,
    avgGasCost: 45000,
    maxSlippage: 0.8,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'cometh-polygon',
    name: 'ComethSwap',
    chain: 'polygon',
    fees: [0.3],
    supportedTokens: ['MATIC', 'MUST', 'USDT'],
    liquidityThreshold: 11000,
    avgGasCost: 55000,
    maxSlippage: 0.7,
    avgExecutionTime: 6,
    isActive: true
  },
  {
    id: 'gravity-polygon',
    name: 'Gravity Finance',
    chain: 'polygon',
    fees: [0.3],
    supportedTokens: ['MATIC', 'GFI', 'USDT'],
    liquidityThreshold: 7000,
    avgGasCost: 50000,
    maxSlippage: 1.0,
    avgExecutionTime: 6,
    isActive: true
  },

  // BSC DEXes (15 total)
  {
    id: 'pancakeswap-v3-bsc',
    name: 'PancakeSwap V3',
    chain: 'bsc',
    fees: [0.01, 0.05, 0.25, 1.0],
    supportedTokens: ['BNB', 'USDT', 'USDC', 'CAKE'],
    liquidityThreshold: 100000,
    avgGasCost: 120000,
    maxSlippage: 0.5,
    avgExecutionTime: 8,
    isActive: true
  },
  {
    id: 'pancakeswap-v2-bsc',
    name: 'PancakeSwap V2',
    chain: 'bsc',
    fees: [0.25],
    supportedTokens: ['BNB', 'USDT', 'BUSD', 'CAKE'],
    liquidityThreshold: 150000,
    avgGasCost: 100000,
    maxSlippage: 0.5,
    avgExecutionTime: 6,
    isActive: true
  },
  {
    id: 'biswap-bsc',
    name: 'Biswap',
    chain: 'bsc',
    fees: [0.1],
    supportedTokens: ['BNB', 'USDT', 'BSW'],
    liquidityThreshold: 30000,
    avgGasCost: 90000,
    maxSlippage: 0.3,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'mdex-bsc',
    name: 'MDEX',
    chain: 'bsc',
    fees: [0.3],
    supportedTokens: ['BNB', 'USDT', 'MDX'],
    liquidityThreshold: 25000,
    avgGasCost: 110000,
    maxSlippage: 0.5,
    avgExecutionTime: 7,
    isActive: true
  },
  {
    id: 'apeswap-bsc',
    name: 'ApeSwap',
    chain: 'bsc',
    fees: [0.2],
    supportedTokens: ['BNB', 'BANANA', 'USDT'],
    liquidityThreshold: 20000,
    avgGasCost: 100000,
    maxSlippage: 0.5,
    avgExecutionTime: 6,
    isActive: true
  },
  {
    id: 'bakeryswap-bsc',
    name: 'BakerySwap',
    chain: 'bsc',
    fees: [0.3],
    supportedTokens: ['BNB', 'BAKE', 'USDT'],
    liquidityThreshold: 15000,
    avgGasCost: 90000,
    maxSlippage: 0.8,
    avgExecutionTime: 6,
    isActive: true
  },
  {
    id: 'ellipsis-bsc',
    name: 'Ellipsis Finance',
    chain: 'bsc',
    fees: [0.04],
    supportedTokens: ['BUSD', 'USDT', 'USDC'],
    liquidityThreshold: 80000,
    avgGasCost: 80000,
    maxSlippage: 0.1,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'babyswap-bsc',
    name: 'BabySwap',
    chain: 'bsc',
    fees: [0.2],
    supportedTokens: ['BNB', 'BABY', 'USDT'],
    liquidityThreshold: 12000,
    avgGasCost: 85000,
    maxSlippage: 1.0,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'cheeseswap-bsc',
    name: 'CheeseSwap',
    chain: 'bsc',
    fees: [0.2],
    supportedTokens: ['BNB', 'CHS', 'USDT'],
    liquidityThreshold: 10000,
    avgGasCost: 80000,
    maxSlippage: 0.8,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'julswap-bsc',
    name: 'JulSwap',
    chain: 'bsc',
    fees: [0.2],
    supportedTokens: ['BNB', 'JULD', 'USDT'],
    liquidityThreshold: 8000,
    avgGasCost: 75000,
    maxSlippage: 1.0,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'marsswap-bsc',
    name: 'MarsSwap',
    chain: 'bsc',
    fees: [0.25],
    supportedTokens: ['BNB', 'XMS', 'USDT'],
    liquidityThreshold: 9000,
    avgGasCost: 78000,
    maxSlippage: 0.8,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'pantherswap-bsc',
    name: 'PantherSwap',
    chain: 'bsc',
    fees: [0.2],
    supportedTokens: ['BNB', 'PANTHER', 'USDT'],
    liquidityThreshold: 11000,
    avgGasCost: 82000,
    maxSlippage: 0.8,
    avgExecutionTime: 6,
    isActive: true
  },
  {
    id: 'squirrel-bsc',
    name: 'SquirrelSwap',
    chain: 'bsc',
    fees: [0.25],
    supportedTokens: ['BNB', 'NUTS', 'USDT'],
    liquidityThreshold: 7000,
    avgGasCost: 70000,
    maxSlippage: 1.0,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'warden-bsc',
    name: 'WardenSwap',
    chain: 'bsc',
    fees: [0.25],
    supportedTokens: ['BNB', 'WAD', 'USDT'],
    liquidityThreshold: 8500,
    avgGasCost: 73000,
    maxSlippage: 0.8,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'nerve-bsc',
    name: 'Nerve Finance',
    chain: 'bsc',
    fees: [0.04],
    supportedTokens: ['BUSD', 'USDT', 'USDC'],
    liquidityThreshold: 50000,
    avgGasCost: 75000,
    maxSlippage: 0.2,
    avgExecutionTime: 5,
    isActive: true
  },

  // Arbitrum DEXes (12 total)
  {
    id: 'uniswap-v3-arbitrum',
    name: 'Uniswap V3',
    chain: 'arbitrum',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'ARB'],
    liquidityThreshold: 90000,
    avgGasCost: 200000,
    maxSlippage: 0.5,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'gmx-arbitrum',
    name: 'GMX',
    chain: 'arbitrum',
    fees: [0.1],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'GMX'],
    liquidityThreshold: 200000,
    avgGasCost: 300000,
    maxSlippage: 1.0,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'camelot-arbitrum',
    name: 'Camelot',
    chain: 'arbitrum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'ARB', 'GRAIL'],
    liquidityThreshold: 40000,
    avgGasCost: 180000,
    maxSlippage: 0.8,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'sushiswap-arbitrum',
    name: 'SushiSwap',
    chain: 'arbitrum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'SUSHI'],
    liquidityThreshold: 35000,
    avgGasCost: 150000,
    maxSlippage: 0.5,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'curve-arbitrum',
    name: 'Curve Finance',
    chain: 'arbitrum',
    fees: [0.04],
    supportedTokens: ['USDT', 'USDC', 'DAI'],
    liquidityThreshold: 100000,
    avgGasCost: 100000,
    maxSlippage: 0.1,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'balancer-arbitrum',
    name: 'Balancer',
    chain: 'arbitrum',
    fees: [0.1, 0.3],
    supportedTokens: ['ETH', 'USDT', 'BAL'],
    liquidityThreshold: 60000,
    avgGasCost: 180000,
    maxSlippage: 1.0,
    avgExecutionTime: 5,
    isActive: true
  },
  {
    id: 'radiant-arbitrum',
    name: 'Radiant Capital',
    chain: 'arbitrum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'RDNT'],
    liquidityThreshold: 30000,
    avgGasCost: 160000,
    maxSlippage: 0.8,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'zyberswap-arbitrum',
    name: 'ZyberSwap',
    chain: 'arbitrum',
    fees: [0.05, 0.3],
    supportedTokens: ['ETH', 'USDT', 'ZYB'],
    liquidityThreshold: 25000,
    avgGasCost: 140000,
    maxSlippage: 0.5,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'chronos-arbitrum',
    name: 'Chronos',
    chain: 'arbitrum',
    fees: [0.05, 0.3],
    supportedTokens: ['ETH', 'USDT', 'CHR'],
    liquidityThreshold: 20000,
    avgGasCost: 130000,
    maxSlippage: 0.6,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'arbidex-arbitrum',
    name: 'ArbiDEX',
    chain: 'arbitrum',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'ARBX'],
    liquidityThreshold: 15000,
    avgGasCost: 120000,
    maxSlippage: 0.8,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'woofi-arbitrum',
    name: 'WOOFi',
    chain: 'arbitrum',
    fees: [0.025],
    supportedTokens: ['ETH', 'USDT', 'WOO'],
    liquidityThreshold: 35000,
    avgGasCost: 110000,
    maxSlippage: 0.3,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'sterling-arbitrum',
    name: 'Sterling Finance',
    chain: 'arbitrum',
    fees: [0.05, 0.3],
    supportedTokens: ['ETH', 'USDT', 'STR'],
    liquidityThreshold: 18000,
    avgGasCost: 125000,
    maxSlippage: 0.5,
    avgExecutionTime: 4,
    isActive: true
  },

  // Optimism DEXes (10 total)
  {
    id: 'velodrome-optimism',
    name: 'Velodrome',
    chain: 'optimism',
    fees: [0.05, 0.3],
    supportedTokens: ['ETH', 'USDT', 'OP', 'VELO'],
    liquidityThreshold: 80000,
    avgGasCost: 100000,
    maxSlippage: 0.5,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'uniswap-v3-optimism',
    name: 'Uniswap V3',
    chain: 'optimism',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDT', 'USDC', 'OP'],
    liquidityThreshold: 70000,
    avgGasCost: 80000,
    maxSlippage: 0.5,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'sushiswap-optimism',
    name: 'SushiSwap',
    chain: 'optimism',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'SUSHI'],
    liquidityThreshold: 30000,
    avgGasCost: 80000,
    maxSlippage: 0.5,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'curve-optimism',
    name: 'Curve Finance',
    chain: 'optimism',
    fees: [0.04],
    supportedTokens: ['USDT', 'USDC', 'DAI'],
    liquidityThreshold: 60000,
    avgGasCost: 70000,
    maxSlippage: 0.1,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'beethoven-optimism',
    name: 'Beethoven X',
    chain: 'optimism',
    fees: [0.1, 0.3],
    supportedTokens: ['ETH', 'USDT', 'BEETS'],
    liquidityThreshold: 25000,
    avgGasCost: 90000,
    maxSlippage: 1.0,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'zipswap-optimism',
    name: 'ZipSwap',
    chain: 'optimism',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'ZIP'],
    liquidityThreshold: 15000,
    avgGasCost: 75000,
    maxSlippage: 0.8,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'kwenta-optimism',
    name: 'Kwenta',
    chain: 'optimism',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'KWENTA'],
    liquidityThreshold: 20000,
    avgGasCost: 85000,
    maxSlippage: 0.5,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'rubicon-optimism',
    name: 'Rubicon',
    chain: 'optimism',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDT', 'RBC'],
    liquidityThreshold: 12000,
    avgGasCost: 70000,
    maxSlippage: 0.8,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'wardenswap-optimism',
    name: 'WardenSwap',
    chain: 'optimism',
    fees: [0.25],
    supportedTokens: ['ETH', 'USDT', 'WAD'],
    liquidityThreshold: 18000,
    avgGasCost: 78000,
    maxSlippage: 0.6,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'perp-optimism',
    name: 'Perpetual Protocol',
    chain: 'optimism',
    fees: [0.1],
    supportedTokens: ['ETH', 'USDT', 'PERP'],
    liquidityThreshold: 40000,
    avgGasCost: 95000,
    maxSlippage: 0.5,
    avgExecutionTime: 4,
    isActive: true
  },

  // Base DEXes (8 total)
  {
    id: 'aerodrome-base',
    name: 'Aerodrome',
    chain: 'base',
    fees: [0.05, 0.3],
    supportedTokens: ['ETH', 'USDC', 'AERO'],
    liquidityThreshold: 60000,
    avgGasCost: 50000,
    maxSlippage: 0.5,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'uniswap-v3-base',
    name: 'Uniswap V3',
    chain: 'base',
    fees: [0.05, 0.3, 1.0],
    supportedTokens: ['ETH', 'USDC', 'DAI'],
    liquidityThreshold: 50000,
    avgGasCost: 60000,
    maxSlippage: 0.5,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'sushiswap-base',
    name: 'SushiSwap',
    chain: 'base',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDC', 'SUSHI'],
    liquidityThreshold: 25000,
    avgGasCost: 50000,
    maxSlippage: 0.5,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'curve-base',
    name: 'Curve Finance',
    chain: 'base',
    fees: [0.04],
    supportedTokens: ['USDC', 'DAI'],
    liquidityThreshold: 40000,
    avgGasCost: 45000,
    maxSlippage: 0.1,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'baseswap-base',
    name: 'BaseSwap',
    chain: 'base',
    fees: [0.25],
    supportedTokens: ['ETH', 'USDC', 'BSWAP'],
    liquidityThreshold: 20000,
    avgGasCost: 48000,
    maxSlippage: 0.8,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'moonwell-base',
    name: 'Moonwell',
    chain: 'base',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDC', 'WELL'],
    liquidityThreshold: 30000,
    avgGasCost: 52000,
    maxSlippage: 0.5,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'alien-base',
    name: 'AlienBase',
    chain: 'base',
    fees: [0.3],
    supportedTokens: ['ETH', 'USDC', 'ALB'],
    liquidityThreshold: 15000,
    avgGasCost: 45000,
    maxSlippage: 1.0,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'seamless-base',
    name: 'Seamless Protocol',
    chain: 'base',
    fees: [0.05],
    supportedTokens: ['ETH', 'USDC', 'SEAM'],
    liquidityThreshold: 25000,
    avgGasCost: 50000,
    maxSlippage: 0.3,
    avgExecutionTime: 3,
    isActive: true
  },

  // Avalanche DEXes (12 total)
  {
    id: 'traderjoe-avalanche',
    name: 'Trader Joe',
    chain: 'avalanche',
    fees: [0.3],
    supportedTokens: ['AVAX', 'USDT', 'USDC', 'JOE'],
    liquidityThreshold: 80000,
    avgGasCost: 200000,
    maxSlippage: 0.8,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'pangolin-avalanche',
    name: 'Pangolin',
    chain: 'avalanche',
    fees: [0.3],
    supportedTokens: ['AVAX', 'USDT', 'PNG'],
    liquidityThreshold: 40000,
    avgGasCost: 180000,
    maxSlippage: 0.8,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'sushiswap-avalanche',
    name: 'SushiSwap',
    chain: 'avalanche',
    fees: [0.3],
    supportedTokens: ['AVAX', 'USDT', 'SUSHI'],
    liquidityThreshold: 35000,
    avgGasCost: 180000,
    maxSlippage: 0.5,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'curve-avalanche',
    name: 'Curve Finance',
    chain: 'avalanche',
    fees: [0.04],
    supportedTokens: ['USDT', 'USDC', 'DAI'],
    liquidityThreshold: 60000,
    avgGasCost: 160000,
    maxSlippage: 0.1,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'gmx-avalanche',
    name: 'GMX',
    chain: 'avalanche',
    fees: [0.1],
    supportedTokens: ['AVAX', 'USDT', 'GMX'],
    liquidityThreshold: 120000,
    avgGasCost: 250000,
    maxSlippage: 1.0,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'platypus-avalanche',
    name: 'Platypus Finance',
    chain: 'avalanche',
    fees: [0.04],
    supportedTokens: ['USDT', 'USDC', 'PTP'],
    liquidityThreshold: 50000,
    avgGasCost: 140000,
    maxSlippage: 0.2,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'lydia-avalanche',
    name: 'Lydia Finance',
    chain: 'avalanche',
    fees: [0.2],
    supportedTokens: ['AVAX', 'USDT', 'LYD'],
    liquidityThreshold: 20000,
    avgGasCost: 160000,
    maxSlippage: 0.8,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'yak-avalanche',
    name: 'Yield Yak',
    chain: 'avalanche',
    fees: [0.0],
    supportedTokens: ['AVAX', 'USDT', 'YAK'],
    liquidityThreshold: 25000,
    avgGasCost: 150000,
    maxSlippage: 0.5,
    avgExecutionTime: 4,
    isActive: true
  },
  {
    id: 'oliveswap-avalanche',
    name: 'OliveSwap',
    chain: 'avalanche',
    fees: [0.25],
    supportedTokens: ['AVAX', 'USDT', 'OLIVE'],
    liquidityThreshold: 12000,
    avgGasCost: 140000,
    maxSlippage: 1.0,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'zero-avalanche',
    name: 'Zero Exchange',
    chain: 'avalanche',
    fees: [0.3],
    supportedTokens: ['AVAX', 'USDT', 'ZERO'],
    liquidityThreshold: 18000,
    avgGasCost: 155000,
    maxSlippage: 0.8,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'pharaoh-avalanche',
    name: 'Pharaoh Exchange',
    chain: 'avalanche',
    fees: [0.05, 0.3],
    supportedTokens: ['AVAX', 'USDT', 'PHAR'],
    liquidityThreshold: 15000,
    avgGasCost: 145000,
    maxSlippage: 0.6,
    avgExecutionTime: 3,
    isActive: true
  },
  {
    id: 'echidna-avalanche',
    name: 'Echidna',
    chain: 'avalanche',
    fees: [0.3],
    supportedTokens: ['AVAX', 'USDT', 'ECD'],
    liquidityThreshold: 10000,
    avgGasCost: 135000,
    maxSlippage: 1.0,
    avgExecutionTime: 3,
    isActive: true
  },

  // Additional chains and DEXes to reach 80+
  
  // Fantom DEXes (8 total)
  {
    id: 'spookyswap-fantom',
    name: 'SpookySwap',
    chain: 'fantom',
    fees: [0.2],
    supportedTokens: ['FTM', 'USDT', 'BOO'],
    liquidityThreshold: 40000,
    avgGasCost: 150000,
    maxSlippage: 0.8,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'spiritswap-fantom',
    name: 'SpiritSwap',
    chain: 'fantom',
    fees: [0.3],
    supportedTokens: ['FTM', 'USDT', 'SPIRIT'],
    liquidityThreshold: 25000,
    avgGasCost: 140000,
    maxSlippage: 0.8,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'paintswap-fantom',
    name: 'PaintSwap',
    chain: 'fantom',
    fees: [0.25],
    supportedTokens: ['FTM', 'USDT', 'BRUSH'],
    liquidityThreshold: 15000,
    avgGasCost: 130000,
    maxSlippage: 1.0,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'tomb-fantom',
    name: 'TombSwap',
    chain: 'fantom',
    fees: [0.2],
    supportedTokens: ['FTM', 'TOMB', 'USDT'],
    liquidityThreshold: 20000,
    avgGasCost: 125000,
    maxSlippage: 1.2,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'morpheus-fantom',
    name: 'MorpheusSwap',
    chain: 'fantom',
    fees: [0.25],
    supportedTokens: ['FTM', 'MORPH', 'USDT'],
    liquidityThreshold: 12000,
    avgGasCost: 120000,
    maxSlippage: 1.0,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'protofi-fantom',
    name: 'ProtoFi',
    chain: 'fantom',
    fees: [0.3],
    supportedTokens: ['FTM', 'PROTO', 'USDT'],
    liquidityThreshold: 10000,
    avgGasCost: 115000,
    maxSlippage: 1.0,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'wigoswap-fantom',
    name: 'WigoSwap',
    chain: 'fantom',
    fees: [0.25],
    supportedTokens: ['FTM', 'WIGO', 'USDT'],
    liquidityThreshold: 8000,
    avgGasCost: 110000,
    maxSlippage: 1.2,
    avgExecutionTime: 2,
    isActive: true
  },
  {
    id: 'excalibur-fantom',
    name: 'Excalibur',
    chain: 'fantom',
    fees: [0.05, 0.3],
    supportedTokens: ['FTM', 'EXC', 'USDT'],
    liquidityThreshold: 15000,
    avgGasCost: 125000,
    maxSlippage: 0.8,
    avgExecutionTime: 2,
    isActive: true
  }
];

export const DEX_REGISTRY: DEXConfig[] = ALL_DEXES;

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
  minProfitThreshold: number = 0.003 // Lowered to 0.3%
): boolean {
  const profit = calculateArbitrageProfit(buyPrice, sellPrice, amount, buyDex, sellDex);
  const profitPercentage = profit / (buyPrice * amount);
  return profitPercentage >= minProfitThreshold;
}
