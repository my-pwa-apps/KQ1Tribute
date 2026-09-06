const fs = require('fs');
const path = require('path');

function fail(message) {
    console.error(message);
    process.exitCode = 1;
}

function read(file) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

// Content is split across a bootstrap, shared art and per-act room modules.
// Every cross-reference check runs over the concatenation of all of them.
const CONTENT_FILES = [
    'js/game.js',
    'js/art.js',
    'js/actors.js',
    'js/icons.js',
    'js/cutscenes.js',
    'js/rooms/act1.js',
    'js/rooms/act2.js',
    'js/rooms/act3.js'
];

for (const file of CONTENT_FILES) {
    if (!fs.existsSync(path.join(__dirname, '..', file))) {
        fail(`Content module is missing: ${file}`);
    }
}

const game = CONTENT_FILES.map(read).join('\n');
const html = read('index.html');
const sw = read('serviceworker.js');
const headers = read('_headers');
const content = require('../js/content.js');

const itemIds = new Set(content.items.map((item) => item.id));
const roomIds = new Set([...game.matchAll(/registerRoom\(\{\s*id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));
const roomRefs = [...game.matchAll(/goToRoom\(['"]([^'"]+)['"]/g)].map((m) => m[1]);
const itemRefs = [...game.matchAll(/(?:hasItem|addToInventory|removeFromInventory)\(['"]([^'"]+)['"]\)|(?:itemId|id)\s*===\s*['"]([^'"]+)['"]/g)]
    .map((m) => m[1] || m[2]);

for (const roomId of roomRefs) {
    if (!roomIds.has(roomId)) fail(`Unknown room reference: ${roomId}`);
}

for (const itemId of itemRefs) {
    if (!itemIds.has(itemId)) fail(`Unknown item reference: ${itemId}`);
}

if (html.indexOf('js/content.js') > html.indexOf('js/game.js')) {
    fail('js/content.js must load before js/game.js.');
}

// Room modules queue themselves against the registry and are drained by the
// bootstrap, so every module must be loaded before game.js and cached offline.
for (const file of CONTENT_FILES.concat('js/registry.js')) {
    if (!html.includes(file)) fail(`Content module is not loaded by index.html: ${file}`);
    if (!sw.includes(file)) fail(`Content module is not cached by the service worker: ${file}`);
    if (file !== 'js/game.js' && html.indexOf(file) > html.indexOf('js/game.js')) {
        fail(`${file} must load before js/game.js.`);
    }
}

const IMMERSIVE_RUNTIME_FILES = [
    'js/vr.js',
    'js/vendor/three.module.min.js',
    'js/vendor/three.core.min.js'
];
if (!html.includes('type="module" src="js/vr.js"')) {
    fail('The WebXR entry point must load as an ES module.');
}
for (const file of IMMERSIVE_RUNTIME_FILES) {
    if (!fs.existsSync(path.join(__dirname, '..', file))) fail(`Immersive runtime is missing: ${file}`);
    if (!sw.includes(file)) fail(`Immersive runtime is not cached by the service worker: ${file}`);
}

for (const directive of ['frame-ancestors', 'X-Content-Type-Options', 'Referrer-Policy']) {
    if (!headers.includes(directive)) fail(`Missing production security header: ${directive}`);
}

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .filter((m) => m[1].trim().length > 0);
if (inlineScripts.length) {
    fail('Inline script found; this violates the page CSP.');
}

const assetMatches = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1].replace(/^\.\//, ''));
for (const asset of assetMatches) {
    if (asset === '') continue;
    if (!fs.existsSync(path.join(__dirname, '..', asset))) {
        fail(`Service worker asset does not exist: ${asset}`);
    }
}

// A misspelt flag name is invisible at runtime: getFlag returns false forever and
// the puzzle silently never opens. Cross-reference every literal flag name.
const engine = read('js/engine.js');
// content.js holds the shared progression rules, so it is a flag and score source too.
const contentSource = read('js/content.js');
const flagSources = game + engine + contentSource;
const collectFlags = (fn) => new Set(
    [...flagSources.matchAll(new RegExp(`${fn}\\(['"]([^'"]+)['"]`, 'g'))].map((m) => m[1])
);
const written = collectFlags('setFlag');
// getCounter reads the same flag store, so a numeric flag counts as read.
const read_ = new Set([...collectFlags('getFlag'), ...collectFlags('getCounter')]);
for (const flag of read_) {
    if (!written.has(flag)) fail(`Flag is read but never set (typo or dead gate): ${flag}`);
}
for (const flag of written) {
    if (!read_.has(flag)) fail(`Flag is set but never read (dead state): ${flag}`);
}

// maxScore is the published contract for the status bar and the rank thresholds.
// The walkthrough proves it is reachable; this proves the awards still fund it.
const awardValues = Object.values(content.rules.awards);
const awarded = awardValues.reduce((sum, points) => sum + points, 0);
if (awardValues.some(points => !Number.isInteger(points) || points <= 0) || awarded !== content.game.maxScore) {
    fail(`Score awards total ${awarded} but maxScore is ${content.game.maxScore}; the score ledger must match exactly.`);
}
const awardRefs = [...(game + contentSource).matchAll(/\.award\([^,]+,\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
for (const event of Object.keys(content.rules.awards)) {
    if (awardRefs.filter(reference => reference === event).length !== 1) fail(`Score event needs one award site: ${event}`);
}
for (const event of awardRefs) {
    if (!Object.hasOwn(content.rules.awards, event)) fail(`Unknown score event: ${event}`);
}
if (/addScore\(\d+\)/.test(game + contentSource)) fail('Content must award named score events, not literal point values.');
