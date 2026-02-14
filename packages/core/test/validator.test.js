// @ts-check
'use strict';

const assert = require('assert');
const {
    requireString,
    sanitizeString,
    requireEnum,
    validateObservations,
    validateSafePath,
    validateContext
} = require('../src/validator');
const { ValidationError } = require('../src/errors');

console.log('[Unit] Testing Validator...');

// requireString
{
    assert.strictEqual(requireString('hello', 'test'), 'hello');
    assert.strictEqual(requireString('  trimmed  ', 'test'), 'trimmed');

    assert.throws(() => requireString('', 'test'), ValidationError, 'Empty string should throw');
    assert.throws(() => requireString('   ', 'test'), ValidationError, 'Whitespace-only should throw');
    assert.throws(() => requireString(null, 'test'), ValidationError, 'null should throw');
    assert.throws(() => requireString(123, 'test'), ValidationError, 'number should throw');
    assert.throws(() => requireString(undefined, 'test'), ValidationError, 'undefined should throw');
    console.log('  PASS: requireString');
}

// sanitizeString
{
    assert.strictEqual(sanitizeString('hello', 'test', 10), 'hello');
    assert.throws(() => sanitizeString('a'.repeat(1001), 'test'), ValidationError, 'Exceeds default max');
    assert.throws(() => sanitizeString('toolong', 'test', 3), ValidationError, 'Exceeds custom max');
    console.log('  PASS: sanitizeString');
}

// requireEnum
{
    assert.strictEqual(requireEnum('Concept', ['Concept', 'Tool'], 'type'), 'Concept');
    assert.throws(() => requireEnum('Invalid', ['Concept', 'Tool'], 'type'), ValidationError);
    console.log('  PASS: requireEnum');
}

// validateObservations
{
    assert.deepStrictEqual(validateObservations(null), []);
    assert.deepStrictEqual(validateObservations(undefined), []);
    assert.deepStrictEqual(validateObservations(['a', 'b']), ['a', 'b']);
    assert.throws(() => validateObservations('not-array'), ValidationError);
    assert.throws(() => validateObservations([1, 2]), ValidationError);
    console.log('  PASS: validateObservations');
}

// validateSafePath
{
    const result = validateSafePath('data.jsonl', '/base/dir');
    assert.ok(result.includes('data.jsonl'));
    assert.throws(() => validateSafePath('../../etc/passwd', '/base/dir'), ValidationError, 'Path traversal should throw');
    console.log('  PASS: validateSafePath');
}

// validateContext
{
    assert.strictEqual(validateContext('default'), 'default');
    assert.strictEqual(validateContext('my-context'), 'my-context');
    assert.strictEqual(validateContext('test_123'), 'test_123');
    assert.throws(() => validateContext('bad/context'), ValidationError);
    assert.throws(() => validateContext('bad..context'), ValidationError);
    console.log('  PASS: validateContext');
}

console.log('[PASS] All Validator tests passed!');
