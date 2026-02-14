#!/usr/bin/env node
// @ts-check
'use strict';

const { createContainer, UksError } = require('@uks/core');
const { program } = require('commander');

// Bootstrap DI container — all managers share the same config/storage
const { graphManager, ingestManager, vectorManager, config } = createContainer();

/**
 * Unified error handler for all CLI commands.
 * Outputs structured JSON if --json flag is set, otherwise human-readable.
 * @param {Error} error
 * @param {object} [options]
 * @param {boolean} [options.json]
 */
function handleError(error, options = {}) {
    if (options.json) {
        const payload = error instanceof UksError ? error.toJSON() : { error: error.message };
        console.error(JSON.stringify(payload, null, 2));
    } else {
        const prefix = error instanceof UksError ? `[${error.code}]` : '[ERROR]';
        console.error(`${prefix} ${error.message}`);
    }
    process.exitCode = 1;
}

// --- Config Command ---
program
    .command('config <key> <value>')
    .description('Set global configuration (e.g., storagePath)')
    .action((key, value) => {
        try {
            config.set(key, value);
            console.log(`Config saved: ${key} = ${value}`);
        } catch (e) {
            handleError(/** @type {Error} */ (e));
        }
    });

// --- Ingest Command ---
program
    .command('ingest <pattern>')
    .description('Ingest knowledge files matching glob pattern')
    .option('--dry-run', 'Simulate ingestion without writing')
    .option('--json', 'Output result in JSON format for automation')
    .option('--map <config>', 'Path to mapping configuration (JSON)')
    .option('--strict', 'Enforce schema validation for all files')
    .action(async (pattern, options) => {
        try {
            const report = await ingestManager.ingest(pattern, options);
            if (options.json) {
                console.log(JSON.stringify(report, null, 2));
            } else {
                console.log(`\nIngestion Complete: ${report.processed}/${report.totalFiles} files`);
                console.log(`  Entities added: ${report.entitiesAdded}`);
                console.log(`  Relations added: ${report.relationsAdded}`);
                if (report.errors.length > 0) {
                    console.error('Errors:', report.errors.map(e => `${e.file}: ${e.error}`).join('\n  '));
                }
            }
        } catch (e) {
            handleError(/** @type {Error} */ (e), options);
        }
    });

// --- Search Command ---
program
    .command('search <query>')
    .description('Search the knowledge graph (supports --semantic)')
    .option('--semantic', 'Use semantic vector search')
    .action(async (query, options) => {
        try {
            if (options.semantic) {
                const results = await vectorManager.search(query);
                console.log(JSON.stringify({ type: 'semantic', results }, null, 2));
            } else {
                const result = await graphManager.search(query);
                console.log(JSON.stringify(result, null, 2));
            }
        } catch (e) {
            handleError(/** @type {Error} */ (e));
        }
    });

// --- Undo Command ---
program
    .command('undo')
    .description('Revert graph to the last saved state')
    .action(async () => {
        try {
            const restoredFile = await graphManager.undo();
            console.log(`Reverted to backup: ${restoredFile}`);
        } catch (e) {
            handleError(/** @type {Error} */ (e));
        }
    });

// --- Add Entity ---
program
    .command('add-entity <name> <type>')
    .option('-o, --observations <items>', 'Comma separated observations')
    .action(async (name, type, options) => {
        try {
            const obs = options.observations ? options.observations.split(',').map(s => s.trim()) : [];
            const id = await graphManager.addEntity({ name, entityType: type, observations: obs });
            console.log(`Entity '${name}' added (${id}).`);
        } catch (e) {
            handleError(/** @type {Error} */ (e));
        }
    });

// --- Link Entities ---
program
    .command('link <from> <relation> <to>')
    .action(async (from, relation, to) => {
        try {
            await graphManager.addRelation({ from, to, relationType: relation });
            console.log(`Linked '${from}' --${relation}--> '${to}'`);
        } catch (e) {
            handleError(/** @type {Error} */ (e));
        }
    });

// --- Dump Graph ---
program
    .command('dump')
    .description('Output the entire knowledge graph as JSON')
    .action(async () => {
        try {
            const result = await graphManager.getAll();
            console.log(JSON.stringify(result, null, 2));
        } catch (e) {
            handleError(/** @type {Error} */ (e));
        }
    });

// --- Serve Viewer ---
program
    .command('serve')
    .description('Start the UKS Web Visualizer')
    .option('-p, --port <number>', 'Port to run on', '3000')
    .option('-f, --file <path>', 'Path to graph file', 'graph-default.jsonl')
    .action((options) => {
        try {
            const path = require('path');
            const { spawn } = require('child_process');

            const viewerPath = path.resolve(__dirname, '../viewer');
            const graphFile = path.resolve(process.cwd(), options.file);

            console.log(`Starting UKS Visualizer from ${viewerPath}...`);
            console.log(`Serving graph: ${graphFile}`);

            const server = spawn('npm', ['start'], {
                cwd: viewerPath,
                stdio: 'inherit',
                env: {
                    ...process.env,
                    PORT: options.port,
                    GRAPH_FILE: graphFile
                }
            });

            server.on('error', (err) => {
                handleError(err);
            });
        } catch (e) {
            handleError(/** @type {Error} */ (e));
        }
    });

// Parse and run
if (require.main === module) {
    program.parse(process.argv);
}

module.exports = { program };
