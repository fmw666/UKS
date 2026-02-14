#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
let sendCard;
try {
    // Try to load from local workspace skills (if available)
    sendCard = require('../../../skills/common/feishu-client').sendCard;
} catch (e) {
    // Fallback for CI or standalone usage
    sendCard = async (target, card) => {
        console.log('[Mock SendCard] Would send to', target);
        // console.log(JSON.stringify(card, null, 2));
    };
}

const CLI_ROOT = path.resolve(__dirname, '../packages/cli');
const CLI_BIN = path.resolve(CLI_ROOT, 'index.js');
const GRAPH_FILE = process.env.UKS_GRAPH_FILE || path.resolve(__dirname, '../../knowledge/uks_graph/graph-default.jsonl');
const TEMP_DATA = path.resolve(CLI_ROOT, 'test/dogfood_temp');

// 1. Setup Environment
if (!fs.existsSync(TEMP_DATA)) fs.mkdirSync(TEMP_DATA, { recursive: true });

async function runAudit() {
    let report = {
        title: "🔥 UKS Audit: Full Nichirin Test",
        checks: [],
        status: "success" // success | warning | error
    };

    function log(step, status, detail = '') {
        console.log(`[${status.toUpperCase()}] ${step}: ${detail}`);
        report.checks.push({ step, status, detail });
        if (status === 'error') report.status = 'error';
    }

    try {
        log('Start', 'info', `Environment: ${CLI_ROOT}`);

        // --- PHASE 1: UNIT TEST AUDIT ---
        try {
            log('Unit Tests', 'running', 'npm test...');
            execSync('npm test', { cwd: CLI_ROOT, stdio: 'pipe' }); // Capture output
            log('Unit Tests', 'success', 'All tests passed via `npm test`');
        } catch (e) {
            log('Unit Tests', 'error', `Failed: ${e.stdout?.toString() || e.message}`);
        }

        // --- PHASE 2: FUNCTIONAL AUDIT (E2E SCENARIO) ---
        // Scenario: Ingest -> Search -> Undo -> Verify
        const testFile = path.join(TEMP_DATA, 'dogfood_scenario.json');
        const entityName = `Dogfood_Entity_${Date.now()}`;
        
        try {
            // 2.1 Prepare Test Data
            const testJson = {
                title: entityName,
                archetype: 'TestScenario',
                description: 'Created by Cron Job for E2E validation',
                pillars: [{ name: 'Step1_Ingest' }, { name: 'Step2_Undo' }]
            };
            fs.writeFileSync(testFile, JSON.stringify(testJson));

            // 2.2 Execute Ingest (Real Run on Graph)
            // Use dedicated graph context to avoid polluting main graph too much, 
            // OR use Undo immediately. Let's use main graph + Undo for realistic test.
            const ingestCmd = `export UKS_STORAGE_PATH=${path.dirname(GRAPH_FILE)} && node ${CLI_BIN} ingest "${testFile}" --json`;
            const ingestOut = execSync(ingestCmd).toString();
            const ingestRes = JSON.parse(ingestOut);

            if (ingestRes.errors.length === 0 && ingestRes.entitiesAdded > 0) {
                log('E2E Ingest', 'success', `Ingested ${entityName}`);
            } else {
                throw new Error(`Ingest failed: ${JSON.stringify(ingestRes.errors)}`);
            }

            // 2.3 Verify Search
            const searchCmd = `export UKS_STORAGE_PATH=${path.dirname(GRAPH_FILE)} && node ${CLI_BIN} search "${entityName}"`;
            const searchOut = execSync(searchCmd).toString();
            const searchRes = JSON.parse(searchOut);
            
            if (searchRes.entities.length > 0 && searchRes.entities[0].name === entityName) {
                log('E2E Search', 'success', `Found entity: ${entityName}`);
            } else {
                throw new Error(`Search failed to find: ${entityName}`);
            }

            // 2.4 Verify Undo (Rollback)
            const undoCmd = `export UKS_STORAGE_PATH=${path.dirname(GRAPH_FILE)} && node ${CLI_BIN} undo`;
            const undoOut = execSync(undoCmd).toString(); // "Reverted to backup..."
            
            if (undoOut.includes('Reverted')) {
                log('E2E Undo', 'success', 'Rollback successful');
                
                // Double Check: Search again (should be gone)
                const verifyCmd = `export UKS_STORAGE_PATH=${path.dirname(GRAPH_FILE)} && node ${CLI_BIN} search "${entityName}"`;
                const verifyOut = execSync(verifyCmd).toString();
                const verifyRes = JSON.parse(verifyOut);
                
                if (verifyRes.entities.length === 0) {
                     log('E2E Verify', 'success', 'Entity is GONE after Undo. Perfect!');
                } else {
                    log('E2E Verify', 'error', 'Entity STILL EXISTS after Undo! (Critical Bug)');
                }
            } else {
                 throw new Error(`Undo command failed output: ${undoOut}`);
            }

        } catch (e) {
            log('E2E Scenario', 'error', e.message);
        } finally {
            if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
        }

        // --- PHASE 3: ARCHITECTURE AUDIT ---
        // Check for forbidden patterns in source code
        try {
            const srcFiles = fs.readdirSync(path.join(CLI_ROOT, 'src')).filter(f => f.endsWith('.js'));
            let archIssues = [];

            srcFiles.forEach(file => {
                const content = fs.readFileSync(path.join(CLI_ROOT, 'src', file), 'utf-8');
                
                // Rule 1: No hardcoded paths (e.g., /home/node)
                if (content.includes('/home/node')) archIssues.push(`${file}: Hardcoded /home/node`);
                
                // Rule 2: No process.exit in library code (except ingest-manager fatal error, acceptable for CLI tool but bad for lib)
                // graph-manager should throw, not exit.
                if (file === 'graph-manager.js' && content.includes('process.exit')) archIssues.push(`${file}: forbidden process.exit`);
                
                // Rule 3: No console.log in core logic (should use logger or return values) - strict mode
                // (Skipping for now as we rely on console.log for CLI output)
            });

            if (archIssues.length > 0) {
                log('Architecture', 'warning', `Issues found:\n${archIssues.join('\n')}`);
            } else {
                log('Architecture', 'success', 'Clean code scan (No hardcoded paths/forbidden exits)');
            }

        } catch (e) {
             log('Architecture', 'error', `Scan failed: ${e.message}`);
        }

    } catch (fatal) {
        log('FATAL', 'error', fatal.message);
    }

    // Report Generation
    const color = report.status === 'success' ? 'green' : (report.status === 'error' ? 'red' : 'orange');
    const mood = report.status === 'success' ? '🍱' : (report.status === 'error' ? '🚑' : '🧹');
    
    const card = {
        "header": { "template": color, "title": { "tag": "plain_text", "content": report.title } },
        "elements": [
            { "tag": "div", "text": { "tag": "lark_md", "content": `**${mood} Status: ${report.status.toUpperCase()}**\n` } },
            ...report.checks.map(c => ({
                "tag": "div",
                "text": { "tag": "lark_md", "content": `${c.status === 'success' ? '✅' : (c.status === 'error' ? '❌' : '⚠️')} **${c.step}:** ${c.detail}` }
            })),
            { "tag": "note", "elements": [{ "tag": "plain_text", "content": `PID: ${process.pid} | Time: ${new Date().toISOString()}` }] }
        ]
    };

    await sendCard('ou_94bec5a96dd5980abc1d792a4768d50f', card);
}

runAudit();
