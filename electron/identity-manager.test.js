const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { manageIdentities } = require('./identity-manager');
const { createProfile, activateNewProfile, readProfiles } = require('./identity-profiles');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yara-manager-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.writeFileSync(path.join(root, 'identity'), Buffer.alloc(64, 1));
    const profile = createProfile(root);
    fs.writeFileSync(path.join(profile.dir, 'identity'), Buffer.alloc(64, 2));
    activateNewProfile(root, profile.id, false);
    const migration = { profileRoot: root, stateDir: profile.dir, env: {} };
    return { root, migration, run: async () => ({ lxmf_address_hash: 'a'.repeat(32) }) };
}

test('manager switches to an existing profile for the next launch', async (t) => {
    const options = fixture(t);
    let calls = 0;
    const dialog = { showMessageBox: async box => {
        calls++;
        if (calls === 1) { assert.match(box.detail, /close and reopen/); return { response: 0 }; }
        return { response: 0 };
    } };
    await manageIdentities({ ...options, importer: 'test', dialog });
    assert.equal(readProfiles(options.root).active, 'default');
    assert.equal(calls, 2);
});

test('manager file picker passes the chosen source through the consent-based importer', async (t) => {
    const options = fixture(t);
    const source = path.join(options.root, 'external-key');
    fs.writeFileSync(source, Buffer.alloc(64, 3));
    const dialog = { showMessageBox: async () => ({ response: 2 }),
        showOpenDialog: async opts => { assert.deepEqual(opts.properties, ['openFile']); return { canceled: false, filePaths: [source] }; } };
    let passed;
    await manageIdentities({ ...options, importer: 'test', dialog, offer: async args => { passed = args; return false; } });
    assert.equal(passed.env.YARA_MESHCHAT_IDENTITY, source);
    assert.equal(passed.forceNewProfile, true);
    assert.notEqual(readProfiles(options.root).active, 'default');
});

test('a missing backup does not prevent choosing a healthy profile', async (t) => {
    const options = fixture(t);
    fs.unlinkSync(path.join(options.migration.stateDir, 'identity'));
    const run = async (binary, args) => {
        if (!fs.existsSync(args[1])) throw new Error('identity missing');
        return { lxmf_address_hash: 'a'.repeat(32) };
    };
    let count = 0;
    const dialog = { showMessageBox: async box => {
        if (++count === 1) { assert.match(box.buttons[1], /unavailable/); return { response: 0 }; }
        return { response: 0 };
    } };
    await manageIdentities({ ...options, run, importer: 'test', dialog });
    assert.equal(readProfiles(options.root).active, 'default');
});
