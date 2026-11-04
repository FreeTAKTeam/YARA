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
                    on() {}, quit() { quits++; },
                },
                ipcMain: { handle() {} },
                BrowserWindow: class {
                    webContents = { setWindowOpenHandler() {} };
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
