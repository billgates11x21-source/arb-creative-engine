import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Settings, 
  Power, 
  Zap, 
  Shield,
  TrendingUp 
} from "lucide-react";

interface TradingHeaderProps {
  isEngineActive: boolean;
  onToggleEngine: () => void;
}

export function TradingHeader({ isEngineActive, onToggleEngine }: TradingHeaderProps) {
  return (
    <header className="glass-card p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground neon-text">
              ARB Creative Engine
            </h1>
            <p className="text-muted-foreground">
              Autonomous Multi-DEX Arbitrage System
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Badge 
              variant={isEngineActive ? "default" : "secondary"}
              className={isEngineActive ? "profit-glow" : ""}
            >
              <Activity className="w-3 h-3 mr-1" />
              {isEngineActive ? "ACTIVE" : "PAUSED"}
            </Badge>
            
            <Badge variant="outline" className="neon-border">
              <Shield className="w-3 h-3 mr-1" />
              SIMULATION MODE
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="neon-border"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <Button
              variant={isEngineActive ? "destructive" : "default"}
              size="sm"
              onClick={onToggleEngine}
              className={isEngineActive ? "" : "profit-glow"}
            >
              <Power className="w-4 h-4 mr-2" />
              {isEngineActive ? "STOP" : "START"}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Flash Loans
          </p>
          <p className="text-lg font-semibold text-neon-cyan">Ready</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            DEX Connections
          </p>
          <p className="text-lg font-semibold text-neon-green">8/8</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Risk Level
          </p>
          <p className="text-lg font-semibold text-neon-orange">Low</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Gas Price
          </p>
          <p className="text-lg font-semibold text-neon-purple">23 gwei</p>
        </div>
      </div>
    </header>
  );
}