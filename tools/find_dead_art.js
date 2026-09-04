// Report script-scope helpers in the shared art modules that nothing references.
// Those files disable no-unused-vars (their consumers are other <script> files),
// so ESLint cannot see dead helpers and they accumulate silently.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROVIDERS = ['js/art.js', 'js/actors.js', 'js/icons.js', 'js/cutscenes.js'];
const CONSUMERS = [
    'js/art.js', 'js/actors.js', 'js/icons.js', 'js/cutscenes.js',
    'js/game.js', 'js/rooms/act1.js', 'js/rooms/act2.js', 'js/rooms/act3.js',
    'js/engine.js', 'js/vr.js'
];

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const declPattern = /^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/gm;

const declared = new Map();
for (const file of PROVIDERS) {
    for (const m of read(file).matchAll(declPattern)) {
        declared.set(m[1] || m[2], file);
    }
}

const sources = new Map(CONSUMERS.map((f) => [f, read(f)]));
const tests = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))
    .join('\n');

const dead = [];
for (const [name, origin] of declared) {
    const uses = new RegExp(`\\b${name}\\b`, 'g');
    let count = 0;
    for (const [file, src] of sources) {
        const hits = src.match(uses);
        if (!hits) continue;
        // Discount the declaration itself in its own file.
        count += file === origin ? hits.length - 1 : hits.length;
    }
    if (tests.match(uses)) count += 1;
    if (count === 0) dead.push(`${origin}: ${name}`);
}

if (dead.length) {
    console.error('Unreferenced shared helpers (delete them or wire them up):');
    for (const d of dead) console.error('  ' + d);
    process.exitCode = 1;
} else {
    console.log(`checked ${declared.size} shared helpers; none unreferenced`);
}
