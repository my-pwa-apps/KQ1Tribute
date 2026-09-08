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
    } finally {
        const exited = once(server, 'exit');
        server.kill();
        await exited;
    }
});