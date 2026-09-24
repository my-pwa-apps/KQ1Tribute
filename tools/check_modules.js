// Static module gate: every shipped script parses, and no file outgrows the
// size ceiling. A file too large to read in one sitting is where reviews stop
// and merge conflicts start, so the limit is enforced rather than advised.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOM_FILES, ENGINE_FILES } = require('./modules.js');

const ROOT = path.join(__dirname, '..');
const SOFT_LIMIT = 800;
const HARD_LIMIT = 1500;
// Files still being split carry their current size here; the list must only
// shrink. Leave it empty once everything is under the ceiling.
const ALLOW = {};

const SCRIPTS = [
    'js/palette.js', 'js/content.js', 'js/registry.js', 'js/sound.js', 'js/register-sw.js',
    'js/art.js', 'js/actors.js', 'js/icons.js', 'js/cutscenes.js', 'js/game.js',
    ...ENGINE_FILES, ...ROOM_FILES, 'serviceworker.js', 'tools/serve.js'
];
// Sized but not syntax-checked with --check: the WebXR entry point is an ES module.
const SIZED_ONLY = ['js/vr.js'];

let failed = false;
const fail = (message) => { console.error(message); failed = true; };

for (const file of SCRIPTS) {
    const result = spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { encoding: 'utf8' });
    if (result.status !== 0) fail(`Syntax error in ${file}:\n${result.stderr}`);
}

const warnings = [];
for (const file of [...SCRIPTS, ...SIZED_ONLY]) {
    if (!file.startsWith('js/')) continue;
    const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n').length;
    const limit = Object.hasOwn(ALLOW, file) ? ALLOW[file] : HARD_LIMIT;
    if (lines > limit) fail(`${file} has ${lines} lines; the ceiling is ${limit}. Split it along an existing seam.`);
    else if (lines > SOFT_LIMIT) warnings.push(`${file} (${lines})`);
}
for (const [file, limit] of Object.entries(ALLOW)) {
    const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n').length;
    if (lines <= HARD_LIMIT) fail(`${file} is now ${lines} lines; remove it from the allow-list (was ${limit}).`);
}

if (failed) process.exitCode = 1;
else console.log(`checked ${SCRIPTS.length} scripts; all parse and fit the ${HARD_LIMIT}-line ceiling` +
    (warnings.length ? `; over the ${SOFT_LIMIT}-line soft limit: ${warnings.join(', ')}` : ''));
