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

  // WebSocket connection for real-time updates
  const [wsConnected, setWsConnected] = useState(false);


  const { toast } = useToast();

  // Scan for arbitrage opportunities
  const scanOpportunities = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await apiClient.functions.invoke('trading-engine', {
        body: { action: 'scan_opportunities' }
      }).catch(error => {
        console.error('API call failed:', error);
        return { data: null, error: { message: error.message || 'Network error' } };
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      const data = result.data;
      setOpportunities(data.opportunities || []);
      setTradingStats(data.stats || {});
      setLastUpdate(new Date());

      // Log opportunities summary
      const profitable = data.opportunities?.filter((op: any) => parseFloat(op.profit_percentage) > 0) || [];
      const executing = data.opportunities?.filter((op: any) => op.status === 'executing') || [];

      console.log(`📊 Current opportunities: ${data.opportunities?.length || 0} total, ${profitable.length} profitable, ${executing.length} executing`);

      // Auto-execute if profitable opportunities exist and none are executing
      if (profitable.length > 0 && executing.length === 0 && isEngineActive) {
        console.log(`🚀 Triggering auto-execution for ${profitable.length} opportunities`);
        await autoExecuteOpportunities();
      }

    } catch (error) {
      console.error('Error scanning opportunities:', error);
      toast({
        title: "Scan Error",
        description: `Failed to scan opportunities: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, toast, isEngineActive]);

  const autoExecuteOpportunities = useCallback(async () => {
    try {
      const result = await apiClient.functions.invoke('trading-engine', {
        body: { action: 'auto_execute_opportunities' }
      }).catch(error => {
        console.error('Auto-execution failed:', error);
        return { data: null, error: { message: error.message || 'Auto-execution error' } };
      });

      if (result.data && result.data.executed > 0) {
        console.log(`✅ Auto-executed ${result.data.executed} opportunities`);
        toast({
          title: "Auto-Execution",
          description: `Executed ${result.data.executed} profitable trades`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Auto-execution error:', error);
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
      const maxAmount = Math.min(opportunity.volume_available * 0.001, 0.1);
      const tradeAmount = Math.max(maxAmount, 0.001); // Very small minimum for live trading

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


  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔌 WebSocket connected for real-time updates');
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case 'opportunities':
                // Update opportunities in real-time
                setOpportunities(message.data.opportunities || []);
                setAiRecommendation(message.data.aiRecommendation);
                setCurrentStrategy(message.data.strategy || 'arbitrage');
                setLastUpdate(new Date());

                // Update stats
                setTradingStats(prev => ({
                  ...prev,
                  totalOpportunities: message.data.opportunities?.length || 0,
                  activeArbitrage: message.data.opportunities?.filter((o: ArbitrageOpportunity) => o.status === 'executing').length || 0,
                }));
                break;

              case 'portfolio':
                // Update portfolio stats in real-time
                setTradingStats(prev => ({
                  ...prev,
                  profitToday: message.data.portfolio.totalProfit,
                  successRate: message.data.portfolio.successRate,
                  totalVolume: message.data.portfolio.totalVolume || prev.totalVolume,
                  avgProfitPercent: message.data.portfolio.avgProfitPercent || prev.avgProfitPercent
                }));
                break;

              case 'connection':
                console.log('WebSocket connection confirmed');
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            toast({
              title: "WebSocket Error",
              description: "Failed to process incoming message.",
              variant: "destructive",
            });
          }
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected, attempting reconnect...');
          setWsConnected(false);

          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };

      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        toast({
          title: "WebSocket Connection Error",
          description: "Could not establish connection.",
          variant: "destructive",
        });
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    // Add global error handler for unhandled promise rejections
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Unhandled Promise Rejection:', event.message, event.reason);
      toast({
        title: "System Error",
        description: `An unexpected error occurred: ${event.reason?.message || event.message}`,
        variant: "destructive",
      });
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, [toast]); // Added toast to dependencies

  // Fallback polling when WebSocket is not connected (less frequent)
  useEffect(() => {
    if (!isEngineActive || wsConnected) return;

    const interval = setInterval(() => {
      scanOpportunities();
      getPortfolioStatus();
    }, 10000); // Slower fallback polling every 10 seconds

    return () => clearInterval(interval);
  }, [isEngineActive, wsConnected, scanOpportunities, getPortfolioStatus]);

  // Log execution status for monitoring
  useEffect(() => {
    if (opportunities.length > 0) {
      const profitableOpps = opportunities.filter(opp => opp.profit_percentage > 0.1);
      const executingOpps = opportunities.filter(opp => opp.status === 'executing');

      console.log(`📊 Current opportunities: ${opportunities.length} total, ${profitableOpps.length} profitable, ${executingOpps.length} executing`);

      if (profitableOpps.length > 0 && executingOpps.length === 0) {
        console.log(`⚠️ Warning: ${profitableOpps.length} profitable opportunities found but none executing`);
      }
    }
  }, [opportunities]);

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
    wsConnected, // Expose WebSocket connection status

    // Actions
    toggleEngine,
    scanOpportunities,
    executeTrade,
    getPortfolioStatus,
    getAIRecommendation,
    handleExecuteTrade // Expose handleExecuteTrade
  };
}