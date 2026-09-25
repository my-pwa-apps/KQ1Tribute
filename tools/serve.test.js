const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');

test('development server refuses hidden paths while still serving the game', async () => {
    const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
    try {
        const output = await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.once('exit', code => reject(new Error(`Server exited before listening: ${code}`)));
            server.stdout.once('data', data => resolve(data.toString()));
        });
        const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
        for (const pathname of ['/.env.cloudflare', '/%2eenv.cloudflare', '/.gitignore', '/.git/config', '/js%5c..%5c.env.cloudflare']) {
            const response = await fetch(url + pathname);
            assert.equal(response.status, 403, pathname);
            assert.equal(await response.text(), 'Forbidden');
        }
        const response = await fetch(url + '/');
        assert.equal(response.status, 200);
        assert.match(await response.text(), /Crown Quest/);
        const worker = await fetch(url + '/serviceworker.js');
        assert.match(await worker.text(), /const VERSION/, 'the normal server serves the real offline worker');
    } finally {
        const exited = once(server, 'exit');
        server.kill();
        await exited;
    }
});

test('test mode replaces the offline worker with one that retires itself', async () => {
    const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), '0', '--test'], { stdio: ['ignore', 'pipe', 'pipe'] });
    try {
        const output = await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.once('exit', code => reject(new Error(`Server exited before listening: ${code}`)));
            server.stdout.once('data', data => resolve(data.toString()));
        });
        const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
        const worker = await fetch(url + '/serviceworker.js');
        assert.equal(worker.status, 200);
        assert.equal(worker.headers.get('cache-control'), 'no-store');
        const body = await worker.text();
        assert.match(body, /registration\.unregister\(\)/);
        assert.doesNotMatch(body, /const VERSION/);
        assert.equal((await fetch(url + '/.env.cloudflare')).status, 403);
        assert.equal((await fetch(url + '/')).status, 200);
    } finally {
        const exited = once(server, 'exit');
        server.kill();
        await exited;
    }
});