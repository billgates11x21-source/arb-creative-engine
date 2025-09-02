
const fs = require('fs');
const path = require('path');

class SmartContractAuditor {
    constructor() {
        this.findings = [];
        this.criticalIssues = [];
        this.warnings = [];
        this.gasOptimizations = [];
    }

    async auditContract() {
        console.log("🔍 SMART CONTRACT SECURITY AUDIT");
        console.log("=" .repeat(50));
        
        const contractPath = path.join(__dirname, 'FlashLoanArbitrage.sol');
        const contractCode = fs.readFileSync(contractPath, 'utf8');
        
        // Critical Security Checks
        this.checkReentrancyProtection(contractCode);
        this.checkAccessControls(contractCode);
        this.checkFlashLoanSafety(contractCode);
        this.checkIntegerOverflow(contractCode);
        this.checkExternalCallSafety(contractCode);
        this.checkEmergencyMechanisms(contractCode);
        this.checkGasOptimizations(contractCode);
        this.checkDEXIntegrationSafety(contractCode);
        
        this.generateAuditReport();
        return this.getAuditSummary();
    }

    checkReentrancyProtection(code) {
        const checks = [
            {
                pattern: /nonReentrant/g,
                requirement: "ReentrancyGuard modifier",
                found: code.includes('nonReentrant'),
                critical: true
            },
            {
                pattern: /checks-effects-interactions/g,
                requirement: "Checks-Effects-Interactions pattern",
                found: this.checksEffectsInteractions(code),
                critical: true
            }
        ];

        checks.forEach(check => {
            if (!check.found && check.critical) {
                this.criticalIssues.push(`❌ CRITICAL: Missing ${check.requirement}`);
            } else if (check.found) {
                this.findings.push(`✅ ${check.requirement} implemented`);
            }
        });
    }

    checkAccessControls(code) {
        const accessChecks = [
            { pattern: /onlyOwner/g, name: "Owner access control" },
            { pattern: /onlyAuthorized/g, name: "Authorized caller control" },
            { pattern: /authorizedCallers/g, name: "Authorization mapping" }
        ];

        accessChecks.forEach(check => {
            if (code.match(check.pattern)) {
                this.findings.push(`✅ ${check.name} implemented`);
            } else {
                this.warnings.push(`⚠️ Missing ${check.name}`);
            }
        });
    }

    checkFlashLoanSafety(code) {
        const flashLoanChecks = [
            {
                check: code.includes('receiveFlashLoan'),
                message: "Flash loan callback function"
            },
            {
                check: code.includes('msg.sender == BALANCER_VAULT'),
                message: "Flash loan caller validation"
            },
            {
                check: code.includes('totalRepayment'),
                message: "Repayment amount calculation"
            },
            {
                check: code.includes('safeTransfer'),
                message: "Safe token transfers"
            }
        ];

        flashLoanChecks.forEach(check => {
            if (check.check) {
                this.findings.push(`✅ ${check.message} implemented`);
            } else {
                this.criticalIssues.push(`❌ CRITICAL: Missing ${check.message}`);
            }
        });
    }

    checkIntegerOverflow(code) {
        if (code.includes('pragma solidity ^0.8')) {
            this.findings.push("✅ Solidity 0.8+ automatic overflow protection");
        } else {
            this.criticalIssues.push("❌ CRITICAL: Update to Solidity 0.8+ for overflow protection");
        }

        if (code.includes('SafeMath')) {
            this.warnings.push("⚠️ SafeMath unnecessary in Solidity 0.8+");
        }
    }

    checkExternalCallSafety(code) {
        const externalCalls = [
            { pattern: /\.call\(/g, risk: "High", message: "Raw call detected" },
            { pattern: /\.delegatecall\(/g, risk: "Critical", message: "Delegatecall detected" },
            { pattern: /\.send\(/g, risk: "Medium", message: "Send detected" }
        ];

        externalCalls.forEach(call => {
            const matches = code.match(call.pattern);
            if (matches) {
                if (call.risk === "Critical") {
                    this.criticalIssues.push(`❌ CRITICAL: ${call.message} - Review needed`);
                } else {
                    this.warnings.push(`⚠️ ${call.risk} risk: ${call.message}`);
                }
            }
        });
    }

    checkEmergencyMechanisms(code) {
        const emergencyChecks = [
            { pattern: /emergencyWithdraw/g, name: "Emergency withdrawal" },
            { pattern: /pause/g, name: "Pause mechanism" },
            { pattern: /circuit.?breaker/gi, name: "Circuit breaker" }
        ];

        emergencyChecks.forEach(check => {
            if (code.match(check.pattern)) {
                this.findings.push(`✅ ${check.name} implemented`);
            } else {
                this.warnings.push(`⚠️ Consider adding ${check.name}`);
            }
        });
    }

    checkGasOptimizations(code) {
        const gasChecks = [
            {
                pattern: /uint256/g,
                suggestion: "Consider using uint instead of uint256 where possible",
                severity: "Low"
            },
            {
                pattern: /storage/g,
                suggestion: "Minimize storage operations",
                severity: "Medium"
            }
        ];

        if (code.includes('memory') && code.includes('calldata')) {
            this.gasOptimizations.push("✅ Proper memory/calldata usage");
        }
    }

    checkDEXIntegrationSafety(code) {
        const dexChecks = [
            {
                check: code.includes('safeApprove'),
                message: "Safe DEX approvals"
            },
            {
                check: code.includes('deadline'),
                message: "Transaction deadline protection"
            },
            {
                check: code.includes('amountOutMin'),
                message: "Slippage protection"
            }
        ];

        dexChecks.forEach(check => {
            if (check.check) {
                this.findings.push(`✅ ${check.message} implemented`);
            } else {
                this.warnings.push(`⚠️ Missing ${check.message}`);
            }
        });
    }

    checksEffectsInteractions(code) {
        // Simplified check for CEI pattern
        const hasStateChangesBeforeExternalCalls = code.includes('totalProfit +=') && 
                                                  code.includes('safeTransfer');
        return hasStateChangesBeforeExternalCalls;
    }

    generateAuditReport() {
        const report = {
            timestamp: new Date().toISOString(),
            contractName: "FlashLoanArbitrage.sol",
            findings: this.findings,
            criticalIssues: this.criticalIssues,
            warnings: this.warnings,
            gasOptimizations: this.gasOptimizations,
            overallRisk: this.calculateRiskLevel()
        };

        fs.writeFileSync(
            path.join(__dirname, 'audit-report.json'),
            JSON.stringify(report, null, 2)
        );
    }

    calculateRiskLevel() {
        if (this.criticalIssues.length > 0) return "HIGH";
        if (this.warnings.length > 3) return "MEDIUM";
        return "LOW";
    }

    getAuditSummary() {
        console.log("\n📋 AUDIT SUMMARY:");
        console.log("Critical Issues:", this.criticalIssues.length);
        console.log("Warnings:", this.warnings.length);
        console.log("Positive Findings:", this.findings.length);
        console.log("Risk Level:", this.calculateRiskLevel());
        
        if (this.criticalIssues.length > 0) {
            console.log("\n❌ CRITICAL ISSUES:");
            this.criticalIssues.forEach(issue => console.log(issue));
        }

        if (this.warnings.length > 0) {
            console.log("\n⚠️ WARNINGS:");
            this.warnings.forEach(warning => console.log(warning));
        }

        console.log("\n✅ POSITIVE FINDINGS:");
        this.findings.forEach(finding => console.log(finding));

        return {
            isDeploymentReady: this.criticalIssues.length === 0,
            riskLevel: this.calculateRiskLevel(),
            criticalCount: this.criticalIssues.length,
            warningCount: this.warnings.length
        };
    }
}

// Manual audit checklist
const MANUAL_AUDIT_CHECKLIST = {
    "Business Logic": [
        "Arbitrage calculation logic is correct",
        "Profit threshold validation works",
        "DEX route validation is comprehensive",
        "Flash loan repayment logic is bulletproof"
    ],
    "Economic Security": [
        "MEV (Maximum Extractable Value) protection",
        "Front-running attack prevention",
        "Sandwich attack mitigation",
        "Flash loan fee calculations are accurate"
    ],
    "Integration Security": [
        "DEX router addresses are correct for Base network",
        "Token addresses match Base network tokens",
        "Flash loan provider integration is secure",
        "Cross-DEX compatibility is maintained"
    ],
    "Operational Security": [
        "Emergency procedures are functional",
        "Upgrade patterns are secure",
        "Admin key management is robust",
        "Monitoring and alerting capabilities"
    ]
};

if (require.main === module) {
    const auditor = new SmartContractAuditor();
    auditor.auditContract().then(summary => {
        console.log("\n🎯 DEPLOYMENT RECOMMENDATION:");
        if (summary.isDeploymentReady) {
            console.log("✅ Contract passes automated audit - Ready for deployment");
            console.log("💡 Consider professional audit for additional security");
        } else {
            console.log("❌ Fix critical issues before deployment");
            console.log(`Critical issues found: ${summary.criticalCount}`);
        }
        
        console.log("\n📝 MANUAL CHECKLIST:");
        Object.entries(MANUAL_AUDIT_CHECKLIST).forEach(([category, items]) => {
            console.log(`\n${category}:`);
            items.forEach(item => console.log(`  □ ${item}`));
        });
    });
}

module.exports = { SmartContractAuditor };
