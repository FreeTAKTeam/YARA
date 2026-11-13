const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { discoverMeshchat, offerMeshchatImport } = require('./meshchat-import');
const { importMeshchatIdentity } = require('./meshchat-identity');
const { readProfiles, profileDir, selectProfile } = require('./identity-profiles');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yara-profile-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const options = {
        stateDir: path.join(root, 'state'), homeDir: path.join(root, 'home'), repoRoot: root,
        desktopDir: path.join(root, 'Desktop'), executablePath: path.join(root, 'Desktop', 'YARA.exe'),
        packaged: true, platform: 'win32', env: {}, importer: 'meshchat-import.exe', headless: false,
    };
    const source = path.join(options.desktopDir, '.reticulum-meshchat', 'identity');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.mkdirSync(options.stateDir);
    fs.writeFileSync(source, Buffer.alloc(64, 7));
    const summary = { identity_hash: '1'.repeat(32), lxmf_address_hash: '2'.repeat(32),
        message_count: 2, database_path: path.join(path.dirname(source), 'identities', '1'.repeat(32), 'database.db') };
    const calls = [];
    options.run = async (binary, args) => {
        calls.push(args);
        return args.includes('--db') ? { ...summary, imported: 2, skipped: 0 } : summary;
    };
    return { root, options, source, summary, calls, identity: path.join(options.stateDir, 'identity'),
        marker: path.join(options.stateDir, 'meshchat-import.json') };
}

for (const mechanism of ['executablePath', 'PORTABLE_EXECUTABLE_DIR', 'PORTABLE_EXECUTABLE_FILE', 'desktopDir']) {
    test(`discovers Desktop MeshChat and .reticulum config using ${mechanism}`, (t) => {
        const { options, source } = fixture(t);
        fs.mkdirSync(path.join(options.desktopDir, '.reticulum'));
        const config = path.join(options.desktopDir, '.reticulum', 'config');
        fs.writeFileSync(config, '[reticulum]');
        const desktop = options.desktopDir;
        options.executablePath = undefined;
        if (mechanism !== 'desktopDir') options.desktopDir = path.join(options.homeDir, 'EmptyDesktop');
        if (mechanism === 'executablePath') options.executablePath = path.join(desktop, 'YARA.exe');
        if (mechanism === 'PORTABLE_EXECUTABLE_DIR') options.env.PORTABLE_EXECUTABLE_DIR = desktop;
        if (mechanism === 'PORTABLE_EXECUTABLE_FILE') options.env.PORTABLE_EXECUTABLE_FILE = path.join(desktop, 'YARA.exe');
        const found = discoverMeshchat(options);
        assert.deepEqual(found.sources, [source]);
        assert.deepEqual(found.configs, [config]);
    });
}

test('acceptance precedes identity/history writes, preserves source, and suppresses repeat offers', async (t) => {
    const { options, source, calls, identity, marker } = fixture(t);
    let prompted = false;
    options.dialog = { async showMessageBox(box) {
        if (box.type === 'question') {
            assert.equal(fs.existsSync(identity), false);
            assert.equal(calls.some(args => args.includes('--db')), false);
            assert.match(box.detail, /2 messages/);
            prompted = true;
        }
        return { response: 0 };
    } };
    assert.equal(await offerMeshchatImport(options), true);
    assert.equal(prompted, true);
    assert.deepEqual(fs.readFileSync(identity), fs.readFileSync(source));
    assert.equal(JSON.parse(fs.readFileSync(marker)).status, 'imported');
    assert.equal(calls.filter(args => args.includes('--db')).length, 1);
    await offerMeshchatImport({ ...options, dialog: { showMessageBox() { assert.fail('repeat offer'); } } });
});

for (const action of ['skip', 'cancel']) {
    test(`${action} does not import a key or history`, async (t) => {
        const { options, identity, marker, calls } = fixture(t);
        options.dialog = { showMessageBox: async () => ({ response: action === 'skip' ? 2 : 3 }) };
        assert.equal(await offerMeshchatImport(options), action === 'skip');
        assert.equal(fs.existsSync(identity), false);
        assert.equal(calls.some(args => args.includes('--db')), false);
        assert.equal(fs.existsSync(marker), action === 'skip');
    });
}

test('Beta 1 matching identity can import missing history without replacing native files', async (t) => {
    const { options, source, identity } = fixture(t);
    fs.copyFileSync(source, identity);
    const database = path.join(options.stateDir, 'reticulum.db');
    fs.writeFileSync(database, 'existing native history');
    options.dialog = { showMessageBox: async box => {
        if (box.type === 'question') assert.match(box.message, /missing MeshChat messages/);
        return { response: 0 };
    } };
    await offerMeshchatImport(options);
    assert.deepEqual(fs.readFileSync(identity), fs.readFileSync(source));
    assert.equal(fs.readFileSync(database, 'utf8'), 'existing native history');
});

test('a different identity can be used separately without overwriting the current profile', async (t) => {
    const { options, source, identity, calls } = fixture(t);
    const original = Buffer.alloc(64, 9);
    fs.writeFileSync(identity, original);
    options.env.YARA_MESHCHAT_IDENTITY = source;
    let prompts = 0;
    options.dialog = { async showMessageBox(box) {
        if (box.type === 'info') return { response: 0 };
        prompts++;
        if (box.type === 'warning') {
            assert.equal(box.defaultId, 0);
            return { response: 1 };
        }
        return { response: 0 };
    } };
    await offerMeshchatImport(options);
    const profiles = readProfiles(options.stateDir);
    assert.equal(prompts, 2);
    assert.notEqual(profiles.active, 'default');
    assert.deepEqual(fs.readFileSync(path.join(profileDir(options.stateDir, profiles.active), 'identity')), fs.readFileSync(source));
    assert.deepEqual(fs.readFileSync(identity), original);
    assert.equal(calls.some(args => args.includes('--db')), true);
    selectProfile(options.stateDir, 'default');
    assert.equal(readProfiles(options.stateDir).active, 'default');
});

test('replacement requires a second non-default warning and retains the original as a backup', async (t) => {
    const { options, source, identity } = fixture(t);
    fs.writeFileSync(identity, Buffer.alloc(64, 9));
    fs.writeFileSync(path.join(options.stateDir, 'reticulum.db'), 'original messages');
    options.env.YARA_MESHCHAT_IDENTITY = source;
    let step = 0;
    options.dialog = { async showMessageBox(box) {
        if (box.type === 'info') return { response: 0 };
        step++;
        if (step === 1) return { response: 0 };
        assert.equal(box.defaultId, 0);
        return { response: step === 2 ? 2 : 1 };
    } };
    await offerMeshchatImport(options);
    const profiles = readProfiles(options.stateDir);
    assert.equal(step, 3);
    assert.equal(profiles.profiles.find(p => p.id === 'default').backup, true);
    assert.deepEqual(fs.readFileSync(identity), Buffer.alloc(64, 9));
    assert.equal(fs.readFileSync(path.join(options.stateDir, 'reticulum.db'), 'utf8'), 'original messages');
    assert.deepEqual(fs.readFileSync(path.join(profileDir(options.stateDir, profiles.active), 'identity')), fs.readFileSync(source));
});

test('cancelling replacement or failing import leaves the selected profile unchanged', async (t) => {
    const { options, source, identity } = fixture(t);
    fs.writeFileSync(identity, Buffer.alloc(64, 9));
    options.env.YARA_MESHCHAT_IDENTITY = source;
    let step = 0;
    options.dialog = { showMessageBox: async () => ({ response: ++step === 1 ? 0 : step === 2 ? 2 : 0 }) };
    assert.equal(await offerMeshchatImport(options), false);
    assert.equal(readProfiles(options.stateDir).active, 'default');
    step = 0;
    options.dialog = { showMessageBox: async () => ({ response: ++step === 1 ? 0 : 1 }) };
    const run = options.run;
    options.run = (binary, args) => args.includes('--db') ? Promise.reject(new Error('import failed')) : run(binary, args);
    await assert.rejects(offerMeshchatImport(options), /import failed/);
    assert.equal(readProfiles(options.stateDir).active, 'default');
    assert.deepEqual(fs.readFileSync(identity), Buffer.alloc(64, 9));
    assert.deepEqual(fs.readdirSync(path.join(options.stateDir, 'profiles')), []);
});

test('headless import does not replace a different identity without consent', async (t) => {
    const { options, source, identity } = fixture(t);
    fs.writeFileSync(identity, Buffer.alloc(64, 9));
    options.env.YARA_MESHCHAT_IDENTITY = source;
    await assert.rejects(offerMeshchatImport({ ...options, headless: true }), /interactive confirmation/);
    assert.deepEqual(fs.readFileSync(identity), Buffer.alloc(64, 9));
});

test('folder picker confirms the chosen profile before writes', async (t) => {
    const { options, source, identity } = fixture(t);
    const chosen = path.join(options.homeDir, 'custom-profile');
    fs.mkdirSync(chosen, { recursive: true });
    fs.renameSync(source, path.join(chosen, 'identity'));
    let questions = 0;
    options.dialog = {
        showMessageBox: async box => {
            if (box.type !== 'question') return { response: 0 };
            assert.equal(fs.existsSync(identity), false);
            questions++;
            if (questions === 2) assert.match(box.detail, /custom-profile/);
            return { response: 0 };
        },
        showOpenDialog: async () => ({ canceled: false, filePaths: [chosen] }),
    };
    await offerMeshchatImport(options);
    assert.equal(questions, 2);
    assert.equal(fs.existsSync(identity), true);
});

test('a .reticulum transport key without a MeshChat database is only a discovery hint', async (t) => {
    const { options, source, summary, calls } = fixture(t);
    const protocol = path.join(options.desktopDir, '.reticulum');
    fs.mkdirSync(protocol);
    fs.renameSync(source, path.join(protocol, 'identity'));
    fs.writeFileSync(path.join(protocol, 'config'), '[reticulum]');
    summary.database_path = null;
    options.dialog = { showMessageBox: async box => {
        assert.equal(box.buttons.some(button => button.startsWith('Import profile')), false);
        assert.match(box.detail, /Network settings are not imported/);
        return { response: 1 };
    } };
    await offerMeshchatImport(options);
    assert.equal(calls.some(args => args.includes('--db')), false);
});

test('failed history import is visible and retryable; headless requires explicit source', async (t) => {
    const { options, source, marker, calls } = fixture(t);
    await offerMeshchatImport({ ...options, headless: true });
    assert.equal(calls.length, 0);
    options.env.YARA_MESHCHAT_IDENTITY = source;
    const run = options.run;
    options.run = async (binary, args) => {
        if (args.includes('--db')) throw new Error('bad message fields');
        return run(binary, args);
    };
    await assert.rejects(offerMeshchatImport({ ...options, headless: true }), /bad message fields/);
    assert.equal(fs.existsSync(marker), false);
});

test('atomic identity copy preserves keys on invalid sources, failed writes and publication races', (t) => {
    const { options, source, identity } = fixture(t);
    const sync = t.mock.method(fs, 'fsyncSync', () => { throw new Error('disk failure'); });
    assert.throws(() => importMeshchatIdentity({ stateDir: options.stateDir, source }), /disk failure/);
    assert.equal(fs.existsSync(identity), false);
    assert.deepEqual(fs.readdirSync(options.stateDir), []);
    sync.mock.restore();
    const link = fs.linkSync;
    t.mock.method(fs, 'linkSync', (from, to) => { fs.writeFileSync(to, Buffer.alloc(64, 3)); link(from, to); });
    assert.throws(() => importMeshchatIdentity({ stateDir: options.stateDir, source }), { code: 'EEXIST' });
    assert.deepEqual(fs.readFileSync(identity), Buffer.alloc(64, 3));
    assert.deepEqual(fs.readdirSync(options.stateDir), ['identity']);
});

test('identity copy rejects invalid keys, different existing identities and missing-key recovery', (t) => {
    const { options, source, identity } = fixture(t);
    const copy = () => importMeshchatIdentity({ stateDir: options.stateDir, source });
    fs.writeFileSync(source, 'invalid');
    assert.throws(copy, /64-byte private identity/);
    fs.writeFileSync(source, Buffer.alloc(64, 7));
    fs.writeFileSync(path.join(options.stateDir, 'reticulum.db'), 'existing history');
    assert.throws(copy, /Restore its original identity/);
    fs.writeFileSync(identity, Buffer.alloc(64, 9));
    assert.throws(copy, /does not match/);
    fs.copyFileSync(source, identity);
    assert.equal(copy(), null);
});

test('an interrupted marker is retryable, and an explicit import can retry a declined offer', async (t) => {
    t.mock.method(console, 'warn', () => {});
    const { options, source, marker, calls } = fixture(t);
    fs.writeFileSync(marker, '');
    options.dialog = { showMessageBox: async () => ({ response: 0 }) };
    await offerMeshchatImport(options);
    fs.writeFileSync(marker, JSON.stringify({ status: 'declined' }));
    await offerMeshchatImport({ ...options, env: { YARA_MESHCHAT_IDENTITY: source } });
    assert.equal(calls.filter(args => args.includes('--db')).length, 2);
});

test('a source identity changed during confirmation is rejected before writes', async (t) => {
    const { options, source, identity, marker, calls } = fixture(t);
    options.dialog = { showMessageBox: async () => {
        fs.writeFileSync(source, Buffer.alloc(64, 6));
        return { response: 0 };
    } };
    await assert.rejects(offerMeshchatImport(options), /identity changed after/);
    assert.equal(fs.existsSync(identity), false);
    assert.equal(fs.existsSync(marker), false);
    assert.equal(calls.some(args => args.includes('--db')), false);
});

test('explicit opt-out does not inspect sources, prompt or write a marker', async (t) => {
    const { options, source, identity, marker } = fixture(t);
    options.env = { YARA_IMPORT_MESHCHAT: '0', YARA_MESHCHAT_IDENTITY: source };
    options.run = () => { assert.fail('opted-out source inspected'); };
    options.dialog = { showMessageBox() { assert.fail('opted-out offer shown'); } };
    assert.equal(await offerMeshchatImport(options), true);
    assert.equal(fs.existsSync(identity), false);
    assert.equal(fs.existsSync(marker), false);
});

test('skipping a manual import leaves the existing migration marker untouched', async (t) => {
    const { options, source, marker } = fixture(t);
    fs.writeFileSync(marker, '{"status":"imported"}\n');
    options.env.YARA_MESHCHAT_IDENTITY = source;
    options.dialog = { showMessageBox: async () => ({ response: 2 }) };
    assert.equal(await offerMeshchatImport({ ...options, manual: true }), false);
    assert.equal(fs.readFileSync(marker, 'utf8'), '{"status":"imported"}\n');
});
