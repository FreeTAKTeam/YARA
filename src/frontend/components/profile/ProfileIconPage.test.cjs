const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { parse } = require('@vue/compiler-sfc');

function loadPage(dependencies) {
    const { descriptor } = parse(fs.readFileSync(path.join(__dirname, 'ProfileIconPage.vue'), 'utf8'));
    const script = descriptor.script.content
        .replace(/^import \* as (\w+) from .*;$/gm, 'const $1 = {};')
        .replace(/^import (\w+) from .*;$/gm, 'const $1 = dependencies.$1 ?? {};')
        .replace('export default', 'return');
    const page = new Function('dependencies', 'window', script)(dependencies, dependencies.window);
    return { ...page.data(), ...page.methods };
}

const icon = {
    lxmf_user_icon_name: 'alien-outline',
    lxmf_user_icon_foreground_colour: '#123456',
    lxmf_user_icon_background_colour: '#abcdef',
};

for (const rustPoc of [true, false]) {
    test(`save and remove profile icon with ${rustPoc ? 'Rust' : 'Python'} config format`, async () => {
        const requests = [];
        const saved = { display_name: 'Test', ...icon };
        const page = loadPage({
            GlobalState: { rustPoc },
            DialogUtils: { confirm: async () => true },
            window: { axios: { async patch(url, body) {
                requests.push({ url, body });
                return { data: { config: saved } };
            } } },
        });
        page.iconForegroundColour = icon.lxmf_user_icon_foreground_colour;
        page.iconBackgroundColour = icon.lxmf_user_icon_background_colour;
        await page.onIconClick(icon.lxmf_user_icon_name);
        assert.deepEqual(requests[0], {
            url: '/api/v1/config', body: rustPoc ? { config: icon } : icon,
        });
        assert.equal(page.config, saved);

        await page.removeProfileIcon();
        const removed = Object.fromEntries(Object.keys(icon).map(key => [key, null]));
        assert.deepEqual(requests[1], {
            url: '/api/v1/config', body: rustPoc ? { config: removed } : removed,
        });
    });
}

test('cancelling an icon change or removal does not write config', async () => {
    const page = loadPage({
        DialogUtils: { confirm: async () => false },
        window: { axios: { patch() { assert.fail('unexpected config write'); } } },
    });
    page.iconForegroundColour = '#123456';
    page.iconBackgroundColour = '#abcdef';
    await page.onIconClick('alien-outline');
    await page.removeProfileIcon();
});

for (const message of ['MeshChat state write failed', undefined]) {
    test(`failed save reports ${message ? 'the backend error' : 'a fallback error'} and keeps state`, async (t) => {
        t.mock.method(console, 'log', () => {});
        let alert;
        const page = loadPage({
            GlobalState: { rustPoc: true },
            DialogUtils: { alert(value) { alert = value; } },
            window: { axios: { async patch() { throw { response: { data: { message } } }; } } },
        });
        const original = { display_name: 'Test' };
        page.config = original;
        page.iconForegroundColour = '#123456';
        await page.updateConfig(icon);
        assert.equal(alert, message ?? 'Failed to save config!');
        assert.equal(page.config, original);
        assert.equal(page.iconForegroundColour, '#123456');
    });
}
