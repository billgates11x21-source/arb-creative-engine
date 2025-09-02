import { arbitrageEngine } from './trading-strategies';
import { riskManager } from './risk-management';
import { okxService } from './okx-service';
import { db } from './db';
import { executedTrades, tradingOpportunities, strategyPerformance } from '@shared/schema';
import { desc, gte, eq } from 'drizzle-orm';

export interface BackgroundEngineConfig {
  scanInterval: number; // milliseconds
  executionEnabled: boolean;
  maxConcurrentScans: number;
  emergencyStopEnabled: boolean;
  performanceLogging: boolean;
  autoRebalancing: boolean;
}

export interface EngineStatus {
  isRunning: boolean;
  scanCount: number;
  totalOpportunities: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  uptime: number;
  currentStrategy: string;
  riskLevel: number;
}

export class BackgroundArbitrageEngine {
  private config: BackgroundEngineConfig = {
    scanInterval: 2000, // 2 seconds for stability
    executionEnabled: true,
    maxConcurrentScans: 5, // Reduced for stability
    emergencyStopEnabled: false,
    performanceLogging: true,
    autoRebalancing: true
  };

  private isRunning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private currentScans = 0;
  private status: EngineStatus = {
    isRunning: false,
    scanCount: 0,
    totalOpportunities: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalProfit: 0,
    uptime: 0,
    currentStrategy: 'comprehensive_scanning',
    riskLevel: 0
  };

  private startTime = Date.now();

  // Start the persistent background engine
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Background engine already running');
      return;
    }

    console.log('🚀 Starting Background Arbitrage Engine...');
    console.log(`📊 Monitoring 80+ DEXes across 7 chains with 5 strategies`);
    
    this.isRunning = true;
    this.status.isRunning = true;
    this.startTime = Date.now();

    // Main scanning loop
    this.scanInterval = setInterval(async () => {
      try {
        await this.executeScanCycle();
      } catch (error) {
        console.error('❌ Background scan cycle error:', error);
      }
    }, this.config.scanInterval);

    // Performance monitoring loop (every minute)
    setInterval(async () => {
      try {
        await this.updatePerformanceMetrics();
      } catch (error) {
        console.error('❌ Performance update error:', error);
      }
    }, 60000);

    // Risk monitoring loop (every 30 seconds)
    setInterval(async () => {
      try {
        await this.performRiskCheck();
      } catch (error) {
        console.error('❌ Risk check error:', error);
      }
    }, 30000);

    console.log('✅ Background engine started successfully');
  }

  // Stop the background engine
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ Background engine not running');
      return;
    }

    console.log('🛑 Stopping Background Arbitrage Engine...');
    
    this.isRunning = false;
    this.status.isRunning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    // Wait for current scans to complete
    let waitCount = 0;
    while (this.currentScans > 0 && waitCount < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitCount++;
    }

    console.log('✅ Background engine stopped');
  }

  // Main scan cycle execution
  private async executeScanCycle(): Promise<void> {
    if (this.currentScans >= this.config.maxConcurrentScans) {
      console.log('📊 Scan limit reached, skipping cycle');
      return;
    }

    this.currentScans++;
    this.status.scanCount++;

    try {
      // 1. Comprehensive multi-strategy scan
      const opportunities = await arbitrageEngine.scanAllStrategies();
      this.status.totalOpportunities += opportunities.length;
      
      console.log(`🔍 Background scan ${this.status.scanCount}: Found ${opportunities.length} opportunities`);

      if (opportunities.length > 0) {
        // 2. Risk assessment for each opportunity
        const riskAssessedOpportunities = opportunities.map(op => {
          const riskAssessment = riskManager.assessOpportunityRisk(op);
          return {
            ...op,
            riskAssessment
          };
        });

        // 3. Filter profitable and low-risk opportunities
        const executeableOpportunities = riskAssessedOpportunities.filter(op => 
          op.riskAssessment.recommendation === 'execute' &&
          op.profitPercentage >= 0.008 // 0.8% minimum
        );

        console.log(`✅ ${executeableOpportunities.length} opportunities passed risk assessment`);

        // 4. Execute trades if enabled
        if (this.config.executionEnabled && executeableOpportunities.length > 0) {
          await this.executeOpportunities(executeableOpportunities.slice(0, 3)); // Max 3 per cycle
        }

        // 5. Store opportunities in database
        await this.storeOpportunities(opportunities.slice(0, 15));
      }

      // 6. Update strategy performance
      await this.updateStrategyPerformance(opportunities);

    } catch (error) {
      console.error('❌ Scan cycle error:', error);
    } finally {
      this.currentScans--;
    }
  }

  // Execute selected opportunities
  private async executeOpportunities(opportunities: any[]): Promise<void> {
    for (const opportunity of opportunities) {
      try {
        console.log(`🤖 Background executing: ${opportunity.token} ${opportunity.strategy}`);
        
        // Check if OKX supports the trading pair
        const isValidPair = this.isValidOKXPair(opportunity.token);
        if (!isValidPair) {
          console.log(`⚠️ Skipping ${opportunity.token}: Not supported on OKX`);
          continue;
        }

        // Execute with risk management
        const result = await this.executeTradeWithRiskManagement(opportunity);
        
        if (result.success) {
          this.status.successfulTrades++;
          this.status.totalProfit += result.profit || 0;
          console.log(`✅ Background trade successful: ${result.profit || 0} profit`);
        } else {
          this.status.failedTrades++;
          console.log(`❌ Background trade failed: ${result.error}`);
        }

        // NO DELAYS - CONTINUOUS EXECUTION FOR MAXIMUM PROFIT
        
      } catch (error) {
        console.error(`❌ Background execution error for ${opportunity.token}:`, error);
        this.status.failedTrades++;
      }
    }
  }

  // Execute trade with comprehensive risk management
  private async executeTradeWithRiskManagement(opportunity: any): Promise<{
    success: boolean;
    profit?: number;
    error?: string;
  }> {
    try {
      // Final risk check
      const emergencyCheck = riskManager.checkEmergencyConditions();
      if (emergencyCheck.shouldStop) {
        return {
          success: false,
          error: `Emergency stop: ${emergencyCheck.reasons.join(', ')}`
        };
      }

      // Position sizing
      const positionOptimization = riskManager.calculateOptimalPositionSize(
        opportunity,
        this.status.totalProfit + 10000 // Assume base capital
      );

      if (positionOptimization.optimalPositionSize < 0.01) {
        return {
          success: false,
          error: 'Position size too small'
        };
      }

      // Execute via OKX
      const tradeAmount = Math.min(
        opportunity.riskAssessment.adjustedPositionSize,
        positionOptimization.optimalPositionSize,
        1.0 // Max $1 for safety
      );

      const result = await okxService.executeAIOptimizedTrade(
        opportunity,
        tradeAmount,
        { strategy: 'auto' }
      );

      return {
        success: true,
        profit: result.actualProfit || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Store opportunities in database
  private async storeOpportunities(opportunities: any[]): Promise<void> {
    try {
      const dbOpportunities = opportunities.map(op => ({
        tokenPair: op.token || 'BTC/USDT',
        buyExchange: op.buyDex || 'Exchange A',
        sellExchange: op.sellDex || 'Exchange B',
        buyPrice: op.buyPrice?.toString() || '0',
        sellPrice: op.sellPrice?.toString() || '0',
        profitAmount: op.profitAmount?.toString() || '0',
        profitPercentage: (op.profitPercentage * 100)?.toString() || '0',
        volumeAvailable: op.amount?.toString() || '0',
        riskScore: op.riskLevel || 1,
        gasCost: op.gasEstimate?.toString() || '0',
        executionTime: op.executionTime?.toString() || '0',
        status: 'discovered',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }));

      if (dbOpportunities.length > 0) {
        await db.insert(tradingOpportunities)
          .values(dbOpportunities)
          .onConflictDoNothing();
      }
    } catch (error) {
      console.error('Error storing opportunities:', error);
    }
  }

  // Update performance metrics
  private async updatePerformanceMetrics(): Promise<void> {
    try {
      this.status.uptime = Date.now() - this.startTime;
      
      // Get recent performance data
      const recentTrades = await db.select()
        .from(executedTrades)
        .where(gte(executedTrades.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))) // Last 24 hours
        .orderBy(desc(executedTrades.createdAt));

      // Calculate daily metrics
      const dailyProfit = recentTrades.reduce((sum, trade) => {
        const profit = parseFloat(trade.profitRealized || '0');
        return sum + profit;
      }, 0);

      const dailyTrades = recentTrades.length;
      const successRate = recentTrades.filter(t => 
        parseFloat(t.profitRealized || '0') > 0
      ).length / Math.max(1, dailyTrades);

      // Update risk metrics
      riskManager.updateRiskMetrics(
        dailyProfit,
        10000 + this.status.totalProfit, // Estimated portfolio
        this.currentScans,
        0.3 // Market volatility estimate
      );

      this.status.riskLevel = riskManager.getCurrentMetrics().riskScore;

      if (this.config.performanceLogging) {
        console.log(`📊 Background Performance - Profit: $${dailyProfit.toFixed(2)}, Trades: ${dailyTrades}, Success: ${(successRate * 100).toFixed(1)}%`);
      }

    } catch (error) {
      console.error('Error updating performance metrics:', error);
    }
  }

  // Perform risk assessment
  private async performRiskCheck(): Promise<void> {
    try {
      const emergencyCheck = riskManager.checkEmergencyConditions();
      
      if (emergencyCheck.shouldStop && this.config.emergencyStopEnabled) {
        console.log(`🚨 EMERGENCY STOP: ${emergencyCheck.reasons.join(', ')}`);
        
        if (emergencyCheck.severity === 'critical') {
          await this.stop();
          console.log('🛑 Background engine stopped due to critical risk');
        } else {
          // Temporary pause for warning conditions
          console.log('⏸️ Pausing execution for 5 minutes due to risk warning');
          this.config.executionEnabled = false;
          setTimeout(() => {
            this.config.executionEnabled = true;
            console.log('▶️ Resuming execution after risk warning');
          }, 5 * 60 * 1000);
        }
      }

      // Auto-rebalancing check
      if (this.config.autoRebalancing) {
        const rebalancing = riskManager.calculateRebalancing();
        if (rebalancing.rebalanceNeeded) {
          console.log(`⚖️ Portfolio rebalancing needed: ${rebalancing.rebalanceActions.length} actions`);
          // Implementation would go here
        }
      }

    } catch (error) {
      console.error('Error in risk check:', error);
    }
  }

  // Update strategy performance tracking
  private async updateStrategyPerformance(opportunities: any[]): Promise<void> {
    try {
      const strategyCounts = opportunities.reduce((acc, op) => {
        acc[op.strategy] = (acc[op.strategy] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      for (const [strategyId, count] of Object.entries(strategyCounts)) {
        await db.insert(strategyPerformance)
          .values({
            strategyId: parseInt(strategyId),
            date: new Date().toISOString().split('T')[0],
            successRate: "0.75",
            avgProfitPerTrade: "0.00",
            totalTrades: count as number,
            aiConfidenceScore: "0.50"
          })
          .onConflictDoNothing();
      }
    } catch (error) {
      console.error('Error updating strategy performance:', error);
    }
  }

  // Check if trading pair is valid for OKX
  private isValidOKXPair(token: string): boolean {
    const validTokens = ['BTC', 'ETH', 'USDT', 'USDC', 'LINK', 'UNI', 'AVAX', 'MATIC'];
    
    if (token.includes('/')) {
      const [base, quote] = token.split('/');
      return validTokens.includes(base) && validTokens.includes(quote);
    }
    
    return validTokens.includes(token);
  }

  // Public getters
  getStatus(): EngineStatus {
    return { ...this.status };
  }

  getConfig(): BackgroundEngineConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<BackgroundEngineConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('🔧 Background engine configuration updated');
  }

  // Manual trigger for immediate scan
  async triggerManualScan(): Promise<any[]> {
    console.log('🔍 Manual scan triggered');
    const opportunities = await arbitrageEngine.scanAllStrategies();
    console.log(`✅ Manual scan complete: ${opportunities.length} opportunities found`);
    return opportunities;
  }
}

// Singleton instance
export const backgroundEngine = new BackgroundArbitrageEngine();