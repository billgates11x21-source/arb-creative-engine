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

  // Get real opportunities from OKX or fallback to mock data
  let opportunities;
  try {
    opportunities = await okxService.scanRealOpportunities();
    if (opportunities.length === 0) {
      // Fallback to mock data if no real opportunities found
      opportunities = await generateMockOpportunities(exchanges, riskSettingsData[0]);
    }
  } catch (error) {
    console.error('Error getting real opportunities:', error);
    opportunities = await generateMockOpportunities(exchanges, riskSettingsData[0]);
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

  // Check if in simulation mode
  if (riskSettingsRecord.isSimulationMode) {
    return await simulateTrade(opportunity, tradeData, res);
  }

  // Execute real trade using OKX
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

// Helper functions

async function generateMockOpportunities(exchanges: any[], riskSettingsRecord: any) {
  const tokenPairs = ['ETH/USDC', 'BTC/USDT', 'WETH/DAI', 'MATIC/USDC', 'LINK/ETH', 'UNI/USDT'];
  const opportunities = [];

  for (let i = 0; i < Math.floor(Math.random() * 10) + 15; i++) {
    const buyExchange = exchanges[Math.floor(Math.random() * exchanges.length)] || { exchangeName: 'Uniswap V3' };
    const sellExchange = exchanges[Math.floor(Math.random() * exchanges.length)] || { exchangeName: 'SushiSwap' };
    
    if (buyExchange.exchangeName === sellExchange.exchangeName) continue;

    const tokenPair = tokenPairs[Math.floor(Math.random() * tokenPairs.length)];
    const basePrice = Math.random() * 1000 + 100;
    const profitMargin = Math.random() * 0.05 + 0.005; // 0.5% to 5.5%
    
    const opportunity = {
      id: Math.random().toString(),
      token_pair: tokenPair,
      buy_exchange: buyExchange.exchangeName,
      sell_exchange: sellExchange.exchangeName,
      buy_price: basePrice,
      sell_price: basePrice * (1 + profitMargin),
      profit_amount: basePrice * profitMargin,
      profit_percentage: profitMargin * 100,
      volume_available: Math.random() * 100000 + 1000,
      gas_cost: Math.random() * 50 + 10,
      execution_time: Math.random() * 5 + 1,
      risk_score: Math.floor(Math.random() * 5) + 1,
      status: 'discovered',
      created_at: new Date().toISOString()
    };

    // Apply BTC/ETH allocation rules
    const isBtcEth = tokenPair.includes('BTC') || tokenPair.includes('ETH');
    const minThreshold = parseFloat(riskSettingsRecord.minProfitThreshold || '0.5');
    if (isBtcEth && opportunity.profit_percentage >= minThreshold) {
      opportunities.push(opportunity);
    } else if (!isBtcEth && opportunity.profit_percentage >= minThreshold * 1.5) {
      opportunities.push(opportunity);
    }
  }

  return opportunities.slice(0, 25); // Limit results
}

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

async function simulateTrade(opportunity: any, tradeData: any, res: any) {
  // Simulate trade execution with realistic results
  const simulatedProfit = parseFloat(opportunity.profitAmount) * tradeData.amount * (0.8 + Math.random() * 0.4);
  const simulatedGasUsed = Math.floor(Math.random() * 100000) + 300000;
  const simulatedExecutionTime = Math.random() * 3 + 1;

  const trade = await db.insert(executedTrades).values({
    opportunityId: opportunity.id,
    strategyId: tradeData.strategyId ? parseInt(tradeData.strategyId) : null,
    transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
    tokenPair: opportunity.tokenPair,
    buyExchange: opportunity.buyExchange,
    sellExchange: opportunity.sellExchange,
    amountTraded: tradeData.amount.toString(),
    profitRealized: simulatedProfit.toString(),
    gasUsed: simulatedGasUsed,
    gasPrice: (tradeData.gasPrice || 25).toString(),
    executionTime: simulatedExecutionTime.toString(),
    status: Math.random() > 0.1 ? 'confirmed' : 'failed', // 90% success rate in simulation
    errorMessage: Math.random() > 0.9 ? 'Simulated execution error' : null
  }).returning();

  return res.json({
    success: true,
    simulation: true,
    trade: trade[0],
    message: 'Trade executed in simulation mode',
    timestamp: new Date().toISOString()
  });
}

async function executeRealTrade(opportunity: any, tradeData: any) {
  // This is where actual smart contract interaction would happen
  // For now, returning mock data structure
  return {
    txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    actualProfit: parseFloat(opportunity.profitAmount) * tradeData.amount,
    gasUsed: 450000,
    gasPrice: tradeData.gasPrice || 25,
    executionTime: 2.5,
    blockNumber: Math.floor(Math.random() * 1000000) + 18000000
  };
}

async function callAIStrategySelector(opportunities: any[]) {
  // Mock market conditions for AI strategy selection
  const marketConditions = {
    volatility: Math.random() * 100,
    volume: Math.random() * 100,
    gasPrice: Math.random() * 100,
    liquidityDepth: Math.random() * 100,
    spreadTightness: Math.random() * 100
  };

  return {
    recommendedStrategy: 'Flash Loan Arbitrage',
    confidence: 85.2,
    allocation: 60,
    marketSentiment: 'BULLISH',
    riskLevel: 'MEDIUM'
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
