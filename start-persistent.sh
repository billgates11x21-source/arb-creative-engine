#!/bin/bash

# ARB Creative Engine - Persistent Execution Script
# This script ensures the arbitrage engine runs continuously in the background

echo "🚀 Starting ARB Creative Engine with Persistent Background Execution"
echo "📊 Monitoring 80+ DEXes across 7 chains with 5 automated strategies"
echo "💼 Advanced Risk Management & AI Strategy Selection Enabled"
echo ""

# Function to check if process is running
check_process() {
    if pgrep -f "npm run dev" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to start the engine
start_engine() {
    echo "🔄 Starting arbitrage engine..."
    npm run dev &
    ENGINE_PID=$!
    echo "✅ Engine started with PID: $ENGINE_PID"
    
    # Wait for engine to initialize (30 seconds)
    echo "⏳ Initializing engine systems..."
    sleep 30
    
    # Start background arbitrage engine via API
    echo "🎯 Activating background arbitrage engine..."
    curl -X POST http://localhost:5000/api/trading-engine \
         -H "Content-Type: application/json" \
         -d '{"action": "start_background_engine"}' \
         > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Background engine activated successfully"
    else
        echo "⚠️ Background engine activation may have failed"
    fi
}

# Function to monitor and restart if needed
monitor_engine() {
    while true; do
        if ! check_process; then
            echo "❌ Engine process died, restarting..."
            start_engine
        fi
        
        # Check every 30 seconds
        sleep 30
        
        # Status check every 5 minutes
        if [ $(($(date +%s) % 300)) -eq 0 ]; then
            echo "📊 Engine Status Check: $(date)"
            curl -s http://localhost:5000/api/trading-engine \
                 -H "Content-Type: application/json" \
                 -d '{"action": "get_background_status"}' | \
                 jq -r '.status | "Running: \(.isRunning) | Scans: \(.scanCount) | Opportunities: \(.totalOpportunities) | Profit: $\(.totalProfit)"' 2>/dev/null || echo "Status check failed"
        fi
    done
}

# Trap signals to gracefully shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down ARB Creative Engine..."
    
    # Stop background engine
    curl -X POST http://localhost:5000/api/trading-engine \
         -H "Content-Type: application/json" \
         -d '{"action": "stop_background_engine"}' \
         > /dev/null 2>&1
    
    # Kill main process
    if [ ! -z "$ENGINE_PID" ]; then
        kill $ENGINE_PID 2>/dev/null
    fi
    
    # Kill any remaining npm processes
    pkill -f "npm run dev" 2>/dev/null
    
    echo "✅ Engine stopped gracefully"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
echo "🎯 Starting persistent monitoring system..."

# Initial start
start_engine

# Show initial status
echo ""
echo "📈 ARB Creative Engine is now running persistently!"
echo "🔍 Scanning across all supported chains and strategies:"
echo "   • Ethereum (Uniswap V3, Curve, SushiSwap, Balancer, 1inch, etc.)"
echo "   • Polygon (QuickSwap, Uniswap V3, SushiSwap, etc.)"
echo "   • BSC (PancakeSwap, Biswap, MDEX, etc.)"
echo "   • Arbitrum (Uniswap V3, GMX, Camelot, etc.)"
echo "   • Optimism (Velodrome, Uniswap V3, etc.)"
echo "   • Base (Aerodrome, Uniswap V3, etc.)"
echo "   • Avalanche (Trader Joe, Pangolin, etc.)"
echo ""
echo "🤖 Active Strategies:"
echo "   1. Cross-Exchange Arbitrage"
echo "   2. Triangular Arbitrage"
echo "   3. Flash Loan Arbitrage"
echo "   4. Cross-Chain Arbitrage"
echo "   5. Liquidity Pool Arbitrage"
echo ""
echo "🛡️ Advanced Risk Management Active"
echo "💰 Live Trading with OKX Exchange"
echo "📱 Web Interface: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the engine gracefully"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start monitoring loop
monitor_engine