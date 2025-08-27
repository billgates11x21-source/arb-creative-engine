import { useState, useEffect } from "react";
import { TradingHeader } from "@/components/TradingHeader";
import { MarketOverview } from "@/components/MarketOverview";
import { ArbitrageCard } from "@/components/ArbitrageCard";

const Index = () => {
  const [isEngineActive, setIsEngineActive] = useState(false);
  
  // Mock data for demonstration
  const marketStats = {
    totalOpportunities: 24,
    activeArbitrage: 3,
    totalVolume: 1250000,
    profitToday: 8420,
    successRate: 94.2,
    avgProfitPercent: 2.8
  };

  const mockOpportunities = [
    {
      id: "1",
      fromExchange: "Uniswap V3",
      toExchange: "OKX",
      token: "ETH/USDC",
      buyPrice: 2340.50,
      sellPrice: 2398.75,
      profit: 58.25,
      profitPercent: 2.49,
      volume: 125000,
      lastUpdated: "2 seconds ago"
    },
    {
      id: "2", 
      fromExchange: "PancakeSwap",
      toExchange: "Binance",
      token: "BTC/USDT",
      buyPrice: 43250.00,
      sellPrice: 44180.50,
      profit: 930.50,
      profitPercent: 2.15,
      volume: 89000,
      lastUpdated: "5 seconds ago"
    },
    {
      id: "3",
      fromExchange: "SushiSwap",
      toExchange: "Kraken",
      token: "MATIC/ETH",
      buyPrice: 0.000534,
      sellPrice: 0.000547,
      profit: 0.000013,
      profitPercent: 2.43,
      volume: 45000,
      lastUpdated: "1 second ago"
    },
    {
      id: "4",
      fromExchange: "Curve",
      toExchange: "OKX",
      token: "USDC/DAI",
      buyPrice: 0.9998,
      sellPrice: 1.0015,
      profit: 0.0017,
      profitPercent: 0.17,
      volume: 250000,
      lastUpdated: "8 seconds ago"
    }
  ];

  return (
    <div className="min-h-screen bg-background trading-grid">
      <div className="container mx-auto p-6">
        <TradingHeader 
          isEngineActive={isEngineActive}
          onToggleEngine={() => setIsEngineActive(!isEngineActive)}
        />
        
        <div className="mb-8">
          <MarketOverview stats={marketStats} />
        </div>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4 neon-text">
            Live Arbitrage Opportunities
          </h2>
          <p className="text-muted-foreground mb-6">
            Real-time scanning across 8 DEXs with simulation-first execution
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {mockOpportunities.map((opportunity) => (
            <ArbitrageCard 
              key={opportunity.id}
              opportunity={opportunity}
            />
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            ARB Creative Engine v0.1.0 • Regulatory Compliant • Australian Financial Regulations
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
