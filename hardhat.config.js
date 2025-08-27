require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-deploy");

// Load environment variables
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: MAINNET_RPC_URL,
        blockNumber: 18500000, // Latest stable block for testing
      },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk"
      }
    },
    
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545"
    },
    
    mainnet: {
      chainId: 1,
      url: MAINNET_RPC_URL,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? [PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 120000,
    },
    
    goerli: {
      chainId: 5,
      url: "https://eth-goerli.alchemyapi.io/v2/your-api-key",
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? [PRIVATE_KEY] : [],
    },
    
    sepolia: {
      chainId: 11155111,  
      url: "https://eth-sepolia.alchemyapi.io/v2/your-api-key",
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000" ? [PRIVATE_KEY] : [],
    }
  },
  
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
    }
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    gasPrice: 25,
    showTimeSpent: true,
    showMethodSig: true,
  },
  
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0, // Mainnet
      5: 0, // Goerli
      11155111: 0, // Sepolia
    },
    user: {
      default: 1,
    },
  },
  
  mocha: {
    timeout: 200000, // 200 seconds max for tests
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
  },
};