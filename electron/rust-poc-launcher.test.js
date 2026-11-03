const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createConfig, DEFAULT_SETTINGS, normalizeSettings, prepareLaunch } = require('./rust-poc-launcher');
const { importMeshchatIdentity } = require('./meshchat-identity');

function migrationFixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yara-import-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const options = {
        stateDir: path.join(root, 'state'), homeDir: root, repoRoot: root,
        packaged: true, platform: 'linux', env: {},
    };
    const source = path.join(root, '.reticulum-meshchat', 'identity');
    fs.mkdirSync(path.dirname(source));
    fs.mkdirSync(options.stateDir);
    const key = require('node:crypto').randomBytes(64);
    fs.writeFileSync(source, key);
    return { root, options, source, key, destination: path.join(options.stateDir, 'identity') };
}

test('first launch imports the MeshChat key privately and restart preserves it', (t) => {
    const { root, options, source, key, destination } = migrationFixture(t);
    fs.mkdirSync(path.join(root, 'bin'));
    fs.mkdirSync(path.join(root, 'public'));
    fs.writeFileSync(path.join(root, 'bin', 'reticulumd'), '');
    fs.writeFileSync(path.join(root, 'public', 'index.html'), '');
    const launch = { ...options, resourcesPath: root };
    const first = prepareLaunch(launch);
    assert.equal(first.importedIdentity, source);
    assert.deepEqual(fs.readFileSync(destination), key);
    assert.deepEqual(fs.readFileSync(source), key);
    if (process.platform !== 'win32') assert.equal(fs.statSync(destination).mode & 0o777, 0o600);
    fs.writeFileSync(source, Buffer.alloc(64, 9));
    const second = prepareLaunch(launch);
    assert.equal(second.importedIdentity, null);
    assert.deepEqual(fs.readFileSync(destination), key);
});

test('no MeshChat installation and opt-out both leave identity creation to the daemon', (t) => {
    const { options, source, destination } = migrationFixture(t);
    options.env.YARA_IMPORT_MESHCHAT = '0';
    assert.equal(importMeshchatIdentity(options), null);
    delete options.env.YARA_IMPORT_MESHCHAT;
    fs.unlinkSync(source);
    assert.equal(importMeshchatIdentity(options), null);
    assert.equal(fs.existsSync(destination), false);
});

test('an existing YARA identity is never overwritten, even with an explicit source', (t) => {
    const { options, source, destination } = migrationFixture(t);
    const original = Buffer.alloc(64, 42);
    fs.writeFileSync(destination, original);
    options.env.YARA_MESHCHAT_IDENTITY = source;
    assert.equal(importMeshchatIdentity(options), null);
    assert.deepEqual(fs.readFileSync(destination), original);
});

test('custom identity location is supported and a missing explicit file fails visibly', (t) => {
    const { root, options, source, key, destination } = migrationFixture(t);
    const custom = path.join(root, 'custom-key');
    options.env.YARA_MESHCHAT_IDENTITY = custom;
    assert.throws(() => importMeshchatIdentity(options), /not found/);
    assert.equal(fs.existsSync(destination), false);
    fs.renameSync(source, custom);
    assert.equal(importMeshchatIdentity(options), custom);
    assert.deepEqual(fs.readFileSync(destination), key);
});

for (const portable of [false, true]) {
    test(`detects ${portable ? 'Windows portable' : 'source checkout'} identity and refuses ambiguous keys`, (t) => {
        const { root, options, source, destination } = migrationFixture(t);
        options.packaged = portable;
        options.platform = portable ? 'win32' : 'linux';
        const other = portable
            ? path.join(root, 'portable', '.reticulum-meshchat', 'identity')
            : path.join(root, 'storage', 'identity');
        if (portable) options.env.PORTABLE_EXECUTABLE_DIR = path.join(root, 'portable');
        fs.mkdirSync(path.dirname(other), { recursive: true });
        fs.writeFileSync(other, Buffer.alloc(64, 11));
        assert.throws(() => importMeshchatIdentity(options), /Multiple MeshChat identities/);
        assert.equal(fs.existsSync(destination), false);
        fs.unlinkSync(source);
        assert.equal(importMeshchatIdentity(options), other);
        assert.deepEqual(fs.readFileSync(destination), Buffer.alloc(64, 11));
    });
}

test('duplicate copies of one identity are not ambiguous', (t) => {
    const { root, options, source, key } = migrationFixture(t);
    options.packaged = false;
    fs.mkdirSync(path.join(root, 'storage'));
    fs.writeFileSync(path.join(root, 'storage', 'identity'), key);
    assert.equal(importMeshchatIdentity(options), source);
});

test('invalid, dangling, and non-file sources fail without creating an identity', (t) => {
    const { options, source, destination } = migrationFixture(t);
    fs.writeFileSync(source, 'invalid');
    assert.throws(() => importMeshchatIdentity(options), /64-byte private identity/);
    fs.unlinkSync(source);
    fs.mkdirSync(source);
    assert.throws(() => importMeshchatIdentity(options), /64-byte private identity/);
    fs.rmdirSync(source);
    if (process.platform !== 'win32') {
        fs.symlinkSync(`${source}-missing`, source);
        assert.throws(() => importMeshchatIdentity(options), { code: 'ENOENT' });
    }
    assert.equal(fs.existsSync(destination), false);
});

test('a profile with a database and missing identity requires recovery', (t) => {
    const { options, destination } = migrationFixture(t);
    fs.writeFileSync(path.join(options.stateDir, 'reticulum.db'), 'existing history');
    assert.throws(() => importMeshchatIdentity(options), /Restore its original identity/);
    assert.equal(fs.existsSync(destination), false);
});

test('failed writes clean up the private temporary key and can be retried', (t) => {
    const { options, source, destination } = migrationFixture(t);
    const sync = t.mock.method(fs, 'fsyncSync', () => { throw new Error('disk failure'); });
    assert.throws(() => importMeshchatIdentity(options), /disk failure/);
    assert.equal(fs.existsSync(destination), false);
    assert.deepEqual(fs.readdirSync(options.stateDir), []);
    sync.mock.restore();
    assert.equal(importMeshchatIdentity(options), source);
});

test('a competing identity writer cannot be overwritten during publication', (t) => {
    const { options, destination } = migrationFixture(t);
    const originalLink = fs.linkSync;
    const otherKey = Buffer.alloc(64, 12);
    t.mock.method(fs, 'linkSync', (source, target) => {
        fs.writeFileSync(target, otherKey);
        originalLink(source, target);
    });
    assert.throws(() => importMeshchatIdentity(options), { code: 'EEXIST' });
    assert.deepEqual(fs.readFileSync(destination), otherKey);
    assert.deepEqual(fs.readdirSync(options.stateDir), ['identity']);
});

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
            resourcesPath: root, homeDir: root,
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
        const first = prepareLaunch({ packaged: true, platform: 'win32', resourcesPath: root, homeDir: root, stateDir, env: {} });
        fs.appendFileSync(first.config, '\n[[interfaces]]\nname = "second-tcp"\ntype = "TCPClientInterface"\nenabled = false\ntarget_host = "example.org"\ntarget_port = 4242\n\n[reticulum]\nenable_transport = true\n');
        const second = prepareLaunch({ packaged: true, platform: 'win32', resourcesPath: root, homeDir: root, stateDir, env: {} });
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
        const plan = prepareLaunch({ packaged: true, platform: 'win32', resourcesPath: root, homeDir: root, stateDir, env: {} });
        const migrated = fs.readFileSync(plan.config, 'utf8');
        assert.match(migrated, /\[\[interfaces\]\]\ntype = "TCPClientInterface"/);
        assert.match(migrated, /name = "old-tcp"/);
        assert.match(migrated, /enable_transport = true/);
        assert.equal(fs.readFileSync(path.join(stateDir, 'generated-config.toml'), 'utf8'), legacy);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
