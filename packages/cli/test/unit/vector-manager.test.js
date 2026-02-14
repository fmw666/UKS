// @ts-check
'use strict';

const assert = require('assert');
const { VectorManager } = require('@uks/core');

// cosineSimilarity is now a static method
const cosineSimilarity = VectorManager.cosineSimilarity;

// Test Data
const vecA = [1, 0, 0];
const vecB = [0, 1, 0];
const vecC = [1, 1, 0]; // 45 degrees to A and B
const vecZero = [0, 0, 0];

console.log('[Unit] Testing Cosine Similarity...');

// 1. Orthogonal (90 deg) -> 0
{
    const sim = cosineSimilarity(vecA, vecB);
    assert.strictEqual(sim, 0, 'Orthogonal vectors should have 0 similarity');
    console.log('  PASS: Orthogonal check');
}

// 2. Identical (0 deg) -> 1
{
    const sim = cosineSimilarity(vecA, vecA);
    assert.strictEqual(Math.round(sim), 1, 'Identical vectors should have 1 similarity');
    console.log('  PASS: Identical check');
}

// 3. 45 deg -> ~0.707
{
    const sim = cosineSimilarity(vecA, vecC);
    const expected = 1 / Math.sqrt(2);
    assert.ok(Math.abs(sim - expected) < 0.0001, '45-degree check failed');
    console.log('  PASS: Angle check');
}

// 4. Zero vector -> 0 (no NaN)
{
    const sim = cosineSimilarity(vecA, vecZero);
    assert.strictEqual(sim, 0, 'Zero vector should produce 0 similarity (not NaN)');
    console.log('  PASS: Zero vector check');
}

// 5. Both zero vectors -> 0
{
    const sim = cosineSimilarity(vecZero, vecZero);
    assert.strictEqual(sim, 0, 'Both zero vectors should produce 0');
    console.log('  PASS: Both zero vectors check');
}

// 6. Negative vectors
{
    const sim = cosineSimilarity([1, 0], [-1, 0]);
    assert.strictEqual(sim, -1, 'Opposite vectors should have -1 similarity');
    console.log('  PASS: Negative vector check');
}

// 7. Different length vectors (should handle gracefully)
{
    const sim = cosineSimilarity([1, 0, 0, 0], [1, 0]);
    assert.ok(!isNaN(sim), 'Different-length vectors should not produce NaN');
    console.log('  PASS: Different length check');
}

console.log('[PASS] All Vector Logic tests passed!');
