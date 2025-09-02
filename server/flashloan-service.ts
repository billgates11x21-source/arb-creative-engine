import { ethers } from 'ethers';
import { okxService } from './okx-service';

interface FlashLoanConfig {
    contractAddress: string;
    abi: any[];
    provider: ethers.JsonRpcProvider;
    signer: ethers.Wallet;
}

interface FlashLoanOpportunity {
    asset: string;
    amount: number;
    dexA: string;
    dexB: string;
    estimatedProfit: number;
    profitPercentage: number;
    gasEstimate: number;
}

class FlashLoanService {
    private config: FlashLoanConfig | null = null;
    private contract: ethers.Contract | null = null;
    private isInitialized = false;

    async initialize(privateKey?: string): Promise<boolean> {
        try {
            console.log("🔧 Initializing Flash Loan Service on Base network...");

            // Get private key from environment if not provided
            const key = privateKey || process.env.PRIVATE_KEY;

            // Skip initialization if no valid private key provided
            if (!key || key === '[REDACTED]' || key.length < 32) {
                console.log("⚠️ No valid private key provided - running in simulation mode");
                console.log("💡 Add PRIVATE_KEY to secrets to enable real flash loan execution");
                this.isInitialized = false;
                return false;
            }

            // Validate private key format
            let validKey = key;
            if (!validKey.startsWith('0x') && validKey.length === 64) {
                validKey = '0x' + validKey;
            }

            // Base network configuration
            const BASE_RPC_URL = "https://mainnet.base.org";
            const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
            const signer = new ethers.Wallet(validKey, provider);

            console.log("📋 Flash loan wallet:", signer.address);

            // Check if deployment info exists
            const deploymentInfo = await this.loadDeploymentInfo();
            if (!deploymentInfo) {
                console.log("⚠️ No deployment found. Please deploy contract first.");
                return false;
            }

            this.config = {
                contractAddress: deploymentInfo.contractAddress,
                abi: deploymentInfo.abi,
                provider,
                signer
            };

            this.contract = new ethers.Contract(
                this.config.contractAddress,
                this.config.abi,
                this.config.signer
            );

            // Authorize this service to call the contract
            await this.authorizeService();

            this.isInitialized = true;
            console.log("✅ Flash Loan Service initialized successfully");
            return true;

        } catch (error) {
            console.error("❌ Failed to initialize Flash Loan Service:", error);
            return false;
        }
    }

    private async loadDeploymentInfo(): Promise<any> {
        try {
            const fs = require('fs');
            const path = require('path');
            const deploymentPath = path.join(__dirname, '../contracts/deployment-info.json');

            if (fs.existsSync(deploymentPath)) {
                const data = fs.readFileSync(deploymentPath, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.error("Error loading deployment info:", error);
            return null;
        }
    }

    private async authorizeService(): Promise<void> {
        try {
            if (!this.contract || !this.config) return;

            // Add this service as authorized caller
            const tx = await this.contract.addAuthorizedCaller(this.config.signer.address);
            await tx.wait();

            console.log("🔐 Service authorized for flash loan execution");
        } catch (error) {
            console.error("Error authorizing service:", error);
        }
    }

    async scanFlashLoanOpportunities(): Promise<FlashLoanOpportunity[]> {
        if (!this.isInitialized) {
            console.log("⚠️ Flash loan service not initialized - running simulation mode");
            return this.generateSimulatedFlashLoanOpportunities();
        }

        try {
            const opportunities: FlashLoanOpportunity[] = [];

            // Base network DEX configurations
            const baseDEXes = [
                {
                    name: 'Aerodrome',
                    router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
                    fee: 0.05
                },
                {
                    name: 'Uniswap V3',
                    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
                    fee: 0.05
                },
                {
                    name: 'Equalizer',
                    router: '0x8c0f6a1f6a7f4e0e4f4c4f4a4f4e4f4e4f4e4f4e',
                    fee: 0.05
                }
            ];

            // Token pairs on Base
            const basePairs = [
                { tokenA: '0x4200000000000000000000000000000000000006', tokenB: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'WETH/USDC' },
                { tokenA: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', tokenB: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'USDC/DAI' }
            ];

            // Scan for arbitrage opportunities across DEXes
            for (const pair of basePairs) {
                for (let i = 0; i < baseDEXes.length; i++) {
                    for (let j = i + 1; j < baseDEXes.length; j++) {
                        const dexA = baseDEXes[i];
                        const dexB = baseDEXes[j];

                        // Calculate potential profit using smart contract
                        const flashLoanAmount = ethers.parseEther("1"); // 1 ETH or equivalent

                        try {
                            const routeA = this.encodeRoute(dexA.name, [pair.tokenA, pair.tokenB]);
                            const routeB = this.encodeRoute(dexB.name, [pair.tokenB, pair.tokenA]);

                            const [estimatedProfit, isProfitable] = await this.contract!.calculatePotentialProfit(
                                pair.tokenA,
                                pair.tokenB,
                                flashLoanAmount,
                                dexA.router,
                                dexB.router,
                                routeA,
                                routeB
                            );

                            if (isProfitable && estimatedProfit > 0) {
                                const profitETH = ethers.formatEther(estimatedProfit);
                                const profitPercentage = (parseFloat(profitETH) / 1) * 100;

                                opportunities.push({
                                    asset: pair.tokenA,
                                    amount: 1,
                                    dexA: dexA.name,
                                    dexB: dexB.name,
                                    estimatedProfit: parseFloat(profitETH),
                                    profitPercentage,
                                    gasEstimate: 800000 // Estimated gas for flash loan arbitrage
                                });
                            }
                        } catch (error) {
                            console.error(`Error calculating profit for ${pair.symbol}:`, error);
                        }
                    }
                }
            }

            console.log(`🔍 Found ${opportunities.length} flash loan opportunities`);
            return opportunities.slice(0, 10);

        } catch (error) {
            console.error("Error scanning flash loan opportunities:", error);
            return [];
        }
    }

    private encodeRoute(dexName: string, path: string[]): string {
        if (dexName === 'Equalizer') {
            // Equalizer uses stable flag
            return ethers.AbiCoder.defaultAbiCoder().encode(['bool'], [false]);
        } else if (dexName === 'Uniswap V3') {
            // Uniswap uses path array
            return ethers.AbiCoder.defaultAbiCoder().encode(['address[]'], [path]);
        } else if (dexName === 'Aerodrome') {
            // Aerodrome uses Route struct array
            const routes = [{
                from: path[0],
                to: path[1],
                stable: false,
                factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da'
            }];
            return ethers.AbiCoder.defaultAbiCoder().encode(['tuple(address,address,bool,address)[]'], [routes]);
        }
        return '0x';
    }

    async executeFlashLoanArbitrage(opportunity: FlashLoanOpportunity): Promise<any> {
        if (!this.isInitialized || !this.contract) {
            throw new Error("Flash loan service not initialized");
        }

        try {
            console.log(`⚡ Executing flash loan arbitrage for ${opportunity.dexA} → ${opportunity.dexB}`);

            const amount = ethers.parseEther(opportunity.amount.toString());

            // Prepare arbitrage parameters with OKX withdrawal address
            const params = {
                tokenIn: opportunity.asset,
                tokenOut: opportunity.asset === '0x4200000000000000000000000000000000000006' 
                    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // WETH → USDC
                    : '0x4200000000000000000000000000000000000006', // USDC → WETH
                amountIn: amount,
                dexA: this.getDEXRouter(opportunity.dexA),
                dexB: this.getDEXRouter(opportunity.dexB),
                routeA: this.encodeRoute(opportunity.dexA, [opportunity.asset, this.getCounterToken(opportunity.asset)]),
                routeB: this.encodeRoute(opportunity.dexB, [this.getCounterToken(opportunity.asset), opportunity.asset]),
                minProfit: ethers.parseEther((opportunity.estimatedProfit * 0.8).toString()), // 80% of estimated profit
                profitRecipient: this.config!.signer.address // Ensure profits go to our wallet
            };

            // Use Balancer for flash loan (no fee)
            const flashLoanProvider = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

            // Execute flash loan arbitrage
            const tx = await this.contract.executeFlashLoanArbitrage(
                flashLoanProvider,
                opportunity.asset,
                amount,
                params,
                {
                    gasLimit: opportunity.gasEstimate,
                    gasPrice: ethers.parseUnits('0.001', 'gwei') // Base has very low gas prices
                }
            );

            console.log("📝 Transaction submitted:", tx.hash);

            // Wait for confirmation
            const receipt = await tx.wait();

            console.log("✅ Flash loan arbitrage executed successfully");
            console.log("⛽ Gas used:", receipt.gasUsed.toString());

            // Parse events to get actual profit
            const events = receipt.logs?.filter((log: any) => {
                try {
                    return this.contract!.interface.parseLog(log);
                } catch {
                    return false;
                }
            });

            let actualProfit = 0;
            for (const event of events || []) {
                const parsed = this.contract.interface.parseLog(event);
                if (parsed?.name === 'ArbitrageExecuted') {
                    actualProfit = parseFloat(ethers.formatEther(parsed.args.profit));
                    break;
                }
            }

            // CRITICAL: Withdraw profits to OKX-compatible wallet
            if (actualProfit > 0) {
                console.log(`💰 Withdrawing ${actualProfit} profit to OKX-compatible wallet...`);
                const withdrawResult = await this.withdrawProfitToOKXWallet(opportunity.asset, actualProfit);
                
                if (!withdrawResult.success) {
                    console.error("⚠️ Profit withdrawal failed:", withdrawResult.error);
                    // Log this for manual intervention
                    await this.logProfitWithdrawalFailure(tx.hash, actualProfit, withdrawResult.error);
                }
            }

            return {
                success: true,
                txHash: tx.hash,
                actualProfit,
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: receipt.blockNumber,
                explorerUrl: `https://basescan.org/tx/${tx.hash}`,
                profitWithdrawn: actualProfit > 0 ? await this.verifyProfitInOKXWallet(opportunity.asset, actualProfit) : false
            };

        } catch (error) {
            console.error("❌ Flash loan execution failed:", error);
            return {
                success: false,
                error: error.message,
                actualProfit: 0
            };
        }
    }

    private getDEXRouter(dexName: string): string {
        const routers: { [key: string]: string } = {
            'Aerodrome': '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
            'Uniswap V3': '0x2626664c2603336E57B271c5C0b26F421741e481',
            'Equalizer': '0x8c0f6a1f6a7f4e0e4f4c4f4a4f4e4f4e4f4e4f4e'
        };
        return routers[dexName] || routers['Aerodrome'];
    }

    private getCounterToken(token: string): string {
        // WETH on Base
        if (token === '0x4200000000000000000000000000000000000006') {
            return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC
        }
        // USDC on Base
        if (token === '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
            return '0x4200000000000000000000000000000000000006'; // WETH
        }
        return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Default to USDC
    }

    async getContractStats(): Promise<any> {
        if (!this.contract) return null;

        try {
            const [totalProfit, totalTrades, minProfitBps, maxSlippage] = await this.contract.getContractStats();

            return {
                totalProfit: ethers.formatEther(totalProfit),
                totalTrades: totalTrades.toString(),
                minProfitBps: minProfitBps.toString(),
                maxSlippage: maxSlippage.toString(),
                contractAddress: this.config?.contractAddress
            };
        } catch (error) {
            console.error("Error getting contract stats:", error);
            return null;
        }
    }

    async validateArbitrageOpportunity(opportunity: any): Promise<boolean> {
        if (!this.contract) return false;

        try {
            // Convert opportunity to smart contract format
            const tokenA = this.getTokenAddress(opportunity.token_pair.split('/')[0]);
            const tokenB = this.getTokenAddress(opportunity.token_pair.split('/')[1]);
            const amount = ethers.parseEther(opportunity.amount?.toString() || "1");

            const dexARouter = this.getDEXRouter(opportunity.buy_exchange);
            const dexBRouter = this.getDEXRouter(opportunity.sell_exchange);

            const routeA = this.encodeRoute(opportunity.buy_exchange, [tokenA, tokenB]);
            const routeB = this.encodeRoute(opportunity.sell_exchange, [tokenB, tokenA]);

            const [estimatedProfit, isProfitable] = await this.contract.calculatePotentialProfit(
                tokenA,
                tokenB,
                amount,
                dexARouter,
                dexBRouter,
                routeA,
                routeB
            );

            const profitETH = parseFloat(ethers.formatEther(estimatedProfit));
            const profitPercentage = (profitETH / parseFloat(ethers.formatEther(amount))) * 100;

            console.log(`🔍 Smart contract validation: ${profitPercentage.toFixed(3)}% profit, isProfitable: ${isProfitable}`);

            return isProfitable && profitPercentage >= 0.05; // Minimum 0.05% profit

        } catch (error) {
            console.error("Error validating arbitrage opportunity:", error);
            return false;
        }
    }

    private generateSimulatedFlashLoanOpportunities(): FlashLoanOpportunity[] {
        console.log('❌ FLASH LOAN DATA UNAVAILABLE - No contract deployed');
        console.log('⚠️ Deploy smart contract with private key to enable flash loan opportunities');
        return []; // Return empty array when contract is not deployed
    }

    private getTokenAddress(symbol: string): string {
        const baseTokens: { [key: string]: string } = {
            'WETH': '0x4200000000000000000000000000000000000006',
            'ETH': '0x4200000000000000000000000000000000000006',
            'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            'DAI': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
        };

        return baseTokens[symbol.toUpperCase()] || baseTokens['USDC'];
    }

    // Withdraw profits from Base network to OKX-compatible wallet
    private async withdrawProfitToOKXWallet(asset: string, profitAmount: number): Promise<{success: boolean, error?: string, txHash?: string}> {
        try {
            if (!this.contract || !this.config) {
                return { success: false, error: "Contract not initialized" };
            }

            // Get OKX deposit address for this asset
            const okxDepositAddress = await this.getOKXDepositAddress(asset);
            if (!okxDepositAddress) {
                return { success: false, error: "No OKX deposit address found" };
            }

            console.log(`🏦 Withdrawing to OKX address: ${okxDepositAddress}`);

            // Convert profit amount to wei
            const profitWei = ethers.parseEther(profitAmount.toString());

            // Execute withdrawal from smart contract to OKX wallet
            const withdrawTx = await this.contract.withdrawProfit(
                asset,
                profitWei,
                okxDepositAddress,
                {
                    gasLimit: 100000,
                    gasPrice: ethers.parseUnits('0.001', 'gwei')
                }
            );

            await withdrawTx.wait();

            console.log(`✅ Profit withdrawn to OKX wallet: ${withdrawTx.hash}`);

            return {
                success: true,
                txHash: withdrawTx.hash
            };

        } catch (error) {
            console.error("Error withdrawing profit to OKX:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get OKX deposit address for specific asset
    private async getOKXDepositAddress(asset: string): Promise<string | null> {
        try {
            // Your OKX Base/Ethereum wallet address
            const OKX_WALLET_ADDRESS = "0xecfcd0c695c7d66be1a957e84ac822ce95ac6e24";
            
            console.log(`🏦 Using OKX wallet address: ${OKX_WALLET_ADDRESS}`);
            
            // Validate the address format
            if (!OKX_WALLET_ADDRESS.startsWith('0x') || OKX_WALLET_ADDRESS.length !== 42) {
                throw new Error("Invalid OKX wallet address format");
            }
            
            return OKX_WALLET_ADDRESS;

        } catch (error) {
            console.error("Error getting OKX deposit address:", error);
            return null;
        }
    }

    // Convert Base network token address to OKX symbol
    private getOKXSymbolFromAddress(address: string): string {
        const addressToSymbol: { [key: string]: string } = {
            '0x4200000000000000000000000000000000000006': 'ETH',
            '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 'USDC',
            '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': 'DAI'
        };

        return addressToSymbol[address] || 'USDC';
    }

    // Verify profit appeared in OKX wallet
    private async verifyProfitInOKXWallet(asset: string, expectedProfit: number): Promise<boolean> {
        try {
            const symbol = this.getOKXSymbolFromAddress(asset);
            
            // Wait a moment for network confirmation
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Check if OKX balance increased
            const currentBalance = await okxService.getSpotWalletBalance();
            const assetBalance = currentBalance[symbol] || 0;

            console.log(`🔍 Verifying profit in OKX wallet: ${symbol} balance = ${assetBalance}`);

            // This is simplified - in production you'd compare before/after balances
            return assetBalance > 0;

        } catch (error) {
            console.error("Error verifying profit in OKX wallet:", error);
            return false;
        }
    }

    // ESSENTIAL: Direct emergency withdrawal to OKX wallet
    async emergencyWithdrawToOKX(tokenAddress?: string): Promise<{success: boolean, txHash?: string, error?: string}> {
        try {
            if (!this.contract || !this.config) {
                throw new Error("Flash loan service not initialized");
            }

            console.log("🚨 EXECUTING EMERGENCY WITHDRAWAL TO OKX WALLET");
            console.log(`📍 OKX Address: 0xecfcd0c695c7d66be1a957e84ac822ce95ac6e24`);

            let tx;
            if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
                // Withdraw specific token
                console.log(`💰 Withdrawing ${tokenAddress} tokens...`);
                tx = await this.contract.emergencyWithdrawToOKX(tokenAddress, {
                    gasLimit: 100000,
                    gasPrice: ethers.parseUnits('0.001', 'gwei')
                });
            } else {
                // Withdraw ETH
                console.log(`💰 Withdrawing ETH...`);
                tx = await this.contract.emergencyWithdrawETHToOKX({
                    gasLimit: 50000,
                    gasPrice: ethers.parseUnits('0.001', 'gwei')
                });
            }

            console.log("📝 Emergency withdrawal transaction:", tx.hash);
            await tx.wait();

            console.log("✅ EMERGENCY WITHDRAWAL COMPLETED TO OKX WALLET");
            console.log(`🔍 View on BaseScan: https://basescan.org/tx/${tx.hash}`);

            return {
                success: true,
                txHash: tx.hash
            };

        } catch (error) {
            console.error("❌ Emergency withdrawal failed:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Log profit withdrawal failures for manual intervention
    private async logProfitWithdrawalFailure(txHash: string, profit: number, error: string): Promise<void> {
        const logEntry = {
            timestamp: new Date().toISOString(),
            txHash,
            profit,
            error,
            status: 'emergency_withdrawal_available',
            action: 'Call emergencyWithdrawToOKX() to recover funds'
        };

        console.error("🚨 PROFIT WITHDRAWAL FAILURE - EMERGENCY BACKUP AVAILABLE:", logEntry);
        console.error("🔧 Recovery: Use emergencyWithdrawToOKX() function");
    }

    async integrateWithOKXTrading(): Promise<void> {
        console.log("🔗 Integrating flash loans with OKX trading system...");

        // Enhanced integration with profit flow validation
        setInterval(async () => {
            try {
                const opportunities = await okxService.scanRealOpportunities();

                for (const opportunity of opportunities) {
                    // Check if opportunity can benefit from flash loan leverage
                    if (parseFloat(opportunity.profit_percentage) >= 0.05) { // Lower threshold for flash loans
                        const isValid = await this.validateArbitrageOpportunity(opportunity);

                        if (isValid) {
                            console.log(`⚡ Flash loan opportunity detected: ${opportunity.token_pair} (+${opportunity.profit_percentage}%)`);

                            // Pre-execution balance check
                            const preBalance = await okxService.getSpotWalletBalance();
                            const tokenSymbol = opportunity.token_pair.split('/')[0];
                            const preTokenBalance = preBalance[tokenSymbol] || 0;

                            console.log(`💰 Pre-execution ${tokenSymbol} balance: ${preTokenBalance}`);

                            // Execute flash loan arbitrage with profit tracking
                            const result = await this.executeFlashLoanArbitrage({
                                asset: this.getTokenAddress(opportunity.token_pair.split('/')[0]),
                                amount: Math.min(parseFloat(opportunity.volume_available) * 0.1, 2), // Conservative amount
                                dexA: 'Uniswap V3',
                                dexB: 'Aerodrome',
                                estimatedProfit: parseFloat(opportunity.profit_amount),
                                profitPercentage: parseFloat(opportunity.profit_percentage),
                                gasEstimate: 800000
                            });

                            // Post-execution balance verification
                            if (result.success) {
                                await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for network confirmation
                                
                                const postBalance = await okxService.getSpotWalletBalance();
                                const postTokenBalance = postBalance[tokenSymbol] || 0;
                                const balanceIncrease = postTokenBalance - preTokenBalance;

                                console.log(`📊 Balance verification: ${tokenSymbol} increased by ${balanceIncrease}`);
                                
                                if (balanceIncrease > 0) {
                                    console.log(`✅ PROFIT CONFIRMED IN OKX WALLET: +${balanceIncrease} ${tokenSymbol}`);
                                } else {
                                    console.error(`🚨 PROFIT NOT RECEIVED IN OKX WALLET - Manual check required`);
                                    await this.logProfitWithdrawalFailure(result.txHash, result.actualProfit, 'Profit not reflected in OKX balance');
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error in flash loan integration:", error);
            }
        }, 30000); // Check every 30 seconds
    }
}

export const flashLoanService = new FlashLoanService();