const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

async function saveCloudflareEnv(root, env = process.env) {
    const account = env.CLOUDFLARE_ACCOUNT_ID;
    const token = env.CLOUDFLARE_API_TOKEN;
    if (!/^[a-f0-9]{32}$/i.test(account || '') || !/^[a-z0-9_-]+$/i.test(token || '')) {
        throw new Error('Both Cloudflare values must be configured in this terminal; values were not displayed or saved.');
    }
    const destination = path.join(root, '.env.cloudflare');
    const ignored = spawnSync('git', ['check-ignore', '-q', '--', '.env.cloudflare'], {
        cwd: root, stdio: 'ignore'
    });
    if (ignored.status !== 0) throw new Error('Refusing to save: Git must confirm .env.cloudflare is ignored and untracked.');
    await fs.writeFile(destination, `CLOUDFLARE_ACCOUNT_ID=${account}\nCLOUDFLARE_API_TOKEN=${token}\n`, {
        flag: 'wx', mode: 0o600
    });
}

if (require.main === module) {
    saveCloudflareEnv(path.resolve(__dirname, '..'))
        .then(() => console.log('Saved .env.cloudflare locally. No values were displayed. Do not commit or upload this file.'))
        .catch(error => {
            console.error(error.code === 'EEXIST' ? '.env.cloudflare already exists; nothing was overwritten.' : error.message);
            process.exitCode = 1;
        });
}

module.exports = { saveCloudflareEnv };