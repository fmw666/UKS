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
const CORE_ROOT = path.resolve(__dirname, '../packages/core');
const CLI_BIN = path.resolve(CLI_ROOT, 'index.js');
// E2E graph: use CLI's bundled graph dir so path exists in repo (cross-platform)
const GRAPH_FILE = process.env.UKS_GRAPH_FILE || path.join(CLI_ROOT, 'knowledge', 'uks_graph', 'graph-default.jsonl');
const E2E_STORAGE = path.dirname(GRAPH_FILE);
const TEMP_DATA = path.resolve(CLI_ROOT, 'test/dogfood_temp');

// 1. Setup Environment
if (!fs.existsSync(TEMP_DATA)) fs.mkdirSync(TEMP_DATA, { recursive: true });
if (!fs.existsSync(E2E_STORAGE)) fs.mkdirSync(E2E_STORAGE, { recursive: true });

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
            log('Core Tests', 'running', 'npm test (packages/core)...');
            execSync('npm test', { cwd: CORE_ROOT, stdio: 'pipe' }); 
            log('Core Tests', 'success', 'Core drivers verified');
        } catch (e) {
            log('Core Tests', 'error', `Failed: ${e.stdout?.toString() || e.message}`);
        }

        try {
            log('CLI Tests', 'running', 'npm test (packages/cli)...');
            execSync('npm test', { cwd: CLI_ROOT, stdio: 'pipe' }); // Capture output
            log('CLI Tests', 'success', 'All tests passed via `npm test`');
        } catch (e) {
            log('CLI Tests', 'error', `Failed: ${e.stdout?.toString() || e.message}`);
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
            // Use dedicated graph context; Undo at end for realistic test. Cross-platform env.
            const ingestOut = execSync(`node "${CLI_BIN}" ingest "${testFile}" --json`, {
                env: { ...process.env, UKS_STORAGE_PATH: E2E_STORAGE },
                encoding: 'utf-8'
            });
            const ingestRes = JSON.parse(ingestOut);

            if (ingestRes.errors.length === 0 && ingestRes.entitiesAdded > 0) {
                log('E2E Ingest', 'success', `Ingested ${entityName}`);
            } else {
                throw new Error(`Ingest failed: ${JSON.stringify(ingestRes.errors)}`);
            }

            // 2.3 Verify Search
            const searchOut = execSync(`node "${CLI_BIN}" search "${entityName}"`, {
                env: { ...process.env, UKS_STORAGE_PATH: E2E_STORAGE },
                encoding: 'utf-8'
            });
            const searchRes = JSON.parse(searchOut);
            
            if (searchRes.entities.length > 0 && searchRes.entities[0].name === entityName) {
                log('E2E Search', 'success', `Found entity: ${entityName}`);
            } else {
                throw new Error(`Search failed to find: ${entityName}`);
            }

            // 2.3b Verify Semantic Search (New Feature)
            try {
                // Ensure vector-manager.js logic for generating embedding has run during ingest
                const semanticOut = execSync(`node "${CLI_BIN}" search "${entityName.split('_')[0]}" --semantic`, {
                    env: { ...process.env, UKS_STORAGE_PATH: E2E_STORAGE },
                    encoding: 'utf-8'
                });
                // Extract JSON part (skip "Using semantic search..." log)
                const jsonStart = semanticOut.indexOf('{');
                if (jsonStart !== -1) {
                    const semanticRes = JSON.parse(semanticOut.substring(jsonStart));
                    if (semanticRes.type === 'semantic' && semanticRes.results && semanticRes.results.length > 0) {
                         log('E2E Semantic', 'success', `Semantic Search active (Found ${semanticRes.results.length} results)`);
                    } else {
                        log('E2E Semantic', 'warning', 'Semantic search returned no results or wrong mode');
                    }
                } else {
                    log('E2E Semantic', 'warning', 'No JSON output from semantic search');
                }
            } catch (e) {
                log('E2E Semantic', 'warning', `Semantic search check failed (optional): ${e.message}`);
            }

            // 2.4 Verify Undo (Rollback)
            const undoOut = execSync(`node "${CLI_BIN}" undo`, {
                env: { ...process.env, UKS_STORAGE_PATH: E2E_STORAGE },
                encoding: 'utf-8'
            });
            
            if (undoOut.includes('Reverted')) {
                log('E2E Undo', 'success', 'Rollback successful');
                
                // Double Check: Search again (should be gone)
                const verifyOut = execSync(`node "${CLI_BIN}" search "${entityName}"`, {
                    env: { ...process.env, UKS_STORAGE_PATH: E2E_STORAGE },
                    encoding: 'utf-8'
                });
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
        // Check core library (packages/core/src) for forbidden patterns; CLI has no src/
        try {
            const coreSrc = path.join(CORE_ROOT, 'src');
            let archIssues = [];
            if (fs.existsSync(coreSrc)) {
                const srcFiles = fs.readdirSync(coreSrc).filter(f => f.endsWith('.js'));
                for (const file of srcFiles) {
                    const content = fs.readFileSync(path.join(coreSrc, file), 'utf-8');
                    if (content.includes('/home/node')) archIssues.push(`${file}: Hardcoded /home/node`);
                    if (file === 'graph-manager.js' && content.includes('process.exit')) archIssues.push(`${file}: forbidden process.exit`);
                }
            }

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
