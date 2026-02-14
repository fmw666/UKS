// @ts-check
'use strict';

const assert = require('assert');
const {
    UksError,
    ValidationError,
    LockError,
    StorageError,
    NotFoundError,
    PluginError
} = require('../src/errors');

console.log('[Unit] Testing Error Classes...');

// Test UksError
{
    const err = new UksError('test message', 'TEST_CODE', { foo: 'bar' });
    assert.strictEqual(err.message, 'test message');
    assert.strictEqual(err.code, 'TEST_CODE');
    assert.deepStrictEqual(err.details, { foo: 'bar' });
    assert.strictEqual(err.name, 'UksError');
    assert.ok(err instanceof Error, 'Should be an Error');

    const json = err.toJSON();
    assert.strictEqual(json.error, 'UksError');
    assert.strictEqual(json.code, 'TEST_CODE');
    console.log('  PASS: UksError');
}

// Test Subclasses
{
    const validation = new ValidationError('bad input', { field: 'name' });
    assert.ok(validation instanceof UksError);
    assert.ok(validation instanceof ValidationError);
    assert.strictEqual(validation.code, 'VALIDATION_ERROR');
    assert.strictEqual(validation.name, 'ValidationError');
    console.log('  PASS: ValidationError');

    const lock = new LockError('busy');
    assert.strictEqual(lock.code, 'LOCK_ERROR');
    console.log('  PASS: LockError');

    const storage = new StorageError('disk full');
    assert.strictEqual(storage.code, 'STORAGE_ERROR');
    console.log('  PASS: StorageError');

    const notFound = new NotFoundError('missing');
    assert.strictEqual(notFound.code, 'NOT_FOUND');
    console.log('  PASS: NotFoundError');

    const plugin = new PluginError('load failed');
    assert.strictEqual(plugin.code, 'PLUGIN_ERROR');
    console.log('  PASS: PluginError');
}

console.log('[PASS] All Error Class tests passed!');
