#!/usr/bin/env node
'use strict';

/**
 * Version Sync Script
 *
 * Single source of truth: ./VERSION file at repo root.
 * This script reads the version from VERSION and propagates it to:
 *   - All package.json files (version field)
 *   - Internal dependency references (@uks/core)
 *   - MCP Server version declaration
 *   - README.md badge
 *   - TUTORIAL.md title
 *   - AI_PROTOCOL.md title
 *
 * Usage:
 *   node scripts/sync-version.js          # Sync from VERSION file
 *   node scripts/sync-version.js 2.0.0    # Set new version and sync
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERSION_FILE = path.join(ROOT, 'VERSION');

// --- Resolve version ---
let version = process.argv[2];
if (version) {
    // Validate semver format (basic)
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
        console.error(`Invalid version format: "${version}". Expected: X.Y.Z or X.Y.Z-tag`);
        process.exit(1);
    }
    fs.writeFileSync(VERSION_FILE, version + '\n');
    console.log(`VERSION file updated to: ${version}`);
} else {
    if (!fs.existsSync(VERSION_FILE)) {
        console.error('VERSION file not found. Create it or pass a version argument.');
        process.exit(1);
    }
    version = fs.readFileSync(VERSION_FILE, 'utf-8').trim();
}

console.log(`Syncing version: ${version}\n`);

let updatedCount = 0;

// --- Helper: update JSON file field ---
function updateJsonField(filePath, field, value) {
    const rel = path.relative(ROOT, filePath);
    if (!fs.existsSync(filePath)) {
        console.log(`  SKIP  ${rel} (not found)`);
        return;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);

    // Navigate nested field (e.g., "dependencies.@uks/core")
    const parts = field.split('.');
    let obj = json;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) return; // Field path doesn't exist
        obj = obj[parts[i]];
    }
    const key = parts[parts.length - 1];

    if (obj[key] === value) {
        console.log(`  OK    ${rel} → ${field} already "${value}"`);
        return;
    }

    obj[key] = value;
    // Preserve original indentation
    const indent = content.match(/^(\s+)"/m)?.[1] || '  ';
    fs.writeFileSync(filePath, JSON.stringify(json, null, indent.length) + '\n');
    console.log(`  WRITE ${rel} → ${field} = "${value}"`);
    updatedCount++;
}

// --- Helper: regex replace in text file ---
function updateTextFile(filePath, patterns) {
    const rel = path.relative(ROOT, filePath);
    if (!fs.existsSync(filePath)) {
        console.log(`  SKIP  ${rel} (not found)`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    for (const { regex, replacement } of patterns) {
        const newContent = content.replace(regex, replacement);
        if (newContent !== content) {
            content = newContent;
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`  WRITE ${rel}`);
        updatedCount++;
    } else {
        console.log(`  OK    ${rel} (no changes needed)`);
    }
}

// ============================================================
// 1. package.json files — "version" field
// ============================================================
console.log('[1/4] package.json files');
const packageJsonPaths = [
    path.join(ROOT, 'package.json'),
    path.join(ROOT, 'packages/core/package.json'),
    path.join(ROOT, 'packages/cli/package.json'),
    path.join(ROOT, 'packages/mcp-server/package.json'),
    path.join(ROOT, 'packages/viewer/package.json'),
];

for (const p of packageJsonPaths) {
    updateJsonField(p, 'version', version);
}

// ============================================================
// 2. Internal dependency versions (@uks/core)
// ============================================================
console.log('\n[2/4] Internal dependencies');
updateJsonField(
    path.join(ROOT, 'packages/mcp-server/package.json'),
    'dependencies.@uks/core',
    `^${version}`
);

// ============================================================
// 3. Source code version declarations
// ============================================================
console.log('\n[3/4] Source code');
updateTextFile(path.join(ROOT, 'packages/mcp-server/index.js'), [
    {
        regex: /version:\s*"[\d]+\.[\d]+\.[\d]+[^"]*"/,
        replacement: `version: "${version}"`
    }
]);

// ============================================================
// 4. Documentation
// ============================================================
console.log('\n[4/4] Documentation');

updateTextFile(path.join(ROOT, 'README.md'), [
    {
        regex: /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-v[^)]*?\)/,
        replacement: `![Version](https://img.shields.io/badge/version-v${version}-red)`
    }
]);

updateTextFile(path.join(ROOT, 'TUTORIAL.md'), [
    {
        regex: /# UKS Tutorial \(v[\d]+\.[\d]+\.[\d]+[^)]*\)/,
        replacement: `# UKS Tutorial (v${version})`
    }
]);

updateTextFile(path.join(ROOT, 'AI_PROTOCOL.md'), [
    {
        regex: /# UKS AI Integration Protocol \(v[\d]+\.[\d]+\.[\d]+[^)]*\)/,
        replacement: `# UKS AI Integration Protocol (v${version})`
    }
]);

// ============================================================
// Done
// ============================================================
console.log(`\nDone. ${updatedCount} file(s) updated to v${version}.`);
if (updatedCount > 0) {
    console.log('Remember to update CHANGELOG.md manually with release notes.');
}
