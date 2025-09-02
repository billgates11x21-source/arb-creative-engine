// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFlashLoanProvider {
    function flashLoan(
        address receiver,
        address asset,
        uint256 amount,
        bytes calldata params
    ) external;
}

interface IDEXRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
}

interface IEqualizerRouter {
    function swapExactTokensForTokensSimple(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenFrom,
        address tokenTo,
        bool stable,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        bool stable
    ) external view returns (uint256 amount);
}

interface IAerodromeRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract FlashLoanArbitrage is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Base network DEX addresses
    address public constant AERODROME_ROUTER = 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;
    address public constant EQUALIZER_ROUTER = 0x8c0f6a1f6a7f4e0e4f4c4f4a4f4e4f4e4f4e4f4e;
    address public constant UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    // Base network token addresses
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant DAI = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;

    // Flash loan providers on Base
    address public constant AAVE_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address public constant BALANCER_FLASH_LOANS = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    struct ArbitrageParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        address dexA;
        address dexB;
        bytes routeA;
        bytes routeB;
        uint256 minProfit;
    }

    struct FlashLoanData {
        address asset;
        uint256 amount;
        address initiator;
        ArbitrageParams params;
    }

    event ArbitrageExecuted(
        address indexed asset,
        uint256 amount,
        uint256 profit,
        address indexed initiator
    );

    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 fee,
        bool success
    );

    event ProfitWithdrawn(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );

    mapping(address => bool) public authorizedCallers;
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public minTradeAmounts;

    uint256 public maxSlippage = 300; // 3%
    uint256 public minProfitBps = 5; // 0.05%
    uint256 public totalProfit;
    uint256 public totalTrades;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() {
        // Initialize supported tokens on Base
        supportedTokens[WETH] = true;
        supportedTokens[USDC] = true;
        supportedTokens[DAI] = true;

        // Set minimum trade amounts
        minTradeAmounts[WETH] = 0.01 ether;
        minTradeAmounts[USDC] = 10 * 1e6; // 10 USDC
        minTradeAmounts[DAI] = 10 * 1e18; // 10 DAI

        // Authorize contract deployer
        authorizedCallers[msg.sender] = true;
    }

    // Main flash loan arbitrage function
    function executeFlashLoanArbitrage(
        address flashLoanProvider,
        address asset,
        uint256 amount,
        ArbitrageParams calldata params
    ) external onlyAuthorized nonReentrant {
        require(supportedTokens[asset], "Token not supported");
        require(amount >= minTradeAmounts[asset], "Amount below minimum");

        // Encode parameters for flash loan callback
        bytes memory data = abi.encode(FlashLoanData({
            asset: asset,
            amount: amount,
            initiator: msg.sender,
            params: params
        }));

        // Execute flash loan
        if (flashLoanProvider == BALANCER_VAULT) {
            executeBalancerFlashLoan(asset, amount, data);
        } else if (flashLoanProvider == AAVE_POOL) {
            executeAaveFlashLoan(asset, amount, data);
        } else {
            revert("Unsupported flash loan provider");
        }
    }

    function executeBalancerFlashLoan(
        address asset,
        uint256 amount,
        bytes memory userData
    ) internal {
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = asset;
        amounts[0] = amount;

        // Balancer flash loan with no fee
        IFlashLoanProvider(BALANCER_VAULT).flashLoan(
            address(this),
            asset,
            amount,
            userData
        );
    }

    function executeAaveFlashLoan(
        address asset,
        uint256 amount,
        bytes memory userData
    ) internal {
        // Aave flash loan (0.05% fee)
        IFlashLoanProvider(AAVE_POOL).flashLoan(
            address(this),
            asset,
            amount,
            userData
        );
    }

    // Flash loan callback - executed during the flash loan
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT || msg.sender == AAVE_POOL, "Invalid caller");

        FlashLoanData memory data = abi.decode(userData, (FlashLoanData));

        // Execute arbitrage with borrowed funds
        uint256 profit = executeArbitrageLogic(data);

        // Ensure we can repay the flash loan + fees
        uint256 totalRepayment = amounts[0] + feeAmounts[0];
        require(IERC20(tokens[0]).balanceOf(address(this)) >= totalRepayment, "Insufficient funds to repay");

        // Repay flash loan
        IERC20(tokens[0]).safeTransfer(msg.sender, totalRepayment);

        // Send profit to initiator
        if (profit > 0) {
            IERC20(tokens[0]).safeTransfer(data.initiator, profit);
            totalProfit += profit;
            totalTrades++;

            emit ArbitrageExecuted(tokens[0], amounts[0], profit, data.initiator);
        }

        emit FlashLoanExecuted(tokens[0], amounts[0], feeAmounts[0], profit > 0);
    }

    function executeArbitrageLogic(FlashLoanData memory data) internal returns (uint256) {
        uint256 initialBalance = IERC20(data.asset).balanceOf(address(this));

        // Step 1: Swap on DEX A (buy low)
        uint256 amountOut = executeSwapOnDEX(
            data.params.dexA,
            data.asset,
            data.params.tokenOut,
            data.amount,
            data.params.routeA
        );

        require(amountOut > 0, "First swap failed");

        // Step 2: Swap back on DEX B (sell high)
        uint256 finalAmount = executeSwapOnDEX(
            data.params.dexB,
            data.params.tokenOut,
            data.asset,
            amountOut,
            data.params.routeB
        );

        require(finalAmount > initialBalance, "Arbitrage not profitable");

        return finalAmount - initialBalance;
    }

    function executeSwapOnDEX(
        address dexRouter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory routeData
    ) internal returns (uint256) {
        IERC20(tokenIn).safeApprove(dexRouter, amountIn);

        if (dexRouter == AERODROME_ROUTER) {
            return executeAerodromeSwap(tokenIn, tokenOut, amountIn, routeData);
        } else if (dexRouter == EQUALIZER_ROUTER) {
            return executeEqualizerSwap(tokenIn, tokenOut, amountIn, routeData);
        } else if (dexRouter == UNISWAP_V3_ROUTER) {
            return executeUniswapV3Swap(tokenIn, tokenOut, amountIn, routeData);
        } else {
            revert("Unsupported DEX");
        }
    }

    function executeAerodromeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory routeData
    ) internal returns (uint256) {
        IAerodromeRouter.Route[] memory routes = abi.decode(routeData, (IAerodromeRouter.Route[]));

        uint256[] memory amounts = IAerodromeRouter(AERODROME_ROUTER).swapExactTokensForTokens(
            amountIn,
            0, // Accept any amount of tokens out
            routes,
            address(this),
            block.timestamp + 300
        );

        return amounts[amounts.length - 1];
    }

    function executeEqualizerSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory routeData
    ) internal returns (uint256) {
        bool stable = abi.decode(routeData, (bool));

        uint256[] memory amounts = IEqualizerRouter(EQUALIZER_ROUTER).swapExactTokensForTokensSimple(
            amountIn,
            0,
            tokenIn,
            tokenOut,
            stable,
            address(this),
            block.timestamp + 300
        );

        return amounts[amounts.length - 1];
    }

    function executeUniswapV3Swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory routeData
    ) internal returns (uint256) {
        address[] memory path = abi.decode(routeData, (address[]));

        uint256[] memory amounts = IDEXRouter(UNISWAP_V3_ROUTER).swapExactTokensForTokens(
            amountIn,
            0,
            path,
            address(this),
            block.timestamp + 300
        );

        return amounts[amounts.length - 1];
    }

    // Calculate potential profit before executing
    function calculatePotentialProfit(
        address tokenA,
        address tokenB,
        uint256 amount,
        address dexA,
        address dexB,
        bytes calldata routeA,
        bytes calldata routeB
    ) external view returns (uint256 estimatedProfit, bool isProfitable) {
        // Get amount out from DEX A
        uint256 amountOutA;
        if (dexA == EQUALIZER_ROUTER) {
            bool stable = abi.decode(routeA, (bool));
            amountOutA = IEqualizerRouter(dexA).getAmountOut(amount, tokenA, tokenB, stable);
        } else if (dexA == UNISWAP_V3_ROUTER) {
            address[] memory pathA = abi.decode(routeA, (address[]));
            uint256[] memory amountsA = IDEXRouter(dexA).getAmountsOut(amount, pathA);
            amountOutA = amountsA[amountsA.length - 1];
        }

        // Get amount out from DEX B (swap back)
        uint256 finalAmount;
        if (dexB == EQUALIZER_ROUTER) {
            bool stable = abi.decode(routeB, (bool));
            finalAmount = IEqualizerRouter(dexB).getAmountOut(amountOutA, tokenB, tokenA, stable);
        } else if (dexB == UNISWAP_V3_ROUTER) {
            address[] memory pathB = abi.decode(routeB, (address[]));
            uint256[] memory amountsB = IDEXRouter(dexB).getAmountsOut(amountOutA, pathB);
            finalAmount = amountsB[amountsB.length - 1];
        }

        if (finalAmount > amount) {
            estimatedProfit = finalAmount - amount;
            isProfitable = estimatedProfit >= (amount * minProfitBps) / 10000;
        } else {
            estimatedProfit = 0;
            isProfitable = false;
        }
    }

    // OKX wallet address for emergency withdrawals
    address public constant OKX_WALLET = 0xecfcd0c695c7d66be1a957e84ac822ce95ac6e24;
    
    // Emergency functions
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            // Transfer profits directly to OKX wallet address
            IERC20(token).safeTransfer(OKX_WALLET, balance);
            emit ProfitWithdrawn(token, balance, OKX_WALLET);
        }
    }
    
    // Emergency withdrawal to specific address (fallback)
    function emergencyWithdrawTo(address token, address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(recipient, balance);
            emit ProfitWithdrawn(token, balance, recipient);
        }
    }

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            // Transfer profits to the owner's OKX spot wallet
            payable(owner()).transfer(balance);
            emit ProfitWithdrawn(address(0), balance, owner()); // Assuming address(0) for ETH
        }
    }

    // Admin functions
    function addAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = true;
    }

    function removeAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
    }

    function addSupportedToken(address token, uint256 minAmount) external onlyOwner {
        supportedTokens[token] = true;
        minTradeAmounts[token] = minAmount;
    }

    function updateMinProfitBps(uint256 newMinProfit) external onlyOwner {
        require(newMinProfit <= 1000, "Min profit too high"); // Max 10%
        minProfitBps = newMinProfit;
    }

    function updateMaxSlippage(uint256 newMaxSlippage) external onlyOwner {
        require(newMaxSlippage <= 1000, "Max slippage too high"); // Max 10%
        maxSlippage = newMaxSlippage;
    }

    // View functions
    function getContractStats() external view returns (
        uint256 _totalProfit,
        uint256 _totalTrades,
        uint256 _minProfitBps,
        uint256 _maxSlippage
    ) {
        return (totalProfit, totalTrades, minProfitBps, maxSlippage);
    }

    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    function getMinTradeAmount(address token) external view returns (uint256) {
        return minTradeAmounts[token];
    }

    // Fallback to receive ETH
    receive() external payable {}
}