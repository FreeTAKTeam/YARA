const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createConfig, DEFAULT_SETTINGS, normalizeSettings, prepareLaunch } = require('./rust-poc-launcher');

test('packaged Windows launch uses bundled assets and a local TCP RPC listener', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yara-launch-'));
    try {
        fs.mkdirSync(path.join(root, 'bin'));
        fs.mkdirSync(path.join(root, 'public'));
        fs.writeFileSync(path.join(root, 'bin', 'reticulumd.exe'), '');
        fs.writeFileSync(path.join(root, 'public', 'index.html'), '');
        const plan = prepareLaunch({
            packaged: true,
            platform: 'win32',
            resourcesPath: root,
            stateDir: path.join(root, 'state'),
            env: {},
        });
        assert.equal(plan.mode, 'tcp');
        assert.equal(plan.binary, path.join(root, 'bin', 'reticulumd.exe'));
        assert.deepEqual(plan.args.slice(6, 8), ['--rpc', '127.0.0.1:0']);
        assert.match(fs.readFileSync(plan.config, 'utf8'), /target_host = "rmap\.world"/);
        assert.equal(path.basename(plan.config), 'managed-config.toml');
        assert.match(fs.readFileSync(plan.config, 'utf8'), /\[\[interfaces\]\]/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('bridge config accepts a Windows COM port and enables transport', () => {
    const settings = {
        ...DEFAULT_SETTINGS,
        rnode: { ...DEFAULT_SETTINGS.rnode, port: 'COM10' },
    };
    const config = createConfig(settings, 'bridge', '/missing', {}, 'win32', 'settings.json');
    assert.match(config, /target_host = "rmap\.world"/);
    assert.match(config, /port = "COM10"/);
    assert.match(config, /bitrate = 3906/);
    assert.match(config, /enable_transport = true/);
    assert.throws(() => createConfig({ ...settings, rnode: { ...settings.rnode, port: '/dev/ttyUSB1' } },
        'rnode', '/missing', {}, 'win32', 'settings.json'), /COM port/);
    assert.equal(normalizeSettings({ ...settings, mode: 'bridge' }, 'win32').rnode.port, 'COM10');
    assert.throws(() => normalizeSettings({ ...settings, mode: 'bridge', rnode: { ...settings.rnode, port: '' } }, 'win32'), /serial port/);
});

test('saved interface edits and transport setting survive the next launch', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yara-settings-'));
    try {
        fs.mkdirSync(path.join(root, 'bin'));
        fs.mkdirSync(path.join(root, 'public'));
        fs.writeFileSync(path.join(root, 'bin', 'reticulumd.exe'), '');
        fs.writeFileSync(path.join(root, 'public', 'index.html'), '');
        const stateDir = path.join(root, 'state');
        const first = prepareLaunch({ packaged: true, platform: 'win32', resourcesPath: root, stateDir, env: {} });
        fs.appendFileSync(first.config, '\n[[interfaces]]\nname = "second-tcp"\ntype = "TCPClientInterface"\nenabled = false\ntarget_host = "example.org"\ntarget_port = 4242\n\n[reticulum]\nenable_transport = true\n');
        const second = prepareLaunch({ packaged: true, platform: 'win32', resourcesPath: root, stateDir, env: {} });
        assert.equal(second.mode, 'managed');
        assert.equal(second.config, first.config);
        assert.match(fs.readFileSync(second.config, 'utf8'), /target_host = "example\.org"/);
        assert.match(fs.readFileSync(second.config, 'utf8'), /enable_transport = true/);
        assert.equal((fs.readFileSync(second.config, 'utf8').match(/\[\[interfaces\]\]/g) || []).length, 2);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('legacy generated config migrates once without changing the source', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yara-migration-'));
    try {
        fs.mkdirSync(path.join(root, 'bin'));
        fs.mkdirSync(path.join(root, 'public'));
        fs.writeFileSync(path.join(root, 'bin', 'reticulumd.exe'), '');
        fs.writeFileSync(path.join(root, 'public', 'index.html'), '');
        const stateDir = path.join(root, 'state');
        fs.mkdirSync(stateDir);
        const legacy = 'display_name = "YARA POC"\ninterfaces = [\n  { type = "TCPClientInterface", enabled = true, name = "old-tcp", target_host = "example.org", target_port = 4242 }\n]\n\n[reticulum]\nenable_transport = true\n';
        fs.writeFileSync(path.join(stateDir, 'generated-config.toml'), legacy);
        const plan = prepareLaunch({ packaged: true, platform: 'win32', resourcesPath: root, stateDir, env: {} });
        const migrated = fs.readFileSync(plan.config, 'utf8');
        assert.match(migrated, /\[\[interfaces\]\]\ntype = "TCPClientInterface"/);
        assert.match(migrated, /name = "old-tcp"/);
        assert.match(migrated, /enable_transport = true/);
        assert.equal(fs.readFileSync(path.join(stateDir, 'generated-config.toml'), 'utf8'), legacy);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
