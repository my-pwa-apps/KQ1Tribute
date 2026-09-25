const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
// --test: a play-test server. It listens on the local network so phones and
// other machines can join, and it replaces the offline service worker with one
// that removes itself, so every reload shows the working tree as it is now
// rather than a cached build.
const testMode = args.includes('--test');
const port = Number(args.find(arg => /^\d+$/.test(arg)) || process.env.PORT || 8080);
const host = testMode ? '0.0.0.0' : '127.0.0.1';
const RETIRING_WORKER = `// Test server: retire any cached build so testers always see the working tree.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
})()));
`;
const securityHeaders = Object.fromEntries(
    fs.readFileSync(path.join(root, '_headers'), 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim().match(/^([^/][^:]+):\s*(.+)$/))
        .filter(Boolean)
        .map((match) => [match[1], match[2]])
);
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    // Firefox refuses @font-face resources served as octet-stream.
    '.woff2': 'font/woff2'
};

const server = http.createServer((request, response) => {
    let requestUrl;
    let pathname;
    try {
        // A malformed target or bad percent-encoding must not take the server down.
        requestUrl = new URL(request.url, `http://${request.headers.host}`);
        pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
        response.writeHead(400).end('Bad request');
        return;
    }
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    if (testMode && relativePath === 'serviceworker.js') {
        response.writeHead(200, {
            ...securityHeaders,
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-store'
        });
        response.end(RETIRING_WORKER);
        return;
    }
    if (relativePath.split(/[\\/]/).some(segment => segment.startsWith('.'))) {
        response.writeHead(403).end('Forbidden');
        return;
    }
    const filePath = path.resolve(root, relativePath);
    if (!filePath.startsWith(root + path.sep)) {
        response.writeHead(403).end('Forbidden');
        return;
    }
    const sendFile = () => fs.realpath(filePath, (realError, realPath) => {
        // Resolve symlinks before serving: the prefix test above is a string
        // check and a link inside the repo can still point outside it.
        if (realError || !(realPath === root || realPath.startsWith(root + path.sep))) {
            response.writeHead(realError && realError.code === 'ENOENT' ? 404 : 403).end('Not found');
            return;
        }
        if (path.relative(root, realPath).split(path.sep).some(segment => segment.startsWith('.'))) {
            response.writeHead(403).end('Forbidden');
            return;
        }
        fs.readFile(realPath, (error, data) => {
            if (error) {
                response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
                return;
            }
            response.writeHead(200, {
                ...securityHeaders,
                'Content-Type': mimeTypes[path.extname(realPath)] || 'application/octet-stream',
                'Cache-Control': 'no-cache'
            });
            response.end(data);
        });
    });
    const delay = Math.min(10000, Math.max(0, Number(requestUrl.searchParams.get('delay')) || 0));
    if (delay) setTimeout(sendFile, delay);
    else sendFile();
}).listen(port, host, () => {
    const actual = server.address().port;
    console.log(`Crown Quest development server: http://127.0.0.1:${actual}`);
    if (!testMode) return;
    const lan = Object.values(os.networkInterfaces()).flat()
        .filter(entry => entry && entry.family === 'IPv4' && !entry.internal)
        .map(entry => `http://${entry.address}:${actual}`);
    console.log('Test mode: offline cache disabled, reachable on the local network.');
    for (const url of lan) console.log(`  ${url}/                  default art`);
    for (const url of lan) console.log(`  ${url}/?scenery=painted  painted trial`);
});
