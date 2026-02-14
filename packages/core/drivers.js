const fs = require('fs').promises;
const path = require('path');

class StorageDriver {
    async read(key) { throw new Error('Not implemented'); }
    async write(key, value) { throw new Error('Not implemented'); }
    async list(prefix) { throw new Error('Not implemented'); }
}

class FsDriver extends StorageDriver {
    constructor(basePath) {
        super();
        this.basePath = basePath;
    }

    async read(key) {
        const filePath = path.join(this.basePath, key);
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (e) {
            return null;
        }
    }

    async write(key, value) {
        const filePath = path.join(this.basePath, key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, value);
    }

    async list(prefix = '') {
        // Simplified list implementation
        return []; 
    }
}

module.exports = { StorageDriver, FsDriver };
