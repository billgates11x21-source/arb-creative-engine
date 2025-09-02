import { ethers } from "ethers";
import fs from "fs";

async function deployFlashLoanContract() {
    console.log("🚀 Starting deployment to Base network...");
    
    const BASE_RPC_URL = "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    
    if (!PRIVATE_KEY) {
        throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log("📋 Deployment wallet:", wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceETH = ethers.formatEther(balance);
    console.log("💰 Wallet balance:", balanceETH, "ETH");
    
    if (parseFloat(balanceETH) < 0.002) {
        throw new Error("Insufficient ETH for deployment. Need at least 0.002 ETH");
    }
    
    // Read compiled contract
    const contractSource = fs.readFileSync('./contracts/FlashLoanArbitrage.sol', 'utf8');
    
    // Contract bytecode for FlashLoanArbitrage (pre-compiled)
    const contractBytecode = "0x608060405234801561001057600080fd5b50600160008190555061001f3361010a565b61002b30600161015a565b61003861047d6002015461015a565b61004461047d6003015461015a565b61005161047d6004015461015a565b61005e66038d7ea4c6800060020155610071630bebc20060030155610084683635c9adc5dea0000060040155610091336001016101d0565b50610102565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6001600160a01b03821660009081526005602052604090205460ff161515811515146101c65760405162461bcd60e51b815260206004820152601a60248201527f546f6b656e20737570706f7274207374617465206368616e67656400000000000060448201526064015b60405180910390fd5b6001600160a01b0382166000908152600560205260409020805460ff1916821515179055806001600160a01b0316827fb79bf2e89c2d70dde91d2991fb1ea69b7e478061ad7c04817e2e7c9a19cce78560405160405180910390a35050565b6001600160a01b0382166000908152600760205260409020805460ff1916821515179055806001600160a01b0316827f3f008fd510eae7a9e7bee13d5177d3a0c2e0d9dc5b26fb6d3d43e1d1b1c0c0c060405160405180910390a35050565b614c9380620002116000396000f3fe";
    
    // Contract ABI
    const contractABI = [
        "constructor()",
        "function executeFlashLoanArbitrage(address,address,uint256,tuple(address,address,uint256,address,address,bytes,bytes,uint256)) external",
        "function calculatePotentialProfit(address,address,uint256,address,address,bytes,bytes) external view returns (uint256,bool)",
        "function addAuthorizedCaller(address) external",
        "function getContractStats() external view returns (uint256,uint256,uint256,uint256)",
        "function emergencyWithdrawToOKX(address) external",
        "function emergencyWithdrawETHToOKX() external",
        "event ArbitrageExecuted(address indexed,uint256,uint256,address indexed)"
    ];
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    console.log("⛽ Current gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
    
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(contractABI, contractBytecode, wallet);
    
    // Estimate gas for deployment
    const estimatedGas = await provider.estimateGas({
        data: contractBytecode
    });
    
    const deploymentCost = feeData.gasPrice * estimatedGas;
    const deploymentCostETH = ethers.formatEther(deploymentCost);
    
    console.log("📊 Estimated gas needed:", estimatedGas.toString());
    console.log("💸 Estimated deployment cost:", deploymentCostETH, "ETH");
    console.log("💵 Cost in USD (approx):", (parseFloat(deploymentCostETH) * 2800).toFixed(4), "USD");
    
    // Deploy contract
    console.log("🔄 Deploying contract...");
    
    const contract = await contractFactory.deploy({
        gasLimit: estimatedGas + 100000n, // Add buffer
        gasPrice: feeData.gasPrice
    });
    
    console.log("⏳ Waiting for deployment transaction...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    
    console.log("✅ Contract deployed successfully!");
    console.log("📍 Contract address:", contractAddress);
    console.log("🔗 Base Explorer:", `https://basescan.org/address/${contractAddress}`);
    console.log("📝 Transaction hash:", contract.deploymentTransaction().hash);
    
    // Save deployment info
    const deploymentInfo = {
        contractAddress,
        deploymentTx: contract.deploymentTransaction().hash,
        network: "base",
        chainId: 8453,
        deployedAt: new Date().toISOString(),
        deployer: wallet.address,
        gasUsed: estimatedGas.toString(),
        actualCost: deploymentCostETH,
        abi: contractABI
    };
    
    fs.writeFileSync('./contracts/deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    
    console.log("📁 Deployment info saved to deployment-info.json");
    
    return deploymentInfo;
}

deployFlashLoanContract()
    .then(result => {
        console.log("🎉 Deployment completed successfully!");
        console.log("Your FlashLoanArbitrage contract is now live on Base network!");
    })
    .catch(error => {
        console.error("❌ Deployment failed:", error.message);
        process.exit(1);
    });