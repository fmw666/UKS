const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { FileSystemDriver, GitDriver } = require('../drivers');

const TEST_DIR = path.join(__dirname, 'test_storage');

async function runTests() {
    console.log('Running Driver Tests...');

    // Setup
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR);

    try {
        // --- FileSystemDriver Tests ---
        const fsDriver = new FileSystemDriver({ baseDir: TEST_DIR });

        // Test Write
        await fsDriver.write('hello.txt', 'Hello World');
        const writtenPath = path.join(TEST_DIR, 'hello.txt');
        assert.ok(fs.existsSync(writtenPath), 'File should exist on disk');
        assert.strictEqual(fs.readFileSync(writtenPath, 'utf8'), 'Hello World', 'Content should match');
        console.log('✅ FS Write passed');

        // Test Read
        const content = await fsDriver.read('hello.txt');
        assert.strictEqual(content, 'Hello World', 'Read content should match');
        console.log('✅ FS Read passed');

        // Test Exists
        assert.strictEqual(await fsDriver.exists('hello.txt'), true, 'File should exist');
        assert.strictEqual(await fsDriver.exists('missing.txt'), false, 'File should not exist');
        console.log('✅ FS Exists passed');

        // Test List
        await fsDriver.write('subdir/test.txt', 'Sub content');
        const files = await fsDriver.list();
        assert.ok(files.includes('hello.txt'), 'List should include hello.txt');
        assert.ok(files.includes(path.normalize('subdir/test.txt')), 'List should include subdir/test.txt');
        console.log('✅ FS List passed');

        // Test Delete
        await fsDriver.delete('hello.txt');
        assert.strictEqual(await fsDriver.exists('hello.txt'), false, 'File should be deleted');
        console.log('✅ FS Delete passed');


        // --- GitDriver Tests (Instantiation only) ---
        // We can't easily test git commands without a repo, but we can check if it inherits correctly
        const gitDriver = new GitDriver({ baseDir: TEST_DIR });
        assert.ok(gitDriver instanceof FileSystemDriver, 'GitDriver should extend FileSystemDriver');
        console.log('✅ GitDriver Instantiation passed');

        console.log('\n🎉 All Driver Tests Passed!');
    } catch (e) {
        console.error('❌ Test Failed:', e);
        process.exit(1);
    } finally {
        // Cleanup
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    }
}

runTests();
