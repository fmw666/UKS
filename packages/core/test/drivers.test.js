// @ts-check
'use strict';

const assert = require('assert');
const { FsDriver } = require('../drivers');
const { StorageError } = require('../src/errors');
const path = require('path');
const fs = require('fs');

const TEST_DIR = path.resolve(__dirname, 'driver_test_data');

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

async function testFsDriverCrud() {
    console.log('  [Test] FsDriver CRUD operations');
    const driver = new FsDriver(TEST_DIR);

    // Write
    await driver.write('test.txt', 'Hello Core');
    assert.ok(true, 'Write should not throw');

    // Read
    const content = await driver.read('test.txt');
    assert.strictEqual(content, 'Hello Core', 'Read should return written content');

    // Exists
    const exists = await driver.exists('test.txt');
    assert.strictEqual(exists, true, 'Exists should return true for existing file');

    const notExists = await driver.exists('nonexistent.txt');
    assert.strictEqual(notExists, false, 'Exists should return false for missing file');

    // List
    const files = await driver.list();
    assert.ok(files.includes('test.txt'), 'List should include written file');

    // Read missing file
    const missing = await driver.read('nonexistent.txt');
    assert.strictEqual(missing, null, 'Read of missing file should return null');

    // Delete
    await driver.delete('test.txt');
    const afterDelete = await driver.exists('test.txt');
    assert.strictEqual(afterDelete, false, 'File should not exist after deletion');

    // Delete nonexistent (should not throw)
    await driver.delete('nonexistent.txt');

    console.log('  PASS: FsDriver CRUD');
}

async function testFsDriverValidation() {
    console.log('  [Test] FsDriver constructor validation');
    try {
        new FsDriver('');
        assert.fail('Should throw on empty basePath');
    } catch (e) {
        assert.ok(e instanceof StorageError, 'Should throw StorageError');
    }
    console.log('  PASS: FsDriver validation');
}

async function testSubdirectoryWrite() {
    console.log('  [Test] FsDriver nested directory write');
    const driver = new FsDriver(TEST_DIR);
    await driver.write('sub/dir/nested.txt', 'Nested content');
    const content = await driver.read('sub/dir/nested.txt');
    assert.strictEqual(content, 'Nested content', 'Should read nested file');
    console.log('  PASS: Subdirectory write');
}

async function runAll() {
    console.log('[Unit] Testing Core Drivers...');
    await setup();
    try {
        await testFsDriverCrud();
        await testFsDriverValidation();
        await testSubdirectoryWrite();
        console.log('[PASS] All Core Driver tests passed!');
    } catch (e) {
        console.error('[FAIL]', e);
        process.exit(1);
    } finally {
        await cleanup();
    }
}

runAll();
