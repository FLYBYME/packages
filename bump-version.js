const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * bump-version.js
 * Usage: node bump-version.js [patch|minor|major|version_number]
 */

const target = process.argv[2] || 'patch';
const rootDir = process.cwd();
const rootPkgPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(rootPkgPath)) {
    console.error('Error: package.json not found in current directory.');
    process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const workspaces = rootPkg.workspaces || [];

// 1. Get all package.json files from workspaces
const packageFiles = [];
workspaces.forEach(pattern => {
    const matches = glob.sync(path.join(pattern, 'package.json'), { cwd: rootDir });
    packageFiles.push(...matches.map(m => path.join(rootDir, m)));
});

if (packageFiles.length === 0) {
    console.warn('Warning: No workspace packages found.');
}

// 2. Identify current reference version (using isomorphic-core as source of truth if possible, or first package)
const referencePkgPath = packageFiles.find(p => p.includes('isomorphic-core')) || packageFiles[0];
if (!referencePkgPath) {
    console.error('Error: No packages found to bump.');
    process.exit(1);
}

const referencePkg = JSON.parse(fs.readFileSync(referencePkgPath, 'utf8'));
const currentVersion = referencePkg.version;
console.log(`Current base version: ${currentVersion}`);

// 3. Determine new version
let newVersion = target;
if (['patch', 'minor', 'major'].includes(target)) {
    const parts = currentVersion.split('.').map(Number);
    if (target === 'major') {
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
    } else if (target === 'minor') {
        parts[1]++;
        parts[2] = 0;
    } else {
        parts[2]++;
    }
    newVersion = parts.join('.');
}

console.log(`Bumping to version: ${newVersion}`);

// 4. Update all package.json files
[rootPkgPath, ...packageFiles].forEach(pkgPath => {
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // Only update if it's not the private root, or if the user wants root to have a version
    if (pkgPath === rootPkgPath && pkg.private) {
        console.log(`Skipping version field for private root package.`);
    } else {
        pkg.version = newVersion;
    }

    // Also update internal dependencies if they match @flybyme/*
    ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
        if (pkg[depType]) {
            Object.keys(pkg[depType]).forEach(dep => {
                if (dep.startsWith('@flybyme/') && pkg[depType][dep] !== '*') {
                    pkg[depType][dep] = `^${newVersion}`;
                }
            });
        }
    });

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated ${path.relative(rootDir, pkgPath)}`);
});

console.log('Version bump complete.');
