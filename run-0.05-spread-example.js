
const { transactionExample } = require('./server/transaction-example');
const { flashLoanExamples } = require('./server/flashloan-examples');

async function run005SpreadExample() {
  console.log("🎯 FLASH LOAN ARBITRAGE - 0.05% SPREAD EXAMPLE");
  console.log("Initial Balance: $20 USDT");
  console.log("Minimum Spread: 0.05% (Ultra-tight spread)");
  console.log("Leverage: 1500x");
  console.log("=" * 70);
  
  // Create a detailed example with 0.05% spread
  const example = {
    // Starting position
    initialBalance: 20, // $20 USDT
    minSpread: 0.05, // 0.05% minimum spread
    leverage: 1500, // 1500x leverage
    
    // Market opportunity (real Base network scenario)
    opportunity: {
      pair: 'ETH/USDC',
      buyExchange: 'Aerodrome Finance',
      sellExchange: 'Uniswap V3 (Base)',
      buyPrice: 2800.00, // ETH price on Aerodrome
      sellPrice: 2801.40, // ETH price on Uniswap (0.05% higher)
      spread: 0.05,
      liquidity: {
        aerodrome: '$2.1M ETH/USDC',
        uniswap: '$8.4M ETH/USDC'
      }
    },
    
    // Flash loan calculation
    flashLoan: {
      amount: 20 * 1500, // $30,000 USDT borrowed
      provider: 'Balancer Vault (Base)',
      fee: '0%',
      gasEstimate: 750000
    }
  };
  
  // Execution breakdown
  const flashLoanAmount = example.flashLoan.amount; // $30,000
  const ethBought = flashLoanAmount / example.opportunity.buyPrice; // 10.7143 ETH
  const usdcReceived = ethBought * example.opportunity.sellPrice; // $30,015 USDC
  const grossProfit = usdcReceived - flashLoanAmount; // $15 USDC profit
  const gasCost = 0.002; // $0.002 on Base network
  const netProfit = grossProfit - gasCost; // $14.998 final profit
  const finalBalance = example.initialBalance + netProfit; // $34.998
  const roi = (netProfit / example.initialBalance) * 100; // 74.99% ROI
  
  console.log("\n📊 EXECUTION BREAKDOWN:");
  console.log(`1. Flash Loan: Borrow $${flashLoanAmount.toLocaleString()} USDT (1500x leverage)`);
  console.log(`2. Buy ETH: ${ethBought.toFixed(4)} ETH at $${example.opportunity.buyPrice} on Aerodrome`);
  console.log(`3. Sell ETH: ${ethBought.toFixed(4)} ETH at $${example.opportunity.sellPrice} on Uniswap V3`);
  console.log(`4. Receive: $${usdcReceived.toFixed(2)} USDC`);
  console.log(`5. Repay Loan: $${flashLoanAmount.toLocaleString()} USDT`);
  console.log(`6. Keep Profit: $${netProfit.toFixed(3)} USDT`);
  
  console.log("\n💰 FINANCIAL RESULTS:");
  console.log(`Starting Balance: $${example.initialBalance} USDT`);
  console.log(`Final Balance: $${finalBalance.toFixed(3)} USDT`);
  console.log(`Net Profit: $${netProfit.toFixed(3)} USDT`);
  console.log(`ROI: ${roi.toFixed(2)}%`);
  console.log(`Profit Amplification: ${(netProfit / (example.initialBalance * 0.05 / 100)).toFixed(0)}x vs no leverage`);
  
  console.log("\n⚡ WHY 0.05% SPREADS WORK WITH 1500x LEVERAGE:");
  console.log(`• Tiny spread (0.05%) × Massive capital ($30k) = Significant profit ($15)`);
  console.log(`• Flash loan fee: $0 (Balancer has no fees on Base)`);
  console.log(`• Gas cost: $0.002 (Base network ultra-low fees)`);
  console.log(`• Net profit margin: 99.99% of gross profit kept`);
  console.log(`• Risk: Minimal (instant execution, no price risk)`);
  
  console.log("\n🔥 COMPARISON:");
  const regularTradeProfit = example.initialBalance * 0.05 / 100; // $0.01 without leverage
  console.log(`Without Flash Loan: $20 × 0.05% = $${regularTradeProfit.toFixed(3)} profit`);
  console.log(`With Flash Loan: $30k × 0.05% = $${grossProfit.toFixed(3)} profit`);
  console.log(`Amplification Factor: ${(grossProfit / regularTradeProfit).toFixed(0)}x more profit!`);
  
  console.log("\n✅ CONCLUSION:");
  console.log(`Even with ultra-tight 0.05% spreads, 1500x leverage generates massive returns!`);
  console.log(`$20 → $${finalBalance.toFixed(2)} in one transaction (${roi.toFixed(1)}% ROI)`);
  
  return example;
}

// Run the example
run005SpreadExample().catch(console.error);
