import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { seedDatabase } from "./seed";
import { okxService } from "./okx-service";
import { 
  tradingOpportunities, 
  executedTrades, 
  riskSettings, 
  exchangeConfigs,
  tradingStrategies,
  strategyPerformance,
  type TradingOpportunity,
  type ExecutedTrade,
  type RiskSettings
} from "@shared/schema";
import { eq, gte, desc, and } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Seed the database with initial data
  await seedDatabase();
  
  // Initialize OKX service
  await okxService.initialize();
  
  // Trading Engine Routes
  app.post("/api/trading-engine", async (req, res) => {
    try {
      const { action, data } = req.body;

      switch (action) {
        case 'scan_opportunities':
          return await scanArbitrageOpportunities(req, res);
        
        case 'execute_trade':
          return await executeTrade(req, res, data);
        
        case 'get_portfolio_status':
          return await getPortfolioStatus(req, res);
        
        case 'get_okx_balance':
          return await getOKXBalance(req, res);
        
        case 'update_risk_settings':
          return await updateRiskSettings(req, res, data);
        
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Trading engine error:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // AI Strategy Selector Route
  app.post("/api/ai-strategy-selector", async (req, res) => {
    try {
      const { marketConditions, availableOpportunities } = req.body;
      const result = await getAIStrategyRecommendation(marketConditions, availableOpportunities);
      return res.json(result);
    } catch (error) {
      console.error('AI strategy selector error:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function scanArbitrageOpportunities(req: any, res: any) {
  // Get active exchange configurations
  const exchanges = await db.select().from(exchangeConfigs).where(eq(exchangeConfigs.isActive, true));
  
  // Get risk settings
  let riskSettingsData = await db.select().from(riskSettings).limit(1);
  if (riskSettingsData.length === 0) {
    // Create default risk settings if none exist
    riskSettingsData = await db.insert(riskSettings).values({}).returning();
  }

  // Get real opportunities from OKX only
  let opportunities = [];
  let strategyUsed = 'arbitrage';
  
  try {
    opportunities = await okxService.scanRealOpportunities();
    
    if (opportunities.length === 0) {
      console.log('No real arbitrage opportunities found at this time');
      strategyUsed = 'no_opportunities';
    } else {
      console.log(`Found ${opportunities.length} real arbitrage opportunities from OKX`);
    }
  } catch (error) {
    console.error('Error getting real opportunities:', error);
    opportunities = [];
    strategyUsed = 'error';
  }

  // Clear old expired opportunities first
  await db.delete(tradingOpportunities).where(
    and(
      eq(tradingOpportunities.status, 'discovered'),
      gte(new Date(), tradingOpportunities.expiresAt)
    )
  );

  // Store opportunities in database and collect the stored records
  const storedOpportunities = [];
  for (const opportunity of opportunities) {
    const stored = await db.insert(tradingOpportunities)
      .values({
        tokenPair: opportunity.token_pair,
        buyExchange: opportunity.buy_exchange,
        sellExchange: opportunity.sell_exchange,
        buyPrice: opportunity.buy_price.toString(),
        sellPrice: opportunity.sell_price.toString(),
        profitAmount: opportunity.profit_amount.toString(),
        profitPercentage: opportunity.profit_percentage.toString(),
        volumeAvailable: opportunity.volume_available.toString(),
        gasCost: opportunity.gas_cost?.toString(),
        executionTime: opportunity.execution_time?.toString(),
        riskScore: opportunity.risk_score,
        status: opportunity.status,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      })
      .returning();
    
    if (stored.length > 0) {
      // Convert database record back to the expected format
      const dbRecord = stored[0];
      storedOpportunities.push({
        id: dbRecord.id.toString(), // Use database ID
        token_pair: dbRecord.tokenPair,
        buy_exchange: dbRecord.buyExchange,
        sell_exchange: dbRecord.sellExchange,
        buy_price: parseFloat(dbRecord.buyPrice),
        sell_price: parseFloat(dbRecord.sellPrice),
        profit_amount: parseFloat(dbRecord.profitAmount),
        profit_percentage: parseFloat(dbRecord.profitPercentage),
        volume_available: parseFloat(dbRecord.volumeAvailable),
        gas_cost: dbRecord.gasCost ? parseFloat(dbRecord.gasCost) : null,
        execution_time: dbRecord.executionTime ? parseFloat(dbRecord.executionTime) : null,
        risk_score: dbRecord.riskScore,
        status: dbRecord.status,
        created_at: dbRecord.createdAt?.toISOString(),
        expires_at: dbRecord.expiresAt?.toISOString()
      });
    }
  }

  // Get AI strategy recommendation
  const aiRecommendation = await callAIStrategySelector(storedOpportunities);

  return res.json({
    opportunities: storedOpportunities,
    totalFound: storedOpportunities.length,
    highProfitCount: storedOpportunities.filter(o => o.profit_percentage > 2).length,
    strategy: strategyUsed,
    aiRecommendation,
    scanTimestamp: new Date().toISOString()
  });
}

async function executeTrade(req: any, res: any, tradeData: any) {
  const { opportunityId, strategyId, amount, maxSlippage } = tradeData;

  // Get the opportunity from database
  const opportunities = await db.select().from(tradingOpportunities).where(eq(tradingOpportunities.id, parseInt(opportunityId)));
  if (opportunities.length === 0) {
    throw new Error('Opportunity not found');
  }
  const opportunity = opportunities[0];

  // Get risk settings
  const riskSettingsData = await db.select().from(riskSettings).limit(1);
  const riskSettingsRecord = riskSettingsData[0];

  // Pre-execution validation
  const validation = await validateTrade(opportunity, tradeData, riskSettingsRecord);
  if (!validation.isValid) {
    throw new Error(`Trade validation failed: ${validation.reason}`);
  }

  // Execute real trade using OKX only
  const executionResult = await okxService.executeRealTrade(opportunity, tradeData.amount);

  // Record the trade
  const trade = await db.insert(executedTrades).values({
    opportunityId: parseInt(opportunityId),
    strategyId: strategyId ? parseInt(strategyId) : null,
    transactionHash: executionResult.txHash,
    tokenPair: opportunity.tokenPair,
    buyExchange: opportunity.buyExchange,
    sellExchange: opportunity.sellExchange,
    amountTraded: amount.toString(),
    profitRealized: executionResult.actualProfit.toString(),
    gasUsed: executionResult.gasUsed,
    gasPrice: executionResult.gasPrice.toString(),
    executionTime: executionResult.executionTime.toString(),
    status: 'pending'
  }).returning();

  return res.json({
    success: true,
    trade: trade[0],
    executionResult,
    timestamp: new Date().toISOString()
  });
}

async function getPortfolioStatus(req: any, res: any) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's trades
  const todayTrades = await db.select().from(executedTrades)
    .where(gte(executedTrades.createdAt, new Date(today)));

  // Get active opportunities
  const activeOpportunities = await db.select().from(tradingOpportunities)
    .where(and(
      eq(tradingOpportunities.status, 'discovered'),
      gte(tradingOpportunities.expiresAt, new Date())
    ));

  // Calculate stats
  const totalProfit = todayTrades.reduce((sum, trade) => sum + parseFloat(trade.profitRealized || '0'), 0);
  const successfulTrades = todayTrades.filter(t => t.status === 'confirmed').length;
  const totalTrades = todayTrades.length;

  return res.json({
    portfolio: {
      totalProfit,
      tradesCount: totalTrades,
      successRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
      activeOpportunities: activeOpportunities.length,
      highProfitOpportunities: activeOpportunities.filter(o => parseFloat(o.profitPercentage) > 2).length
    },
    recentTrades: todayTrades.slice(0, 10),
    timestamp: new Date().toISOString()
  });
}

async function updateRiskSettings(req: any, res: any, settings: any) {
  const updated = await db.update(riskSettings)
    .set({
      ...settings,
      updatedAt: new Date()
    })
    .returning();

  return res.json({
    success: true,
    settings: updated[0],
    timestamp: new Date().toISOString()
  });
}

async function getOKXBalance(req: any, res: any) {
  try {
    const balance = await okxService.getAccountBalance();
    const connectionStatus = okxService.getConnectionStatus();
    
    return res.json({
      balance,
      connectionStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching OKX balance:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch balance',
      connectionStatus: okxService.getConnectionStatus()
    });
  }
}

// Helper functions - Only real data processing

async function validateTrade(opportunity: any, tradeData: any, riskSettingsRecord: any) {
  // Check if opportunity is still valid
  if (opportunity.expiresAt && new Date(opportunity.expiresAt) < new Date()) {
    return { isValid: false, reason: 'Opportunity expired' };
  }

  // Check profit threshold
  if (parseFloat(opportunity.profitPercentage) < parseFloat(riskSettingsRecord.minProfitThreshold || '0.5')) {
    return { isValid: false, reason: 'Profit below threshold' };
  }

  // Check position size
  if (tradeData.amount > parseFloat(riskSettingsRecord.maxPositionSize || '10000')) {
    return { isValid: false, reason: 'Position size exceeds limit' };
  }

  // Check risk score
  if (opportunity.riskScore > (riskSettingsRecord.maxRiskScore || 3)) {
    return { isValid: false, reason: 'Risk score too high' };
  }

  return { isValid: true, reason: 'Trade validated' };
}



async function callAIStrategySelector(opportunities: any[]) {
  // Only return data when real opportunities exist
  if (opportunities.length === 0) {
    return null;
  }

  // Calculate real metrics from actual opportunities
  const avgProfitPercentage = opportunities.reduce((sum, opp) => sum + opp.profit_percentage, 0) / opportunities.length;
  const totalVolume = opportunities.reduce((sum, opp) => sum + opp.volume_available, 0);
  const highProfitCount = opportunities.filter(opp => opp.profit_percentage > 2).length;

  return {
    recommendedStrategy: highProfitCount > 0 ? 'High Profit Arbitrage' : 'Standard Arbitrage',
    confidence: Math.min(avgProfitPercentage * 10, 100),
    allocation: Math.min(totalVolume / 100, 100),
    marketSentiment: avgProfitPercentage > 2 ? 'BULLISH' : avgProfitPercentage > 1 ? 'NEUTRAL' : 'CAUTIOUS',
    riskLevel: avgProfitPercentage > 3 ? 'HIGH' : avgProfitPercentage > 1.5 ? 'MEDIUM' : 'LOW'
  };
}

async function getAIStrategyRecommendation(marketConditions: any, availableOpportunities: any[]) {
  // Get all active trading strategies
  const strategies = await db.select().from(tradingStrategies).where(eq(tradingStrategies.isActive, true));
  
  // Get recent performance data
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const performanceData = await db.select().from(strategyPerformance)
    .where(gte(strategyPerformance.date, sevenDaysAgo))
    .orderBy(desc(strategyPerformance.date));

  // AI Strategy Selection Algorithm (simplified version)
  const strategyScores = strategies.map(strategy => {
    const recentPerformance = performanceData.filter(p => p.strategyId === strategy.id);
    const avgSuccessRate = recentPerformance.reduce((sum, p) => sum + parseFloat(p.successRate || '0'), 0) / Math.max(recentPerformance.length, 1);
    
    let score = 50; // Base score
    
    // Simple scoring based on strategy type and market conditions
    switch (strategy.strategyType) {
      case 'flash_loan':
        score += marketConditions.volatility * 0.3;
        score += marketConditions.volume * 0.25;
        break;
      case 'triangular':
        score += marketConditions.spreadTightness * 0.35;
        score += marketConditions.liquidityDepth * 0.3;
        break;
      case 'cross_exchange':
        score += marketConditions.volume * 0.3;
        break;
      case 'liquidity_pool':
        score += marketConditions.liquidityDepth * 0.4;
        break;
    }

    const confidence = Math.min(avgSuccessRate + Math.random() * 20, 100);
    
    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      score: Math.min(score, 100),
      confidence,
      recommendedAllocation: score > 70 ? 60 : score > 50 ? 40 : 20
    };
  });

  strategyScores.sort((a, b) => b.score - a.score);

  return {
    timestamp: new Date().toISOString(),
    marketConditions,
    recommendedStrategies: strategyScores.filter(s => s.recommendedAllocation > 0),
    totalOpportunities: availableOpportunities.length,
    marketSentiment: getMarketSentiment(marketConditions),
    riskLevel: calculateRiskLevel(marketConditions),
    executionPriority: strategyScores[0]?.strategyName || 'No suitable strategy'
  };
}

function getMarketSentiment(conditions: any): string {
  const score = (conditions.volatility + conditions.volume + conditions.liquidityDepth) / 3;
  if (score > 80) return 'BULLISH';
  if (score > 60) return 'NEUTRAL';
  if (score > 40) return 'CAUTIOUS';
  return 'BEARISH';
}

function calculateRiskLevel(conditions: any): string {
  const riskScore = (
    conditions.volatility * 0.4 +
    (100 - conditions.liquidityDepth) * 0.3 +
    conditions.gasPrice * 0.2 +
    Math.random() * 10
  );
  
  if (riskScore > 70) return 'HIGH';
  if (riskScore > 40) return 'MEDIUM';
  return 'LOW';
}
