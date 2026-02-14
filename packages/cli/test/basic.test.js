const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Setup Test Environment
const TEST_DIR = path.resolve(__dirname, 'test_data');
process.env.UKS_STORAGE_PATH = TEST_DIR;

// Clean previous run
if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DIR);

console.log('🔥 [Test] Environment Setup: ' + TEST_DIR);

// 2. Load Module (Post-Env Setup)
const graphManager = require('../src/graph-manager');

async function runTests() {
    try {
        console.log('🧪 [Test 1] Add Entity (Create)');
        const id1 = await graphManager.addEntity({
            name: 'NestJS',
            entityType: 'Framework',
            observations: ['Node.js', 'TypeScript']
        });
        assert.ok(id1, 'Entity ID should be returned');
        console.log('   ✅ Created Entity: NestJS (' + id1 + ')');

        console.log('🧪 [Test 2] Add Entity (Idempotency)');
        const id2 = await graphManager.addEntity({
            name: 'NestJS', // Same name
            observations: ['Backend'] // New observation
        });
        assert.strictEqual(id1, id2, 'IDs should match for same name');
        console.log('   ✅ Idempotency Verified');

        console.log('🧪 [Test 3] Add Second Entity');
        const id3 = await graphManager.addEntity({
            name: 'Microservices',
            entityType: 'Architecture'
        });
        console.log('   ✅ Created Entity: Microservices (' + id3 + ')');

        console.log('🧪 [Test 4] Link Entities');
        const linked = await graphManager.addRelation({
            from: 'NestJS',
            to: 'Microservices',
            relationType: 'supports'
        });
        assert.ok(linked, 'Relation should be created');
        console.log('   ✅ Linked: NestJS --supports--> Microservices');

        console.log('🧪 [Test 5] Search');
        const searchRes = await graphManager.search('Backend');
        assert.strictEqual(searchRes.entities.length, 1, 'Should find 1 entity by observation');
        assert.strictEqual(searchRes.entities[0].name, 'NestJS');
        console.log('   ✅ Search Found: ' + searchRes.entities[0].name);

        console.log('🧪 [Test 6] Dump/Persistence Check');
        const dump = await graphManager.getAll();
        assert.strictEqual(dump.entities.length, 2);
        assert.strictEqual(dump.relations.length, 1);
        console.log('   ✅ Dump Verified (2 entities, 1 relation)');

        console.log('\n🎉 ALL TESTS PASSED! Umai! 🔥');
        process.exit(0);

    } catch (e) {
        console.error('\n❌ TEST FAILED:', e);
        process.exit(1);
    } finally {
        // Cleanup
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    }
}

runTests();
