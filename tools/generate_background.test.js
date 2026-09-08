const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateBackground } = require('./generate_background');

test('background generation is preview-only unless explicitly enabled', async context => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cq-art-'));
    context.after(() => fs.rm(directory, { recursive: true, force: true }));
    const promptPath = path.join(directory, 'prompt.txt');
    await fs.writeFile(promptPath, 'A pixel-art stone chamber.');
    const result = await generateBackground({ promptPath, request: () => assert.fail('Preview must not contact Cloudflare') });
    assert.equal(result.preview, true);
    assert.equal(result.width / result.height, 1.6);
});

test('generation validates credentials, sends once, saves image bytes and refuses overwrite', async context => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cq-art-'));
    context.after(() => fs.rm(directory, { recursive: true, force: true }));
    const promptPath = path.join(directory, 'prompt.txt');
    const outputBase = path.join(directory, 'chamber');
    await fs.writeFile(promptPath, 'A pixel-art stone chamber.');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64');
    const env = { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'test-only-placeholder' };
    let calls = 0;
    const request = async (url, options) => {
        calls++;
        assert.equal(new URL(url).hostname, 'api.cloudflare.com');
        assert.equal(options.headers.Authorization, 'Bearer test-only-placeholder');
        assert.equal(options.redirect, 'error');
        assert.equal(JSON.parse(options.body).num_steps, 20);
        return { ok: true, json: async () => ({ success: true, result: { image: png.toString('base64') } }) };
    };
    await assert.rejects(generateBackground({ promptPath, outputBase, generate: true, env: {}, request }), /Configure/);
    assert.equal(calls, 0);
    const result = await generateBackground({ promptPath, outputBase, generate: true, env, request });
    assert.deepEqual(await fs.readFile(result.output), png);
    assert.equal(calls, 1);
    await assert.rejects(generateBackground({ promptPath, outputBase, generate: true, env, request }), /already exists/);
    assert.equal(calls, 1);
});

test('API errors do not echo response secrets or trigger retries', async context => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cq-art-'));
    context.after(() => fs.rm(directory, { recursive: true, force: true }));
    const promptPath = path.join(directory, 'prompt.txt');
    await fs.writeFile(promptPath, 'A chamber.');
    let calls = 0;
    await assert.rejects(generateBackground({
        promptPath, outputBase: path.join(directory, 'draft'), generate: true,
        env: { CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_TOKEN: 'test-only-placeholder' },
        request: async () => { calls++; return { ok: false, status: 403, json: () => assert.fail('Do not print response bodies') }; }
    }), /HTTP 403/);
    assert.equal(calls, 1);
    await assert.rejects(fs.access(path.join(directory, 'draft.png')));
});