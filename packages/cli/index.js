const config = require('./src/config');
const graphManager = require('./src/graph-manager');
const ingestManager = require('./src/ingest-manager');
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
    .command('search <query>')
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

// If executing directly
if (require.main === module) {
    program.parse(process.argv);
}

module.exports = graphManager;
