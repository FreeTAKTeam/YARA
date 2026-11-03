const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

for (const platform of ['darwin', 'win32', 'linux']) {
    test(`main window title bar configuration on ${platform}`, async () => {
        let start;
        let options;
        const loadingPageReached = new Error('Stop before launching the backend');
        const electron = {
            app: {
                isPackaged: false,
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

for (const headless of [false, true]) {
    test(`import is reported before daemon startup (${headless ? 'headless' : 'desktop'})`, async () => {
        let start;
        const events = [];
        const plan = { bind: '127.0.0.1:9337', binary: 'reticulumd', args: [], importedIdentity: '/meshchat/identity' };
        const electron = {
            app: {
                isPackaged: true,
                whenReady: () => ({ then: (callback) => { start = callback; } }),
                on() {},
            },
            ipcMain: { handle() {} },
            dialog: { showMessageBox: async (options) => {
                assert.match(options.message, /LXMF address stays the same/);
                assert.match(options.message, /Message history was not imported/);
                events.push('notice');
            } },
            BrowserWindow: class {
                webContents = { setWindowOpenHandler() {} };
                async loadFile() {}
            },
        };
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'), {
            require: (name) => {
                if (name === 'electron') return electron;
                if (name === 'electron-prompt') return () => {};
                if (name === './rust-poc-launcher') return { prepareLaunch: () => plan };
                if (name === 'node:net') return { createServer: () => ({
                    once() {}, listen(port, host, callback) { callback(); }, close(callback) { callback(); },
                }) };
                if (name === 'child_process') return { spawn: () => {
                    events.push('spawn');
                    const stream = { setEncoding() {}, on() {} };
                    return { stdout: stream, stderr: stream, on() {} };
                } };
                return require(name);
            },
            __dirname,
            console: { log(message) {
                assert.match(message, /LXMF address stays the same/);
                events.push('notice');
            } },
            process: { platform: 'linux', env: {}, argv: ['yara', ...(headless ? ['--headless'] : [])], on() {} },
        });
        await start();
        assert.deepEqual(events, ['notice', 'spawn']);
    });
}
