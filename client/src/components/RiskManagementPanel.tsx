import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  AlertTriangle, 
  Settings, 
  TrendingDown,
  DollarSign,
  Activity,
  Zap,
  Target,
  Save
} from "lucide-react";

interface RiskSettings {
  maxPositionSize: number;
  maxDailyTrades: number; 
  maxDailyLoss: number;
  minProfitThreshold: number;
  maxSlippage: number;
  emergencyStopThreshold: number;
  btcEthAllocation: number;
  altAllocation: number;
}

export function RiskManagementPanel() {
  const { toast } = useToast();
  
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxPositionSize: 1.0,
    maxDailyTrades: 50,
    maxDailyLoss: 10.0,
    minProfitThreshold: 0.3,
    maxSlippage: 1.5,
    emergencyStopThreshold: 5.0,
    btcEthAllocation: 80.0,
    altAllocation: 20.0
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // In production, this would save to Supabase
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      
      toast({
        title: "Settings Saved",
        description: "Risk management settings have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save risk management settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof RiskSettings, value: any) => {
    setRiskSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const riskLevel = () => {
    const score = (
      (riskSettings.maxPositionSize / 20) * 25 +
      (riskSettings.maxSlippage / 5) * 25 +
      (riskSettings.emergencyStopThreshold / 20) * 25 +
      (riskSettings.maxDailyTrades / 200) * 25
    );
    
    if (score > 75) return { level: 'HIGH', color: 'text-destructive' };
    if (score > 50) return { level: 'MEDIUM', color: 'text-neon-orange' };
    return { level: 'LOW', color: 'text-neon-green' };
  };

  const risk = riskLevel();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2 neon-text">
            Risk Management
          </h2>
          <p className="text-muted-foreground">
            Configure trading limits and safety parameters for optimal risk control
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge 
            variant="outline" 
            className={`neon-border ${risk.color}`}
          >
            <Shield className="w-3 h-3 mr-1" />
            Risk Level: {risk.level}
          </Badge>
          
          <Button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="profit-glow"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="position-limits" className="w-full">
        <TabsList className="grid w-full grid-cols-4 glass-card">
          <TabsTrigger value="position-limits">Position Limits</TabsTrigger>
          <TabsTrigger value="trading-rules">Trading Rules</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
        </TabsList>

        <TabsContent value="position-limits" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Position Size Management
              </h3>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="maxPosition" className="text-sm font-medium">
                    Maximum Position Size (ETH)
                  </Label>
                  <div className="mt-2">
                    <Slider
                      value={[riskSettings.maxPositionSize]}
                      onValueChange={(value) => updateSetting('maxPositionSize', value[0])}
                      max={50}
                      min={1}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1 ETH</span>
                      <span className="text-neon-cyan font-mono">
                        {riskSettings.maxPositionSize} ETH
                      </span>
                      <span>50 ETH</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="minProfit" className="text-sm font-medium">
                    Minimum Profit Threshold (%)
                  </Label>
                  <div className="mt-2">
                    <Slider
                      value={[riskSettings.minProfitThreshold]}
                      onValueChange={(value) => updateSetting('minProfitThreshold', value[0])}
                      max={5}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0.1%</span>
                      <span className="text-neon-green font-mono">
                        {riskSettings.minProfitThreshold}%
                      </span>
                      <span>5%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Slippage & Execution
              </h3>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="maxSlippage" className="text-sm font-medium">
                    Maximum Slippage Tolerance (%)
                  </Label>
                  <div className="mt-2">
                    <Slider
                      value={[riskSettings.maxSlippage]}
                      onValueChange={(value) => updateSetting('maxSlippage', value[0])}
                      max={10}
                      min={0.5}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0.5%</span>
                      <span className="text-neon-orange font-mono">
                        {riskSettings.maxSlippage}%
                      </span>
                      <span>10%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="maxDailyLoss" className="text-sm font-medium">
                    Maximum Daily Loss (ETH)
                  </Label>
                  <div className="mt-2">
                    <Input
                      id="maxDailyLoss"
                      type="number"
                      value={riskSettings.maxDailyLoss}
                      onChange={(e) => updateSetting('maxDailyLoss', parseFloat(e.target.value))}
                      className="glass-card"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trading-rules" className="mt-6">
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Trading Rules & Limits
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="maxTrades" className="text-sm font-medium">
                    Maximum Daily Trades
                  </Label>
                  <Input
                    id="maxTrades"
                    type="number"
                    value={riskSettings.maxDailyTrades}
                    onChange={(e) => updateSetting('maxDailyTrades', parseInt(e.target.value))}
                    className="glass-card mt-2"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="simulation" className="text-sm font-medium">
                      Simulation Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable for testing without real trades
                    </p>
                  </div>
                  <Switch
                    id="simulation"
                    checked={riskSettings.isSimulationMode}
                    onCheckedChange={(checked) => updateSetting('isSimulationMode', checked)}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-muted/20 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Current Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Daily Trades Used:</span>
                    <span className="text-neon-cyan">3 / {riskSettings.maxDailyTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily P&L:</span>
                    <span className="text-neon-green">+$8,420</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <Badge variant={riskSettings.isSimulationMode ? "secondary" : "default"}>
                      {riskSettings.isSimulationMode ? "Simulation" : "Live"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="mt-6">
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Asset Allocation Rules (80/20 Compliance)
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium">BTC/ETH Allocation</Label>
                  <span className="text-neon-cyan font-mono">{riskSettings.btcEthAllocation}%</span>
                </div>
                <Slider
                  value={[riskSettings.btcEthAllocation]}
                  onValueChange={(value) => {
                    updateSetting('btcEthAllocation', value[0]);
                    updateSetting('altAllocation', 100 - value[0]);
                  }}
                  max={95}
                  min={50}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium">Alt Token Allocation</Label>
                  <span className="text-neon-purple font-mono">{riskSettings.altAllocation}%</span>
                </div>
                <Slider
                  value={[riskSettings.altAllocation]}
                  onValueChange={(value) => {
                    updateSetting('altAllocation', value[0]);
                    updateSetting('btcEthAllocation', 100 - value[0]);
                  }}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="mt-6 p-4 bg-gradient-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-semibold mb-2 text-primary">Balance Allocation Rules</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BTC/ETH Trading:</span>
                    <span className="text-neon-cyan font-mono">80% of balance</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BTC/ETH Fee Reserve:</span>
                    <span className="text-neon-orange font-mono">20% of balance</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alt Tokens Trading:</span>
                    <span className="text-neon-purple font-mono">90% of balance</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alt Tokens Fee Reserve:</span>
                    <span className="text-neon-green font-mono">10% of balance</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  These rules ensure proper fee reserves while maximizing trading capital efficiency 
                  based on token stability and transaction cost patterns.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="mt-6">
          <Card className="glass-card p-6 border-destructive/20">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Emergency Controls
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emergencyStop" className="text-sm font-medium">
                    Emergency Stop Loss Threshold (%)
                  </Label>
                  <div className="mt-2">
                    <Slider
                      value={[riskSettings.emergencyStopThreshold]}
                      onValueChange={(value) => updateSetting('emergencyStopThreshold', value[0])}
                      max={25}
                      min={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>5%</span>
                      <span className="text-destructive font-mono">
                        {riskSettings.emergencyStopThreshold}%
                      </span>
                      <span>25%</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <h4 className="font-semibold mb-2 text-destructive">Emergency Actions</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Immediately halt all trading operations</li>
                    <li>• Cancel pending transactions</li>
                    <li>• Notify operators via emergency channels</li>
                    <li>• Generate incident report</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  size="lg"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  EMERGENCY STOP
                </Button>
                
                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-semibold mb-2">System Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Engine Status:</span>
                      <Badge variant="secondary">
                        <Zap className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Health Check:</span>
                      <span className="text-neon-green">2 min ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Circuit Breaker:</span>
                      <span className="text-neon-green">Armed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}