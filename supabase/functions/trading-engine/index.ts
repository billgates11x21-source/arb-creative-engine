import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradeExecution {
  opportunityId: string;
  strategyId: string;
  amount: number;
  maxSlippage: number;
  gasPrice?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { action, data } = await req.json() as {
      action: string;
      data: any;
    }

    switch (action) {
      case 'scan_opportunities':
        return await scanArbitrageOpportunities(supabase)
      
      case 'execute_trade':
        return await executeTrade(supabase, data as TradeExecution)
      
      case 'get_portfolio_status':
        return await getPortfolioStatus(supabase)
      
      case 'update_risk_settings':
        return await updateRiskSettings(supabase, data)
      
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function scanArbitrageOpportunities(supabase: any) {
  // Get active exchange configurations
  const { data: exchanges, error: exchangeError } = await supabase
    .from('exchange_configs')
    .select('*')
    .eq('is_active', true)
    .order('priority_score', { ascending: false })

  if (exchangeError) throw exchangeError

  // Get risk settings
  const { data: riskSettings, error: riskError } = await supabase
    .from('risk_settings')
    .select('*')
    .single()

  if (riskError) throw riskError

  // Mock real-time opportunity scanning (in production, this would connect to actual APIs)
  const opportunities = await generateMockOpportunities(exchanges, riskSettings)

  // Store opportunities in database
  for (const opportunity of opportunities) {
    await supabase
      .from('trading_opportunities')
      .upsert(opportunity)
  }

  // Get AI strategy recommendation
  const aiRecommendation = await callAIStrategySelector(supabase, opportunities)

  return new Response(
    JSON.stringify({
      opportunities,
      totalFound: opportunities.length,
      highProfitCount: opportunities.filter(o => o.profit_percentage > 2).length,
      aiRecommendation,
      scanTimestamp: new Date().toISOString()
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function executeTrade(supabase: any, tradeData: TradeExecution) {
  // Get the opportunity
  const { data: opportunity, error: oppError } = await supabase
    .from('trading_opportunities')
    .select('*')
    .eq('id', tradeData.opportunityId)
    .single()

  if (oppError) throw oppError

  // Get risk settings
  const { data: riskSettings } = await supabase
    .from('risk_settings')
    .select('*')
    .single()

  // Pre-execution validation
  const validation = await validateTrade(opportunity, tradeData, riskSettings)
  if (!validation.isValid) {
    throw new Error(`Trade validation failed: ${validation.reason}`)
  }

  // Check if in simulation mode
  if (riskSettings.is_simulation_mode) {
    return await simulateTrade(supabase, opportunity, tradeData)
  }

  // PRODUCTION TRADING EXECUTION
  // This would integrate with actual smart contracts and exchanges
  const executionResult = await executeRealTrade(opportunity, tradeData)

  // Record the trade
  const { data: trade, error: tradeError } = await supabase
    .from('executed_trades')
    .insert({
      opportunity_id: tradeData.opportunityId,
      strategy_id: tradeData.strategyId,
      transaction_hash: executionResult.txHash,
      token_pair: opportunity.token_pair,
      buy_exchange: opportunity.buy_exchange,
      sell_exchange: opportunity.sell_exchange,
      amount_traded: tradeData.amount,
      profit_realized: executionResult.actualProfit,
      gas_used: executionResult.gasUsed,
      gas_price: executionResult.gasPrice,
      execution_time: executionResult.executionTime,
      status: 'pending'
    })
    .select()
    .single()

  if (tradeError) throw tradeError

  return new Response(
    JSON.stringify({
      success: true,
      trade,
      executionResult,
      timestamp: new Date().toISOString()
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function getPortfolioStatus(supabase: any) {
  const today = new Date().toISOString().split('T')[0]
  
  // Get today's trades
  const { data: todayTrades } = await supabase
    .from('executed_trades')
    .select('*')
    .gte('created_at', today)

  // Get active opportunities
  const { data: activeOpportunities } = await supabase
    .from('trading_opportunities')
    .select('*')
    .eq('status', 'discovered')
    .gt('expires_at', new Date().toISOString())

  // Calculate stats
  const totalProfit = todayTrades?.reduce((sum: number, trade: any) => sum + parseFloat(trade.profit_realized || 0), 0) || 0
  const successfulTrades = todayTrades?.filter((t: any) => t.status === 'confirmed').length || 0
  const totalTrades = todayTrades?.length || 0

  return new Response(
    JSON.stringify({
      portfolio: {
        totalProfit,
        tradesCount: totalTrades,
        successRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
        activeOpportunities: activeOpportunities?.length || 0,
        highProfitOpportunities: activeOpportunities?.filter((o: any) => o.profit_percentage > 2).length || 0
      },
      recentTrades: todayTrades?.slice(0, 10) || [],
      timestamp: new Date().toISOString()
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function updateRiskSettings(supabase: any, settings: any) {
  const { data, error } = await supabase
    .from('risk_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error

  return new Response(
    JSON.stringify({
      success: true,
      settings: data,
      timestamp: new Date().toISOString()
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

// Helper functions

async function generateMockOpportunities(exchanges: any[], riskSettings: any) {
  const tokenPairs = ['ETH/USDC', 'BTC/USDT', 'WETH/DAI', 'MATIC/USDC', 'LINK/ETH', 'UNI/USDT']
  const opportunities = []

  for (let i = 0; i < Math.floor(Math.random() * 10) + 15; i++) {
    const buyExchange = exchanges[Math.floor(Math.random() * exchanges.length)]
    const sellExchange = exchanges[Math.floor(Math.random() * exchanges.length)]
    
    if (buyExchange.id === sellExchange.id) continue

    const tokenPair = tokenPairs[Math.floor(Math.random() * tokenPairs.length)]
    const basePrice = Math.random() * 1000 + 100
    const profitMargin = Math.random() * 0.05 + 0.005 // 0.5% to 5.5%
    
    const opportunity = {
      token_pair: tokenPair,
      buy_exchange: buyExchange.exchange_name,
      sell_exchange: sellExchange.exchange_name,
      buy_price: basePrice,
      sell_price: basePrice * (1 + profitMargin),
      profit_amount: basePrice * profitMargin,
      profit_percentage: profitMargin * 100,
      volume_available: Math.random() * 100000 + 1000,
      gas_cost: Math.random() * 50 + 10,
      execution_time: Math.random() * 5 + 1,
      risk_score: Math.floor(Math.random() * 5) + 1,
      status: 'discovered'
    }

    // Apply BTC/ETH allocation rules
    const isBtcEth = tokenPair.includes('BTC') || tokenPair.includes('ETH')
    if (isBtcEth && opportunity.profit_percentage >= riskSettings.min_profit_threshold) {
      opportunities.push(opportunity)
    } else if (!isBtcEth && opportunity.profit_percentage >= riskSettings.min_profit_threshold * 1.5) {
      opportunities.push(opportunity)
    }
  }

  return opportunities.slice(0, 25) // Limit results
}

async function validateTrade(opportunity: any, tradeData: TradeExecution, riskSettings: any) {
  // Check if opportunity is still valid
  if (new Date(opportunity.expires_at) < new Date()) {
    return { isValid: false, reason: 'Opportunity expired' }
  }

  // Check profit threshold
  if (opportunity.profit_percentage < riskSettings.min_profit_threshold) {
    return { isValid: false, reason: 'Profit below threshold' }
  }

  // Check position size
  if (tradeData.amount > riskSettings.max_position_size) {
    return { isValid: false, reason: 'Position size exceeds limit' }
  }

  // Check risk score
  if (opportunity.risk_score > riskSettings.max_risk_score) {
    return { isValid: false, reason: 'Risk score too high' }
  }

  return { isValid: true, reason: 'Trade validated' }
}

async function simulateTrade(supabase: any, opportunity: any, tradeData: TradeExecution) {
  // Simulate trade execution with realistic results
  const simulatedProfit = opportunity.profit_amount * tradeData.amount * (0.8 + Math.random() * 0.4)
  const simulatedGasUsed = Math.floor(Math.random() * 100000) + 300000
  const simulatedExecutionTime = Math.random() * 3 + 1

  const { data: trade } = await supabase
    .from('executed_trades')
    .insert({
      opportunity_id: tradeData.opportunityId,
      strategy_id: tradeData.strategyId,
      transaction_hash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
      token_pair: opportunity.token_pair,
      buy_exchange: opportunity.buy_exchange,
      sell_exchange: opportunity.sell_exchange,
      amount_traded: tradeData.amount,
      profit_realized: simulatedProfit,
      gas_used: simulatedGasUsed,
      gas_price: tradeData.gasPrice || 25,
      execution_time: simulatedExecutionTime,
      status: Math.random() > 0.1 ? 'confirmed' : 'failed', // 90% success rate in simulation
      error_message: Math.random() > 0.9 ? 'Simulated execution error' : null
    })
    .select()
    .single()

  return new Response(
    JSON.stringify({
      success: true,
      simulation: true,
      trade,
      message: 'Trade executed in simulation mode',
      timestamp: new Date().toISOString()
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function executeRealTrade(opportunity: any, tradeData: TradeExecution) {
  // This is where actual smart contract interaction would happen
  // For now, returning mock data structure for compilation
  return {
    txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    actualProfit: opportunity.profit_amount * tradeData.amount,
    gasUsed: 450000,
    gasPrice: tradeData.gasPrice || 25,
    executionTime: 2.5,
    blockNumber: Math.floor(Math.random() * 1000000) + 18000000
  }
}

async function callAIStrategySelector(supabase: any, opportunities: any[]) {
  // Mock market conditions for AI strategy selection
  const marketConditions = {
    volatility: Math.random() * 100,
    volume: Math.random() * 100,
    gasPrice: Math.random() * 100,
    liquidityDepth: Math.random() * 100,
    spreadTightness: Math.random() * 100
  }

  // In production, this would call the AI strategy selector function
  return {
    recommendedStrategy: 'Flash Loan Arbitrage',
    confidence: 85.2,
    allocation: 60,
    marketSentiment: 'BULLISH',
    riskLevel: 'MEDIUM'
  }
}