
#!/usr/bin/env node

const { executeExampleFlashLoanTrade } = require('./server/flashloan-examples');

async function main() {
  console.log("🚀 Running Flash Loan Arbitrage Example");
  console.log("=" * 60);
  
  try {
    const result = await executeExampleFlashLoanTrade();
    
    if (result.success) {
      console.log("✅ Example completed successfully!");
      console.log();
      console.log("📝 SUMMARY:");
      console.log(`   Initial Capital: $${result.calculations.initialCapital} USDT`);
      console.log(`   Flash Loan Amount: $${result.calculations.flashLoanAmount} USDT`);
      console.log(`   Leverage Used: ${result.calculations.leverage}x`);
      console.log(`   Net Profit: $${result.calculations.netProfit.toFixed(4)} USDT`);
      console.log(`   ROI: ${result.calculations.roi.toFixed(2)}%`);
      console.log();
      console.log("🔗 To execute this for real:");
      console.log("   1. Deploy the smart contract using: node deploy-flashloan.js");
      console.log("   2. Add your private key to execute live trades");
      console.log("   3. Ensure minimum 0.33% spread opportunities exist");
    } else {
      console.log("❌ Example failed:", result.error);
    }
    
  } catch (error) {
    console.error("❌ Error running example:", error);
  }
}

main();
