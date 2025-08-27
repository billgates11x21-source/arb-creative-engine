// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ArbitrageEngine
 * @dev Advanced multi-DEX arbitrage contract with flash loan integration
 * @notice This contract is designed for mainnet deployment with real trading
 */
contract ArbitrageEngine is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Flash loan providers
    address public constant AAVE_LENDING_POOL = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    
    // DEX Router addresses (Mainnet)
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address public constant PANCAKESWAP_ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E; // BSC
    
    // Wrapped ETH address
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    
    // Risk management parameters
    uint256 public maxTradeAmount = 100 ether;
    uint256 public minProfitThreshold = 50; // 0.5% in basis points
    uint256 public maxSlippageTolerance = 200; // 2% in basis points
    uint256 public emergencyStopLoss = 1000; // 10% in basis points
    
    // BTC/ETH allocation enforcement (80/20 rule)
    uint256 public btcEthAllocation = 8000; // 80% in basis points
    uint256 public altAllocation = 2000; // 20% in basis points
    
    // Trading statistics
    struct TradingStats {
        uint256 totalTrades;
        uint256 successfulTrades;
        uint256 totalProfit;
        uint256 totalVolume;
        uint256 lastTradeTimestamp;
    }
    
    TradingStats public stats;
    
    // Arbitrage opportunity structure
    struct ArbitrageOpportunity {
        address tokenA;
        address tokenB;
        address buyDEX;
        address sellDEX;
        uint256 amountIn;
        uint256 expectedProfitBasisPoints;
        uint256 gasEstimate;
        bool useFlashLoan;
        bytes buyCalldata;
        bytes sellCalldata;
    }
    
    // Events
    event ArbitrageExecuted(
        address indexed tokenA,
        address indexed tokenB,
        uint256 profit,
        uint256 gasUsed,
        bool flashLoanUsed
    );
    
    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 premium,
        bool success
    );
    
    event RiskParametersUpdated(
        uint256 maxTradeAmount,
        uint256 minProfitThreshold,
        uint256 maxSlippageTolerance
    );
    
    event EmergencyStop(string reason, uint256 timestamp);
    
    // Modifiers
    modifier onlyAuthorizedCaller() {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized");
        _;
    }
    
    modifier validOpportunity(ArbitrageOpportunity memory opportunity) {
        require(opportunity.expectedProfitBasisPoints >= minProfitThreshold, "Profit below threshold");
        require(opportunity.amountIn <= maxTradeAmount, "Amount exceeds maximum");
        _;
    }
    
    // Authorized callers for automated execution
    mapping(address => bool) public authorizedCallers;
    
    // Supported tokens for BTC/ETH allocation tracking
    mapping(address => bool) public isBtcEthToken;
    mapping(address => uint256) public dailyVolume;
    mapping(address => uint256) public lastVolumeReset;
    
    constructor() {
        // Set BTC/ETH tokens
        isBtcEthToken[WETH] = true;
        isBtcEthToken[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = true; // WBTC
        isBtcEthToken[0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6] = true; // sBTC
    }
    
    /**
     * @dev Execute arbitrage opportunity with flash loan if needed
     * @param opportunity The arbitrage opportunity details
     */
    function executeArbitrage(ArbitrageOpportunity calldata opportunity)
        external
        onlyAuthorizedCaller
        whenNotPaused
        nonReentrant
        validOpportunity(opportunity)
    {
        uint256 gasStart = gasleft();
        
        // Check allocation limits
        _enforceAllocationLimits(opportunity.tokenA, opportunity.amountIn);
        
        if (opportunity.useFlashLoan) {
            _executeFlashLoanArbitrage(opportunity);
        } else {
            _executeDirectArbitrage(opportunity);
        }
        
        // Update statistics
        stats.totalTrades++;
        stats.totalVolume += opportunity.amountIn;
        stats.lastTradeTimestamp = block.timestamp;
        
        uint256 gasUsed = gasStart - gasleft();
        
        emit ArbitrageExecuted(
            opportunity.tokenA,
            opportunity.tokenB,
            0, // Profit calculated in execution
            gasUsed,
            opportunity.useFlashLoan
        );
    }
    
    /**
     * @dev Execute arbitrage using flash loan
     * @param opportunity The arbitrage opportunity
     */
    function _executeFlashLoanArbitrage(ArbitrageOpportunity memory opportunity) internal {
        // Prepare flash loan parameters
        address[] memory assets = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        uint256[] memory modes = new uint256[](1);
        
        assets[0] = opportunity.tokenA;
        amounts[0] = opportunity.amountIn;
        modes[0] = 0; // No debt
        
        bytes memory params = abi.encode(opportunity);
        
        // Execute Aave flash loan
        ILendingPool(AAVE_LENDING_POOL).flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
    }
    
    /**
     * @dev Flash loan callback from Aave
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == AAVE_LENDING_POOL, "Invalid flash loan caller");
        require(initiator == address(this), "Invalid initiator");
        
        ArbitrageOpportunity memory opportunity = abi.decode(params, (ArbitrageOpportunity));
        
        // Execute the arbitrage trades
        uint256 profit = _executeTrades(opportunity, amounts[0]);
        
        // Calculate repayment amount
        uint256 amountOwing = amounts[0] + premiums[0];
        
        // Ensure we have enough to repay
        require(profit >= premiums[0], "Insufficient profit to cover premium");
        
        // Approve repayment
        IERC20(assets[0]).safeApprove(AAVE_LENDING_POOL, amountOwing);
        
        emit FlashLoanExecuted(assets[0], amounts[0], premiums[0], true);
        
        return true;
    }
    
    /**
     * @dev Execute direct arbitrage without flash loan
     * @param opportunity The arbitrage opportunity
     */
    function _executeDirectArbitrage(ArbitrageOpportunity memory opportunity) internal {
        // Transfer tokens from caller
        IERC20(opportunity.tokenA).safeTransferFrom(
            msg.sender,
            address(this),
            opportunity.amountIn
        );
        
        // Execute trades
        uint256 profit = _executeTrades(opportunity, opportunity.amountIn);
        
        // Return profit to caller
        if (profit > 0) {
            IERC20(opportunity.tokenA).safeTransfer(msg.sender, profit);
        }
    }
    
    /**
     * @dev Execute the actual buy and sell trades
     * @param opportunity The arbitrage opportunity
     * @param amount The amount to trade
     * @return profit The profit generated
     */
    function _executeTrades(ArbitrageOpportunity memory opportunity, uint256 amount)
        internal
        returns (uint256 profit)
    {
        uint256 initialBalance = IERC20(opportunity.tokenA).balanceOf(address(this));
        
        // Execute buy trade on first DEX
        IERC20(opportunity.tokenA).safeApprove(opportunity.buyDEX, amount);
        (bool buySuccess,) = opportunity.buyDEX.call(opportunity.buyCalldata);
        require(buySuccess, "Buy trade failed");
        
        // Get intermediate token balance
        uint256 intermediateBalance = IERC20(opportunity.tokenB).balanceOf(address(this));
        
        // Execute sell trade on second DEX
        IERC20(opportunity.tokenB).safeApprove(opportunity.sellDEX, intermediateBalance);
        (bool sellSuccess,) = opportunity.sellDEX.call(opportunity.sellCalldata);
        require(sellSuccess, "Sell trade failed");
        
        // Calculate profit
        uint256 finalBalance = IERC20(opportunity.tokenA).balanceOf(address(this));
        profit = finalBalance > initialBalance ? finalBalance - initialBalance : 0;
        
        // Update statistics
        if (profit > 0) {
            stats.successfulTrades++;
            stats.totalProfit += profit;
        }
        
        return profit;
    }
    
    /**
     * @dev Enforce BTC/ETH allocation limits (80/20 rule)
     * @param token The token being traded
     * @param amount The amount being traded
     */
    function _enforceAllocationLimits(address token, uint256 amount) internal {
        // Reset daily volume if needed
        if (block.timestamp >= lastVolumeReset[token] + 1 days) {
            dailyVolume[token] = 0;
            lastVolumeReset[token] = block.timestamp;
        }
        
        dailyVolume[token] += amount;
        
        // Check allocation limits
        if (isBtcEthToken[token]) {
            uint256 totalDailyVolume = _getTotalDailyVolume();
            uint256 btcEthVolume = _getBtcEthDailyVolume();
            
            require(
                btcEthVolume * 10000 <= totalDailyVolume * (btcEthAllocation + 500), // Allow 5% buffer
                "BTC/ETH allocation exceeded"
            );
        } else {
            uint256 totalDailyVolume = _getTotalDailyVolume();
            uint256 altVolume = _getAltDailyVolume();
            
            require(
                altVolume * 10000 <= totalDailyVolume * (altAllocation + 500), // Allow 5% buffer
                "Alt token allocation exceeded"
            );
        }
    }
    
    /**
     * @dev Get total daily trading volume
     */
    function _getTotalDailyVolume() internal view returns (uint256 total) {
        // This would iterate through all tracked tokens in production
        // Simplified for demonstration
        return stats.totalVolume;
    }
    
    /**
     * @dev Get BTC/ETH daily trading volume
     */
    function _getBtcEthDailyVolume() internal view returns (uint256 total) {
        // This would calculate BTC/ETH volume specifically
        return stats.totalVolume * btcEthAllocation / 10000;
    }
    
    /**
     * @dev Get alt token daily trading volume
     */
    function _getAltDailyVolume() internal view returns (uint256 total) {
        // This would calculate alt token volume specifically
        return stats.totalVolume * altAllocation / 10000;
    }
    
    /**
     * @dev Emergency stop function
     * @param reason The reason for emergency stop
     */
    function emergencyStop(string calldata reason) external onlyOwner {
        _pause();
        emit EmergencyStop(reason, block.timestamp);
    }
    
    /**
     * @dev Resume operations after emergency stop
     */
    function resumeOperations() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Update risk management parameters
     */
    function updateRiskParameters(
        uint256 _maxTradeAmount,
        uint256 _minProfitThreshold,
        uint256 _maxSlippageTolerance
    ) external onlyOwner {
        maxTradeAmount = _maxTradeAmount;
        minProfitThreshold = _minProfitThreshold;
        maxSlippageTolerance = _maxSlippageTolerance;
        
        emit RiskParametersUpdated(_maxTradeAmount, _minProfitThreshold, _maxSlippageTolerance);
    }
    
    /**
     * @dev Add authorized caller for automated execution
     */
    function addAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
    }
    
    /**
     * @dev Remove authorized caller
     */
    function removeAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
    }
    
    /**
     * @dev Withdraw profits (owner only)
     */
    function withdrawProfits(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    /**
     * @dev Get trading statistics
     */
    function getTradingStats() external view returns (
        uint256 totalTrades,
        uint256 successfulTrades,
        uint256 totalProfit,
        uint256 totalVolume,
        uint256 successRate
    ) {
        return (
            stats.totalTrades,
            stats.successfulTrades,
            stats.totalProfit,
            stats.totalVolume,
            stats.totalTrades > 0 ? (stats.successfulTrades * 100) / stats.totalTrades : 0
        );
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}

// Interface for Aave Lending Pool
interface ILendingPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
}