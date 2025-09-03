export interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
  symbol?: string;
  decimals?: number;
  name?: string;
}

export interface AlchemyGasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export class AlchemyService {
  private readonly apiKey = 'HvikZ7oxym4m_Y6zAlAQw';
  private readonly rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/HvikZ7oxym4m_Y6zAlAQw';
  private readonly wsUrl = 'wss://eth-mainnet.g.alchemy.com/v2/HvikZ7oxym4m_Y6zAlAQw';

  async getTokenBalances(walletAddress: string): Promise<AlchemyTokenBalance[]> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [walletAddress]
        })
      });

      const data = await response.json();
      return data.result?.tokenBalances || [];
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return [];
    }
  }

  async getGasEstimate(to: string, value: string, data?: string): Promise<AlchemyGasEstimate | null> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'eth_estimateGas',
          params: [{
            to,
            value,
            data: data || '0x'
          }]
        })
      });

      const gasEstimate = await response.json();
      
      const gasPriceResponse = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 2,
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: []
        })
      });

      const gasPrice = await gasPriceResponse.json();

      return {
        gasLimit: gasEstimate.result,
        gasPrice: gasPrice.result,
        maxFeePerGas: gasPrice.result,
        maxPriorityFeePerGas: '0x3b9aca00' // 1 gwei
      };
    } catch (error) {
      console.error('Error estimating gas:', error);
      return null;
    }
  }

  async getLatestBlock(): Promise<any> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['latest', false]
        })
      });

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error fetching latest block:', error);
      return null;
    }
  }

  createWebSocketConnection(): WebSocket | null {
    try {
      const ws = new WebSocket(this.wsUrl);
      
      ws.onopen = () => {
        console.log('Alchemy WebSocket connected');
        // Subscribe to new blocks
        ws.send(JSON.stringify({
          id: 1,
          method: 'eth_subscribe',
          params: ['newHeads']
        }));
      };

      return ws;
    } catch (error) {
      console.error('Error creating Alchemy WebSocket:', error);
      return null;
    }
  }
}

export const alchemyService = new AlchemyService();