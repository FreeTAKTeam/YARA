const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DEFAULT_SETTINGS = {
    mode: 'tcp',
    tcp: { host: 'rmap.world', port: 4242 },
    rnode: {
        port: '',
        frequency: 915000000,
        bandwidth: 500000,
        spreadingFactor: 10,
        codingRate: 5,
        txPower: 22,
    },
};

function integer(value, name, min, max) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(`${name} must be an integer from ${min} to ${max}`);
    }
    return parsed;
}

function normalizeSettings(input, platform = process.platform) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('Interface settings must be an object');
    }
    const mode = input.mode;
    if (!['tcp', 'rnode', 'bridge'].includes(mode)) {
        throw new Error('Mode must be tcp, rnode, or bridge');
    }
    const host = input.tcp?.host;
    if (typeof host !== 'string' || !host.trim() || host.length > 255 || /[\r\n]/.test(host)) {
        throw new Error('TCP host must be a valid hostname or address');
    }
    const serialPort = input.rnode?.port;
    if (typeof serialPort !== 'string' || serialPort.length > 260) {
        throw new Error('RNode port must be a serial device path or COM port');
    }
    if (mode !== 'tcp' && !serialPort) {
        throw new Error('Set the RNode serial port before selecting RNode or bridge mode');
    }
    if (serialPort && platform === 'win32' && !/^COM[1-9][0-9]*$/i.test(serialPort)) {
        throw new Error('RNode port must be a COM port such as COM3');
    }
    if (serialPort && platform !== 'win32' && !/^\/dev\/[a-zA-Z0-9_./-]+$/.test(serialPort)) {
        throw new Error('RNode port must be a serial device under /dev');
    }
    return {
        mode,
        tcp: { host: host.trim(), port: integer(input.tcp?.port, 'TCP port', 1, 65535) },
        rnode: {
            port: serialPort,
            frequency: integer(input.rnode?.frequency, 'RNode frequency', 1, 9999999999),
            bandwidth: integer(input.rnode?.bandwidth, 'RNode bandwidth', 1, 10000000),
            spreadingFactor: integer(input.rnode?.spreadingFactor, 'RNode spreading factor', 6, 12),
            codingRate: integer(input.rnode?.codingRate, 'RNode coding rate', 5, 8),
            txPower: integer(input.rnode?.txPower, 'RNode transmit power', 0, 30),
        },
    };
}

function readSettings(stateDir) {
    const file = path.join(stateDir, 'settings.json');
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, `${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    }
    let saved;
    try {
        saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        throw new Error(`Cannot read ${file}: ${error.message}`);
    }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
        throw new Error(`${file} must contain a JSON object`);
    }
    return {
        file,
        value: {
            ...DEFAULT_SETTINGS,
            ...saved,
            tcp: { ...DEFAULT_SETTINGS.tcp, ...saved.tcp },
            rnode: { ...DEFAULT_SETTINGS.rnode, ...saved.rnode },
        },
    };
}

function saveSettings(file, value, platform = process.platform) {
    const settings = normalizeSettings(value, platform);
    fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
    return settings;
}

function displayName(stateDir, env) {
    if (env.RUST_POC_DISPLAY_NAME) return env.RUST_POC_DISPLAY_NAME;
    const file = path.join(stateDir, 'reticulum.meshchat.json');
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8')).config?.display_name || 'YARA POC';
    } catch {
        return 'YARA POC';
    }
}

function rnodeConfig(settings, env, platform, settingsFile) {
    const saved = settings.rnode;
    const port = env.RUST_POC_RNODE_PORT || saved.port;
    if (typeof port !== 'string' || !port) {
        throw new Error(`Set rnode.port in ${settingsFile} or RUST_POC_RNODE_PORT`);
    }
    if (platform === 'win32') {
        if (!/^COM[1-9][0-9]*$/i.test(port)) {
            throw new Error('The RNode port must be a COM port such as COM3');
        }
    } else {
        if (!/^\/dev\/[a-zA-Z0-9_./-]+$/.test(port) || !fs.statSync(port).isCharacterDevice()) {
            throw new Error(`The RNode port must be a serial device under /dev: ${port}`);
        }
        fs.accessSync(port, fs.constants.R_OK | fs.constants.W_OK);
    }
    const frequency = integer(env.RUST_POC_RNODE_FREQUENCY ?? saved.frequency, 'RNode frequency', 1, 9999999999);
    const bandwidth = integer(env.RUST_POC_RNODE_BANDWIDTH ?? saved.bandwidth, 'RNode bandwidth', 1, 10000000);
    const spreadingFactor = integer(env.RUST_POC_RNODE_SPREADING_FACTOR ?? saved.spreadingFactor, 'RNode spreading factor', 6, 12);
    const codingRate = integer(env.RUST_POC_RNODE_CODING_RATE ?? saved.codingRate, 'RNode coding rate', 5, 8);
    const txPower = integer(env.RUST_POC_RNODE_TX_POWER ?? saved.txPower, 'RNode transmit power', 0, 30);
    const bitrate = Math.floor(spreadingFactor * bandwidth * 4 / ((1 << spreadingFactor) * codingRate));
    return `{ type = "RNodeInterface", enabled = true, name = "yara-rnode", port = ${JSON.stringify(port)}, frequency = ${frequency}, bandwidth = ${bandwidth}, spreadingfactor = ${spreadingFactor}, codingrate = ${codingRate}, txpower = ${txPower}, bitrate = ${bitrate}, announce_cap = 2, outgoing = true }`;
}

function createConfig(settings, mode, stateDir, env, platform, settingsFile) {
    const host = env.RUST_POC_TCP_HOST || settings.tcp.host;
    if (typeof host !== 'string' || !host || host.includes('\n')) {
        throw new Error('tcp.host must be a nonempty hostname');
    }
    const port = integer(env.RUST_POC_TCP_PORT ?? settings.tcp.port, 'TCP port', 1, 65535);
    const tcp = `{ type = "TCPClientInterface", enabled = true, name = "yara-tcp", target_host = ${JSON.stringify(host)}, target_port = ${port} }`;
    const interfaces = [];
    if (mode === 'tcp' || mode === 'bridge') interfaces.push(tcp);
    if (mode === 'rnode' || mode === 'bridge') {
        interfaces.push(rnodeConfig(settings, env, platform, settingsFile));
    }
    if (!interfaces.length) throw new Error(`Unsupported mode ${mode}; use tcp, rnode, or bridge`);
    return `display_name = ${JSON.stringify(displayName(stateDir, env))}\ninterfaces = [\n  ${interfaces.join(',\n  ')}\n]\n${mode === 'bridge' ? '\n[reticulum]\nenable_transport = true\n' : ''}`;
}

function prepareLaunch(options = {}) {
    const env = options.env || process.env;
    const platform = options.platform || process.platform;
    const repoRoot = options.repoRoot || path.resolve(__dirname, '..');
    const packaged = options.packaged || false;
    const stateDir = env.RUST_POC_STATE_DIR || options.stateDir ||
        (packaged ? path.join(os.homedir(), '.yara') : path.join(repoRoot, 'storage', 'rust-poc'));
    const bind = env.RUST_POC_BIND || '127.0.0.1:9337';
    const match = /^127\.0\.0\.1:([0-9]+)$/.exec(bind);
    if (!match || Number(match[1]) < 1 || Number(match[1]) > 65535) {
        throw new Error('RUST_POC_BIND must use 127.0.0.1:port');
    }
    const binaryName = platform === 'win32' ? 'reticulumd.exe' : 'reticulumd';
    const rustRoot = env.RUST_POC_LXMF_RS_ROOT || path.resolve(repoRoot, '..', 'LXMF-rs');
    const binary = env.RUST_POC_RETICULUMD_BIN || (packaged
        ? path.join(options.resourcesPath, 'bin', binaryName)
        : path.join(rustRoot, 'target', 'debug', binaryName));
    const assets = packaged ? path.join(options.resourcesPath, 'public') : path.join(repoRoot, 'public');
    if (!fs.existsSync(binary)) throw new Error(`reticulumd is missing: ${binary}`);
    if (!fs.existsSync(path.join(assets, 'index.html'))) throw new Error(`Build the frontend first: ${assets}`);
    fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    const { file: settingsFile, value: settings } = readSettings(stateDir);
    const mode = options.mode || env.MESHCHAT_RUST_POC_MODE || settings.mode;
    const config = path.join(stateDir, 'generated-config.toml');
    fs.writeFileSync(config, createConfig(settings, mode, stateDir, env, platform, settingsFile), { mode: 0o600 });
    const args = [
        '--db', path.join(stateDir, 'reticulum.db'),
        '--identity', path.join(stateDir, 'identity'),
        '--config', config,
        ...(platform === 'win32' ? ['--rpc', '127.0.0.1:0'] : ['--rpc-unix', path.join(stateDir, 'rpc.sock')]),
        ...(mode === 'rnode' ? ['--strict-interface-startup'] : []),
        '--meshchat-bind', bind,
        '--meshchat-assets', assets,
    ];
    return { binary, args, bind, config, mode, settingsFile, stateDir };
}

module.exports = { prepareLaunch, createConfig, readSettings, saveSettings, normalizeSettings, DEFAULT_SETTINGS };

if (require.main === module) {
    try {
        const plan = prepareLaunch({ mode: process.argv[2] });
        console.log(`YARA Rust proof of concept: ${plan.mode} on http://${plan.bind}`);
        console.log(`Settings: ${plan.settingsFile}`);
        console.log(`Config: ${plan.config}`);
        const child = spawn(plan.binary, plan.args, { stdio: 'inherit' });
        process.on('SIGINT', () => child.kill('SIGINT'));
        process.on('SIGTERM', () => child.kill('SIGTERM'));
        child.on('error', error => { console.error(error); process.exitCode = 1; });
        child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
    } catch (error) {
        console.error(error.message);
        process.exitCode = 2;
    }
}
