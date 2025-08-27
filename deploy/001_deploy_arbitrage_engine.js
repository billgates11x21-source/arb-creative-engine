const { network } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("----------------------------------------------------");
  log("Deploying ArbitrageEngine...");
  log("Network:", network.name);
  log("Deployer:", deployer);

  // Deploy arguments (none for constructor)
  const args = [];

  // Deploy the contract
  const arbitrageEngine = await deploy("ArbitrageEngine", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
    gasLimit: 3000000, // Set gas limit for complex contract
  });

  log(`ArbitrageEngine deployed at ${arbitrageEngine.address}`);

  // Verify on Etherscan if on mainnet or testnet
  if (network.config.chainId !== 31337 && process.env.ETHERSCAN_API_KEY) {
    log("Verifying contract on Etherscan...");
    await verify(arbitrageEngine.address, args);
  }

  // Setup initial configuration
  if (network.config.chainId !== 31337) {
    log("Setting up initial configuration...");
    
    const arbitrageContract = await hre.ethers.getContractAt(
      "ArbitrageEngine", 
      arbitrageEngine.address
    );

    // Add deployer as authorized caller for initial setup
    const addCallerTx = await arbitrageContract.addAuthorizedCaller(deployer);
    await addCallerTx.wait(1);
    log("Added deployer as authorized caller");

    // Set initial risk parameters for mainnet
    if (network.config.chainId === 1) { // Mainnet
      const updateRiskTx = await arbitrageContract.updateRiskParameters(
        hre.ethers.utils.parseEther("50"), // 50 ETH max trade
        50, // 0.5% min profit
        200 // 2% max slippage
      );
      await updateRiskTx.wait(1);
      log("Updated risk parameters for mainnet");
    }
  }

  log("----------------------------------------------------");
};

module.exports.tags = ["all", "arbitrage", "main"];
module.exports.dependencies = [];