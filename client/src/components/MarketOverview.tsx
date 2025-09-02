import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";

interface MarketStats {
  totalOpportunities: number;
  activeArbitrage: number;
  totalVolume: number;
  profitToday: number;
  successRate: number;
  avgProfitPercent: number;
}

interface MarketOverviewProps {
  stats: MarketStats;
}

export function MarketOverview({ stats }: MarketOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="glass-card p-6 pulse-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Active Opportunities</p>
            <p className="text-3xl font-bold text-neon-cyan neon-text">
              {stats.totalOpportunities}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-neon-cyan" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-neon-green" />
          <span className="text-sm text-neon-green">+12% from yesterday</span>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Today's Profit</p>
            <p className="text-3xl font-bold text-neon-green neon-text">
              ${stats.profitToday?.toLocaleString() || "0"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-neon-green" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-neon-green" />
          <span className="text-sm text-neon-green">
            {(stats.avgProfitPercent || 0).toFixed(1)}% avg profit
          </span>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
            <p className="text-3xl font-bold text-neon-purple neon-text">
              {stats.successRate}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-neon-purple" />
          </div>
        </div>
        <div className="mt-4">
          <Badge variant="secondary" className="text-neon-purple">
            {stats.activeArbitrage} active trades
          </Badge>
        </div>
      </Card>

      <Card className="glass-card p-6 lg:col-span-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              24H Trading Volume
            </h3>
            <p className="text-4xl font-bold text-neon-orange neon-text">
              ${stats.totalVolume?.toLocaleString() || "0"}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">BTC/ETH</p>
              <p className="text-lg font-semibold text-neon-cyan">80%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Alts</p>
              <p className="text-lg font-semibold text-neon-purple">20%</p>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary rounded-full" style={{ width: '80%' }} />
        </div>
      </Card>
    </div>
  );
}