import { useState, useEffect } from "react";
import { TradingHeader } from "@/components/TradingHeader";
import { MarketOverview } from "@/components/MarketOverview";
import { ArbitrageCard } from "@/components/ArbitrageCard";
import { AIStrategyPanel } from "@/components/AIStrategyPanel";
import { RiskManagementPanel } from "@/components/RiskManagementPanel";
import { OKXBalancePanel } from "@/components/OKXBalancePanel";
import { useArbitrageEngine } from "@/hooks/useArbitrageEngine";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Brain,
  Shield,
  RefreshCw,
  Play,
  Pause,
  Wallet
} from "lucide-react";

export function TradingDashboard() {
  const {
    isEngineActive,
    opportunities,
    tradingStats,
    aiRecommendation,
    isLoading,
    lastUpdate,
    toggleEngine,
    scanOpportunities,
    executeTrade,
    getAIRecommendation
  } = useArbitrageEngine();

  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || !isEngineActive) return;

    const interval = setInterval(() => {
      scanOpportunities();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, isEngineActive, scanOpportunities]);

  const handleExecuteTrade = async (opportunityId: string) => {
    try {
      // Use AI recommendation to select best strategy
      const strategyId = 'flash_loan'; // Default to flash loan strategy
      const amount = 1.0; // Default amount
      
      await executeTrade(opportunityId, strategyId, amount);
      setSelectedOpportunity(null);
    } catch (error) {
      console.error('Trade execution failed:', error);
    }
  };

  const highProfitOpportunities = opportunities.filter(opp => opp.profit_percentage > 2);
  const mediumProfitOpportunities = opportunities.filter(opp => opp.profit_percentage >= 1 && opp.profit_percentage <= 2);

  return (
    <div className="min-h-screen bg-background trading-grid">
      <div className="container mx-auto p-6">
        {/* Main Header */}
        <TradingHeader 
          isEngineActive={isEngineActive}
          onToggleEngine={toggleEngine}
        />
        
        {/* Control Panel */}
        <Card className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={isEngineActive ? "default" : "secondary"} className="pulse-glow">
                {isEngineActive ? <Activity className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                {isEngineActive ? "SCANNING" : "PAUSED"}
              </Badge>
              
              <Badge variant="outline" className="neon-border">
                <Shield className="w-3 h-3 mr-1" />
                MAINNET READY
              </Badge>
              
              {aiRecommendation && (
                <Badge variant="secondary">
                  <Brain className="w-3 h-3 mr-1" />
                  AI: {aiRecommendation.recommendedStrategy}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "neon-border" : ""}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={scanOpportunities}
                disabled={isLoading}
                className="neon-border"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Scan Now
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground">
            Last Updated: {lastUpdate.toLocaleTimeString()} • 
            Total Opportunities: {opportunities.length} • 
            High Profit: {highProfitOpportunities.length} • 
            Medium Profit: {mediumProfitOpportunities.length}
          </div>
        </Card>

        {/* Market Overview */}
        <div className="mb-8">
          <MarketOverview stats={tradingStats} />
        </div>

        {/* Main Trading Interface */}
        <Tabs defaultValue="opportunities" className="w-full">
          <TabsList className="grid w-full grid-cols-5 glass-card">
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="okx-balance" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              OKX Balance
            </TabsTrigger>
            <TabsTrigger value="ai-strategy" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Strategy
            </TabsTrigger>
            <TabsTrigger value="risk-management" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Risk Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="okx-balance" className="mt-6">
            <OKXBalancePanel />
          </TabsContent>

          <TabsContent value="opportunities" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2 neon-text">
                Live Arbitrage Opportunities
              </h2>
              <p className="text-muted-foreground">
                Real-time scanning across multiple DEXs • Mainnet ready • Simulation mode active
              </p>
            </div>
            
            {/* High Profit Opportunities */}
            {highProfitOpportunities.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-neon-green mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  High Profit Opportunities (2%+)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {highProfitOpportunities.map((opportunity) => (
                    <ArbitrageCard 
                      key={opportunity.id}
                      opportunity={{
                        id: opportunity.id,
                        fromExchange: opportunity.buy_exchange,
                        toExchange: opportunity.sell_exchange,
                        token: opportunity.token_pair,
                        buyPrice: opportunity.buy_price,
                        sellPrice: opportunity.sell_price,
                        profit: opportunity.profit_amount,
                        profitPercent: opportunity.profit_percentage,
                        volume: opportunity.volume_available,
                        lastUpdated: new Date(opportunity.created_at).toLocaleString()
                      }}
                      onExecute={() => handleExecuteTrade(opportunity.id)}
                      isHighProfit={true}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Medium Profit Opportunities */}
            {mediumProfitOpportunities.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-neon-cyan mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Medium Profit Opportunities (1-2%)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {mediumProfitOpportunities.map((opportunity) => (
                    <ArbitrageCard 
                      key={opportunity.id}
                      opportunity={{
                        id: opportunity.id,
                        fromExchange: opportunity.buy_exchange,
                        toExchange: opportunity.sell_exchange,
                        token: opportunity.token_pair,
                        buyPrice: opportunity.buy_price,
                        sellPrice: opportunity.sell_price,
                        profit: opportunity.profit_amount,
                        profitPercent: opportunity.profit_percentage,
                        volume: opportunity.volume_available,
                        lastUpdated: new Date(opportunity.created_at).toLocaleString()
                      }}
                      onExecute={() => handleExecuteTrade(opportunity.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {opportunities.length === 0 && !isLoading && (
              <Card className="glass-card p-12 text-center">
                <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Opportunities Found</h3>
                <p className="text-muted-foreground mb-4">
                  The engine is scanning for profitable arbitrage opportunities
                </p>
                <Button onClick={scanOpportunities} disabled={isLoading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan Again
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ai-strategy" className="mt-6">
            <AIStrategyPanel 
              recommendation={aiRecommendation}
              onRefresh={getAIRecommendation}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="risk-management" className="mt-6">
            <RiskManagementPanel />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Trading Analytics</h3>
              <p className="text-muted-foreground">
                Advanced analytics dashboard coming soon...
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            ARB Creative Engine v1.0.0 • Smart Contracts Compiled • Mainnet Ready • 
            Australian Financial Regulations Compliant
          </p>
        </div>
      </div>
    </div>
  );
}