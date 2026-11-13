const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');

for (const platform of ['darwin', 'win32', 'linux']) {
    test(`main window title bar configuration on ${platform}`, async () => {
        let start;
        let options;
        const loadingPageReached = new Error('Stop before launching the backend');
        const electron = {
            app: {
                isPackaged: false,
                getPath: () => '/test',
                whenReady: () => ({ then: (callback) => { start = callback; } }),
                on() {},
            },
            ipcMain: { handle() {} },
            BrowserWindow: class {
                constructor(value) { options = value; }
                webContents = { setWindowOpenHandler() {} };
                loadFile() { throw loadingPageReached; }
            },
        };
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'), {
            require: (name) => {
                if (name === 'electron') return electron;
                if (name === 'electron-prompt') return () => {};
                return require(name);
            },
            __dirname,
            process: { platform, env: {}, argv: ['electron', '.'], on() {} },
        });
        await assert.rejects(start(), (error) => error === loadingPageReached);

        assert.equal(options.titleBarStyle, platform === 'darwin' ? 'default' : 'hidden');
        if (platform === 'darwin') {
            assert.equal(options.titleBarOverlay, false);
        } else {
            assert.equal(options.titleBarOverlay.height, 86);
            assert.equal(options.titleBarOverlay.color, '#00000000');
            assert.equal(options.titleBarOverlay.symbolColor, '#8fdbff');
        }
    });
}

function lifecycleHarness({ childState = {}, headless = true, loadFile = async () => {}, importOffer = async () => true } = {}) {
    let start;
    const child = Object.assign(new EventEmitter(), {
        pid: 123,
        exitCode: null,
        signalCode: null,
        stdout: { setEncoding() {}, on() {} },
        stderr: { setEncoding() {}, on() {} },
    }, childState);
    const kills = [];
    child.kill = (signal) => { kills.push(signal); return true; };
    const handlers = new Map();
    const timers = new Map();
    const processMock = Object.assign(new EventEmitter(), {
        platform: 'linux', env: {}, argv: ['yara', ...(headless ? ['--headless'] : [])],
    });
    const app = Object.assign(new EventEmitter(), {
        isPackaged: true,
        getPath: () => '/test',
        exits: 0,
        relaunches: 0,
        whenReady: () => ({ then: (callback) => { start = callback; } }),
        relaunch() { this.relaunches++; },
        quit() {
            let prevented = false;
            this.emit('before-quit', { preventDefault() { prevented = true; } });
            if (!prevented) this.exits++;
        },
    });
    let spawns = 0;
    const dialogs = [];
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'), {
        require: (name) => {
            if (name === 'electron') return {
                app,
                ipcMain: { handle: (name, callback) => handlers.set(name, callback) },
                dialog: { showMessageBox: async (...args) => { dialogs.push(args); } },
                BrowserWindow: class {
                    webContents = { setWindowOpenHandler() {} };
                    loadFile = loadFile;
                },
            };
            if (name === 'electron-prompt') return () => {};
            if (name === './meshchat-import') return { offerMeshchatImport: importOffer };
            if (name === './rust-poc-launcher') return {
                prepareLaunch: () => ({ bind: '127.0.0.1:9337', binary: 'reticulumd', args: [] }),
            };
            if (name === 'node:net') return { createServer: () => ({
                once() {}, listen(port, host, callback) { callback(); }, close(callback) { callback(); },
            }) };
            if (name === 'child_process') return { spawn: () => { spawns++; return child; } };
            return require(name);
        },
        __dirname,
        process: processMock,
        setTimeout: (callback, delay) => { timers.set(callback, delay); return callback; },
        clearTimeout: (id) => timers.delete(id),
    });
    return { start: () => start(), child, app, handlers, kills, timers, dialogs, process: processMock,
        get spawns() { return spawns; } };
}

for (const action of ['window-all-closed', 'relaunch', 'SIGTERM', 'SIGINT', 'SIGHUP']) {
    test(`${action} waits for backend exit before quitting`, async () => {
        const harness = lifecycleHarness();
        await harness.start();
        if (action === 'relaunch') harness.handlers.get('relaunch')();
        else if (action === 'window-all-closed') harness.app.emit(action);
        else harness.process.emit(action);
        assert.equal(harness.app.exits, 0);
        assert.deepEqual(harness.kills, ['SIGTERM']);
        assert.deepEqual([...harness.timers.values()], [5000]);

        // A second close/restart request must not schedule another stop or relaunch.
        harness.app.quit();
        harness.handlers.get('relaunch')();
        assert.deepEqual(harness.kills, ['SIGTERM']);
        assert.equal(harness.app.relaunches, action === 'relaunch' ? 1 : 0);

        harness.child.signalCode = 'SIGTERM';
        harness.child.emit('exit', null, 'SIGTERM');
        assert.equal(harness.app.exits, 1);
        assert.equal(harness.timers.size, 0);
        assert.equal(harness.dialogs.length, 0);
    });
}

test('an unresponsive backend is force-stopped before Electron exits', async () => {
    const harness = lifecycleHarness();
    await harness.start();
    harness.app.quit();
    [...harness.timers.keys()][0]();
    assert.deepEqual(harness.kills, ['SIGTERM', 'SIGKILL']);
    assert.equal(harness.app.exits, 0);
    harness.child.signalCode = 'SIGKILL';
    harness.child.emit('exit', null, 'SIGKILL');
    assert.equal(harness.app.exits, 1);
    assert.equal(harness.timers.size, 0);
});

for (const childState of [{ pid: undefined }, { exitCode: 0 }, { signalCode: 'SIGTERM' }]) {
    test(`quitting does not wait for a backend that is not running: ${JSON.stringify(childState)}`, async () => {
        const harness = lifecycleHarness({ childState });
        await harness.start();
        harness.app.quit();
        assert.equal(harness.app.exits, 1);
        assert.deepEqual(harness.kills, []);
        assert.equal(harness.timers.size, 0);
    });
}

test('closing the loading window does not start a backend after quitting', async () => {
    let finishLoading;
    let loading;
    const loadingStarted = new Promise((resolve) => { loading = resolve; });
    const harness = lifecycleHarness({ headless: false, loadFile: () => {
        loading();
        return new Promise((resolve) => { finishLoading = resolve; });
    } });
    const started = harness.start();
    await loadingStarted;
    harness.app.emit('window-all-closed');
    finishLoading();
    await started;
    assert.equal(harness.spawns, 0);
    assert.equal(harness.app.exits, 1);
});
