const assert = require('assert');
const { FsDriver } = require('../drivers');
const path = require('path');
const fs = require('fs');

console.log('🧪 [Unit] Testing Core Drivers...');

const TEST_DIR = path.resolve(__dirname, 'driver_test_data');
if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

async function testFsDriver() {
    const driver = new FsDriver(TEST_DIR);
    
    // Write
    await driver.write('test.txt', 'Hello Core');
    console.log('   ✅ Write success');

    // Read
    const content = await driver.read('test.txt');
    assert.strictEqual(content, 'Hello Core');
    console.log('   ✅ Read success');

    // Cleanup
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

testFsDriver()
    .then(() => console.log('🎉 Core Drivers Verified!'))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
