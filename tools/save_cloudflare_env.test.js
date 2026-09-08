const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { parseEnv } = require('node:util');
const { saveCloudflareEnv } = require('./save_cloudflare_env');

test('saves only ignored credentials, round-trips values, and refuses overwrite or malformed input', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'crownquest-env-'));
    const env = { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'synthetic_test-token' };
    try {
        assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
        await assert.rejects(saveCloudflareEnv(root, env), /ignored and untracked/);
        await fs.writeFile(path.join(root, '.gitignore'), '.env.*\n');
        await assert.rejects(saveCloudflareEnv(root, { ...env, CLOUDFLARE_API_TOKEN: 'bad\nTOKEN=value' }), /not displayed or saved/);
        await assert.rejects(saveCloudflareEnv(root, {}), /not displayed or saved/);
        await saveCloudflareEnv(root, env);
        const file = path.join(root, '.env.cloudflare');
        assert.deepEqual(parseEnv(await fs.readFile(file, 'utf8')), env);
        await assert.rejects(saveCloudflareEnv(root, { ...env, CLOUDFLARE_API_TOKEN: 'replacement' }), { code: 'EEXIST' });
        assert.deepEqual(parseEnv(await fs.readFile(file, 'utf8')), env);
        assert.equal(spawnSync('git', ['-C', root, 'add', '-f', '.env.cloudflare']).status, 0);
        await assert.rejects(saveCloudflareEnv(root, env), /ignored and untracked/);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});