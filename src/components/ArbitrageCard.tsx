import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRightLeft, Zap, DollarSign } from "lucide-react";

interface ArbitrageOpportunity {
  id: string;
  fromExchange: string;
  toExchange: string;
  token: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  profitPercent: number;
  volume: number;
  lastUpdated: string;
}

interface ArbitrageCardProps {
  opportunity: ArbitrageOpportunity;
}

export function ArbitrageCard({ opportunity }: ArbitrageCardProps) {
  const isHighProfit = opportunity.profitPercent > 2;
  
  return (
    <Card className="glass-card p-6 hover:neon-border transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{opportunity.token}</h3>
            <p className="text-sm text-muted-foreground">
              {opportunity.fromExchange} → {opportunity.toExchange}
            </p>
          </div>
        </div>
        <Badge 
          variant={isHighProfit ? "default" : "secondary"}
          className={isHighProfit ? "profit-glow neon-text" : ""}
        >
          {isHighProfit && <Zap className="w-3 h-3 mr-1" />}
          +{opportunity.profitPercent.toFixed(2)}%
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Buy Price</p>
          <p className="text-lg font-mono text-neon-cyan">
            ${opportunity.buyPrice.toLocaleString()}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Sell Price</p>
          <p className="text-lg font-mono text-neon-green">
            ${opportunity.sellPrice.toLocaleString()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-neon-green" />
          <span className="text-neon-green font-mono">
            ${opportunity.profit.toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Vol: ${opportunity.volume.toLocaleString()}
        </div>
      </div>
      
      <Button 
        className="w-full neon-border bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-300"
        variant="outline"
      >
        <TrendingUp className="w-4 h-4 mr-2" />
        Execute Trade
      </Button>
      
      <div className="mt-3 text-xs text-muted-foreground text-center">
        Updated: {opportunity.lastUpdated}
      </div>
    </Card>
  );
}