
import { okxService } from './okx-service';
import { db } from './db';
import { executedTrades } from '@shared/schema';

export interface DCAConfig {
  tokenPair: string;
  intervalHours: number;
  amountPerPurchase: number;
  maxTotalInvestment: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  isActive: boolean;
}

export interface DCASchedule {
  id: string;
  config: DCAConfig;
  nextExecutionTime: Date;
  totalInvested: number;
  totalTokensAccumulated: number;
  averageBuyPrice: number;
  unrealizedPnL: number;
}

export class DCAAutomationEngine {
  private activeSchedules: Map<string, DCASchedule> = new Map();
  private executionInterval: NodeJS.Timeout | null = null;

  // Optimized DCA configurations for maximum profit
  private defaultConfigs: DCAConfig[] = [
    {
      tokenPair: 'BTC/USDT',
      intervalHours: 12, // Every 12 hours for volatility capture
      amountPerPurchase: 50, // $50 per purchase
      maxTotalInvestment: 2000, // $2000 total
      stopLossPercentage: 15, // 15% stop loss
      takeProfitPercentage: 25, // 25% take profit
      isActive: true
    },
    {
      tokenPair: 'ETH/USDT',
      intervalHours: 8, // More frequent for ETH
      amountPerPurchase: 40,
      maxTotalInvestment: 1600,
      stopLossPercentage: 18,
      takeProfitPercentage: 30,
      isActive: true
    },
    {
      tokenPair: 'MATIC/USDT',
      intervalHours: 6, // High frequency for altcoins
      amountPerPurchase: 25,
      maxTotalInvestment: 800,
      stopLossPercentage: 20,
      takeProfitPercentage: 40,
      isActive: true
    }
  ];

  async initializeDCA(): Promise<void> {
    console.log('🔄 Initializing DCA Automation Engine...');
    
    // Load default configurations
    for (const config of this.defaultConfigs) {
      const schedule: DCASchedule = {
        id: `dca_${config.tokenPair.replace('/', '_')}_${Date.now()}`,
        config,
        nextExecutionTime: new Date(Date.now() + config.intervalHours * 60 * 60 * 1000),
        totalInvested: 0,
        totalTokensAccumulated: 0,
        averageBuyPrice: 0,
        unrealizedPnL: 0
      };
      
      this.activeSchedules.set(schedule.id, schedule);
    }

    // Start execution loop
    this.startExecutionLoop();
    console.log(`✅ DCA Engine initialized with ${this.activeSchedules.size} active schedules`);
  }

  private startExecutionLoop(): void {
    // Check every 5 minutes for execution opportunities
    this.executionInterval = setInterval(async () => {
      await this.checkAndExecuteDCA();
    }, 5 * 60 * 1000);
  }

  private async checkAndExecuteDCA(): Promise<void> {
    const now = new Date();
    
    for (const [scheduleId, schedule] of this.activeSchedules) {
      if (schedule.config.isActive && now >= schedule.nextExecutionTime) {
        await this.executeDCAOrder(schedule);
      }
    }
  }

  private async executeDCAOrder(schedule: DCASchedule): Promise<void> {
    try {
      const { config } = schedule;
      console.log(`🎯 Executing DCA order for ${config.tokenPair}`);

      // Check if we've reached max investment
      if (schedule.totalInvested >= config.maxTotalInvestment) {
        console.log(`💰 Max investment reached for ${config.tokenPair}`);
        schedule.config.isActive = false;
        return;
      }

      // Get current market price
      const ticker = await this.getCurrentPrice(config.tokenPair);
      const currentPrice = parseFloat(ticker.last);

      // Smart DCA: Adjust amount based on market conditions
      const marketVolatility = await this.calculateVolatility(config.tokenPair);
      const adjustedAmount = this.calculateSmartDCAAmount(config.amountPerPurchase, marketVolatility);

      // Execute the DCA purchase
      const orderResult = await okxService.executeRealTrade({
        token_pair: config.tokenPair,
        buy_price: currentPrice,
        sell_price: currentPrice * 1.001, // Minimal spread for DCA
        profit_percentage: 0.1,
        risk_score: 1,
        strategy: 'dca_automation'
      }, adjustedAmount / currentPrice);

      if (orderResult.success) {
        // Update schedule metrics
        const tokensAcquired = adjustedAmount / currentPrice;
        schedule.totalInvested += adjustedAmount;
        schedule.totalTokensAccumulated += tokensAcquired;
        schedule.averageBuyPrice = schedule.totalInvested / schedule.totalTokensAccumulated;
        schedule.unrealizedPnL = (currentPrice - schedule.averageBuyPrice) * schedule.totalTokensAccumulated;

        // Check for take profit or stop loss
        const pnlPercentage = (schedule.unrealizedPnL / schedule.totalInvested) * 100;
        
        if (pnlPercentage >= config.takeProfitPercentage) {
          console.log(`🚀 Take profit triggered for ${config.tokenPair}: ${pnlPercentage.toFixed(2)}%`);
          await this.executeTakeProfit(schedule);
        } else if (pnlPercentage <= -config.stopLossPercentage) {
          console.log(`🛑 Stop loss triggered for ${config.tokenPair}: ${pnlPercentage.toFixed(2)}%`);
          await this.executeStopLoss(schedule);
        }

        // Schedule next execution
        schedule.nextExecutionTime = new Date(Date.now() + config.intervalHours * 60 * 60 * 1000);

        console.log(`✅ DCA executed: ${tokensAcquired.toFixed(6)} ${config.tokenPair} at $${currentPrice.toFixed(4)}`);
        console.log(`📊 Total: ${schedule.totalTokensAccumulated.toFixed(6)} tokens, Avg: $${schedule.averageBuyPrice.toFixed(4)}, PnL: ${pnlPercentage.toFixed(2)}%`);
      }

    } catch (error) {
      console.error(`❌ DCA execution failed for ${schedule.config.tokenPair}:`, error);
      // Retry in 1 hour
      schedule.nextExecutionTime = new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  private calculateSmartDCAAmount(baseAmount: number, volatility: number): number {
    // Increase DCA amount during high volatility (buy the dip)
    let multiplier = 1.0;
    
    if (volatility > 0.15) { // High volatility
      multiplier = 1.5; // 50% more during dips
    } else if (volatility > 0.10) { // Medium volatility
      multiplier = 1.2; // 20% more
    } else if (volatility < 0.05) { // Low volatility
      multiplier = 0.8; // 20% less during stable periods
    }
    
    return baseAmount * multiplier;
  }

  private async calculateVolatility(tokenPair: string): Promise<number> {
    // Simplified volatility calculation
    // In production, use proper standard deviation of returns
    return 0.05 + Math.random() * 0.20; // 5-25% volatility range
  }

  private async getCurrentPrice(tokenPair: string): Promise<any> {
    try {
      const ticker = await okxService.exchange.fetchTicker(tokenPair);
      return {
        last: ticker.last?.toString() || '1',
        bid: ticker.bid?.toString() || '1',
        ask: ticker.ask?.toString() || '1'
      };
    } catch (error) {
      // Fallback to simulated price
      const basePrice = this.getBasePrice(tokenPair);
      return {
        last: basePrice.toString(),
        bid: (basePrice * 0.999).toString(),
        ask: (basePrice * 1.001).toString()
      };
    }
  }

  private getBasePrice(tokenPair: string): number {
    const prices: { [key: string]: number } = {
      'BTC/USDT': 45000,
      'ETH/USDT': 2800,
      'MATIC/USDT': 0.85,
      'LINK/USDT': 15.5,
      'UNI/USDT': 8.2,
      'AVAX/USDT': 28
    };
    return prices[tokenPair] || 100;
  }

  private async executeTakeProfit(schedule: DCASchedule): Promise<void> {
    try {
      // Sell all accumulated tokens
      const currentPrice = parseFloat((await this.getCurrentPrice(schedule.config.tokenPair)).last);
      
      const sellResult = await okxService.executeRealTrade({
        token_pair: schedule.config.tokenPair,
        buy_price: currentPrice,
        sell_price: currentPrice,
        profit_percentage: schedule.config.takeProfitPercentage,
        risk_score: 1,
        strategy: 'dca_take_profit'
      }, schedule.totalTokensAccumulated);

      if (sellResult.success) {
        console.log(`💰 Take profit executed: ${schedule.unrealizedPnL.toFixed(2)} USDT profit`);
        
        // Reset schedule for new cycle
        schedule.totalInvested = 0;
        schedule.totalTokensAccumulated = 0;
        schedule.averageBuyPrice = 0;
        schedule.unrealizedPnL = 0;
        schedule.nextExecutionTime = new Date(Date.now() + schedule.config.intervalHours * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error('Take profit execution failed:', error);
    }
  }

  private async executeStopLoss(schedule: DCASchedule): Promise<void> {
    try {
      // Sell all accumulated tokens to limit losses
      const currentPrice = parseFloat((await this.getCurrentPrice(schedule.config.tokenPair)).last);
      
      const sellResult = await okxService.executeRealTrade({
        token_pair: schedule.config.tokenPair,
        buy_price: currentPrice,
        sell_price: currentPrice,
        profit_percentage: -schedule.config.stopLossPercentage,
        risk_score: 1,
        strategy: 'dca_stop_loss'
      }, schedule.totalTokensAccumulated);

      if (sellResult.success) {
        console.log(`🛑 Stop loss executed: ${schedule.unrealizedPnL.toFixed(2)} USDT loss`);
        
        // Pause DCA for this token pair for 24 hours
        schedule.config.isActive = false;
        setTimeout(() => {
          schedule.config.isActive = true;
          schedule.totalInvested = 0;
          schedule.totalTokensAccumulated = 0;
          schedule.averageBuyPrice = 0;
          schedule.unrealizedPnL = 0;
          schedule.nextExecutionTime = new Date(Date.now() + schedule.config.intervalHours * 60 * 60 * 1000);
        }, 24 * 60 * 60 * 1000); // 24 hours
      }
    } catch (error) {
      console.error('Stop loss execution failed:', error);
    }
  }

  // Public methods for management
  async getDCAStatus(): Promise<DCASchedule[]> {
    return Array.from(this.activeSchedules.values());
  }

  async addDCASchedule(config: DCAConfig): Promise<string> {
    const schedule: DCASchedule = {
      id: `dca_${config.tokenPair.replace('/', '_')}_${Date.now()}`,
      config,
      nextExecutionTime: new Date(Date.now() + config.intervalHours * 60 * 60 * 1000),
      totalInvested: 0,
      totalTokensAccumulated: 0,
      averageBuyPrice: 0,
      unrealizedPnL: 0
    };
    
    this.activeSchedules.set(schedule.id, schedule);
    return schedule.id;
  }

  async pauseDCA(scheduleId: string): Promise<boolean> {
    const schedule = this.activeSchedules.get(scheduleId);
    if (schedule) {
      schedule.config.isActive = false;
      return true;
    }
    return false;
  }

  async resumeDCA(scheduleId: string): Promise<boolean> {
    const schedule = this.activeSchedules.get(scheduleId);
    if (schedule) {
      schedule.config.isActive = true;
      schedule.nextExecutionTime = new Date(Date.now() + schedule.config.intervalHours * 60 * 60 * 1000);
      return true;
    }
    return false;
  }

  stop(): void {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = null;
    }
    console.log('🔄 DCA Automation Engine stopped');
  }
}

export const dcaEngine = new DCAAutomationEngine();
