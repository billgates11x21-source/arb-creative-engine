import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  Activity, 
  RefreshCw,
  Zap,
  Target,
  BarChart3 
} from "lucide-react";

interface AIRecommendation {
  recommendedStrategy: string;
  confidence: number;
  allocation: number;
  marketSentiment: string;
  riskLevel: string;
}

interface AIStrategyPanelProps {
  recommendation: AIRecommendation | null;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

export function AIStrategyPanel({ recommendation, onRefresh, isLoading }: AIStrategyPanelProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toUpperCase()) {
      case 'BULLISH': return 'text-neon-green';
      case 'NEUTRAL': return 'text-neon-cyan';
      case 'CAUTIOUS': return 'text-neon-orange';
      case 'BEARISH': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'LOW': return 'text-neon-green';
      case 'MEDIUM': return 'text-neon-orange';
      case 'HIGH': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2 neon-text">
            AI Strategy Intelligence
          </h2>
          <p className="text-muted-foreground">
            Advanced machine learning analysis for optimal arbitrage strategy selection
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          className="neon-border"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
      </div>

      {recommendation ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Recommendation */}
          <Card className="glass-card p-6 profit-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Recommended Strategy</h3>
                <p className="text-sm text-muted-foreground">AI-selected optimal approach</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Strategy</span>
                  <Badge variant="default" className="neon-text">
                    <Zap className="w-3 h-3 mr-1" />
                    {recommendation.recommendedStrategy}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Confidence</span>
                  <span className="text-lg font-bold text-neon-green">
                    {recommendation.confidence.toFixed(1)}%
                  </span>
                </div>
                
                <Progress 
                  value={recommendation.confidence} 
                  className="w-full h-2 mb-4"
                />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recommended Allocation</span>
                  <span className="text-lg font-bold text-neon-cyan">
                    {recommendation.allocation}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-neon-green" />
                  <span className="text-sm">Expected Performance</span>
                </div>
                <Badge variant="secondary" className="text-neon-green">
                  HIGH PROBABILITY
                </Badge>
              </div>
            </div>
          </Card>

          {/* Market Analysis */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Market Analysis</h3>
                <p className="text-sm text-muted-foreground">Current market conditions</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Market Sentiment</span>
                <Badge 
                  variant="outline" 
                  className={`neon-border ${getSentimentColor(recommendation.marketSentiment)}`}
                >
                  <Activity className="w-3 h-3 mr-1" />
                  {recommendation.marketSentiment}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Level</span>
                <Badge 
                  variant="outline"
                  className={`neon-border ${getRiskColor(recommendation.riskLevel)}`}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {recommendation.riskLevel}
                </Badge>
              </div>
              
              <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  AI Insights
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Market volatility favors flash loan strategies</li>
                  <li>• High liquidity depth detected across major DEXs</li>
                  <li>• Gas prices within optimal range for execution</li>
                  <li>• BTC/ETH allocation within 80/20 compliance</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="glass-card p-12 text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">AI Analysis Pending</h3>
          <p className="text-muted-foreground mb-4">
            Click refresh to get AI-powered strategy recommendations
          </p>
          <Button onClick={onRefresh} disabled={isLoading}>
            <Brain className="w-4 h-4 mr-2" />
            Start AI Analysis
          </Button>
        </Card>
      )}

      {/* Strategy Comparison */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Strategy Performance Comparison
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Flash Loan', success: 94, profit: 2.8, active: true },
            { name: 'Triangular', success: 87, profit: 1.9, active: false },
            { name: 'Cross-Exchange', success: 91, profit: 2.1, active: false },
            { name: 'Liquidity Pool', success: 82, profit: 1.4, active: false }
          ].map((strategy) => (
            <div 
              key={strategy.name}
              className={`p-4 rounded-lg border ${
                strategy.active 
                  ? 'border-primary bg-primary/10 neon-border' 
                  : 'border-border bg-muted/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{strategy.name}</h4>
                {strategy.active && (
                    <Badge variant="default">
                      <Zap className="w-3 h-3" />
                    </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="text-neon-green">{strategy.success}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Avg Profit</span>
                  <span className="text-neon-cyan">{strategy.profit}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}