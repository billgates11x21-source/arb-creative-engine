import { ArbitrageOpportunity } from './trading-strategies';

export interface RiskConfiguration {
  maxDailyLoss: number;
  maxPositionSize: number;
  maxConcurrentTrades: number;
  maxSlippage: number;
  minLiquidityThreshold: number;
  maxGasPrice: number;
  emergencyStopThreshold: number;
  portfolioAllocation: {
    btc: number;
    eth: number;
    stablecoins: number;
    altcoins: number;
    defi: number;
  };
  chainRiskWeights: {
    ethereum: number;
    polygon: number;
    bsc: number;
    arbitrum: number;
    optimism: number;
    base: number;
    avalanche: number;
  };
}

export interface RiskMetrics {
  currentDailyLoss: number;
  portfolioBalance: number;
  activePositions: number;
  volatilityIndex: number;
  liquidityScore: number;
  exposureByChain: { [chain: string]: number };
  exposureByToken: { [token: string]: number };
  riskScore: number;
}

export interface PortfolioOptimization {
  optimalPositionSize: number;
  recommendedExposure: number;
  riskAdjustedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  diversificationScore: number;
}

export class AdvancedRiskManager {
  private config: RiskConfiguration = {
    maxDailyLoss: 500, // $500 max daily loss
    maxPositionSize: 1000, // $1000 max per position
    maxConcurrentTrades: 10,
    maxSlippage: 3.0, // 3% max slippage
    minLiquidityThreshold: 10000, // $10k minimum liquidity
    maxGasPrice: 100, // 100 gwei max
    emergencyStopThreshold: 0.15, // 15% portfolio loss triggers emergency stop
    portfolioAllocation: {
      btc: 0.30, // 30% Bitcoin
      eth: 0.25, // 25% Ethereum
      stablecoins: 0.25, // 25% Stablecoins
      altcoins: 0.15, // 15% Altcoins
      defi: 0.05  // 5% DeFi tokens
    },
    chainRiskWeights: {
      ethereum: 1.0,    // Lowest risk
      arbitrum: 1.1,    // Slightly higher risk
      optimism: 1.1,    // Similar to Arbitrum
      base: 1.2,        // Higher risk (newer chain)
      polygon: 1.3,     // Higher risk
      bsc: 1.4,         // Higher risk
      avalanche: 1.5    // Highest risk
    }
  };

  private currentMetrics: RiskMetrics = {
    currentDailyLoss: 0,
    portfolioBalance: 10000,
    activePositions: 0,
    volatilityIndex: 0.5,
    liquidityScore: 0.8,
    exposureByChain: {},
    exposureByToken: {},
    riskScore: 0
  };

  // Advanced Risk Assessment Algorithm
  assessOpportunityRisk(opportunity: ArbitrageOpportunity): {
    riskScore: number;
    riskFactors: string[];
    recommendation: 'execute' | 'reduce_size' | 'reject';
    adjustedPositionSize: number;
    reasoning: string;
  } {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // 1. Liquidity Risk Assessment
    if (opportunity.liquidityScore < 0.3) {
      riskScore += 25;
      riskFactors.push('Low liquidity');
    } else if (opportunity.liquidityScore < 0.6) {
      riskScore += 10;
      riskFactors.push('Medium liquidity');
    }

    // 2. Slippage Risk
    const estimatedSlippage = this.calculateSlippage(opportunity);
    if (estimatedSlippage > this.config.maxSlippage) {
      riskScore += 30;
      riskFactors.push(`High slippage (${estimatedSlippage.toFixed(2)}%)`);
    }

    // 3. Gas Price Risk
    const gasPrice = opportunity.gasEstimate / 1000000; // Convert to approximate gwei
    if (gasPrice > this.config.maxGasPrice) {
      riskScore += 15;
      riskFactors.push(`High gas price (${gasPrice.toFixed(0)} gwei)`);
    }

    // 4. Execution Time Risk
    if (opportunity.executionTime > 60) {
      riskScore += 20;
      riskFactors.push('Long execution time');
    }

    // 5. Cross-Chain Risk
    if (opportunity.strategy === 'cross_chain_arbitrage') {
      riskScore += 35;
      riskFactors.push('Cross-chain bridge risk');
    }

    // 6. Flash Loan Risk
    if (opportunity.strategy === 'flash_loan_arbitrage') {
      riskScore += 15;
      riskFactors.push('Flash loan complexity');
    }

    // 7. Market Volatility Impact
    const volatilityMultiplier = 1 + (this.currentMetrics.volatilityIndex * 0.5);
    riskScore *= volatilityMultiplier;

    // 8. Portfolio Concentration Risk
    const tokenExposure = this.currentMetrics.exposureByToken[opportunity.token] || 0;
    if (tokenExposure > 0.4) { // More than 40% exposure to single token
      riskScore += 25;
      riskFactors.push('High token concentration');
    }

    // Determine recommendation
    let recommendation: 'execute' | 'reduce_size' | 'reject';
    let adjustedPositionSize = opportunity.amount;
    let reasoning = '';

    if (riskScore <= 30) {
      recommendation = 'execute';
      reasoning = 'Low risk opportunity suitable for full execution';
    } else if (riskScore <= 60) {
      recommendation = 'reduce_size';
      adjustedPositionSize *= 0.5; // Reduce position by 50%
      reasoning = 'Medium risk - recommend reducing position size';
    } else {
      recommendation = 'reject';
      adjustedPositionSize = 0;
      reasoning = 'High risk - reject opportunity';
    }

    // Apply additional position sizing constraints
    adjustedPositionSize = Math.min(
      adjustedPositionSize,
      this.config.maxPositionSize,
      this.currentMetrics.portfolioBalance * 0.1 // Max 10% of portfolio per trade
    );

    return {
      riskScore,
      riskFactors,
      recommendation,
      adjustedPositionSize,
      reasoning
    };
  }

  // Dynamic Position Sizing Algorithm
  calculateOptimalPositionSize(
    opportunity: ArbitrageOpportunity,
    portfolioBalance: number
  ): PortfolioOptimization {
    
    // Kelly Criterion for optimal position sizing
    const winProbability = opportunity.confidence / 100;
    const expectedReturn = opportunity.profitPercentage;
    const maxLoss = 0.05; // Assume max 5% loss on failed trade
    
    // Kelly formula: f = (bp - q) / b
    // where f = fraction to bet, b = odds, p = win probability, q = loss probability
    const kellyFraction = ((expectedReturn * winProbability) - (1 - winProbability)) / expectedReturn;
    const conservativeKelly = Math.max(0, Math.min(kellyFraction * 0.5, 0.25)); // Cap at 25% and use half-Kelly
    
    // Risk-adjusted position size
    const basePosition = portfolioBalance * conservativeKelly;
    const liquidityAdjustment = Math.min(1, opportunity.liquidityScore * 2);
    const volatilityAdjustment = Math.max(0.3, 1 - this.currentMetrics.volatilityIndex);
    
    const optimalPositionSize = basePosition * liquidityAdjustment * volatilityAdjustment;
    
    // Calculate risk-adjusted metrics
    const riskAdjustedReturn = expectedReturn * (1 - (opportunity.riskLevel / 10));
    const sharpeRatio = riskAdjustedReturn / (this.currentMetrics.volatilityIndex || 0.1);
    const maxDrawdown = Math.max(0.05, opportunity.riskLevel * 0.02);
    
    // Portfolio diversification score
    const diversificationScore = this.calculateDiversificationScore();
    
    return {
      optimalPositionSize: Math.min(optimalPositionSize, this.config.maxPositionSize),
      recommendedExposure: optimalPositionSize / portfolioBalance,
      riskAdjustedReturn,
      sharpeRatio,
      maxDrawdown,
      diversificationScore
    };
  }

  // Multi-Chain Risk Assessment
  assessChainRisk(chain: string, amount: number): {
    chainRiskScore: number;
    safeAmount: number;
    riskFactors: string[];
  } {
    const riskWeight = (this.config.chainRiskWeights as any)[chain] || 2.0;
    const currentExposure = this.currentMetrics.exposureByChain[chain] || 0;
    const maxChainExposure = this.currentMetrics.portfolioBalance * 0.4; // Max 40% per chain
    
    const riskFactors: string[] = [];
    let chainRiskScore = (riskWeight - 1) * 50; // Base risk from chain
    
    // Exposure concentration risk
    if (currentExposure + amount > maxChainExposure) {
      chainRiskScore += 30;
      riskFactors.push('High chain concentration');
    }
    
    // Chain-specific risks
    if (chain === 'bsc') {
      chainRiskScore += 15;
      riskFactors.push('BSC centralization risk');
    }
    if (chain === 'avalanche') {
      chainRiskScore += 10;
      riskFactors.push('Avalanche subnet risks');
    }
    if (chain === 'base') {
      chainRiskScore += 20;
      riskFactors.push('Base network maturity risk');
    }
    
    // Calculate safe amount
    const safeAmount = Math.min(
      amount,
      Math.max(0, maxChainExposure - currentExposure)
    );
    
    return {
      chainRiskScore,
      safeAmount,
      riskFactors
    };
  }

  // Portfolio Rebalancing Algorithm
  calculateRebalancing(): {
    rebalanceNeeded: boolean;
    targetAllocations: { [token: string]: number };
    rebalanceActions: Array<{
      token: string;
      action: 'buy' | 'sell';
      amount: number;
      priority: 'high' | 'medium' | 'low';
    }>;
  } {
    const currentAllocations = this.getCurrentAllocations();
    const rebalanceActions: Array<{
      token: string;
      action: 'buy' | 'sell';
      amount: number;
      priority: 'high' | 'medium' | 'low';
    }> = [];
    
    let rebalanceNeeded = false;
    
    // Check if any allocation is more than 5% away from target
    for (const [category, targetPct] of Object.entries(this.config.portfolioAllocation)) {
      const currentPct = currentAllocations[category] || 0;
      const deviation = Math.abs(currentPct - targetPct);
      
      if (deviation > 0.05) { // 5% deviation threshold
        rebalanceNeeded = true;
        
        const priority = deviation > 0.15 ? 'high' : deviation > 0.10 ? 'medium' : 'low';
        const amount = Math.abs(currentPct - targetPct) * this.currentMetrics.portfolioBalance;
        
        rebalanceActions.push({
          token: category,
          action: currentPct > targetPct ? 'sell' : 'buy',
          amount,
          priority
        });
      }
    }
    
    return {
      rebalanceNeeded,
      targetAllocations: this.config.portfolioAllocation,
      rebalanceActions
    };
  }

  // Emergency Stop Conditions
  checkEmergencyConditions(): {
    shouldStop: boolean;
    reasons: string[];
    severity: 'warning' | 'critical';
    recommendedActions: string[];
  } {
    const reasons: string[] = [];
    const recommendedActions: string[] = [];
    let shouldStop = false;
    let severity: 'warning' | 'critical' = 'warning';
    
    // Daily loss threshold
    if (this.currentMetrics.currentDailyLoss > this.config.maxDailyLoss) {
      shouldStop = true;
      severity = 'critical';
      reasons.push(`Daily loss exceeded: $${this.currentMetrics.currentDailyLoss}`);
      recommendedActions.push('Stop all trading immediately');
    }
    
    // Portfolio drawdown
    const drawdownPct = this.currentMetrics.currentDailyLoss / this.currentMetrics.portfolioBalance;
    if (drawdownPct > this.config.emergencyStopThreshold) {
      shouldStop = true;
      severity = 'critical';
      reasons.push(`Portfolio drawdown: ${(drawdownPct * 100).toFixed(1)}%`);
      recommendedActions.push('Emergency portfolio protection activated');
    }
    
    // Too many concurrent positions
    if (this.currentMetrics.activePositions > this.config.maxConcurrentTrades) {
      shouldStop = true;
      reasons.push(`Too many active positions: ${this.currentMetrics.activePositions}`);
      recommendedActions.push('Wait for positions to close');
    }
    
    // Extreme volatility
    if (this.currentMetrics.volatilityIndex > 0.8) {
      severity = 'warning';
      reasons.push('High market volatility detected');
      recommendedActions.push('Reduce position sizes');
    }
    
    return {
      shouldStop,
      reasons,
      severity,
      recommendedActions
    };
  }

  // Real-time Risk Monitoring
  updateRiskMetrics(
    dailyPnL: number,
    portfolioBalance: number,
    activePositions: number,
    marketVolatility: number
  ): void {
    this.currentMetrics.currentDailyLoss = Math.max(0, -dailyPnL);
    this.currentMetrics.portfolioBalance = portfolioBalance;
    this.currentMetrics.activePositions = activePositions;
    this.currentMetrics.volatilityIndex = marketVolatility;
    
    // Calculate overall risk score
    let riskScore = 0;
    riskScore += (this.currentMetrics.currentDailyLoss / this.config.maxDailyLoss) * 40;
    riskScore += (activePositions / this.config.maxConcurrentTrades) * 20;
    riskScore += marketVolatility * 30;
    riskScore += (1 - this.currentMetrics.liquidityScore) * 10;
    
    this.currentMetrics.riskScore = Math.min(100, riskScore);
  }

  // Private helper methods
  private calculateSlippage(opportunity: ArbitrageOpportunity): number {
    // Estimate slippage based on liquidity and trade size
    const baseSlippage = 0.1; // 0.1% base slippage
    const liquidityImpact = (1 - opportunity.liquidityScore) * 2; // 0-2% based on liquidity
    const sizeImpact = (opportunity.amount / 1000) * 0.5; // Size impact
    
    return baseSlippage + liquidityImpact + sizeImpact;
  }
  
  private getCurrentAllocations(): { [category: string]: number } {
    // This would fetch real portfolio allocations
    return {
      btc: 0.35,
      eth: 0.30,
      stablecoins: 0.20,
      altcoins: 0.10,
      defi: 0.05
    };
  }
  
  private calculateDiversificationScore(): number {
    // Simplified diversification score calculation
    const allocations = Object.values(this.getCurrentAllocations());
    const herfindahlIndex = allocations.reduce((sum, alloc) => sum + (alloc * alloc), 0);
    return Math.max(0, 1 - herfindahlIndex); // Higher score = better diversification
  }

  // Public getters for configuration
  getRiskConfig(): RiskConfiguration {
    return { ...this.config };
  }
  
  getCurrentMetrics(): RiskMetrics {
    return { ...this.currentMetrics };
  }
  
  updateConfig(updates: Partial<RiskConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }
}

export const riskManager = new AdvancedRiskManager();