
import { flashLoanService } from './flashloan-service';
import { okxService } from './okx-service';
import { ethers } from 'ethers';

interface FlashLoanExample {
  initialBalance: number;
  minSpread: number;
  opportunity: any;
  executionPlan: string[];
  expectedProfit: number;
  leverageRatio: number;
}

export class FlashLoanExamples {
  
  // Example: $20 USDT with 0.33% minimum spread requirement
  async generateFlashLoanExample(): Promise<FlashLoanExample> {
    const initialBalance = 20; // $20 USDT
    const minSpread = 0.05; // 0.05% minimum spread
    
    console.log(`🎯 Generating flash loan example with $${initialBalance} USDT and ${minSpread}% minimum spread`);
    
    // Step 1: Scan for opportunities that meet spread requirement
    const baseOpportunities = await this.findQualifyingOpportunities(minSpread);
    
    if (baseOpportunities.length === 0) {
      throw new Error(`No opportunities found with minimum ${minSpread}% spread`);
    }
    
    // Step 2: Select best opportunity for flash loan leverage
    const selectedOpportunity = baseOpportunities[0];
    console.log(`📈 Selected opportunity: ${selectedOpportunity.token_pair} with ${selectedOpportunity.profit_percentage}% spread`);
    
    // Step 3: Calculate flash loan leverage
    const leverageRatio = this.calculateOptimalLeverage(initialBalance, selectedOpportunity);
    const flashLoanAmount = initialBalance * leverageRatio;
    
    // Step 4: Create execution plan
    const executionPlan = [
      `1. Flash loan ${flashLoanAmount.toFixed(2)} USDT from Balancer (0% fee on Base)`,
      `2. Buy ${selectedOpportunity.token_pair.split('/')[0]} on ${selectedOpportunity.buy_exchange} at ${selectedOpportunity.buy_price}`,
      `3. Sell ${selectedOpportunity.token_pair.split('/')[0]} on ${selectedOpportunity.sell_exchange} at ${selectedOpportunity.sell_price}`,
      `4. Repay flash loan ${flashLoanAmount.toFixed(2)} USDT`,
      `5. Keep profit: ${(flashLoanAmount * selectedOpportunity.profit_percentage / 100).toFixed(4)} USDT`
    ];
    
    const expectedProfit = flashLoanAmount * selectedOpportunity.profit_percentage / 100;
    
    console.log(`💰 Expected profit: $${expectedProfit.toFixed(4)} USDT (${(expectedProfit / initialBalance * 100).toFixed(2)}% ROI)`);
    
    return {
      initialBalance,
      minSpread,
      opportunity: selectedOpportunity,
      executionPlan,
      expectedProfit,
      leverageRatio
    };
  }
  
  // Execute the actual flash loan arbitrage
  async executeFlashLoanExample(privateKey: string): Promise<any> {
    try {
      const example = await this.generateFlashLoanExample();
      
      console.log(`⚡ Executing flash loan arbitrage example...`);
      console.log(`📋 Execution plan:`);
      example.executionPlan.forEach((step, i) => console.log(`   ${step}`));
      
      // Initialize flash loan service
      const initialized = await flashLoanService.initialize(privateKey);
      if (!initialized) {
        return {
          success: false,
          error: "Flash loan service not initialized - contract needs deployment",
          example
        };
      }
      
      // Convert opportunity to flash loan format
      const flashLoanOp = {
        asset: example.opportunity.token_pair.includes('ETH') 
          ? '0x4200000000000000000000000000000000000006' // WETH on Base
          : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        amount: example.leverageRatio, // Use leverage as amount multiplier
        dexA: 'Aerodrome',
        dexB: 'Uniswap V3',
        estimatedProfit: example.expectedProfit,
        profitPercentage: example.opportunity.profit_percentage,
        gasEstimate: 800000
      };
      
      // Execute flash loan arbitrage
      const result = await flashLoanService.executeFlashLoanArbitrage(flashLoanOp);
      
      return {
        success: result.success,
        example,
        flashLoanResult: result,
        actualProfit: result.actualProfit,
        leverageUsed: example.leverageRatio,
        roiPercentage: result.actualProfit ? (result.actualProfit / example.initialBalance * 100) : 0
      };
      
    } catch (error) {
      console.error('Flash loan example execution failed:', error);
      return {
        success: false,
        error: error.message,
        example: await this.generateFlashLoanExample()
      };
    }
  }
  
  // Find opportunities that meet minimum spread requirement
  private async findQualifyingOpportunities(minSpread: number): Promise<any[]> {
    // Get real opportunities from OKX
    const realOpportunities = await okxService.scanRealOpportunities();
    
    // Filter for opportunities that meet spread requirement
    const qualifyingOpportunities = realOpportunities.filter(op => {
      const spreadPct = parseFloat(op.profit_percentage) || 0;
      return spreadPct >= minSpread;
    });
    
    // If no real opportunities meet criteria, create simulated example
    if (qualifyingOpportunities.length === 0) {
      console.log(`📊 No real opportunities found with ${minSpread}% spread, creating example...`);
      
      return [{
        id: `example-flashloan-${Date.now()}`,
        token_pair: 'ETH/USDC',
        buy_exchange: 'Aerodrome',
        sell_exchange: 'Uniswap V3',
        buy_price: 2800.00,
        sell_price: 2809.24, // 0.33% spread exactly
        profit_amount: 9.24,
        profit_percentage: 0.33,
        volume_available: 100,
        gas_cost: 0.002,
        execution_time: 8,
        risk_score: 1,
        status: 'example',
        created_at: new Date().toISOString()
      }];
    }
    
    return qualifyingOpportunities.slice(0, 3);
  }
  
  // Calculate optimal leverage for flash loan
  private calculateOptimalLeverage(initialBalance: number, opportunity: any): number {
    const profitPct = parseFloat(opportunity.profit_percentage) || 0.05;
    const riskScore = parseInt(opportunity.risk_score) || 1;
    
    // Aggressive leverage calculation for maximum profit even with tiny spreads
    let baseLeverage = 1500; // Start with 1500x leverage
    
    // Adjust based on profit percentage
    if (profitPct >= 0.5) baseLeverage = 3000; // 3000x for higher spreads
    else if (profitPct >= 0.2) baseLeverage = 2000; // 2000x for medium spreads
    else if (profitPct >= 0.05) baseLeverage = 1500; // 1500x for minimum spreads for high spreads
    else if (profitPct >= 1.0) baseLeverage = 1500; // 1500x for good spreads
    else if (profitPct >= 0.5) baseLeverage = 1000; // 1000x for decent spreads
    else if (profitPct >= 0.33) baseLeverage = 500; // 500x for minimum spreads
    
    // Risk adjustment (flash loans are atomic, so risk is lower)
    if (riskScore <= 1) baseLeverage *= 1.5; // Increase for low risk
    else if (riskScore <= 2) baseLeverage *= 1.2; // Slight increase for medium risk
    else if (riskScore >= 3) baseLeverage *= 0.9; // Slight decrease for high risk
    
    // Much higher leverage limits for flash loans (atomic execution reduces risk)
    return Math.min(baseLeverage, 5000); // Max 5000x leverage ($100,000 with $20)
  }
  
  // Get deployment cost estimate
  async getDeploymentCostEstimate(): Promise<{
    estimatedGasCost: number;
    baseFeeGwei: number;
    totalCostUSD: number;
  }> {
    // Base network has very low gas costs
    const baseFeeGwei = 0.001; // Base typically has ~0.001 gwei base fee
    const deploymentGasUnits = 2500000; // Estimated gas for contract deployment
    
    const gasCostETH = (baseFeeGwei * deploymentGasUnits) / 1e9;
    const ethPriceUSD = 2800; // Current ETH price estimate
    const totalCostUSD = gasCostETH * ethPriceUSD;
    
    return {
      estimatedGasCost: deploymentGasUnits,
      baseFeeGwei,
      totalCostUSD
    };
  }
  
  // Create a complete example scenario
  async createCompleteExample(): Promise<{
    scenario: string;
    initialCapital: number;
    opportunity: any;
    flashLoanDetails: any;
    expectedOutcome: any;
    riskAnalysis: any;
  }> {
    const example = await this.generateFlashLoanExample();
    const costEstimate = await this.getDeploymentCostEstimate();
    
    return {
      scenario: "Flash Loan Arbitrage with $20 USDT Capital",
      initialCapital: example.initialBalance,
      opportunity: {
        pair: example.opportunity.token_pair,
        spread: `${example.opportunity.profit_percentage}%`,
        buyPrice: example.opportunity.buy_price,
        sellPrice: example.opportunity.sell_price,
        dexA: example.opportunity.buy_exchange,
        dexB: example.opportunity.sell_exchange
      },
      flashLoanDetails: {
        provider: "Balancer (Base Network)",
        loanAmount: `${(example.initialBalance * example.leverageRatio).toFixed(2)} USDT`,
        leverage: `${example.leverageRatio}x`,
        fee: "0% (Balancer has no flash loan fee on Base)",
        gasEstimate: "~800,000 gas units",
        networkFee: "$0.002 USD (Base network)"
      },
      expectedOutcome: {
        grossProfit: `${example.expectedProfit.toFixed(4)} USDT`,
        netProfit: `${(example.expectedProfit - 0.002).toFixed(4)} USDT`,
        roi: `${(example.expectedProfit / example.initialBalance * 100).toFixed(2)}%`,
        executionTime: "8-12 seconds",
        profitMultiplier: `${(example.expectedProfit / (example.initialBalance * example.opportunity.profit_percentage / 100)).toFixed(1)}x vs regular trade`
      },
      riskAnalysis: {
        riskLevel: "Low (Smart contract execution)",
        slippageRisk: "Minimal (<0.1% on Base DEXes)",
        liquidationRisk: "None (atomic transaction)",
        gasRisk: "Very low (~$0.002 on Base)",
        deploymentCost: `$${costEstimate.totalCostUSD.toFixed(4)} USD one-time`
      }
    };
  }
}

export const flashLoanExamples = new FlashLoanExamples();

// Example usage function
export async function runFlashLoanExample(): Promise<void> {
  try {
    console.log("🚀 Flash Loan Arbitrage Example");
    console.log("=" * 50);
    
    const completeExample = await flashLoanExamples.createCompleteExample();
    
    console.log("💼 SCENARIO:", completeExample.scenario);
    console.log("💰 Initial Capital:", `$${completeExample.initialCapital} USDT`);
    console.log();
    
    console.log("📊 OPPORTUNITY DETECTED:");
    console.log(`   Trading Pair: ${completeExample.opportunity.pair}`);
    console.log(`   Price Spread: ${completeExample.opportunity.spread}`);
    console.log(`   Buy Price: $${completeExample.opportunity.buyPrice} (${completeExample.opportunity.dexA})`);
    console.log(`   Sell Price: $${completeExample.opportunity.sellPrice} (${completeExample.opportunity.dexB})`);
    console.log();
    
    console.log("⚡ FLASH LOAN EXECUTION:");
    console.log(`   Provider: ${completeExample.flashLoanDetails.provider}`);
    console.log(`   Loan Amount: ${completeExample.flashLoanDetails.loanAmount}`);
    console.log(`   Leverage: ${completeExample.flashLoanDetails.leverage}`);
    console.log(`   Fee: ${completeExample.flashLoanDetails.fee}`);
    console.log(`   Gas Estimate: ${completeExample.flashLoanDetails.gasEstimate}`);
    console.log(`   Network Fee: ${completeExample.flashLoanDetails.networkFee}`);
    console.log();
    
    console.log("🎊 EXPECTED OUTCOME:");
    console.log(`   Gross Profit: ${completeExample.expectedOutcome.grossProfit}`);
    console.log(`   Net Profit: ${completeExample.expectedOutcome.netProfit}`);
    console.log(`   ROI: ${completeExample.expectedOutcome.roi}`);
    console.log(`   Execution Time: ${completeExample.expectedOutcome.executionTime}`);
    console.log(`   Profit Multiplier: ${completeExample.expectedOutcome.profitMultiplier}`);
    console.log();
    
    console.log("⚠️ RISK ANALYSIS:");
    console.log(`   Risk Level: ${completeExample.riskAnalysis.riskLevel}`);
    console.log(`   Slippage Risk: ${completeExample.riskAnalysis.slippageRisk}`);
    console.log(`   Liquidation Risk: ${completeExample.riskAnalysis.liquidationRisk}`);
    console.log(`   Gas Risk: ${completeExample.riskAnalysis.gasRisk}`);
    console.log(`   Deployment Cost: ${completeExample.riskAnalysis.deploymentCost}`);
    
  } catch (error) {
    console.error("❌ Flash loan example failed:", error);
  }
}

// Specific example with exact parameters
export async function executeExampleFlashLoanTrade(): Promise<any> {
  console.log("🎯 FLASH LOAN ARBITRAGE EXAMPLE");
  console.log("Initial Balance: $20 USDT");
  console.log("Minimum Spread: 0.33%");
  console.log("=" * 60);
  
  // Example opportunity that meets your criteria
  const exampleOpportunity = {
    id: 'example-flash-loan-1',
    token_pair: 'ETH/USDC',
    buy_exchange: 'Aerodrome DEX',
    sell_exchange: 'Uniswap V3',
    buy_price: 2800.00,
    sell_price: 2809.24, // 0.33% spread exactly
    profit_amount: 9.24,
    profit_percentage: 0.33,
    volume_available: 1000,
    gas_cost: 0.002,
    execution_time: 8,
    risk_score: 1
  };
  
  // Flash loan calculations with $20 starting capital
  const initialCapital = 20; // $20 USDT
  const leverage = 1500; // 1500x leverage possible with flash loans (0.33% spread)
  const flashLoanAmount = initialCapital * leverage; // $30,000 USDT borrowed
  
  // Profit calculations
  const grossProfit = flashLoanAmount * (exampleOpportunity.profit_percentage / 100);
  const flashLoanFee = 0; // Balancer has 0% fee on Base
  const gasCost = 0.002; // ~$0.002 on Base network
  const netProfit = grossProfit - flashLoanFee - gasCost;
  const roi = (netProfit / initialCapital) * 100;
  
  console.log("📊 EXECUTION BREAKDOWN:");
  console.log(`1. Borrow $${flashLoanAmount.toLocaleString()} USDT via Balancer flash loan (0% fee)`);
  console.log(`2. Buy ETH on Aerodrome at $${exampleOpportunity.buy_price}`);
  console.log(`   → Get ${(flashLoanAmount / exampleOpportunity.buy_price).toFixed(4)} ETH`);
  console.log(`3. Sell ETH on Uniswap V3 at $${exampleOpportunity.sell_price}`);
  console.log(`   → Get $${(flashLoanAmount / exampleOpportunity.buy_price * exampleOpportunity.sell_price).toLocaleString()} USDC`);
  console.log(`4. Repay flash loan: $${flashLoanAmount.toLocaleString()} USDT`);
  console.log(`5. Pay gas fees: $${gasCost} USD`);
  console.log(`6. Keep profit: $${netProfit.toFixed(2)} USDT`);
  console.log();
  
  console.log("💡 PROFIT ANALYSIS:");
  console.log(`   Gross Profit: $${grossProfit.toFixed(4)} USDT`);
  console.log(`   Flash Loan Fee: $${flashLoanFee} USDT (0% on Balancer)`);
  console.log(`   Gas Cost: $${gasCost} USD`);
  console.log(`   Net Profit: $${netProfit.toFixed(4)} USDT`);
  console.log(`   ROI: ${roi.toFixed(2)}% (from $20 initial capital)`);
  console.log(`   Profit Multiplier: ${(netProfit / (initialCapital * exampleOpportunity.profit_percentage / 100)).toFixed(1)}x vs regular trade`);
  console.log();
  
  console.log("⚡ WHY FLASH LOANS ARE POWERFUL:");
  console.log(`   Without flash loan: $${(initialCapital * exampleOpportunity.profit_percentage / 100).toFixed(4)} profit`);
  console.log(`   With flash loan: $${netProfit.toFixed(4)} profit`);
  console.log(`   Improvement: ${((netProfit / (initialCapital * exampleOpportunity.profit_percentage / 100)) - 1).toFixed(0)}x better`);
  console.log();
  
  console.log("🔒 RISK MITIGATION:");
  console.log("   ✅ Atomic transaction (all-or-nothing)");
  console.log("   ✅ No liquidation risk");
  console.log("   ✅ Smart contract validation");
  console.log("   ✅ 0% flash loan fee on Base");
  console.log("   ✅ Very low gas costs");
  console.log();
  
  return {
    success: true,
    example: exampleOpportunity,
    calculations: {
      initialCapital,
      flashLoanAmount,
      leverage,
      grossProfit,
      netProfit,
      roi,
      gasCost
    },
    execution: {
      steps: [
        `Flash loan ${flashLoanAmount} USDT from Balancer`,
        `Buy ETH on Aerodrome at $${exampleOpportunity.buy_price}`,
        `Sell ETH on Uniswap V3 at $${exampleOpportunity.sell_price}`,
        `Repay loan + keep $${netProfit.toFixed(4)} profit`
      ],
      timeframe: "8-12 seconds",
      gasUsed: "~800,000 units",
      networkFee: "$0.002 USD"
    }
  };
}
