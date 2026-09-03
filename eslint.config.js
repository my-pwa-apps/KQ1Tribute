const fs = require('fs');
const path = require('path');
const globals = require('globals');

// The shared modules expose their helpers as script-scope declarations rather
// than objects, so room modules can call them unqualified. Derive the list from
// the files themselves instead of hand-maintaining a copy that will drift.
function scriptScopeDeclarations(file) {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    const names = {};
    const pattern = /^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/gm;
    for (const match of source.matchAll(pattern)) {
        names[match[1] || match[2]] = 'readonly';
    }
    return names;
}

// Load order in index.html: art -> actors -> icons -> cutscenes -> rooms -> game.
const SHARED_ART_MODULES = ['js/art.js', 'js/actors.js', 'js/icons.js', 'js/cutscenes.js'];
const artGlobals = Object.assign({}, ...SHARED_ART_MODULES.map(scriptScopeDeclarations));

// The game ships as plain <script> tags with no bundler, so cross-file symbols
// are genuine browser globals rather than imports. They are declared here so
// no-undef stays useful instead of drowning in false positives.
const gameGlobals = {
    GameEngine: 'readonly',
    SoundEngine: 'readonly',
    AnimatedObject: 'readonly',
    CrownQuest: 'readonly',
    CrownQuestContent: 'readonly',
    CQ_PALETTE: 'readonly',
    PAL: 'readonly',
    engine: 'readonly'
};

// Classes are declared in one script and consumed by another, so the
// declaration itself always looks unused to a per-file linter.
const crossFileDeclarations = '^(GameEngine|SoundEngine|AnimatedObject)$';

const sharedRules = {
    'no-undef': 'error',
    'no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: crossFileDeclarations,
        caughtErrors: 'none'
    }],
    'no-redeclare': ['error', { builtinGlobals: false }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-const-assign': 'error',
    'no-dupe-keys': 'error',
    'no-dupe-args': 'error',
    'no-duplicate-case': 'error',
    'no-fallthrough': 'error',
    'no-unreachable': 'error',
    'no-self-compare': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    'eqeqeq': ['error', 'smart'],
    'no-shadow-restricted-names': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error'
};

module.exports = [
    {
        ignores: ['node_modules/**', 'js/vendor/**', 'test-results/**', 'playwright-report/**', 'screenshots/**']
    },
    {
        files: ['js/**/*.js', 'serviceworker.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.serviceworker,
                ...gameGlobals
            }
        },
        rules: sharedRules
    },
    {
        files: ['js/vr.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.browser, XRRigidTransform: 'readonly' }
        },
        rules: sharedRules
    },
    {
        // The shared art modules and everything that consumes them.
        files: ['js/art.js', 'js/actors.js', 'js/icons.js', 'js/cutscenes.js', 'js/game.js', 'js/rooms/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...globals.browser, ...gameGlobals, ...artGlobals }
        },
        rules: sharedRules
    },
    {
        files: ['js/content.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...globals.browser, module: 'writable' }
        },
        rules: sharedRules
    },
    {
        files: ['tools/**/*.js', 'eslint.config.js', 'playwright.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node }
        },
        rules: sharedRules
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            // Specs run in Node, but page.evaluate callbacks are lexically part of
            // the spec file, so browser globals must stay declared or no-undef
            // fires on every window/document reference inside them.
            globals: { ...globals.node, ...globals.browser, showUpdateBanner: 'readonly' }
        },
        rules: sharedRules
    }
];
