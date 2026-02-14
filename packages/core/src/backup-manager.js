const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');

class BackupManager {
    constructor(basePath) {
        this.basePath = basePath;
        this.backupDir = path.join(basePath, '.backups');
        this.maxBackups = 5; // Keep last 5 snapshots
    }

    async ensureDir() {
        if (!existsSync(this.backupDir)) {
            await fs.mkdir(this.backupDir, { recursive: true });
        }
    }

    async createSnapshot(context = 'default') {
        await this.ensureDir();
        const sourceFile = path.join(this.basePath, `graph-${context}.jsonl`);
        
        if (!existsSync(sourceFile)) return null; // Nothing to backup

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.backupDir, `graph-${context}-${timestamp}.jsonl`);
        
        await fs.copyFile(sourceFile, backupFile);
        
        // Rotate (Prune old backups)
        await this.pruneBackups(context);
        
        return backupFile;
    }

    async pruneBackups(context) {
        const files = await fs.readdir(this.backupDir);
        const backups = files
            .filter(f => f.startsWith(`graph-${context}-`))
            .sort() // Timestamp ensures chronological order
            .reverse(); // Newest first

        if (backups.length > this.maxBackups) {
            const toDelete = backups.slice(this.maxBackups);
            for (const file of toDelete) {
                await fs.unlink(path.join(this.backupDir, file));
            }
        }
    }

    async restoreLatest(context = 'default') {
        await this.ensureDir();
        const files = await fs.readdir(this.backupDir);
        const backups = files
            .filter(f => f.startsWith(`graph-${context}-`))
            .sort()
            .reverse();

        if (backups.length === 0) {
            throw new Error('No backups found to restore.');
        }

        const latest = backups[0];
        const sourceFile = path.join(this.basePath, `graph-${context}.jsonl`);
        const backupFile = path.join(this.backupDir, latest);

        await fs.copyFile(backupFile, sourceFile);
        return latest;
    }
}

module.exports = BackupManager;
