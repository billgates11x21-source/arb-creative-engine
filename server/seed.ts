import { db } from "./db";
import { exchangeConfigs, tradingStrategies, riskSettings } from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database...");

  // Create initial exchange configurations
  await db.insert(exchangeConfigs).values([
    {
      exchangeName: "Uniswap V3",
      apiEndpoint: "https://api.uniswap.org/v1",
      isActive: true,
      priorityScore: "5.00"
    },
    {
      exchangeName: "SushiSwap",
      apiEndpoint: "https://api.sushi.com/v1",
      isActive: true,
      priorityScore: "4.50"
    },
    {
      exchangeName: "Curve Finance",
      apiEndpoint: "https://api.curve.fi/v1",
      isActive: true,
      priorityScore: "4.00"
    },
    {
      exchangeName: "Balancer",
      apiEndpoint: "https://api.balancer.fi/v2",
      isActive: true,
      priorityScore: "3.50"
    },
    {
      exchangeName: "1inch",
      apiEndpoint: "https://api.1inch.dev/v5.2",
      isActive: true,
      priorityScore: "4.25"
    }
  ]).onConflictDoNothing();

  // Create trading strategies
  await db.insert(tradingStrategies).values([
    {
      name: "Flash Loan Arbitrage",
      strategyType: "flash_loan",
      description: "Execute arbitrage trades using flash loans to maximize capital efficiency",
      isActive: true
    },
    {
      name: "Triangular Arbitrage",
      strategyType: "triangular",
      description: "Profit from price differences in three-way currency exchanges",
      isActive: true
    },
    {
      name: "Cross-Exchange Arbitrage",
      strategyType: "cross_exchange",
      description: "Buy and sell the same asset on different exchanges",
      isActive: true
    },
    {
      name: "Liquidity Pool Arbitrage",
      strategyType: "liquidity_pool",
      description: "Exploit price differences between different liquidity pools",
      isActive: true
    }
  ]).onConflictDoNothing();

  // Create default risk settings
  await db.insert(riskSettings).values({
    minProfitThreshold: "0.50",
    maxPositionSize: "10000.00",
    maxRiskScore: 3,
    isSimulationMode: true
  }).onConflictDoNothing();

  console.log("Database seeded successfully!");
}