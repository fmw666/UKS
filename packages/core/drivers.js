const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { StorageDriver } = require('./types');

/**
 * FileSystem Driver - Default local storage
 */
class FileSystemDriver extends StorageDriver {
    constructor(config = {}) {
        super(config);
        this.baseDir = config.baseDir || process.cwd();
    }

    _resolve(filePath) {
        return path.resolve(this.baseDir, filePath);
    }

    async read(filePath) {
        const fullPath = this._resolve(filePath);
        return fs.promises.readFile(fullPath, 'utf8');
    }

    async write(filePath, content) {
        const fullPath = this._resolve(filePath);
        const dir = path.dirname(fullPath);
        await fs.promises.mkdir(dir, { recursive: true });
        return fs.promises.writeFile(fullPath, content, 'utf8');
    }

    async list(prefix = '') {
        const fullPrefix = this._resolve(prefix);
        if (!fs.existsSync(fullPrefix)) return [];
        
        const files = [];
        const scan = async (dir) => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const res = path.resolve(dir, entry.name);
                if (entry.isDirectory()) {
                    await scan(res);
                } else {
                    files.push(path.relative(this.baseDir, res));
                }
            }
        };
        await scan(fullPrefix);
        return files;
    }

    async exists(filePath) {
        try {
            await fs.promises.access(this._resolve(filePath));
            return true;
        } catch {
            return false;
        }
    }

    async delete(filePath) {
        const fullPath = this._resolve(filePath);
        if (await this.exists(filePath)) {
            return fs.promises.unlink(fullPath);
        }
    }
}

/**
 * Git Driver - Version controlled storage
 */
class GitDriver extends FileSystemDriver {
    constructor(config = {}) {
        super(config);
        this.gitCmd = 'git';
    }

    _exec(command) {
        try {
            execSync(`${this.gitCmd} ${command}`, { cwd: this.baseDir, stdio: 'pipe' });
        } catch (e) {
            // Ignore benign errors or rethrow if critical
        }
    }

    async write(filePath, content) {
        await super.write(filePath, content);
        this._exec(`add "${filePath}"`);
        this._exec(`commit -m "UKS Update: ${filePath}"`);
    }

    async delete(filePath) {
        await super.delete(filePath);
        this._exec(`rm "${filePath}"`);
        this._exec(`commit -m "UKS Delete: ${filePath}"`);
    }
}

/**
 * S3 Driver - AWS/MinIO compatible storage (Mock/Skeleton)
 * Requires 'aws-sdk' or '@aws-sdk/client-s3' to be installed for real usage.
 */
class S3Driver extends StorageDriver {
    constructor(config = {}) {
        super(config);
        this.bucket = config.bucket;
        // In a real implementation:
        // this.s3 = new S3Client(config);
    }

    async read(filePath) {
        throw new Error('S3Driver: Not implemented (requires aws-sdk)');
    }

    async write(filePath, content) {
        throw new Error('S3Driver: Not implemented (requires aws-sdk)');
    }
    
    // ... implement other methods
}

module.exports = {
    FileSystemDriver,
    GitDriver,
    S3Driver
};
