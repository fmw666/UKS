// @ts-check
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. Setup Test Environment BEFORE importing core (env must be set first)
const TEST_DIR = path.resolve(__dirname, 'test_data');
process.env.UKS_STORAGE_PATH = TEST_DIR;

// Clean previous run
if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DIR, { recursive: true });

console.log('[Test] Environment Setup: ' + TEST_DIR);

// 2. Load Module via DI container (Post-Env Setup)
const { createContainer } = require('@uks/core');
const { graphManager } = createContainer({ storagePath: TEST_DIR });

async function runTests() {
    try {
        console.log('  [Test 1] Add Entity (Create)');
        const id1 = await graphManager.addEntity({
            name: 'NestJS',
            entityType: 'Framework',
            observations: ['Node.js', 'TypeScript']
        });
        assert.ok(id1, 'Entity ID should be returned');
        assert.ok(id1.startsWith('urn:uks:'), 'ID should be a URN');
        console.log('  PASS: Created Entity: NestJS (' + id1 + ')');

        console.log('  [Test 2] Add Entity (Idempotency)');
        const id2 = await graphManager.addEntity({
            name: 'NestJS',
            observations: ['Backend']
        });
        assert.strictEqual(id1, id2, 'IDs should match for same name');
        console.log('  PASS: Idempotency Verified');

        console.log('  [Test 3] Add Second Entity');
        const id3 = await graphManager.addEntity({
            name: 'Microservices',
            entityType: 'Architecture'
        });
        assert.ok(id3, 'Should return ID for second entity');
        console.log('  PASS: Created Entity: Microservices (' + id3 + ')');

        console.log('  [Test 4] Link Entities');
        const linked = await graphManager.addRelation({
            from: 'NestJS',
            to: 'Microservices',
            relationType: 'supports'
        });
        assert.ok(linked, 'Relation should be created');
        console.log('  PASS: Linked: NestJS --supports--> Microservices');

        console.log('  [Test 5] Search');
        const searchRes = await graphManager.search('Backend');
        assert.strictEqual(searchRes.entities.length, 1, 'Should find 1 entity by observation');
        assert.strictEqual(searchRes.entities[0].name, 'NestJS');
        console.log('  PASS: Search Found: ' + searchRes.entities[0].name);

        console.log('  [Test 6] Dump/Persistence Check');
        const dump = await graphManager.getAll();
        assert.strictEqual(dump.entities.length, 2);
        assert.strictEqual(dump.relations.length, 1);
        console.log('  PASS: Dump Verified (2 entities, 1 relation)');

        console.log('  [Test 7] Input Validation');
        try {
            await graphManager.addEntity({ name: '', entityType: 'Concept' });
            assert.fail('Should reject empty name');
        } catch (e) {
            assert.ok(e.code === 'VALIDATION_ERROR', 'Should be ValidationError');
        }
        console.log('  PASS: Validation works');

        console.log('  [Test 8] Undo');
        await graphManager.addEntity({ name: 'ToRemove', entityType: 'Temp' });
        const preUndo = await graphManager.getAll();
        assert.strictEqual(preUndo.entities.length, 3, 'Should have 3 entities before undo');
        await graphManager.undo();
        const postUndo = await graphManager.getAll();
        assert.strictEqual(postUndo.entities.length, 2, 'Should have 2 entities after undo');
        console.log('  PASS: Undo verified');

        console.log('\n[PASS] ALL CLI TESTS PASSED!');
        process.exit(0);

    } catch (e) {
        console.error('\n[FAIL] TEST FAILED:', e);
        process.exit(1);
    } finally {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    }
}

runTests();
