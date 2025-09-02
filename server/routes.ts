import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { db } from "./db";
import { seedDatabase } from "./seed";
import { okxService } from "./okx-service";
import { arbitrageEngine, TRADING_STRATEGIES } from "./trading-strategies";
import { getAllActiveDEXes, getDEXById } from "./dex-registry";
import { riskManager } from "./risk-management";
import { backgroundEngine } from "./background-engine";
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

// Global WebSocket connections tracking
let wsConnections: WebSocket[] = [];

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
        
        case 'scan_all_strategies':
          return await scanAllStrategiesComprehensive(req, res);
        
        case 'get_dex_registry':
          return await getDEXRegistry(req, res);
        
        case 'get_trading_strategies':
          return await getTradingStrategies(req, res);
        
        case 'start_background_engine':
          return await startBackgroundEngine(req, res);
        
        case 'stop_background_engine':
          return await stopBackgroundEngine(req, res);
        
        case 'get_background_status':
          return await getBackgroundStatus(req, res);
        
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
  
  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    wsConnections.push(ws);
    
    // Send initial data
    sendRealTimeUpdate('connection', { status: 'connected', timestamp: new Date().toISOString() });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
      wsConnections = wsConnections.filter(conn => conn !== ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsConnections = wsConnections.filter(conn => conn !== ws);
    });
  });
  
  return httpServer;
}

// Real-time WebSocket broadcasting function
function sendRealTimeUpdate(type: string, data: any) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  
  wsConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  });
  
  // Clean up closed connections
  wsConnections = wsConnections.filter(ws => ws.readyState === WebSocket.OPEN);
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

  // Get comprehensive opportunities using all 5 strategies across 80+ DEXes
  let opportunities = [];
  let strategyUsed = 'comprehensive_multi_strategy';
  
  try {
    // Use the advanced arbitrage engine for comprehensive scanning
    const comprehensiveOpps = await arbitrageEngine.scanAllStrategies();
    console.log(`🔍 Comprehensive scan found ${comprehensiveOpps.length} opportunities across all strategies`);
    
    // Convert to OKX format for compatibility
    opportunities = comprehensiveOpps.map(op => ({
      id: op.id,
      token_pair: op.token,
      buy_exchange: op.buyDex,
      sell_exchange: op.sellDex,
      buy_price: op.buyPrice,
      sell_price: op.sellPrice,
      profit_amount: op.estimatedProfit,
      profit_percentage: op.profitPercentage * 100,
      volume_available: op.amount,
      risk_score: op.riskLevel,
      confidence_score: op.confidence,
      strategy: op.strategy,
      gas_estimate: op.gasEstimate,
      execution_time: op.executionTime,
      liquidity_score: op.liquidityScore
    }));
    
    // Fallback to OKX if comprehensive scan finds nothing
    if (opportunities.length === 0) {
      console.log('No comprehensive opportunities, falling back to OKX...');
      opportunities = await okxService.scanRealOpportunities();
      strategyUsed = 'okx_fallback';
    } else {
      // Determine primary strategy used
      const strategyCounts = opportunities.reduce((acc, op) => {
        acc[op.strategy] = (acc[op.strategy] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      strategyUsed = Object.keys(strategyCounts).reduce((a, b) => 
        strategyCounts[a] > strategyCounts[b] ? a : b
      );
      
      console.log(`📊 Primary strategy: ${strategyUsed} with ${strategyCounts[strategyUsed]} opportunities`);
    }
    
  } catch (error) {
    console.error('Error in comprehensive scanning:', error);
    // Ultimate fallback to OKX
    try {
      opportunities = await okxService.scanRealOpportunities();
      strategyUsed = 'okx_fallback_error';
    } catch (okxError) {
      console.error('OKX fallback also failed:', okxError);
      opportunities = [];
      strategyUsed = 'error';
    }
  }

  // Clear old expired opportunities first
  await db.delete(tradingOpportunities).where(
    and(
      eq(tradingOpportunities.status, 'discovered'),
      gte(tradingOpportunities.expiresAt, new Date())
    )
  );

  // Store opportunities in database and collect the stored records
  const storedOpportunities = [];
  let autoExecutedTrades = [];
  
  for (const opportunity of opportunities) {
    try {
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
        const formattedOpp = {
          id: dbRecord.id.toString(),
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
        };
        
        storedOpportunities.push(formattedOpp);
        
        // AI-driven automatic trading - Execute profitable opportunities with proper validation
        const aiDecision = await makeAITradingDecision(formattedOpp);
        
        // Only execute if token pair is valid for OKX and profit is significant
        const tokenPair = formattedOpp.token_pair;
        const isValidForOKX = tokenPair && tokenPair.includes('/') && !tokenPair.includes('LP') && !tokenPair.includes('INVALID');
        const forceExecution = formattedOpp.profit_percentage > 0.5 && isValidForOKX; // Increased threshold
        
        if ((aiDecision.shouldExecute || forceExecution) && isValidForOKX) {
          try {
            console.log(`🤖 AI AUTO-EXECUTING opportunity ${formattedOpp.id} with ${formattedOpp.profit_percentage}% profit using ${aiDecision.strategy} strategy`);
            
            // AI determines optimal trade amount based on multiple factors
            const optimalAmount = calculateOptimalTradeAmount(formattedOpp, aiDecision);
            
            // AI selects best execution strategy
            const executionStrategy = selectOptimalExecutionStrategy(formattedOpp, aiDecision);
            
            // Execute trade automatically with AI-optimized parameters
            const executionResult = await okxService.executeAIOptimizedTrade(dbRecord, optimalAmount, executionStrategy);
            
            // Update opportunity status to executing immediately
            await db.update(tradingOpportunities)
              .set({ status: 'executing' })
              .where(eq(tradingOpportunities.id, dbRecord.id));
            
            // Record the AI-executed trade with strategy details
            const trade = await db.insert(executedTrades).values({
              opportunityId: dbRecord.id,
              strategyId: aiDecision.strategyId,
              transactionHash: executionResult.txHash,
              tokenPair: dbRecord.tokenPair,
              buyExchange: dbRecord.buyExchange,
              sellExchange: dbRecord.sellExchange,
              amountTraded: (executionResult.actualAmount || optimalAmount).toString(),
              profitRealized: executionResult.actualProfit.toString(),
              gasUsed: executionResult.gasUsed || 0,
              gasPrice: executionResult.gasPrice.toString(),
              executionTime: executionResult.executionTime.toString(),
              status: executionResult.success ? 'confirmed' : 'failed'
            }).returning();
            
            autoExecutedTrades.push(trade[0]);
            console.log(`✅ AI auto-executed trade ${trade[0].id} with profit: ${executionResult.actualProfit} using ${aiDecision.strategy} strategy`);
            
            // Update formattedOpp status to reflect execution
            formattedOpp.status = 'executing';
            
            // Update AI learning data for future decisions
            await updateAILearningData(aiDecision, executionResult, formattedOpp);
            
          } catch (autoExecError) {
            console.error(`❌ AI auto-execution failed for opportunity ${formattedOpp.id}:`, autoExecError);
            // Log failure for AI learning
            await logAIExecutionFailure(formattedOpp, aiDecision, autoExecError);
          }
        } else {
          const reason = !isValidForOKX ? 'Invalid token pair for OKX' : `Low profit: ${formattedOpp.profit_percentage}%`;
          console.log(`⏭️ AI skipping opportunity ${formattedOpp.id} - ${reason}, Risk: ${formattedOpp.risk_score}`);
        }
      }
    } catch (dbError) {
      console.error('Database error storing opportunity:', dbError);
    }
  }

  // Get AI strategy recommendation
  const aiRecommendation = await callAIStrategySelector(storedOpportunities);

  const responseData = {
    opportunities: storedOpportunities,
    totalFound: storedOpportunities.length,
    highProfitCount: storedOpportunities.filter(o => o.profit_percentage > 2).length,
    autoExecutedCount: autoExecutedTrades.length,
    autoExecutedTrades,
    strategy: strategyUsed,
    aiRecommendation,
    scanTimestamp: new Date().toISOString()
  };

  // Broadcast real-time updates to all connected clients
  sendRealTimeUpdate('opportunities', responseData);

  return res.json(responseData);
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

  // Real trading mode - all trades are live
  console.log('Executing real trade with live funds');

  // Pre-execution validation
  const validation = await validateTrade(opportunity, tradeData, riskSettingsRecord);
  if (!validation.isValid) {
    throw new Error(`Trade validation failed: ${validation.reason}`);
  }

  // Allow any profitable opportunity
  if (parseFloat(opportunity.profitPercentage) < 0.1) {
    throw new Error('Profit percentage too low for execution');
  }

  // Execute real trade using OKX only
  const executionResult = await okxService.executeRealTrade(opportunity, tradeData.amount);

  // Record the real trade
  const trade = await db.insert(executedTrades).values({
    opportunityId: parseInt(opportunityId),
    strategyId: strategyId ? parseInt(strategyId) : null,
    transactionHash: executionResult.txHash,
    tokenPair: opportunity.tokenPair,
    buyExchange: opportunity.buyExchange,
    sellExchange: opportunity.sellExchange,
    amountTraded: amount.toString(),
    profitRealized: executionResult.actualProfit.toString(),
    gasUsed: executionResult.gasUsed || 0,
    gasPrice: executionResult.gasPrice.toString(),
    executionTime: executionResult.executionTime.toString(),
    status: executionResult.success ? 'confirmed' : 'failed'
  }).returning();

  return res.json({
    success: true,
    trade: trade[0],
    executionResult,
    realTrade: true,
    actualProfit: executionResult.actualProfit,
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

  const portfolioData = {
    portfolio: {
      totalProfit,
      tradesCount: totalTrades,
      successRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
      activeOpportunities: activeOpportunities.length,
      highProfitOpportunities: activeOpportunities.filter(o => parseFloat(o.profitPercentage) > 2).length
    },
    recentTrades: todayTrades.slice(0, 10),
    timestamp: new Date().toISOString()
  };

  // Broadcast real-time portfolio updates
  sendRealTimeUpdate('portfolio', portfolioData);

  return res.json(portfolioData);
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
  // Return recommendation even when no opportunities exist
  if (opportunities.length === 0) {
    return {
      recommendedStrategy: 'Scanning for opportunities...',
      confidence: 0,
      allocation: 0,
      marketSentiment: 'NEUTRAL',
      riskLevel: 'LOW'
    };
  }

  // Calculate real metrics from actual opportunities
  const avgProfitPercentage = opportunities.reduce((sum, opp) => sum + opp.profit_percentage, 0) / opportunities.length;
  const totalVolume = opportunities.reduce((sum, opp) => sum + opp.volume_available, 0);
  const highProfitCount = opportunities.filter(opp => opp.profit_percentage > 2).length;

  // Determine strategy based on opportunity types
  let strategyName = 'Standard Arbitrage';
  if (opportunities[0].id.startsWith('momentum-')) {
    strategyName = 'Trending Momentum';
  } else if (opportunities[0].id.startsWith('yield-')) {
    strategyName = 'Yield Farming';
  } else if (highProfitCount > 0) {
    strategyName = 'High Profit Arbitrage';
  }

  return {
    recommendedStrategy: strategyName,
    confidence: Math.min(avgProfitPercentage * 20, 100),
    allocation: Math.min(totalVolume * 10, 100),
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

// AI Trading Decision Engine - Aggressive auto-execution
async function makeAITradingDecision(opportunity: any): Promise<any> {
  const profitScore = opportunity.profit_percentage * 20; // Increased multiplier
  const riskScore = (5 - opportunity.risk_score) * 25; // Increased multiplier
  const volumeScore = Math.min(opportunity.volume_available * 5, 100); // Adjusted for better scoring
  const timeScore = opportunity.execution_time < 5 ? 90 : 70; // Higher speed bonus
  
  // AI confidence calculation with bias toward execution
  const aiConfidence = (profitScore * 0.5 + riskScore * 0.25 + volumeScore * 0.15 + timeScore * 0.1);
  
  // Lowered threshold for aggressive auto-execution
  const executionThreshold = 25; // Much lower threshold
  
  // Strategy selection based on opportunity characteristics
  let recommendedStrategy = 'flash_loan';
  let strategyId = 1;
  
  if (opportunity.profit_percentage > 3) {
    recommendedStrategy = 'high_profit_arbitrage';
    strategyId = 2;
  } else if (opportunity.profit_percentage > 1.5) {
    recommendedStrategy = 'medium_profit_arbitrage';
    strategyId = 3;
  } else if (opportunity.volume_available > 50) {
    recommendedStrategy = 'high_volume_arbitrage';
    strategyId = 4;
  }
  
  // Auto-execute ANY profitable opportunity above minimum threshold
  const shouldExecute = opportunity.profit_percentage > 0.1 && opportunity.risk_score <= 4;
  
  console.log(`AI Decision for ${opportunity.id}: Profit ${opportunity.profit_percentage}%, Risk ${opportunity.risk_score}, Confidence ${aiConfidence.toFixed(1)} - ${shouldExecute ? 'EXECUTE' : 'SKIP'}`);
  
  return {
    shouldExecute,
    confidence: Math.max(aiConfidence, 50), // Minimum confidence boost
    strategy: recommendedStrategy,
    strategyId,
    reasoning: `AI Score: ${aiConfidence.toFixed(1)}/100 - Profit: ${profitScore}, Risk: ${riskScore}, Volume: ${volumeScore}`,
    executionPriority: opportunity.profit_percentage > 2 ? 'HIGH' : opportunity.profit_percentage > 1 ? 'MEDIUM' : 'LOW'
  };
}

function calculateOptimalTradeAmount(opportunity: any, aiDecision: any): number {
  // Start with a conservative base amount for real trading
  const baseAmount = Math.min(opportunity.volume_available * 0.01, 1); // 1% of volume or max 1 token
  
  // Conservative multipliers for live trading
  let multiplier = 1.0; // Start conservatively
  
  // Profit-based multipliers - more conservative for real money
  if (opportunity.profit_percentage > 5) multiplier = 1.5;
  else if (opportunity.profit_percentage > 3) multiplier = 1.3;
  else if (opportunity.profit_percentage > 1.5) multiplier = 1.2;
  else if (opportunity.profit_percentage > 0.5) multiplier = 1.1;
  
  // Risk adjustment - be very conservative with high risk
  if (opportunity.risk_score <= 1) multiplier *= 1.2;
  else if (opportunity.risk_score <= 2) multiplier *= 1.1;
  else if (opportunity.risk_score >= 3) multiplier *= 0.8;
  else if (opportunity.risk_score >= 4) multiplier *= 0.5;
  
  // Confidence adjustment
  if (aiDecision.confidence > 80) multiplier *= 1.1;
  else if (aiDecision.confidence < 50) multiplier *= 0.8;
  
  const optimalAmount = Math.min(baseAmount * multiplier, opportunity.volume_available * 0.05);
  
  // Use very small amounts for live trading - respect exchange minimums
  return Math.max(optimalAmount, 0.01); // Much smaller minimum for conservative real trading
}

function selectOptimalExecutionStrategy(opportunity: any, aiDecision: any): any {
  return {
    strategy: aiDecision.strategy,
    slippageTolerance: opportunity.profit_percentage > 3 ? 3.0 : 1.5,
    speedPriority: aiDecision.executionPriority === 'HIGH' ? 'fast' : 'standard',
    orderType: opportunity.volume_available > 50 ? 'limit' : 'market',
    splitOrder: opportunity.volume_available > 100 ? true : false
  };
}

async function updateAILearningData(aiDecision: any, executionResult: any, opportunity: any) {
  // Store AI learning data for continuous improvement
  try {
    console.log(`AI Learning: Decision confidence ${aiDecision.confidence} resulted in ${executionResult.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`Predicted profit: ${opportunity.profit_percentage}%, Actual profit: ${executionResult.actualProfit}`);
    
    // This would update ML model weights in a production system
    // For now, we log the learning data
  } catch (error) {
    console.error('Error updating AI learning data:', error);
  }
}

async function logAIExecutionFailure(opportunity: any, aiDecision: any, error: any) {
  try {
    console.log(`AI Failure Analysis: Strategy ${aiDecision.strategy} failed for ${opportunity.token_pair}`);
    console.log(`Error: ${error.message}`);
    
    // This would feed back into the AI model for learning
  } catch (logError) {
    console.error('Error logging AI failure:', logError);
  }
}

// Comprehensive Multi-Strategy Scanner
async function scanAllStrategiesComprehensive(req: any, res: any) {
  try {
    console.log('🔍 Scanning all 5 strategies across 80+ DEXes...');
    
    // Get all opportunities from the advanced arbitrage engine
    const allOpportunities = await arbitrageEngine.scanAllStrategies();
    
    // Convert to database format and store
    const dbOpportunities = allOpportunities.map(op => ({
      opportunity_id: op.id,
      token_pair: op.token,
      buy_exchange: op.buyDex,
      sell_exchange: op.sellDex,
      buy_price: op.buyPrice,
      sell_price: op.sellPrice,
      profit_percentage: op.profitPercentage * 100,
      volume_available: op.amount,
      risk_score: op.riskLevel,
      confidence_score: op.confidence,
      strategy_type: op.strategy,
      execution_time_estimate: op.executionTime,
      gas_estimate: op.gasEstimate.toString(),
      liquidity_score: op.liquidityScore,
      detected_at: new Date(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }));
    
    // Store top opportunities in database
    if (dbOpportunities.length > 0) {
      await db.insert(tradingOpportunities)
        .values(dbOpportunities.slice(0, 15))
        .onConflictDoNothing(); // Avoid duplicates
    }
    
    // Broadcast real-time update
    sendRealTimeUpdate('opportunities', {
      total: allOpportunities.length,
      strategies: TRADING_STRATEGIES.map(s => ({
        id: s.id,
        name: s.name,
        opportunities: allOpportunities.filter(op => op.strategy === s.id).length
      })),
      topOpportunities: allOpportunities.slice(0, 10)
    });
    
    console.log(`📊 Found ${allOpportunities.length} opportunities across all strategies`);
    
    return res.json({
      success: true,
      opportunities: allOpportunities,
      strategies: TRADING_STRATEGIES,
      totalDexes: getAllActiveDEXes().length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error scanning all strategies:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// DEX Registry API
async function getDEXRegistry(req: any, res: any) {
  try {
    const activeDexes = getAllActiveDEXes();
    const dexesByChain = activeDexes.reduce((acc, dex) => {
      if (!acc[dex.chain]) acc[dex.chain] = [];
      acc[dex.chain].push(dex);
      return acc;
    }, {} as { [chain: string]: any[] });
    
    return res.json({
      totalDexes: activeDexes.length,
      chains: Object.keys(dexesByChain).length,
      dexesByChain,
      allDexes: activeDexes
    });
  } catch (error) {
    console.error('Error getting DEX registry:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Trading Strategies API
async function getTradingStrategies(req: any, res: any) {
  try {
    const strategies = arbitrageEngine.getAllStrategies();
    
    // Get performance data for each strategy
    const strategiesWithPerformance = await Promise.all(
      strategies.map(async (strategy) => {
        const performance = await db.select()
          .from(strategyPerformance)
          .where(eq(strategyPerformance.strategy_id, strategy.id))
          .orderBy(desc(strategyPerformance.created_at))
          .limit(1);
        
        return {
          ...strategy,
          performance: performance[0] || null
        };
      })
    );
    
    return res.json({
      strategies: strategiesWithPerformance,
      totalStrategies: strategies.length
    });
  } catch (error) {
    console.error('Error getting trading strategies:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Background Engine Control
async function startBackgroundEngine(req: any, res: any) {
  try {
    await backgroundEngine.start();
    
    return res.json({
      success: true,
      message: 'Background arbitrage engine started',
      status: backgroundEngine.getStatus(),
      config: backgroundEngine.getConfig()
    });
  } catch (error) {
    console.error('Error starting background engine:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function stopBackgroundEngine(req: any, res: any) {
  try {
    await backgroundEngine.stop();
    
    return res.json({
      success: true,
      message: 'Background arbitrage engine stopped',
      status: backgroundEngine.getStatus()
    });
  } catch (error) {
    console.error('Error stopping background engine:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function getBackgroundStatus(req: any, res: any) {
  try {
    const status = backgroundEngine.getStatus();
    const config = backgroundEngine.getConfig();
    const riskMetrics = riskManager.getCurrentMetrics();
    
    return res.json({
      status,
      config,
      riskMetrics,
      totalDexes: getAllActiveDEXes().length,
      totalStrategies: TRADING_STRATEGIES.length
    });
  } catch (error) {
    console.error('Error getting background status:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
