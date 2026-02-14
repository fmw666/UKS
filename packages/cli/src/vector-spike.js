const { pipeline } = require('@xenova/transformers');

async function testEmbedding() {
    console.log('🔥 Loading Feature Extraction Pipeline...');
    // Use a small, quantized model for speed
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    console.log('🧠 Generating Embedding for "Umai Knowledge Standard"...');
    const output = await extractor('Umai Knowledge Standard', { pooling: 'mean', normalize: true });
    
    console.log(`✅ Embedding Generated! Dimensions: ${output.data.length}`);
    console.log(`🔍 Preview: [${output.data.slice(0, 5)}...]`);
}

testEmbedding().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
