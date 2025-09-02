
const { transactionExample } = require('./server/transaction-example.ts');

async function runExample() {
  console.log("🎯 FLASH LOAN ARBITRAGE - COMPLETE TRANSACTION EXAMPLE");
  console.log("=" * 70);
  console.log("Initial Investment: $20 USDT");
  console.log("Strategy: Flash Loan Arbitrage on Base Network");
  console.log("Target: 0.33% spread opportunities");
  console.log("");
  
  try {
    await transactionExample.printDetailedExample();
    
    console.log("\n" + "="*70);
    console.log("📱 ACCESS VIA API:");
    console.log("GET /api/flashloan/transaction-example");
    console.log("");
    console.log("🌐 VIEW IN BROWSER:");
    console.log("http://localhost:5000/api/flashloan/transaction-example");
    
  } catch (error) {
    console.error("Error running example:", error);
  }
}

// Run the example
runExample().catch(console.error);
