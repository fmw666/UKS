// @ts-check
'use strict';

const fs = require('fs').promises;
const { existsSync } = require('fs');
const path = require('path');
const { StorageError, NotFoundError } = require('./errors');

/**
 * Manages backup snapshots for graph files.
 * Supports automatic rotation to prevent disk bloat.
 */
class BackupManager {
    /**
     * @param {string} basePath - Base directory where graph files live
     * @param {object} [options]
     * @param {number} [options.maxBackups=5] - Maximum number of backups to retain
     */
    constructor(basePath, options = {}) {
        if (!basePath || typeof basePath !== 'string') {
            throw new StorageError('BackupManager requires a valid basePath');
        }
        /** @type {string} */
        this.basePath = basePath;
        /** @type {string} */
        this.backupDir = path.join(basePath, '.backups');
        /** @type {number} */
        this.maxBackups = options.maxBackups || 5;
    }

    /** Ensure the backup directory exists. */
    async ensureDir() {
        if (!existsSync(this.backupDir)) {
            await fs.mkdir(this.backupDir, { recursive: true });
        }
    }

    /**
     * Create a snapshot of the current graph file.
     * @param {string} [context='default']
     * @returns {Promise<string|null>} Path to the backup file, or null if nothing to backup
     */
    async createSnapshot(context = 'default') {
        await this.ensureDir();
        const sourceFile = path.join(this.basePath, `graph-${context}.jsonl`);

        if (!existsSync(sourceFile)) return null;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.backupDir, `graph-${context}-${timestamp}.jsonl`);

        try {
            await fs.copyFile(sourceFile, backupFile);
        } catch (e) {
            throw new StorageError(`Failed to create backup: ${e.message}`, { sourceFile, backupFile });
        }

        await this.pruneBackups(context);
        return backupFile;
    }

    /**
     * Remove old backups exceeding the retention limit.
     * @param {string} context
     * @returns {Promise<void>}
     */
    async pruneBackups(context) {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = files
                .filter(f => f.startsWith(`graph-${context}-`))
                .sort()
                .reverse(); // Newest first

            if (backups.length > this.maxBackups) {
                const toDelete = backups.slice(this.maxBackups);
                for (const file of toDelete) {
                    await fs.unlink(path.join(this.backupDir, file));
                }
            }
        } catch (e) {
            // Non-fatal: pruning failure should not break the main operation
            console.warn(`[BackupManager] Prune failed: ${e.message}`);
        }
    }

    /**
     * Restore the most recent backup for a context.
     * @param {string} [context='default']
     * @returns {Promise<string>} Name of the restored backup file
     * @throws {NotFoundError} If no backups are available
     */
    async restoreLatest(context = 'default') {
        await this.ensureDir();
        const files = await fs.readdir(this.backupDir);
        const backups = files
            .filter(f => f.startsWith(`graph-${context}-`))
            .sort()
            .reverse();

        if (backups.length === 0) {
            throw new NotFoundError('No backups found to restore.', { context });
        }

        const latest = backups[0];
        const sourceFile = path.join(this.basePath, `graph-${context}.jsonl`);
        const backupFile = path.join(this.backupDir, latest);

        try {
            await fs.copyFile(backupFile, sourceFile);
        } catch (e) {
            throw new StorageError(`Failed to restore backup: ${e.message}`, { backupFile });
        }

        return latest;
    }
}

module.exports = BackupManager;
