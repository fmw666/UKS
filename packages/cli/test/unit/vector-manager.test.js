const assert = require('assert');
const vectorManager = require('../../src/vector-manager');

// Mock Data
const vecA = [1, 0, 0];
const vecB = [0, 1, 0];
const vecC = [1, 1, 0]; // 45 degree to A and B

console.log('🧪 [Unit] Testing Cosine Similarity...');

// 1. Orthogonal (90 deg) -> 0
const simAB = vectorManager.cosineSimilarity(vecA, vecB);
assert.strictEqual(simAB, 0, 'Orthogonal vectors should have 0 similarity');
console.log('   ✅ Orthogonal Check Passed');

// 2. Identical (0 deg) -> 1
const simAA = vectorManager.cosineSimilarity(vecA, vecA);
assert.strictEqual(Math.round(simAA), 1, 'Identical vectors should have 1 similarity');
console.log('   ✅ Identical Check Passed');

// 3. 45 deg -> ~0.707
const simAC = vectorManager.cosineSimilarity(vecA, vecC);
// dot = 1, normA = 1, normC = sqrt(2) -> 1/sqrt(2)
const expected = 1 / Math.sqrt(2);
assert.ok(Math.abs(simAC - expected) < 0.0001, '45-degree check failed');
console.log('   ✅ Angle Check Passed');

console.log('🎉 Vector Logic Verified!');
