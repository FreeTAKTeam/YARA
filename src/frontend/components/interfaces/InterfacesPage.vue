<template>
    <div class="flex flex-col flex-1 overflow-hidden min-w-full sm:min-w-[500px] dark:bg-zinc-950">
        <div v-if="rustPoc" class="overflow-y-auto p-4 space-y-3 text-gray-900 dark:text-zinc-100">
            <h2 class="text-lg font-semibold">Rust proof of concept interfaces</h2>
            <p>Choose TCP, a serial RNode, or both. Saving restarts YARA so the new interfaces take effect.</p>
            <form v-if="isElectron && rustSettings" @submit.prevent="saveRustSettings" class="rounded border border-gray-300 dark:border-zinc-700 p-4 space-y-4">
                <label class="block text-sm font-medium">Mode
                    <select v-model="rustSettings.mode" class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                        <option value="tcp">TCP</option>
                        <option value="rnode">RNode</option>
                        <option value="bridge">TCP + RNode bridge (transport enabled)</option>
                    </select>
                </label>
                <div v-if="rustSettings.mode !== 'rnode'" class="grid gap-3 sm:grid-cols-2">
                    <label class="block text-sm font-medium">TCP host
                        <input v-model.trim="rustSettings.tcp.host" type="text" required class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                    </label>
                    <label class="block text-sm font-medium">TCP port
                        <input v-model.number="rustSettings.tcp.port" type="number" min="1" max="65535" required class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                    </label>
                </div>
                <div v-if="rustSettings.mode !== 'tcp'" class="space-y-3">
                    <label class="block text-sm font-medium">RNode serial port
                        <input v-model.trim="rustSettings.rnode.port" type="text" placeholder="COM3 or /dev/ttyUSB1" required class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                    </label>
                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label class="block text-sm font-medium">Frequency (Hz)
                            <input v-model.number="rustSettings.rnode.frequency" type="number" min="1" required class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                        </label>
                        <label class="block text-sm font-medium">Bandwidth (Hz)
                            <input v-model.number="rustSettings.rnode.bandwidth" type="number" min="1" required class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                        </label>
                        <label class="block text-sm font-medium">Spreading factor
                            <input v-model.number="rustSettings.rnode.spreadingFactor" type="number" min="6" max="12" required class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                        </label>
                        <label class="block text-sm font-medium">Coding rate denominator (4/5 = 5)
                            <input v-model.number="rustSettings.rnode.codingRate" type="number" min="5" max="8" required class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                        </label>
                        <label class="block text-sm font-medium">Transmit power (dBm)
                            <input v-model.number="rustSettings.rnode.txPower" type="number" min="0" max="30" required class="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                        </label>
                    </div>
                </div>
                <p v-if="rustSettingsError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ rustSettingsError }}</p>
                <div class="flex flex-wrap items-center gap-3">
                    <button type="submit" :disabled="rustSaving" class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{{ rustSaving ? 'Saving…' : 'Save and restart' }}</button>
                    <span class="text-xs text-gray-600 dark:text-zinc-400">{{ rustSettingsPath }}</span>
                </div>
            </form>
            <p v-else-if="!isElectron">In a browser-only session, edit <code>~/.yara/settings.json</code> (or <code>storage/rust-poc/settings.json</code> for a source checkout) and restart the daemon.</p>
            <p v-if="rustInterfaces.length === 0">No active interface is reported by the daemon.</p>
            <div v-for="iface in rustInterfaces" :key="iface.name" class="rounded border border-gray-300 dark:border-zinc-700 p-3">
                <div class="font-semibold">{{ iface.name }}</div>
                <div class="text-sm">{{ iface.type }} · {{ iface.enabled ? 'Enabled' : 'Disabled' }}<span v-if="iface.connection"> · {{ iface.connection }}</span></div>
            </div>
        </div>
        <div v-else class="overflow-y-auto p-2 space-y-2">

            <!-- warning - keeping orange-500 for warning visibility in both modes -->
            <div class="flex bg-orange-500 p-2 text-sm font-semibold leading-6 text-white rounded shadow">
                <div class="my-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                </div>
                <div class="ml-2 my-auto">Reticulum MeshChat must be restarted for any interface changes to take effect.</div>
                <button v-if="isElectron" 
                    @click="relaunch" 
                    type="button" 
                    class="ml-auto my-auto inline-flex items-center gap-x-1 rounded-md bg-white dark:bg-zinc-800 px-2 py-1 text-sm font-semibold text-black dark:text-zinc-200 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:focus-visible:outline-zinc-700">
                    <span>Restart Now</span>
                </button>
            </div>

            <div class="flex space-x-1">

                <!-- Add Interface button -->
                <RouterLink :to="{ name: 'interfaces.add' }">
                    <button type="button" 
                        class="my-auto inline-flex items-center gap-x-1 rounded-md bg-gray-500 dark:bg-zinc-700 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-gray-400 dark:hover:bg-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 dark:focus-visible:outline-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Add Interface</span>
                    </button>
                </RouterLink>

                <!-- Import button -->
                <div class="my-auto">
                    <button @click="showImportInterfacesModal" type="button" class="inline-flex items-center gap-x-1 rounded-md bg-gray-500 dark:bg-zinc-700 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-gray-400 dark:hover:bg-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 dark:focus-visible:outline-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        <span>Import</span>
                    </button>
                </div>

                <!-- Export button -->
                <div class="my-auto">
                    <button @click="exportInterfaces" type="button" class="inline-flex items-center gap-x-1 rounded-md bg-gray-500 dark:bg-zinc-700 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-gray-400 dark:hover:bg-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 dark:focus-visible:outline-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span>Export</span>
                    </button>
                </div>

            </div>

            <!-- enabled interfaces -->
            <Interface
                v-for="iface of enabledInterfaces"
                :iface="iface"
                @enable="enableInterface(iface._name)"
                @disable="disableInterface(iface._name)"
                @edit="editInterface(iface._name)"
                @export="exportInterface(iface._name)"
                @delete="deleteInterface(iface._name)"/>

            <!-- disabled interfaces -->
            <div v-if="disabledInterfaces.length > 0" class="font-semibold dark:text-zinc-200">Disabled Interfaces</div>
            <Interface
                v-for="iface of disabledInterfaces"
                :iface="iface"
                @enable="enableInterface(iface._name)"
                @disable="disableInterface(iface._name)"
                @edit="editInterface(iface._name)"
                @export="exportInterface(iface._name)"
                @delete="deleteInterface(iface._name)"/>

        </div>
    </div>

    <!-- Import Dialog -->
    <ImportInterfacesModal v-if="!rustPoc" ref="import-interfaces-modal" @dismissed="onImportInterfacesModalDismissed"/>

</template>

<script>
import DialogUtils from "../../js/DialogUtils";
import ElectronUtils from "../../js/ElectronUtils";
import Interface from "./Interface.vue";
import Utils from "../../js/Utils";
import ImportInterfacesModal from "./ImportInterfacesModal.vue";
import DownloadUtils from "../../js/DownloadUtils";
import GlobalState from "../../js/GlobalState";

export default {
    name: 'InterfacesPage',
    components: {
        ImportInterfacesModal,
        Interface,
    },
    data() {
        return {
            interfaces: {},
            rustInterfaces: [],
            rustSettings: null,
            rustSettingsPath: '',
            rustSettingsError: '',
            rustSaving: false,
            interfaceStats: {},
            reloadInterval: null,
        };
    },
    beforeUnmount() {
        clearInterval(this.reloadInterval);
    },
    mounted() {

        if (this.rustPoc) {
            this.loadRustInterfaces();
            this.loadRustSettings();
            return;
        }

        this.loadInterfaces();
        this.updateInterfaceStats();

        // update info every few seconds
        this.reloadInterval = setInterval(() => {
            this.updateInterfaceStats();
        }, 1000);

    },
    methods: {
        async loadRustSettings() {
            if (!window.electron?.rustSettings) return;
            try {
                const result = await window.electron.rustSettings();
                this.rustSettings = result.value;
                this.rustSettingsPath = result.file;
            } catch (error) {
                this.rustSettingsError = error.message;
            }
        },
        async saveRustSettings() {
            this.rustSettingsError = '';
            this.rustSaving = true;
            try {
                await window.electron.saveRustSettings(this.rustSettings);
                this.relaunch();
            } catch (error) {
                this.rustSettingsError = error.message;
                this.rustSaving = false;
            }
        },
        async loadRustInterfaces() {
            try {
                const response = await window.axios.get('/api/v1/reticulum/interfaces');
                this.rustInterfaces = response.data.interfaces ?? [];
            } catch(e) {
                this.rustInterfaces = [];
            }
        },
        relaunch() {
            ElectronUtils.relaunch();
        },
        isInterfaceEnabled: function(iface) {
            return Utils.isInterfaceEnabled(iface);
        },
        async loadInterfaces() {
            try {
                const response = await window.axios.get(`/api/v1/reticulum/interfaces`);
                this.interfaces = response.data.interfaces;
            } catch(e) {
                // do nothing if failed to load interfaces
            }
        },
        async updateInterfaceStats() {
            try {

                // fetch interface stats
                const response = await window.axios.get(`/api/v1/interface-stats`);

                // update data
                const interfaces = response.data.interface_stats?.interfaces ?? [];
                for(const iface of interfaces){
                    this.interfaceStats[iface.short_name] = iface;
                }

            } catch(e) {
                // do nothing if failed to load interfaces
            }
        },
        async enableInterface(interfaceName) {

            // enable interface
            try {
                await window.axios.post(`/api/v1/reticulum/interfaces/enable`, {
                    name: interfaceName,
                });
            } catch(e) {
                DialogUtils.alert("failed to enable interface");
                console.log(e);
            }

            // reload interfaces
            await this.loadInterfaces();

        },
        async disableInterface(interfaceName) {

            // disable interface
            try {
                await window.axios.post(`/api/v1/reticulum/interfaces/disable`, {
                    name: interfaceName,
                });
            } catch(e) {
                DialogUtils.alert("failed to disable interface");
                console.log(e);
            }

            // reload interfaces
            await this.loadInterfaces();

        },
        async editInterface(interfaceName) {
            this.$router.push({
                name: "interfaces.edit",
                query: {
                    interface_name: interfaceName,
                },
            });
        },
        async deleteInterface(interfaceName) {

            // ask user to confirm deleting conversation history
            if(!await DialogUtils.confirm("Are you sure you want to delete this interface? This can not be undone!")){
                return;
            }

            // delete interface
            try {
                await window.axios.post(`/api/v1/reticulum/interfaces/delete`, {
                    name: interfaceName,
                });
            } catch(e) {
                DialogUtils.alert("failed to delete interface");
                console.log(e);
            }

            // reload interfaces
            await this.loadInterfaces();

        },
        async exportInterfaces() {
            try {

                // fetch exported interfaces
                const response = await window.axios.post('/api/v1/reticulum/interfaces/export');

                // download file to browser
                DownloadUtils.downloadFile("meshchat_interfaces.txt", new Blob([response.data]));

            } catch(e) {
                DialogUtils.alert("Failed to export interfaces");
                console.error(e);
            }
        },
        async exportInterface(interfaceName) {
            try {

                // fetch exported interfaces
                const response = await window.axios.post('/api/v1/reticulum/interfaces/export', {
                    selected_interface_names: [
                        interfaceName,
                    ],
                });

                // download file to browser
                DownloadUtils.downloadFile(`${interfaceName}.txt`, new Blob([response.data]));

            } catch(e) {
                DialogUtils.alert("Failed to export interface");
                console.error(e);
            }
        },
        showImportInterfacesModal() {
            this.$refs["import-interfaces-modal"].show();
        },
        onImportInterfacesModalDismissed() {
            // reload interfaces as something may have been imported
            this.loadInterfaces();
        },
    },
    computed: {
        rustPoc() {
            return GlobalState.rustPoc;
        },
        isElectron() {
            return ElectronUtils.isElectron();
        },
        interfacesWithStats() {
            const results = [];
            for(const [interfaceName, iface] of Object.entries(this.interfaces)){
                iface._name = interfaceName;
                iface._stats = this.interfaceStats[interfaceName];
                results.push(iface);
            }
            return results;
        },
        enabledInterfaces() {
            return this.interfacesWithStats.filter((iface) => this.isInterfaceEnabled(iface));
        },
        disabledInterfaces() {
            return this.interfacesWithStats.filter((iface) => !this.isInterfaceEnabled(iface));
        },
    },
    watch: {
        rustPoc(isRustPoc) {
            if (isRustPoc) {
                clearInterval(this.reloadInterval);
                this.loadRustInterfaces();
                this.loadRustSettings();
            }
        },
    },
}
</script>
