import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketConditions {
  volatility: number;
  volume: number;
  gasPrice: number;
  liquidityDepth: number;
  spreadTightness: number;
}

interface StrategyScore {
  strategyId: string;
  strategyName: string;
  score: number;
  confidence: number;
  recommendedAllocation: number;
  reasoning: string;
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

    const { marketConditions, availableOpportunities } = await req.json() as {
      marketConditions: MarketConditions;
      availableOpportunities: any[];
    }

    // Fetch all active trading strategies
    const { data: strategies, error: strategiesError } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('is_active', true)

    if (strategiesError) throw strategiesError

    // Fetch recent performance data for each strategy
    const { data: performanceData, error: performanceError } = await supabase
      .from('strategy_performance')
      .select('*')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (performanceError) throw performanceError

    // AI Strategy Selection Algorithm
    const strategyScores: StrategyScore[] = strategies.map(strategy => {
      const recentPerformance = performanceData.filter(p => p.strategy_id === strategy.id)
      const avgSuccessRate = recentPerformance.reduce((sum, p) => sum + p.success_rate, 0) / Math.max(recentPerformance.length, 1)
      const avgProfit = recentPerformance.reduce((sum, p) => sum + p.avg_profit_per_trade, 0) / Math.max(recentPerformance.length, 1)
      
      let score = 0
      let reasoning = []

      // Market condition adaptability scoring
      switch (strategy.strategy_type) {
        case 'flash_loan':
          // Flash loans work best in high volatility, high volume markets
          score += marketConditions.volatility * 0.3
          score += marketConditions.volume * 0.25
          score += (100 - marketConditions.gasPrice) * 0.2 // Lower gas is better
          score += marketConditions.liquidityDepth * 0.15
          score += (100 - marketConditions.spreadTightness) * 0.1 // Wider spreads better for flash loans
          reasoning.push(`Flash loan efficiency: ${marketConditions.volatility > 70 ? 'HIGH' : 'MEDIUM'} volatility market`)
          break

        case 'triangular':
          // Triangular works best with tight spreads and high liquidity
          score += marketConditions.spreadTightness * 0.35
          score += marketConditions.liquidityDepth * 0.3
          score += marketConditions.volume * 0.2
          score += (100 - marketConditions.gasPrice) * 0.15
          reasoning.push(`Triangular efficiency: ${marketConditions.spreadTightness > 80 ? 'OPTIMAL' : 'GOOD'} spread conditions`)
          break

        case 'cross_exchange':
          // Cross-exchange works well in medium volatility with good volume
          score += marketConditions.volume * 0.3
          score += (Math.abs(marketConditions.volatility - 50) < 20 ? 80 : 40) * 0.25 // Prefer medium volatility
          score += marketConditions.liquidityDepth * 0.2
          score += (100 - marketConditions.gasPrice) * 0.25
          reasoning.push(`Cross-exchange: ${marketConditions.volume > 60 ? 'HIGH' : 'MEDIUM'} volume detected`)
          break

        case 'liquidity_pool':
          // LP arbitrage works best in stable, high-liquidity conditions
          score += marketConditions.liquidityDepth * 0.4
          score += marketConditions.spreadTightness * 0.25
          score += (100 - marketConditions.volatility) * 0.2 // Lower volatility is better
          score += (100 - marketConditions.gasPrice) * 0.15
          reasoning.push(`LP arbitrage: ${marketConditions.liquidityDepth > 75 ? 'EXCELLENT' : 'GOOD'} liquidity depth`)
          break
      }

      // Historical performance weighting
      const performanceWeight = (avgSuccessRate * 0.6 + (avgProfit > 0 ? 80 : 20) * 0.4) / 100
      score = score * (0.7 + performanceWeight * 0.3)

      // Opportunity count weighting
      const relevantOpportunities = availableOpportunities.filter(opp => {
        if (strategy.strategy_type === 'flash_loan') return opp.profit_percentage >= 1.5
        if (strategy.strategy_type === 'triangular') return opp.buy_exchange === opp.sell_exchange
        if (strategy.strategy_type === 'cross_exchange') return opp.buy_exchange !== opp.sell_exchange
        if (strategy.strategy_type === 'liquidity_pool') return opp.volume_available > 10000
        return true
      })

      const opportunityBoost = Math.min(relevantOpportunities.length * 10, 50)
      score += opportunityBoost

      reasoning.push(`${relevantOpportunities.length} relevant opportunities`)
      reasoning.push(`Historical success rate: ${avgSuccessRate.toFixed(1)}%`)

      // Calculate confidence based on data availability and consistency
      const confidence = Math.min(
        (recentPerformance.length * 20) + // More data = higher confidence
        (avgSuccessRate > 80 ? 30 : avgSuccessRate > 60 ? 20 : 10) + // Success rate confidence
        (relevantOpportunities.length > 5 ? 25 : relevantOpportunities.length * 5) + // Opportunity confidence
        (marketConditions.volume > 50 ? 25 : 15), // Market confidence
        100
      )

      return {
        strategyId: strategy.id,
        strategyName: strategy.name,
        score: Math.min(score, 100),
        confidence,
        recommendedAllocation: 0, // Will be calculated after sorting
        reasoning: reasoning.join(', ')
      }
    })

    // Sort by score and assign allocations
    strategyScores.sort((a, b) => b.score - a.score)
    
    // Allocation algorithm based on 80/20 rule for BTC/ETH focus
    const totalScore = strategyScores.reduce((sum, s) => sum + s.score, 0)
    let remainingAllocation = 100

    strategyScores.forEach((strategyScore, index) => {
      if (index === 0) {
        // Top strategy gets primary allocation
        strategyScore.recommendedAllocation = Math.min(60, remainingAllocation)
      } else if (index === 1 && strategyScore.score > 70) {
        // Second strategy gets secondary allocation if high scoring
        strategyScore.recommendedAllocation = Math.min(25, remainingAllocation)
      } else if (strategyScore.score > 50) {
        // Remaining high-scoring strategies get smaller allocations
        strategyScore.recommendedAllocation = Math.min(15, remainingAllocation)
      } else {
        strategyScore.recommendedAllocation = 0
      }
      remainingAllocation -= strategyScore.recommendedAllocation
    })

    // Update strategy performance tracking
    const today = new Date().toISOString().split('T')[0]
    for (const strategy of strategies) {
      const strategyScore = strategyScores.find(s => s.strategyId === strategy.id)
      await supabase
        .from('strategy_performance')
        .upsert({
          strategy_id: strategy.id,
          date: today,
          ai_confidence_score: strategyScore?.confidence || 0,
          market_conditions: marketConditions
        })
    }

    const recommendation = {
      timestamp: new Date().toISOString(),
      marketConditions,
      recommendedStrategies: strategyScores.filter(s => s.recommendedAllocation > 0),
      totalOpportunities: availableOpportunities.length,
      marketSentiment: getMarketSentiment(marketConditions),
      riskLevel: calculateRiskLevel(marketConditions, strategyScores),
      executionPriority: strategyScores[0]?.strategyName || 'No suitable strategy'
    }

    return new Response(
      JSON.stringify(recommendation),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

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

function getMarketSentiment(conditions: MarketConditions): string {
  const score = (conditions.volatility + conditions.volume + conditions.liquidityDepth) / 3
  if (score > 80) return 'BULLISH'
  if (score > 60) return 'NEUTRAL'
  if (score > 40) return 'CAUTIOUS'
  return 'BEARISH'
}

function calculateRiskLevel(conditions: MarketConditions, strategies: StrategyScore[]): string {
  const topStrategy = strategies[0]
  const riskScore = (
    conditions.volatility * 0.4 +
    (100 - conditions.liquidityDepth) * 0.3 +
    conditions.gasPrice * 0.2 +
    (100 - (topStrategy?.confidence || 0)) * 0.1
  )
  
  if (riskScore > 70) return 'HIGH'
  if (riskScore > 40) return 'MEDIUM'
  return 'LOW'
}