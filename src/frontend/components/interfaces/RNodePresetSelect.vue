<template>
    <div>
        <FormLabel>
            Radio preset
            <select :value="selectedPreset" @change="applyPreset($event.target.value)" class="mt-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-zinc-900 dark:border-zinc-600 dark:text-white">
                <option value="" disabled>Custom / manual settings</option>
                <option v-for="preset in presets" :key="preset.label" :value="preset.label">{{ preset.label }} — {{ preset.settings.bandwidth / 1000 }} kHz · SF{{ preset.settings.spreadingfactor }} · 4/{{ preset.settings.codingrate }}</option>
            </select>
        </FormLabel>
        <FormSubLabel>All presets use 915.000 MHz. Choose a preset or edit the radio values below.</FormSubLabel>
    </div>
</template>

<script>
import FormLabel from "../forms/FormLabel.vue";
import FormSubLabel from "../forms/FormSubLabel.vue";

export default {
    components: { FormLabel, FormSubLabel },
    props: {
        modelValue: { type: Object, required: true },
    },
    emits: ['update:modelValue'],
    data() {
        return {
            presets: [
                { label: 'Rural fallback', settings: { frequency: 915000000, bandwidth: 250000, spreadingfactor: 11, codingrate: 5 } },
                { label: 'Urban mesh', settings: { frequency: 915000000, bandwidth: 250000, spreadingfactor: 9, codingrate: 5 } },
                { label: 'Extreme range', settings: { frequency: 915000000, bandwidth: 125000, spreadingfactor: 11, codingrate: 8 } },
                { label: 'Rural fast', settings: { frequency: 915000000, bandwidth: 500000, spreadingfactor: 10, codingrate: 5 } },
            ],
        };
    },
    computed: {
        selectedPreset() {
            return this.presets.find(preset => Object.entries(preset.settings).every(([key, value]) => Number(this.modelValue[key]) === value))?.label ?? '';
        },
    },
    methods: {
        applyPreset(label) {
            const preset = this.presets.find(preset => preset.label === label);
            if (preset) this.$emit('update:modelValue', { ...this.modelValue, ...preset.settings });
        },
    },
};
</script>
