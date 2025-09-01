import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const exchangeConfigs = pgTable("exchange_configs", {
  id: serial("id").primaryKey(),
  exchangeName: text("exchange_name").notNull(),
  apiEndpoint: text("api_endpoint"),
  isActive: boolean("is_active").default(true),
  priorityScore: decimal("priority_score", { precision: 5, scale: 2 }).default("1.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const riskSettings = pgTable("risk_settings", {
  id: serial("id").primaryKey(),
  minProfitThreshold: decimal("min_profit_threshold", { precision: 5, scale: 2 }).default("0.50"),
  maxPositionSize: decimal("max_position_size", { precision: 15, scale: 2 }).default("10000.00"),
  maxRiskScore: integer("max_risk_score").default(3),
  isSimulationMode: boolean("is_simulation_mode").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradingOpportunities = pgTable("trading_opportunities", {
  id: serial("id").primaryKey(),
  tokenPair: text("token_pair").notNull(),
  buyExchange: text("buy_exchange").notNull(),
  sellExchange: text("sell_exchange").notNull(),
  buyPrice: decimal("buy_price", { precision: 15, scale: 8 }).notNull(),
  sellPrice: decimal("sell_price", { precision: 15, scale: 8 }).notNull(),
  profitAmount: decimal("profit_amount", { precision: 15, scale: 8 }).notNull(),
  profitPercentage: decimal("profit_percentage", { precision: 5, scale: 2 }).notNull(),
  volumeAvailable: decimal("volume_available", { precision: 15, scale: 2 }).notNull(),
  gasCost: decimal("gas_cost", { precision: 10, scale: 2 }),
  executionTime: decimal("execution_time", { precision: 5, scale: 2 }),
  riskScore: integer("risk_score").default(1),
  status: text("status").default("discovered"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradingStrategies = pgTable("trading_strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  strategyType: text("strategy_type").notNull(), // flash_loan, triangular, cross_exchange, liquidity_pool
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const executedTrades = pgTable("executed_trades", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => tradingOpportunities.id),
  strategyId: integer("strategy_id").references(() => tradingStrategies.id),
  transactionHash: text("transaction_hash"),
  tokenPair: text("token_pair").notNull(),
  buyExchange: text("buy_exchange").notNull(),
  sellExchange: text("sell_exchange").notNull(),
  amountTraded: decimal("amount_traded", { precision: 15, scale: 8 }).notNull(),
  profitRealized: decimal("profit_realized", { precision: 15, scale: 8 }),
  gasUsed: integer("gas_used"),
  gasPrice: decimal("gas_price", { precision: 10, scale: 2 }),
  executionTime: decimal("execution_time", { precision: 5, scale: 2 }),
  status: text("status").default("pending"), // pending, confirmed, failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const strategyPerformance = pgTable("strategy_performance", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").references(() => tradingStrategies.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default("0.00"),
  avgProfitPerTrade: decimal("avg_profit_per_trade", { precision: 15, scale: 8 }).default("0.00"),
  totalTrades: integer("total_trades").default(0),
  aiConfidenceScore: decimal("ai_confidence_score", { precision: 5, scale: 2 }).default("0.00"),
  marketConditions: jsonb("market_conditions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertExchangeConfigSchema = createInsertSchema(exchangeConfigs);
export const insertRiskSettingsSchema = createInsertSchema(riskSettings);
export const insertTradingOpportunitySchema = createInsertSchema(tradingOpportunities);
export const insertTradingStrategySchema = createInsertSchema(tradingStrategies);
export const insertExecutedTradeSchema = createInsertSchema(executedTrades);
export const insertStrategyPerformanceSchema = createInsertSchema(strategyPerformance);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ExchangeConfig = typeof exchangeConfigs.$inferSelect;
export type RiskSettings = typeof riskSettings.$inferSelect;
export type TradingOpportunity = typeof tradingOpportunities.$inferSelect;
export type TradingStrategy = typeof tradingStrategies.$inferSelect;
export type ExecutedTrade = typeof executedTrades.$inferSelect;
export type StrategyPerformance = typeof strategyPerformance.$inferSelect;
