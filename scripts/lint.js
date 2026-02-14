#!/usr/bin/env node
/**
 * Lint: no console.log in library code (packages/<pkg>/src).
 * Matches .github/workflows/ci.yml "Lint Check" step.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
let failed = false;

if (!fs.existsSync(packagesDir)) {
    console.log('No packages/ dir, skip lint.');
    process.exit(0);
}

const dirs = fs.readdirSync(packagesDir);
for (const pkg of dirs) {
    const srcDir = path.join(packagesDir, pkg, 'src');
    if (!fs.existsSync(srcDir)) continue;
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const filePath = path.join(srcDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            // Allow commented-out console.log
            const line = lines[i].trim();
            if (line.startsWith('//')) continue;
            if (line.includes('console.log(')) {
                console.error(`Forbidden console.log in library: ${path.relative(repoRoot, filePath)}:${i + 1}`);
                failed = true;
            }
        }
    }
}

if (failed) {
    console.error('Lint failed: remove console.log from packages/*/src');
    process.exit(1);
}
console.log('Lint OK: no console.log in packages/*/src');
process.exit(0);
