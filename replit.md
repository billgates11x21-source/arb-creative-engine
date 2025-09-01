# Overview

ARB Creative Engine is a sophisticated DeFi arbitrage trading platform that automatically identifies and executes profitable trading opportunities across multiple decentralized exchanges (DEXes). The system combines React-based frontend with Express.js backend, utilizing AI-powered strategy selection and comprehensive risk management features. The platform operates in simulation mode by default, providing safe testing of trading strategies with real market data.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing a modern component-based architecture with shadcn/ui design system. The application features a cyberpunk/neon aesthetic with glass morphism effects, implemented through Tailwind CSS with custom color schemes and animations. Key architectural decisions include:

- **Component Structure**: Modular components for trading dashboard, arbitrage cards, AI strategy panels, and risk management interfaces
- **State Management**: TanStack Query for server state management and caching of trading data
- **Routing**: React Router for client-side navigation with catch-all error handling
- **Styling**: Tailwind CSS with custom design tokens for consistent neon/cyberpunk theming
- **UI Framework**: Radix UI primitives with shadcn/ui components for accessibility and consistency

## Backend Architecture
The backend follows a minimal Express.js architecture with TypeScript, designed for API-first development:

- **Server Framework**: Express.js with TypeScript for type safety and modern JavaScript features
- **Database Layer**: Drizzle ORM with PostgreSQL support, featuring type-safe database operations
- **Storage Interface**: Abstracted storage layer supporting both in-memory (development) and database persistence
- **Development Setup**: Vite integration for hot module replacement during development
- **Build System**: ESBuild for production bundling with optimized output

## Data Storage Solutions
The application uses a flexible data persistence approach:

- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Shared schema definitions between frontend and backend using Drizzle-Zod
- **Development Storage**: In-memory storage implementation for rapid development and testing
- **Migration Strategy**: Drizzle Kit for database schema migrations and version control

## Authentication and Authorization
Currently implementing a basic user management system:

- **User Schema**: Simple username/password authentication with unique constraints
- **Session Management**: Prepared for session-based authentication with connect-pg-simple
- **Development Mode**: No authentication required for development and simulation features

## Risk Management System
Comprehensive risk management with configurable parameters:

- **Position Sizing**: Maximum position size limits and daily trade restrictions
- **Loss Prevention**: Daily loss limits and emergency stop mechanisms
- **Slippage Control**: Configurable maximum slippage tolerance for trade execution
- **Portfolio Allocation**: Configurable allocation between major cryptocurrencies and altcoins
- **Simulation Mode**: Safe testing environment with paper trading capabilities

## AI Strategy Selection
Intelligent strategy selection system with market analysis:

- **Market Sentiment Analysis**: Real-time analysis of market conditions and volatility
- **Strategy Scoring**: Multi-factor scoring system for different arbitrage strategies
- **Confidence Metrics**: AI confidence levels for strategy recommendations
- **Dynamic Allocation**: Automated portfolio allocation based on market conditions

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations and schema management
- **connect-pg-simple**: PostgreSQL session store for authentication

## Frontend Libraries
- **Radix UI**: Accessible, unstyled UI primitives for complex components
- **TanStack Query**: Powerful data synchronization and caching for server state
- **React Hook Form**: Performant form handling with validation support
- **Date-fns**: Modern date utility library for time-based calculations
- **Embla Carousel**: Lightweight carousel component for data visualization

## Development Tools
- **Vite**: Fast development server with hot module replacement
- **TypeScript**: Static type checking and enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **ESBuild**: Fast bundling for production builds
- **Replit Integration**: Development environment optimization for Replit platform

## Supabase Functions
- **AI Strategy Selector**: Edge function for intelligent strategy selection based on market conditions
- **Trading Engine**: Core arbitrage scanning and trade execution engine
- **Real-time Updates**: WebSocket connections for live market data and trade updates

## Mock Services (Development)
- **Mock Supabase Client**: Development-time simulation of Supabase functions
- **Synthetic Market Data**: Generated arbitrage opportunities for testing and demonstration
- **Paper Trading**: Simulated trade execution without real financial risk