const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { parse } = require('@vue/compiler-sfc');

// Exercise the component scripts; the frontend build checks their templates.
function loadOptions(filename, window = {}) {
    const { descriptor } = parse(fs.readFileSync(path.join(__dirname, filename), 'utf8'));
    const script = descriptor.script.content
        .replace(/^import (\w+) from .*;$/gm, 'const $1 = {};')
        .replace('export default', 'return');
    return new Function('window', script)(window);
}

const selector = loadOptions('RNodePresetSelect.vue');
const profiles = [
    ['Rural fallback', 250000, 11, 5],
    ['Urban mesh', 250000, 9, 5],
    ['Extreme range', 125000, 11, 8],
    ['Rural fast', 500000, 10, 5],
];

for (const [label, bandwidth, spreadingfactor, codingrate] of profiles) {
    test(`${label} applies exactly the requested radio settings and preserves other fields`, async () => {
        const original = { name: 'radio', port: 'COM3', txpower: 22, vport: 1, frequency: 868000000 };
        let emitted;
        const context = {
            ...selector.data(), modelValue: original,
            $emit(event, value) { assert.equal(event, 'update:modelValue'); emitted = value; },
        };
        selector.methods.applyPreset.call(context, label);
        const expected = { frequency: 915000000, bandwidth, spreadingfactor, codingrate };
        assert.deepEqual(emitted, { ...original, ...expected });
        assert.equal(original.frequency, 868000000);
        assert.equal(selector.computed.selectedPreset.call({ ...context, modelValue: emitted }), label);

        let payload;
        const page = loadOptions('AddInterfacePage.vue', {
            axios: { async post(url, value) { payload = value; return { data: {} }; } },
        });
        const draft = { ...page.data(), ...page.methods, $router: { push() {} } };
        draft.newInterfaceType = 'RNodeInterface';
        draft.newInterfaceName = original.name;
        draft.newInterfacePort = original.port;
        draft.newInterfaceTxpower = original.txpower;
        page.computed.rnodeRadioSettings.set.call(draft, emitted);
        assert.deepEqual(page.computed.rnodeRadioSettings.get.call(draft), expected);
        for (const isEditingInterface of [false, true]) {
            draft.isEditingInterface = isEditingInterface;
            await draft.addInterface();
            for (const [key, value] of Object.entries(expected)) assert.equal(payload[key], value);
            assert.equal(payload.port, 'COM3');
            assert.equal(payload.txpower, 22);
            assert.equal(payload.allow_overwriting_interface, isEditingInterface);
        }
    });
}

test('saved string values match; any manual radio change is custom', () => {
    const context = { ...selector.data(), modelValue: { frequency: '915000000', bandwidth: '500000', spreadingfactor: '10', codingrate: '5' } };
    assert.equal(selector.computed.selectedPreset.call(context), 'Rural fast');
    for (const key of ['frequency', 'bandwidth', 'spreadingfactor', 'codingrate']) {
        assert.equal(selector.computed.selectedPreset.call({
            ...context, modelValue: { ...context.modelValue, [key]: Number(context.modelValue[key]) + 1 },
        }), '');
    }
    assert.equal(selector.computed.selectedPreset.call({ ...context, modelValue: {} }), '');
});

test('an unknown preset does not change the draft', () => {
    selector.methods.applyPreset.call({
        ...selector.data(), modelValue: {}, $emit() { assert.fail('unexpected change'); },
    }, 'unknown');
});
