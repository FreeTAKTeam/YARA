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
