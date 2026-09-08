const fs = require('node:fs/promises');
const path = require('node:path');

const MODEL = '@cf/leonardo/lucid-origin';

async function generateBackground({ promptPath, outputBase, generate = false, env = process.env, request = fetch }) {
    const prompt = (await fs.readFile(promptPath, 'utf8')).trim();
    if (!prompt) throw new Error('The prompt file is empty.');
    const body = { prompt, width: 1280, height: 800, num_steps: 20, guidance: 4.5, seed: 1042 };
    if (!generate) return { preview: true, model: MODEL, ...body };
    const account = env.CLOUDFLARE_ACCOUNT_ID;
    const token = env.CLOUDFLARE_API_TOKEN;
    if (!account || !/^[a-f0-9]{32}$/i.test(account) || !token || /\s/.test(token)) {
        throw new Error('Configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN locally before generating.');
    }
    if (!outputBase) throw new Error('Provide an output filename stem without an extension.');
    for (const extension of ['.png', '.jpg']) {
        try {
            await fs.access(outputBase + extension);
        } catch (error) {
            if (error.code === 'ENOENT') continue;
            throw new Error('Cannot check the output destination.');
        }
        throw new Error('A draft already exists at this output destination. Choose a new filename stem.');
    }
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(120000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).catch(() => { throw new Error('Cloudflare request failed or timed out; no automatic retry was made.'); });
    if (!response.ok) throw new Error(`Cloudflare returned HTTP ${response.status}; no automatic retry was made.`);
    const payload = await response.json().catch(() => { throw new Error('Cloudflare returned invalid JSON.'); });
    if (!payload.success || typeof payload.result?.image !== 'string') {
        throw new Error('Cloudflare did not return a successful image result.');
    }
    const image = Buffer.from(payload.result.image, 'base64');
    const png = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = image[0] === 255 && image[1] === 216 && image[2] === 255;
    if (!png && !jpeg) throw new Error('Cloudflare returned an unsupported image format; nothing was saved.');
    const output = outputBase + (png ? '.png' : '.jpg');
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, image, { flag: 'wx' });
    return { preview: false, output, bytes: image.length, model: MODEL };
}

if (require.main === module) {
    const [promptPath, outputBase, mode] = process.argv.slice(2);
    if (!promptPath || !outputBase || (mode && mode !== '--generate') || process.argv.length > 5) {
        console.error('Usage: node tools/generate_background.js <prompt.txt> <output-stem> [--generate]');
        process.exitCode = 1;
    } else {
        generateBackground({ promptPath, outputBase, generate: mode === '--generate' })
            .then(result => console.log(JSON.stringify(result, null, 2)))
            .catch(error => { console.error(error.message); process.exitCode = 1; });
    }
}

module.exports = { generateBackground };