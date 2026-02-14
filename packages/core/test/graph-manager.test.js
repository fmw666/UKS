// @ts-check
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KnowledgeGraphManager, ValidationError, NotFoundError } = require('../index');
const BackupManager = require('../src/backup-manager');

const TEST_DIR = path.resolve(__dirname, 'gm_test_data');

async function setup() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
}

async function cleanup() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}

function createManager() {
    return new KnowledgeGraphManager({ basePath: TEST_DIR });
}

async function testAddEntity() {
    console.log('  [Test] Add entity');
    const gm = createManager();
    const id = await gm.addEntity({ name: 'Node.js', entityType: 'Tool', observations: ['JavaScript runtime'] });
    assert.ok(id, 'Should return entity ID');
    assert.ok(id.startsWith('urn:uks:'), 'ID should be a URN');

    const graph = await gm.getAll();
    assert.strictEqual(graph.entities.length, 1);
    assert.strictEqual(graph.entities[0].name, 'Node.js');
    assert.strictEqual(graph.entities[0].entityType, 'Tool');
    console.log('  PASS: Add entity');
}

async function testMergeEntity() {
    console.log('  [Test] Merge entity observations');
    const gm = createManager();
    const id1 = await gm.addEntity({ name: 'Node.js', observations: ['New observation'] });
    const graph = await gm.getAll();
    const entity = graph.entities.find(e => e.name === 'Node.js');
    assert.ok(entity.observations.includes('JavaScript runtime'), 'Should keep old observations');
    assert.ok(entity.observations.includes('New observation'), 'Should add new observations');
    console.log('  PASS: Merge entity');
}

async function testAddRelation() {
    console.log('  [Test] Add relation');
    const gm = createManager();
    await gm.addEntity({ name: 'Express', entityType: 'Framework' });
    await gm.addRelation({ from: 'Node.js', to: 'Express', relationType: 'supports' });

    const graph = await gm.getAll();
    assert.strictEqual(graph.relations.length, 1);
    assert.strictEqual(graph.relations[0].relationType, 'supports');
    console.log('  PASS: Add relation');
}

async function testRelationNotFound() {
    console.log('  [Test] Relation to non-existent entity');
    const gm = createManager();
    try {
        await gm.addRelation({ from: 'Node.js', to: 'NonExistent', relationType: 'uses' });
        assert.fail('Should throw NotFoundError');
    } catch (e) {
        assert.ok(e instanceof NotFoundError, `Expected NotFoundError, got ${e.constructor.name}`);
    }
    console.log('  PASS: Relation not found');
}

async function testSearch() {
    console.log('  [Test] Keyword search');
    const gm = createManager();
    const result = await gm.search('runtime');
    assert.strictEqual(result.entities.length, 1);
    assert.strictEqual(result.entities[0].name, 'Node.js');
    assert.strictEqual(result.metadata.mode, 'keyword');
    console.log('  PASS: Search');
}

async function testSearchValidation() {
    console.log('  [Test] Search validation');
    const gm = createManager();
    try {
        await gm.search('');
        assert.fail('Should throw on empty query');
    } catch (e) {
        assert.ok(e instanceof ValidationError);
    }
    console.log('  PASS: Search validation');
}

async function testUndo() {
    console.log('  [Test] Undo');
    const gm = createManager();
    const beforeGraph = await gm.getAll();
    const beforeCount = beforeGraph.entities.length;

    await gm.addEntity({ name: 'ToBeUndone', entityType: 'Concept' });
    const afterAdd = await gm.getAll();
    assert.strictEqual(afterAdd.entities.length, beforeCount + 1);

    await gm.undo();
    const afterUndo = await gm.getAll();
    assert.strictEqual(afterUndo.entities.length, beforeCount, 'Undo should restore previous state');
    console.log('  PASS: Undo');
}

async function testEntityValidation() {
    console.log('  [Test] Entity input validation');
    const gm = createManager();
    try {
        await gm.addEntity({ name: '', entityType: 'Concept' });
        assert.fail('Should throw on empty name');
    } catch (e) {
        assert.ok(e instanceof ValidationError);
    }

    try {
        await gm.addEntity({ name: 'Test', observations: 'not-array' });
        assert.fail('Should throw on non-array observations');
    } catch (e) {
        assert.ok(e instanceof ValidationError);
    }
    console.log('  PASS: Entity validation');
}

async function runAll() {
    console.log('[Unit] Testing GraphManager...');
    await setup();
    try {
        await testAddEntity();
        await testMergeEntity();
        await testAddRelation();
        await testRelationNotFound();
        await testSearch();
        await testSearchValidation();
        await testUndo();
        await testEntityValidation();
        console.log('[PASS] All GraphManager tests passed!');
    } catch (e) {
        console.error('[FAIL]', e);
        process.exit(1);
    } finally {
        await cleanup();
    }
}

runAll();
