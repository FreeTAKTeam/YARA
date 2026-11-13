const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

for (const headless of [false, true]) {
    for (const accepted of [false, true]) {
        test(`migration precedes startup (${headless ? 'headless' : 'desktop'}, ${accepted ? 'accepted' : 'cancelled'})`, async () => {
            let start;
            let finishOffer;
            let offered;
            let spawns = 0;
            let quits = 0;
            const waiting = new Promise(resolve => { offered = resolve; });
            const plan = { bind: '127.0.0.1:9337', binary: 'reticulumd', args: [],
                importer: 'meshchat-import', migration: { stateDir: '/test/state' } };
            const electron = {
                app: {
                    isPackaged: true, getPath: name => `/test/${name}`,
                    whenReady: () => ({ then: callback => { start = callback; } }),
                    requestSingleInstanceLock: () => true,
                    on() {}, quit() { quits++; },
                },
                ipcMain: { handle() {} },
                Menu: { buildFromTemplate: () => ({}) },
                nativeImage: { createFromPath: () => ({ resize: () => ({}) }) },
                Tray: class { setToolTip() {} setContextMenu() {} on() {} },
                BrowserWindow: class {
                    webContents = { setWindowOpenHandler() {} };
                    on() {}
                    async loadFile() {}
                },
            };
            vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'), {
                require: name => {
                    if (name === 'electron') return electron;
                    if (name === 'electron-prompt') return () => {};
                    if (name === './rust-poc-launcher') return { prepareLaunch(options) {
                        assert.equal(options.executablePath, '/test/exe');
                        assert.equal(options.desktopDir, '/test/desktop');
                        return plan;
                    } };
                    if (name === './meshchat-import') return { offerMeshchatImport(options) {
                        assert.equal(options.importer, 'meshchat-import');
                        assert.equal(options.stateDir, '/test/state');
                        assert.equal(options.headless, headless);
                        offered();
                        return new Promise(resolve => { finishOffer = resolve; });
                    } };
                    if (name === 'node:net') return { createServer: () => ({
                        once() {}, listen(port, host, callback) { callback(); }, close(callback) { callback(); },
                    }) };
                    if (name === 'child_process') return { spawn: () => {
                        spawns++;
                        const stream = { setEncoding() {}, on() {} };
                        return { stdout: stream, stderr: stream, on() {} };
                    } };
                    return require(name);
                },
                __dirname,
                process: { platform: 'win32', env: {}, argv: ['yara', ...(headless ? ['--headless'] : [])], on() {} },
            });
            const started = start();
            await waiting;
            assert.equal(spawns, 0);
            finishOffer(accepted);
            await started;
            assert.equal(spawns, accepted ? 1 : 0);
            assert.equal(quits, accepted ? 0 : 1);
        });
    }
}

test('startup launches the profile selected by the import offer', async () => {
    let start;
    let prepared = 0;
    let selected = false;
    let spawned;
    const electron = {
        app: { isPackaged: true, getPath: name => `/test/${name}`, whenReady: () => ({ then: callback => { start = callback; } }), requestSingleInstanceLock: () => true, on() {}, quit() {} },
        ipcMain: { handle() {} },
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'), {
        require: name => {
            if (name === 'electron') return electron;
            if (name === 'electron-prompt') return () => {};
            if (name === './identity-manager') return {};
            if (name === './identity-profiles') return {
                readProfiles: () => ({ active: selected ? 'new' : 'default' }),
                profileDir: (root, id) => id === 'new' ? '/test/new' : '/test/state',
            };
            if (name === './rust-poc-launcher') return { prepareLaunch: () => {
                prepared++;
                const stateDir = selected ? '/test/new' : '/test/state';
                return { bind: '127.0.0.1:9337', binary: 'reticulumd', args: ['--identity', stateDir + '/identity'],
                    stateDir, importer: 'meshchat-import', migration: { stateDir, profileRoot: '/test/state' } };
            } };
            if (name === './meshchat-import') return { offerMeshchatImport: async () => { selected = true; return true; } };
            if (name === 'node:net') return { createServer: () => ({ once() {}, listen(port, host, cb) { cb(); }, close(cb) { cb(); } }) };
            if (name === 'child_process') return { spawn: (binary, args) => {
                spawned = args; const stream = { setEncoding() {}, on() {} };
                return { stdout: stream, stderr: stream, on() {} };
            } };
            return require(name);
        },
        __dirname,
        process: { platform: 'linux', env: {}, argv: ['yara', '--headless'], on() {} },
    });
    await start();
    assert.equal(prepared, 2);
    assert.equal(spawned[1], '/test/new/identity');
});

test('identity manager IPC only accepts the app window and prevents concurrent dialogs', async () => {
    let start;
    let manage;
    let finish;
    let opened = 0;
    const sender = {};
    const electron = {
        app: { isPackaged: true, getPath: () => '/test', whenReady: () => ({ then: callback => { start = callback; } }), requestSingleInstanceLock: () => true, on() {}, quit() {} },
        ipcMain: { handle: (name, fn) => { if (name === 'manage-identities') manage = fn; } },
        BrowserWindow: class { webContents = Object.assign(sender, { setWindowOpenHandler() {} }); async loadFile() {} },
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'), {
        require: name => {
            if (name === 'electron') return electron;
            if (name === 'electron-prompt') return () => {};
            if (name === './identity-manager') return { manageIdentities: () => { opened++; return new Promise(resolve => { finish = resolve; }); } };
            if (name === './rust-poc-launcher') return { prepareLaunch: () => ({ bind: '127.0.0.1:9337', binary: 'reticulumd', args: [], importer: 'meshchat-import', migration: {} }) };
            if (name === './meshchat-import') return { offerMeshchatImport: async () => true };
            if (name === 'node:net') return { createServer: () => ({ once() {}, listen(port, host, cb) { cb(); }, close(cb) { cb(); } }) };
            if (name === 'child_process') return { spawn: () => {
                const stream = { setEncoding() {}, on() {} }; return { stdout: stream, stderr: stream, on() {} };
            } };
            return require(name);
        },
        __dirname, process: { platform: 'linux', env: {}, argv: ['yara'], on() {} },
    });
    await start();
    await manage({ sender: {} });
    assert.equal(opened, 0);
    const first = manage({ sender });
    await manage({ sender });
    assert.equal(opened, 1);
    finish();
    await first;
});
