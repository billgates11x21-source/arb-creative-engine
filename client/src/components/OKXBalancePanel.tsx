import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RefreshCw, Wallet, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface OKXBalance {
  currency: string;
  available: string;
  frozen: string;
  total: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  tickerCount: number;
  lastUpdate: number | null;
}

export function OKXBalancePanel() {
  const [balance, setBalance] = useState<OKXBalance[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/trading-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_okx_balance'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setBalance(data.balance || []);
        setConnectionStatus(data.connectionStatus);
      } else {
        setError(data.error || 'Failed to fetch balance');
        setConnectionStatus(data.connectionStatus);
      }
    } catch (err) {
      setError('Network error: Unable to fetch balance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const totalUSDValue = balance.reduce((sum, item) => {
    if (item.currency === 'USDT' || item.currency === 'USDC') {
      return sum + parseFloat(item.total);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">OKX Account Balance</h2>
            <p className="text-sm text-muted-foreground">Real-time trading account overview</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBalance}
          disabled={isLoading}
          className="neon-border"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      {connectionStatus && (
        <Card className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionStatus.isConnected ? (
                <CheckCircle className="w-5 h-5 text-neon-green" />
              ) : (
                <AlertCircle className="w-5 h-5 text-neon-orange" />
              )}
              <div>
                <p className="font-semibold">
                  {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {connectionStatus.isConnected 
                    ? `Receiving data from ${connectionStatus.tickerCount} markets`
                    : 'Using fallback data - Check API configuration'
                  }
                </p>
              </div>
            </div>
            
            <Badge 
              variant={connectionStatus.isConnected ? "default" : "secondary"}
              className={connectionStatus.isConnected ? "neon-text" : ""}
            >
              {connectionStatus.isConnected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="glass-card p-4 border-destructive/50">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Connection Issue</p>
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Make sure your OKX API keys are valid and IP whitelist is configured correctly.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Total Balance Overview */}
      {totalUSDValue > 0 && (
        <Card className="glass-card p-6 profit-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total USD Balance</p>
              <p className="text-3xl font-bold text-neon-green neon-text">
                ${totalUSDValue.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-neon-green" />
            </div>
          </div>
        </Card>
      )}

      {/* Balance Details */}
      {balance.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {balance.map((item) => (
            <Card key={item.currency} className="glass-card p-4 balance-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-foreground">{item.currency}</h3>
                <Badge variant="outline" className="text-xs">
                  {parseFloat(item.total) > 0 ? 'ACTIVE' : 'EMPTY'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-mono text-neon-cyan">
                    {parseFloat(item.available).toFixed(6)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frozen:</span>
                  <span className="font-mono text-neon-orange">
                    {parseFloat(item.frozen).toFixed(6)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                  <span>Total:</span>
                  <span className="font-mono text-neon-green">
                    {parseFloat(item.total).toFixed(6)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !isLoading && !error && (
        <Card className="glass-card p-8 text-center">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No balance data available. Refresh to try again.
          </p>
        </Card>
      )}
    </div>
  );
}