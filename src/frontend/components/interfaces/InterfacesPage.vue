<template>
    <div class="flex flex-col flex-1 overflow-hidden min-w-full sm:min-w-[500px]">
        <div class="overflow-y-auto w-full max-w-[1200px] mx-auto space-y-4">

            <!-- restart warning -->
            <div role="status" class="flex items-center gap-2 rounded-xl border border-[rgb(255_196_76/55%)] bg-[rgb(58_34_10/76%)] px-[0.9rem] py-2 text-rem-warning">
                <div class="my-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                </div>
                <div class="ml-2 my-auto">{{ rustPoc ? 'Restart YARA to apply saved interface and transport changes.' : 'Restart YARA for any interface changes to take effect.' }}</div>
                <button v-if="isElectron" 
                    @click="relaunch" 
                    type="button" 
                    class="rem-btn ml-auto">
                    <span>Restart Now</span>
                </button>
            </div>

            <p v-if="rustPoc && interfacesError" role="alert" class="text-sm text-rem-alert">{{ interfacesError }}</p>

            <div class="flex flex-wrap gap-2">

                <!-- Add Interface button -->
                <RouterLink :to="{ name: 'interfaces.add' }">
                    <button type="button" class="rem-btn-cta">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Add Interface</span>
                    </button>
                </RouterLink>

                <!-- Import button -->
                <div class="my-auto">
                    <button @click="showImportInterfacesModal" type="button" class="rem-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        <span>Import</span>
                    </button>
                </div>

                <!-- Export button -->
                <div class="my-auto">
                    <button @click="exportInterfaces" type="button" class="rem-btn">
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
            <div v-if="disabledInterfaces.length > 0" class="rem-eyebrow pt-2">Disabled interfaces</div>
            <Interface
                v-for="iface of disabledInterfaces"
                :iface="iface"
                @enable="enableInterface(iface._name)"
                @disable="disableInterface(iface._name)"
                @edit="editInterface(iface._name)"
                @export="exportInterface(iface._name)"
                @delete="deleteInterface(iface._name)"/>

            <!-- transport and replication nodes, after the interfaces -->
            <TransportPanel v-if="rustPoc" :interfaces="interfaces" @interfaces-changed="loadInterfaces"/>

        </div>
    </div>

    <!-- Import Dialog -->
    <ImportInterfacesModal ref="import-interfaces-modal" @dismissed="onImportInterfacesModalDismissed"/>

</template>

<script>
import DialogUtils from "../../js/DialogUtils";
import ElectronUtils from "../../js/ElectronUtils";
import Interface from "./Interface.vue";
import Utils from "../../js/Utils";
import ImportInterfacesModal from "./ImportInterfacesModal.vue";
import TransportPanel from "./TransportPanel.vue";
import DownloadUtils from "../../js/DownloadUtils";
import GlobalState from "../../js/GlobalState";

export default {
    name: 'InterfacesPage',
    components: {
        ImportInterfacesModal,
        Interface,
        TransportPanel,
    },
    data() {
        return {
            interfaces: {},
            interfacesError: '',
            interfaceStats: {},
            reloadInterval: null,
        };
    },
    beforeUnmount() {
        clearInterval(this.reloadInterval);
    },
    mounted() {

        this.loadInterfaces();
        this.updateInterfaceStats();

        // update info every few seconds
        this.reloadInterval = setInterval(() => {
            this.updateInterfaceStats();
        }, 1000);

    },
    methods: {
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
                this.interfacesError = '';
            } catch(e) {
                if (this.rustPoc) this.interfacesError = e.response?.data?.message ?? e.message;
            }
        },
        async updateInterfaceStats() {
            try {

                // fetch interface stats
                const response = await window.axios.get(`/api/v1/interface-stats`);

                // update data
                const interfaces = response.data.interface_stats?.interfaces ?? [];
                for(const iface of interfaces){
                    const name = iface.short_name ?? iface.interface_name ?? iface.name;
                    const stream = iface.settings?._runtime?.tcp?.stream_status;
                    this.interfaceStats[name] = {
                        ...iface,
                        status: iface.status ?? (stream ? stream.stream_state === 'connected' : null),
                        txb: iface.txb ?? stream?.bytes_tx,
                        rxb: iface.rxb ?? stream?.bytes_rx,
                    };
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
                DownloadUtils.downloadFile("yara_interfaces.txt", new Blob([response.data]));

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
}
</script>
