const { 
    GraphManager: graphManager, 
    IngestManager: ingestManager, 
    VectorManager: vectorManager,
} = require('../core'); 

// Config logic is now in core too, but CLI needs to set it.
// We can expose a ConfigManager from core.
// For MVP, let's assume the managers internally use the core config.
// But we need to set 'config' for the CLI command 'uks config set ...'
const config = require('../core/src/config'); 

const { program } = require('commander');

// Config Command
program
    .command('config <key> <value>')
    .description('Set global configuration (e.g., storagePath)')
    .action((key, value) => {
        config.set(key, value);
        console.log(`Config saved: ${key} = ${value}`);
    });

// Ingest Command (Bot-First Design)
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
                console.log(`\n✅ Ingestion Complete: ${report.processed}/${report.totalFiles} files`);
                if (report.errors.length > 0) {
                    console.error('❌ Errors:', report.errors);
                }
            }
        } catch (e) {
            if (options.json) {
                console.error(JSON.stringify({ error: e.message }));
            } else {
                console.error('Fatal Error:', e);
            }
            process.exit(1);
        }
    });

// Search Command (Upgraded)
program
    .command('search <query>')
    .description('Search the knowledge graph (supports --semantic)')
    .option('--semantic', 'Use semantic vector search')
    .action(async (query, options) => {
        if (options.semantic) {
            const results = await vectorManager.search(query);
            console.log(JSON.stringify({ type: 'semantic', results }, null, 2));
        } else {
            const result = await graphManager.search(query);
            console.log(JSON.stringify(result, null, 2));
        }
    });

// Undo Command (New)
program
    .command('undo')
    .description('Revert graph to the last saved state')
    .action(async () => {
        try {
            const restoredFile = await graphManager.undo();
            console.log(`✅ Reverted to backup: ${restoredFile}`);
        } catch (e) {
            console.error('❌ Undo Failed:', e.message);
        }
    });

// Basic Commands
program
    .command('add-entity <name> <type>')
    .option('-o, --observations <items>', 'Comma separated observations')
    .action(async (name, type, options) => {
        const obs = options.observations ? options.observations.split(',') : [];
        await graphManager.addEntity({ name, entityType: type, observations: obs });
        console.log(`Entity '${name}' added.`);
    });
    
program
    .command('link <from> <relation> <to>')
    .action(async (from, relation, to) => {
        await graphManager.addRelation({ from, to, relationType: relation });
        console.log(`Linked '${from}' --${relation}--> '${to}'`);
    });

program
    .command('search-old <query>') // Renamed to avoid conflict if any
    .action(async (query) => {
        const result = await graphManager.search(query);
        console.log(JSON.stringify(result, null, 2));
    });

program
    .command('dump')
    .action(async () => {
        const result = await graphManager.getAll();
        console.log(JSON.stringify(result, null, 2));
    });

program
    .command('serve')
    .description('Start the UKS Web Visualizer')
    .option('-p, --port <number>', 'Port to run on', 3000)
    .option('-f, --file <path>', 'Path to graph file', 'graph-default.jsonl')
    .action((options) => {
        const path = require('path');
        const { spawn } = require('child_process');
        
        const viewerPath = path.resolve(__dirname, '../viewer');
        const graphFile = path.resolve(process.cwd(), options.file);
        
        console.log(`🚀 Starting UKS Visualizer from ${viewerPath}...`);
        console.log(`📄 Serving graph: ${graphFile}`);

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
            console.error('Failed to start viewer:', err);
        });
    });

// If executing directly
if (require.main === module) {
    program.parse(process.argv);
}

module.exports = graphManager;
