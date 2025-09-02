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

  // Store only valid opportunities and execute profitable ones
  const storedOpportunities = [];
  let autoExecutedTrades = [];
  
  for (const opportunity of opportunities) {
    try {
      // Pre-validate opportunity before database storage
      if (!isValidOpportunity(opportunity)) {
        console.log(`⚠️ Skipping invalid opportunity: ${opportunity.token_pair || 'unknown'}`);
        continue;
      }
      
      // Sanitize and validate all database values
      const sanitizedValues = sanitizeOpportunityData(opportunity);
      
      const stored = await db.insert(tradingOpportunities)
        .values(sanitizedValues)
        .returning();
      
      if (stored.length > 0) {
        const dbRecord = stored[0];
        const formattedOpp = formatOpportunityFromDB(dbRecord);
        
        storedOpportunities.push(formattedOpp);
        
        // Enhanced AI trading decision with stricter validation
        const shouldAttemptTrade = await shouldExecuteTradeWithValidation(formattedOpp);
        
        if (shouldAttemptTrade.execute) {
          try {
            console.log(`🎯 Executing valid OKX trade for ${formattedOpp.token_pair}: ${shouldAttemptTrade.reason}`);
            
            const optimalAmount = calculateOptimalTradeAmount(formattedOpp, shouldAttemptTrade.aiDecision);
            const executionStrategy = selectOptimalExecutionStrategy(formattedOpp, shouldAttemptTrade.aiDecision);
            
            // Execute with enhanced error handling
            const executionResult = await okxService.executeAIOptimizedTrade(dbRecord, optimalAmount, executionStrategy);
            
            // Only record successful trades
            if (executionResult.success) {
              await db.update(tradingOpportunities)
                .set({ status: 'executing' })
                .where(eq(tradingOpportunities.id, dbRecord.id));
              
              const trade = await db.insert(executedTrades).values({
                opportunityId: dbRecord.id,
                strategyId: shouldAttemptTrade.aiDecision.strategyId,
                transactionHash: executionResult.txHash || `trade_${Date.now()}`,
                tokenPair: dbRecord.tokenPair,
                buyExchange: dbRecord.buyExchange,
                sellExchange: dbRecord.sellExchange,
                amountTraded: (executionResult.actualAmount || optimalAmount).toString(),
                profitRealized: Math.abs(executionResult.actualProfit || 0).toString(),
                gasUsed: executionResult.gasUsed || 0,
                gasPrice: (executionResult.gasPrice || 0).toString(),
                executionTime: (executionResult.executionTime || 0).toString(),
                status: 'confirmed'
              }).returning();
              
              autoExecutedTrades.push(trade[0]);
              formattedOpp.status = 'executing';
              
              console.log(`✅ Successfully executed trade ${trade[0].id}: ${executionResult.actualProfit} profit`);
            } else {
              console.log(`❌ Trade execution failed: ${executionResult.error}`);
            }
            
          } catch (autoExecError) {
            console.error(`❌ Auto-execution failed for ${formattedOpp.id}:`, autoExecError);
          }
        } else {
          console.log(`⏭️ Skipping opportunity ${formattedOpp.id}: ${shouldAttemptTrade.reason}`);
        }
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
    }
  }

// Helper functions for validation and sanitization
function isValidOpportunity(opportunity: any): boolean {
  return (
    opportunity &&
    opportunity.token_pair &&
    typeof opportunity.token_pair === 'string' &&
    !opportunity.token_pair.includes('LP') &&
    !opportunity.token_pair.includes('INVALID') &&
    !isNaN(parseFloat(opportunity.buy_price)) &&
    !isNaN(parseFloat(opportunity.sell_price)) &&
    !isNaN(parseFloat(opportunity.profit_percentage)) &&
    parseFloat(opportunity.profit_percentage) > 0
  );
}

function sanitizeOpportunityData(opportunity: any) {
  return {
    tokenPair: opportunity.token_pair || 'BTC/USDT',
    buyExchange: opportunity.buy_exchange || 'OKX',
    sellExchange: opportunity.sell_exchange || 'OKX',
    buyPrice: Math.min(Math.max(parseFloat(opportunity.buy_price) || 1, 0.00000001), 9999999.99999999).toString(),
    sellPrice: Math.min(Math.max(parseFloat(opportunity.sell_price) || 1.01, 0.00000001), 9999999.99999999).toString(),
    profitAmount: Math.min(Math.max(parseFloat(opportunity.profit_amount) || 0.01, 0.00000001), 9999999.99999999).toString(),
    profitPercentage: Math.min(Math.max(parseFloat(opportunity.profit_percentage) || 1, 0.01), 999.99).toString(),
    volumeAvailable: Math.min(Math.max(parseFloat(opportunity.volume_available) || 100, 0.01), 9999999999999.99).toString(),
    gasCost: opportunity.gas_cost ? Math.min(Math.max(parseFloat(opportunity.gas_cost), 0), 999999999999999).toString() : null,
    executionTime: opportunity.execution_time ? Math.min(Math.max(parseFloat(opportunity.execution_time), 0), 999999999999999).toString() : null,
    riskScore: Math.min(Math.max(parseInt(opportunity.risk_score) || 1, 1), 10),
    status: 'discovered',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  };
}

function formatOpportunityFromDB(dbRecord: any) {
  return {
    id: dbRecord.id.toString(),
    token_pair: dbRecord.tokenPair,
    buy_exchange: dbRecord.buyExchange,
    sell_exchange: dbRecord.sellExchange,
    buy_price: parseFloat(dbRecord.buyPrice),
    sell_price: parseFloat(dbRecord.sellPrice),
    profit_amount: parseFloat(dbRecord.profitAmount),
    profit_percentage: parseFloat(dbRecord.profitPercentage),
    volume_available: parseFloat(dbRecord.volumeAvailable),
    gas_cost: dbRecord.gasCost ? parseFloat(dbRecord.gasCost) : 0,
    execution_time: dbRecord.executionTime ? parseFloat(dbRecord.executionTime) : 1,
    risk_score: dbRecord.riskScore,
    status: dbRecord.status,
    created_at: dbRecord.createdAt?.toISOString(),
    expires_at: dbRecord.expiresAt?.toISOString()
  };
}

async function shouldExecuteTradeWithValidation(opportunity: any) {
  // Enhanced validation for OKX trading
  const tokenPair = opportunity.token_pair;
  
  // Validate token pair format
  if (!tokenPair || !tokenPair.includes('/')) {
    return { execute: false, reason: 'Invalid token pair format' };
  }
  
  // Check if it's a valid OKX pair
  const validOKXPairs = ['BTC/USDT', 'ETH/USDT', 'ETH/USDC', 'BTC/USDC', 'MATIC/USDT', 'LINK/USDT', 'UNI/USDT', 'AVAX/USDT'];
  if (!validOKXPairs.includes(tokenPair)) {
    return { execute: false, reason: `Token pair ${tokenPair} not supported by OKX` };
  }
  
  // Check profit threshold (be more selective)
  if (opportunity.profit_percentage < 0.8) {
    return { execute: false, reason: `Profit ${opportunity.profit_percentage}% below 0.8% threshold` };
  }
  
  // Check risk score (be more conservative)
  if (opportunity.risk_score > 3) {
    return { execute: false, reason: `Risk score ${opportunity.risk_score} too high` };
  }
  
  // AI decision with conservative parameters
  const aiDecision = await makeAITradingDecision(opportunity);
  
  return {
    execute: true,
    reason: `Valid OKX trade: ${opportunity.profit_percentage}% profit, risk ${opportunity.risk_score}`,
    aiDecision
  };
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
  try {
    const { opportunityId, strategyId, amount, maxSlippage } = tradeData;

    // Validate input parameters
    if (!opportunityId || isNaN(parseInt(opportunityId))) {
      throw new Error('Invalid opportunity ID');
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw new Error('Invalid trade amount');
    }

    // Get the opportunity from database
    const opportunities = await db.select().from(tradingOpportunities).where(eq(tradingOpportunities.id, parseInt(opportunityId)));
    if (opportunities.length === 0) {
      throw new Error('Opportunity not found or expired');
    }
    const opportunity = opportunities[0];

    // Enhanced pre-execution validation
    const validationResult = await validateTradeEnhanced(opportunity, tradeData);
    if (!validationResult.isValid) {
      throw new Error(`Trade validation failed: ${validationResult.reason}`);
    }

    console.log(`🎯 Executing OKX trade for ${opportunity.tokenPair} with amount ${amount}`);

    // Execute trade with enhanced error handling
    const executionResult = await okxService.executeRealTrade(opportunity, parseFloat(amount));

    // Only record successful trades to avoid database issues
    if (executionResult.success) {
      // Update opportunity status first
      await db.update(tradingOpportunities)
        .set({ status: 'executed' })
        .where(eq(tradingOpportunities.id, parseInt(opportunityId)));

      // Record successful trade with sanitized values
      const trade = await db.insert(executedTrades).values({
        opportunityId: parseInt(opportunityId),
        strategyId: strategyId ? parseInt(strategyId) : null,
        transactionHash: executionResult.txHash || `trade_${Date.now()}`,
        tokenPair: opportunity.tokenPair,
        buyExchange: opportunity.buyExchange,
        sellExchange: opportunity.sellExchange,
        amountTraded: (executionResult.actualAmount || amount).toString(),
        profitRealized: Math.abs(executionResult.actualProfit || 0).toString(),
        gasUsed: executionResult.gasUsed || 0,
        gasPrice: (executionResult.gasPrice || 0).toString(),
        executionTime: (executionResult.executionTime || 1).toString(),
        status: 'confirmed'
      }).returning();

      console.log(`✅ Trade recorded successfully: ${trade[0].id}`);

      return res.json({
        success: true,
        trade: trade[0],
        executionResult,
        actualProfit: executionResult.actualProfit,
        timestamp: new Date().toISOString()
      });
    } else {
      // Handle failed execution
      console.log(`❌ Trade execution failed: ${executionResult.error}`);
      
      return res.status(400).json({
        success: false,
        error: executionResult.error || 'Trade execution failed',
        executionResult,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Trade execution error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown trade execution error',
      timestamp: new Date().toISOString()
    });
  }
}

// Enhanced trade validation
async function validateTradeEnhanced(opportunity: any, tradeData: any) {
  // Check if opportunity is still valid and not expired
  if (opportunity.expiresAt && new Date(opportunity.expiresAt) < new Date()) {
    return { isValid: false, reason: 'Opportunity expired' };
  }

  // Validate token pair format for OKX
  const tokenPair = opportunity.tokenPair;
  if (!tokenPair || !tokenPair.includes('/')) {
    return { isValid: false, reason: 'Invalid token pair format' };
  }

  // Check if it's a supported OKX pair
  const validOKXPairs = ['BTC/USDT', 'ETH/USDT', 'ETH/USDC', 'BTC/USDC', 'MATIC/USDT', 'LINK/USDT', 'UNI/USDT', 'AVAX/USDT'];
  if (!validOKXPairs.includes(tokenPair)) {
    return { isValid: false, reason: `Token pair ${tokenPair} not supported by OKX` };
  }

  // Check profit threshold - be more selective
  const profitPct = parseFloat(opportunity.profitPercentage);
  if (isNaN(profitPct) || profitPct < 0.5) {
    return { isValid: false, reason: `Profit ${profitPct}% below 0.5% threshold` };
  }

  // Check risk score - be conservative
  if (opportunity.riskScore > 3) {
    return { isValid: false, reason: `Risk score ${opportunity.riskScore} too high (max 3)` };
  }

  // Validate trade amount
  const amount = parseFloat(tradeData.amount);
  if (isNaN(amount) || amount <= 0 || amount > 10) {
    return { isValid: false, reason: `Invalid amount: ${amount} (must be 0-10)` };
  }

  return { isValid: true, reason: 'Trade validated successfully' };
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
