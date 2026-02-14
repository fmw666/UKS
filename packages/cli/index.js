#!/usr/bin/env node
const graphManager = require('./src/graph-manager');
const { program } = require('commander');

// CLI for local testing/usage
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

// Export for module usage
module.exports = graphManager;
