
import { deployFlashLoanContract } from './contracts/deploy.js';
import { ethers } from 'ethers';

async function deployWithCostEstimation() {
    console.log("💰 FLASH LOAN CONTRACT DEPLOYMENT COST ESTIMATION");
    console.log("=" .repeat(60));
    
    // Base network gas configuration
    const BASE_GAS_PRICE = 0.001; // 0.001 gwei (very low on Base)
    const DEPLOYMENT_GAS = 2500000; // Estimated gas units
    
    // Calculate costs
    const gasCostWei = ethers.parseUnits(BASE_GAS_PRICE.toString(), 'gwei') * BigInt(DEPLOYMENT_GAS);
    const gasCostETH = ethers.formatEther(gasCostWei);
    const gasCostUSD = parseFloat(gasCostETH) * 2800; // ETH price estimate
    
    console.log("📊 DEPLOYMENT COST BREAKDOWN:");
    console.log(`   • Gas Price: ${BASE_GAS_PRICE} gwei`);
    console.log(`   • Estimated Gas: ${DEPLOYMENT_GAS.toLocaleString()} units`);
    console.log(`   • Cost in ETH: ${gasCostETH} ETH`);
    console.log(`   • Cost in USD: $${gasCostUSD.toFixed(4)}`);
    console.log("");
    
    console.log("🔧 REQUIRED FOR DEPLOYMENT:");
    console.log(`   • Minimum ETH needed: ${(parseFloat(gasCostETH) * 1.5).toFixed(6)} ETH`);
    console.log(`   • Network: Base Mainnet (Chain ID: 8453)`);
    console.log(`   • RPC URL: https://mainnet.base.org`);
    console.log("");
    
    console.log("⚡ FLASH LOAN FEATURES:");
    console.log("   • Balancer Flash Loans (0% fee)");
    console.log("   • Aave Flash Loans (0.05% fee)");
    console.log("   • Aerodrome DEX integration");
    console.log("   • Equalizer DEX integration");
    console.log("   • Uniswap V3 integration");
    console.log("   • Automatic profit validation");
    console.log("   • OKX trading integration");
    console.log("");
    
    console.log("🎯 EXPECTED PERFORMANCE:");
    console.log("   • 5-10x leverage on arbitrage trades");
    console.log("   • 0.5%+ minimum profit threshold");
    console.log("   • <10 second execution time");
    console.log("   • Atomic transaction safety");
    console.log("");
    
    // Check if user wants to proceed with actual deployment
    if (process.env.DEPLOY_NOW === 'true') {
        console.log("🚀 Proceeding with actual deployment...");
        return await deployFlashLoanContract();
    } else {
        console.log("💡 To deploy, run: DEPLOY_NOW=true PRIVATE_KEY=your_key node deploy-flashloan.js");
        return {
            estimatedCost: {
                eth: gasCostETH,
                usd: gasCostUSD,
                gasUnits: DEPLOYMENT_GAS,
                gasPrice: BASE_GAS_PRICE
            },
            ready: true
        };
    }
}

// ES module check equivalent
if (import.meta.url === `file://${process.argv[1]}`) {
    deployWithCostEstimation()
        .then(result => {
            if (result.ready && !result.contractAddress) {
                console.log("✅ Deployment estimation completed");
                console.log("💰 Total estimated cost: $" + result.estimatedCost.usd.toFixed(4));
            }
        })
        .catch(error => {
            console.error("❌ Error:", error);
        });
}

export { deployWithCostEstimation };
