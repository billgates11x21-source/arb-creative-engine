import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// API client for calling server endpoints
const apiClient = {
  functions: {
    invoke: async (functionName: string, options: any) => {
      console.log(`API call: ${functionName}`, options);

      const endpoint = `/api/${functionName}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options.body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: { message: errorData.error || 'API call failed' } };
      }

      const data = await response.json();
      return { data, error: null };
    }
  }
};


interface TradingStats {
  totalOpportunities: number;
  activeArbitrage: number;
  totalVolume: number;
  profitToday: number;
  successRate: number;
  avgProfitPercent: number;
}

interface ArbitrageOpportunity {
  id: string;
  token_pair: string;
  buy_exchange: string;
  sell_exchange: string;
  buy_price: number;
  sell_price: number;
  profit_amount: number;
  profit_percentage: number;
  volume_available: number;
  gas_cost: number;
  execution_time: number;
  risk_score: number;
  status: string;
  created_at: string;
  expires_at: string;
}

interface AIRecommendation {
  recommendedStrategy: string;
  confidence: number;
  allocation: number;
  marketSentiment: string;
  riskLevel: string;
}

export function useArbitrageEngine() {
  const [isEngineActive, setIsEngineActive] = useState(false);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [tradingStats, setTradingStats] = useState<TradingStats>({
    totalOpportunities: 0,
    activeArbitrage: 0,
    totalVolume: 0,
    profitToday: 0,
    successRate: 0,
    avgProfitPercent: 0
  });
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentStrategy, setCurrentStrategy] = useState<string>('arbitrage');

  // Added state for selected opportunity to manage UI state
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);


  const { toast } = useToast();

  // Scan for arbitrage opportunities
  const scanOpportunities = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data, error } = await apiClient.functions.invoke('trading-engine', {
        body: {
          action: 'scan_opportunities'
        }
      });

      if (error) throw error;

      setOpportunities(data.opportunities || []);
      setAiRecommendation(data.aiRecommendation);
      setCurrentStrategy(data.strategy || 'arbitrage');
      setLastUpdate(new Date());

      // Update stats including auto-executed trades
      setTradingStats(prev => ({
        ...prev,
        totalOpportunities: data.opportunities?.length || 0,
        activeArbitrage: data.opportunities?.filter((o: ArbitrageOpportunity) => o.status === 'executing').length || 0,
      }));

      const strategyNames = {
        arbitrage: 'Arbitrage',
        yield_farming: 'Yield Farming',
        lending: 'Lending',
        trending_momentum: 'Trending Momentum',
        mock_arbitrage: 'Mock Arbitrage'
      };

      // Show auto-execution results if any
      if (data.autoExecutedCount > 0) {
        toast({
          title: "Auto-Execution Complete",
          description: `Automatically executed ${data.autoExecutedCount} high-profit trades`,
        });
      }

      toast({
        title: "Opportunities Updated",
        description: `${strategyNames[data.strategy as keyof typeof strategyNames] || data.strategy}: Found ${data.opportunities?.length || 0} opportunities`,
      });

    } catch (error) {
      console.error('Error scanning opportunities:', error);
      toast({
        title: "Scan Error",
        description: "Failed to scan for opportunities",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Execute arbitrage trade
  const executeTrade = useCallback(async (opportunityId: string, strategyId: string, amount: number) => {
    try {
      setIsLoading(true);

      const { data, error } = await apiClient.functions.invoke('trading-engine', {
        body: {
          action: 'execute_trade',
          data: {
            opportunityId,
            strategyId,
            amount,
            maxSlippage: 2.0
          }
        }
      });

      if (error) throw error;

      // Update opportunity status
      setOpportunities(prev => 
        prev.map(opp => 
          opp.id === opportunityId 
            ? { ...opp, status: 'executing' }
            : opp
        )
      );

      toast({
        title: "Trade Executed",
        description: `Executed real trade for ${amount} tokens`,
        variant: data.success ? "default" : "destructive",
      });

      // Refresh portfolio status
      await getPortfolioStatus();

      return data;

    } catch (error) {
      console.error('Error executing trade:', error);
      toast({
        title: "Execution Error",
        description: "Failed to execute trade",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Get portfolio status
  const getPortfolioStatus = useCallback(async () => {
    try {
      const { data, error } = await apiClient.functions.invoke('trading-engine', {
        body: {
          action: 'get_portfolio_status'
        }
      });

      if (error) throw error;

      setTradingStats(prev => ({
        ...prev,
        profitToday: data.portfolio.totalProfit,
        successRate: data.portfolio.successRate,
        totalVolume: data.portfolio.totalVolume || prev.totalVolume,
        avgProfitPercent: data.portfolio.avgProfitPercent || prev.avgProfitPercent
      }));

      return data;

    } catch (error) {
      console.error('Error getting portfolio status:', error);
    }
  }, []);

  // Toggle engine state
  const toggleEngine = useCallback(async () => {
    const newState = !isEngineActive;
    setIsEngineActive(newState);

    if (newState) {
      // Start scanning when engine is activated
      await scanOpportunities();

      toast({
        title: "Engine Started",
        description: "ARB Creative Engine is now scanning for opportunities",
      });
    } else {
      toast({
        title: "Engine Stopped", 
        description: "ARB Creative Engine has been paused",
      });
    }
  }, [isEngineActive, scanOpportunities, toast]);

  // Get AI strategy recommendation
  const getAIRecommendation = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await apiClient.functions.invoke('ai-strategy-selector', {
        body: {
          marketConditions: {
            volatility: Math.random() * 100,
            volume: Math.random() * 100,
            gasPrice: Math.random() * 100,
            liquidityDepth: Math.random() * 100,
            spreadTightness: Math.random() * 100
          },
          availableOpportunities: opportunities
        }
      });

      if (error) throw error;

      setAiRecommendation({
        recommendedStrategy: data.executionPriority,
        confidence: data.recommendedStrategies[0]?.confidence || 0,
        allocation: data.recommendedStrategies[0]?.recommendedAllocation || 0,
        marketSentiment: data.marketSentiment,
        riskLevel: data.riskLevel
      });

    } catch (error) {
      console.error('Error getting AI recommendation:', error);
    }
  }, [opportunities]);

  // Handle trade execution with updated logic
  const handleExecuteTrade = async (opportunityId: string) => {
    try {
      // Determine strategy based on opportunity type
      const opportunity = opportunities.find(o => o.id === opportunityId);
      if (!opportunity) {
        throw new Error('Opportunity not found');
      }

      let strategyId = 'cross_exchange'; // Default
      if (opportunity.id.startsWith('momentum-')) {
        strategyId = 'trending_momentum';
      } else if (opportunity.id.startsWith('yield-')) {
        strategyId = 'yield_farming';
      } else {
        strategyId = 'flash_loan';
      }

      // Use very small amounts for live trading with real money
      const maxAmount = Math.min(opportunity.volume_available * 0.01, 1);
      const tradeAmount = Math.max(maxAmount, 0.01); // Minimum viable trade amount

      const { data, error } = await apiClient.functions.invoke('trading-engine', {
        body: {
          action: 'execute_trade',
          data: {
            opportunityId,
            strategyId,
            amount: tradeAmount,
            maxSlippage: 2
          }
        }
      });

      if (error) {
        toast({
          title: "Trade Execution Failed",
          description: error.message || "An unknown error occurred.",
          variant: "destructive",
        });
        return;
      }

      // Update opportunity status and potentially other states
      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === opportunityId
            ? { ...opp, status: 'executing' }
            : opp
        )
      );

      toast({
        title: "Trade Executed",
        description: `Trade for ${tradeAmount} tokens initiated successfully.`,
        variant: "default",
      });

      // Refresh portfolio status after trade execution
      await getPortfolioStatus();

      setSelectedOpportunity(null); // Clear selection after execution
    } catch (error) {
      console.error('Trade execution failed:', error);
      toast({
        title: "Trade Execution Error",
        description: "An error occurred during trade execution.",
        variant: "destructive",
      });
    }
  };


  // AI-driven automatic trading with continuous monitoring
  useEffect(() => {
    if (!isEngineActive) return;

    const interval = setInterval(() => {
      scanOpportunities();
      getPortfolioStatus();
    }, 5000); // Refresh every 5 seconds for aggressive AI auto-execution

    return () => clearInterval(interval);
  }, [isEngineActive, scanOpportunities, getPortfolioStatus]);

  // AI monitoring for immediate execution of high-profit opportunities
  useEffect(() => {
    if (!isEngineActive) return;

    const aggressiveInterval = setInterval(async () => {
      try {
        // Quick scan for immediate high-profit opportunities
        const { data } = await apiClient.functions.invoke('trading-engine', {
          body: { action: 'scan_opportunities' }
        });

        if (data?.opportunities) {
          const urgentOpportunities = data.opportunities.filter((opp: ArbitrageOpportunity) => 
            opp.profit_percentage > 3 && opp.risk_score <= 2
          );

          // Auto-execute urgent opportunities immediately
          for (const opp of urgentOpportunities) {
            if (opp.status === 'discovered') {
              console.log(`AI auto-executing urgent opportunity: ${opp.id} with ${opp.profit_percentage}% profit`);
              
              try {
                await apiClient.functions.invoke('trading-engine', {
                  body: {
                    action: 'execute_trade',
                    data: {
                      opportunityId: opp.id,
                      strategyId: 'ai_urgent',
                      amount: Math.min(opp.volume_available * 0.1, 2.0),
                      maxSlippage: 2.5
                    }
                  }
                });
              } catch (execError) {
                console.error('AI urgent execution failed:', execError);
              }
            }
          }
        }
      } catch (error) {
        console.error('AI monitoring error:', error);
      }
    }, 3000); // Every 3 seconds for urgent opportunities

    return () => clearInterval(aggressiveInterval);
  }, [isEngineActive]);

  // Initial load
  useEffect(() => {
    getPortfolioStatus();
  }, [getPortfolioStatus]);

  return {
    // State
    isEngineActive,
    opportunities,
    tradingStats,
    aiRecommendation,
    isLoading,
    lastUpdate,
    currentStrategy,
    selectedOpportunity, // Expose selectedOpportunity

    // Actions
    toggleEngine,
    scanOpportunities,
    executeTrade,
    getPortfolioStatus,
    getAIRecommendation,
    handleExecuteTrade // Expose handleExecuteTrade
  };
}