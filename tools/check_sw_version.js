// Guards the one release step that is easy to forget: bumping the service
// worker cache version after changing a cached asset. A stale cache ships old
// code to returning players and produces bug reports nobody can reproduce.
//
// Usage: node tools/check_sw_version.js [baseRef]   (default: origin/main)

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const baseRef = process.argv[2] || process.env.SW_BASE_REF || 'origin/main';

function git(args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function readVersion(source) {
    const match = source.match(/const VERSION\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
}

let baseSw;
try {
    git(['rev-parse', '--verify', '--quiet', baseRef]);
    baseSw = git(['show', `${baseRef}:serviceworker.js`]);
} catch {
    console.log(`check_sw_version: '${baseRef}' is unavailable; skipping.`);
    process.exit(0);
}

const swSource = fs.readFileSync(path.join(root, 'serviceworker.js'), 'utf8');
const assetList = (source) => [...source.matchAll(/['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]).filter(Boolean);
const cachedAssets = assetList(swSource);
const baseAssets = assetList(baseSw);

let changed;
try {
    changed = git(['diff', '--name-only', baseRef, '--']).split('\n').filter(Boolean);
} catch {
    console.log('check_sw_version: unable to diff against the base ref; skipping.');
    process.exit(0);
}

// index.html is cached as the app shell but is not listed by name in ASSETS.
// A removed or renamed asset only appears in the base list, and editing the list
// itself changes cache contents even when no listed file was touched.
const assetListChanged =
    baseAssets.length !== cachedAssets.length ||
    baseAssets.some((asset, index) => asset !== cachedAssets[index]);
const trackedAssets = new Set([...cachedAssets, ...baseAssets]);
const touchedCachedAsset = assetListChanged || changed.some(
    (file) => file === 'index.html' || trackedAssets.has(file)
);

if (!touchedCachedAsset) {
    console.log('check_sw_version: no cached asset changed.');
    process.exit(0);
}

const current = readVersion(swSource);
const base = readVersion(baseSw);

if (!current) {
    console.error('check_sw_version: could not read VERSION from serviceworker.js.');
    process.exit(1);
}

if (current === base) {
    console.error(
        `check_sw_version: cached assets changed but serviceworker.js VERSION is still ${current}.\n` +
        'Bump VERSION so returning players receive the new build.'
    );
    process.exit(1);
}

console.log(`check_sw_version: VERSION moved ${base} -> ${current}.`);
