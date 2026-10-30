<template>
    <div class="flex flex-col flex-1 overflow-hidden min-w-full sm:min-w-[500px]">
        <div class="overflow-y-auto w-full max-w-[820px] mx-auto space-y-4">

            <!-- yara -->
            <div class="rem-panel flex flex-wrap items-center gap-4">
                <span class="flex items-center justify-center size-[72px] rounded-[14px] border border-[rgb(73_173_255/48%)] bg-[rgb(7_25_54/84%)] drop-shadow-[0_0_12px_rgb(20_240_255/30%)]">
                    <YaraLogo aria-hidden="true" class="size-12"/>
                </span>
                <div class="flex-1 min-w-[16rem] space-y-1">
                    <div class="rem-eyebrow">Yet Another Reticulum Application</div>
                    <h2 class="font-ui font-bold text-[2.4rem] leading-none text-rem-strong">YARA</h2>
                    <p class="text-rem-muted">Reference client for the Rust Reticulum / LXMF daemon API.</p>
                </div>
            </div>

            <!-- app info -->
            <div v-if="appInfo" class="rem-panel">
                <div class="rem-heading pb-2">App info</div>
                <div class="rem-card !p-0 divide-y divide-zinc-700">

                    <!-- version -->
                    <div class="flex gap-2 p-[0.78rem]">
                        <div class="mr-auto">
                            <div class="rem-label">Versions</div>
                            <div class="text-[0.85rem] text-rem-muted">
                                <template v-if="appInfo.backend === 'rust-poc'">LXMF-rs v{{ appInfo.lxmf_version }}</template>
                                <template v-else>YARA v{{ appInfo.version }} • RNS v{{ appInfo.rns_version }} • LXMF v{{ appInfo.lxmf_version }} • Python v{{ appInfo.python_version }}</template>
                            </div>
                        </div>
                        <div class="hidden sm:block mx-2 my-auto">
                            <a target="_blank" 
                                :href="appInfo.backend === 'rust-poc' ? 'https://github.com/FreeTAKTeam/YARA/releases' : 'https://github.com/liamcottle/reticulum-meshchat/releases'"
                                type="button" 
                                class="rem-btn">
                                Check for Updates
                            </a>
                        </div>
                    </div>

                    <!-- reticulum config path -->
                    <div class="flex gap-2 p-[0.78rem]">
                        <div class="mr-auto">
                            <div class="rem-label">Reticulum Config Path</div>
                            <div class="font-mono text-[0.85rem] text-rem-muted break-all">{{ appInfo.reticulum_config_path }}</div>
                        </div>
                        <div v-if="isElectron" class="mx-2 my-auto">
                            <button @click="showReticulumConfigFile" 
                                type="button" 
                                class="rem-btn">
                                Show in Folder
                            </button>
                        </div>
                    </div>

                    <!-- database path, only when the backend reports one -->
                    <div v-if="appInfo.database_path" class="flex gap-2 p-[0.78rem]">
                        <div class="mr-auto">
                            <div class="rem-label">Database Path</div>
                            <div class="font-mono text-[0.85rem] text-rem-muted break-all">{{ appInfo.database_path }}</div>
                        </div>
                        <div v-if="isElectron" class="mx-2 my-auto">
                            <button @click="showDatabaseFile" 
                                type="button" 
                                class="rem-btn">
                                Show in Folder
                            </button>
                        </div>
                    </div>

                    <!-- database file size -->
                    <div v-if="appInfo.database_path" class="p-[0.78rem]">
                        <div class="rem-label">Database File Size</div>
                        <div class="text-[0.85rem] text-rem-muted">{{ formatBytes(appInfo.database_file_size) }}</div>
                    </div>

                </div>
            </div>

            <!-- reticulum status -->
            <div v-if="appInfo" class="rem-panel">
                <div class="rem-heading pb-2">Reticulum status</div>
                <div class="rem-card !p-0 divide-y divide-zinc-700">

                    <!-- instance mode -->
                    <div class="p-[0.78rem]">
                        <div class="rem-label">Instance Mode</div>
                        <div class="text-[0.85rem] text-rem-muted">
                            <span v-if="appInfo.is_connected_to_shared_instance" class="text-rem-warning">Connected to Shared Instance</span>
                            <span v-else class="text-rem-ok">Running as Standalone Instance</span>
                        </div>
                    </div>

                    <!-- transport mode -->
                    <div class="p-[0.78rem]">
                        <div class="rem-label">Transport Mode</div>
                        <div class="text-[0.85rem] text-rem-muted">
                            <span v-if="appInfo.is_transport_enabled" class="text-rem-ok">Transport Enabled</span>
                            <span v-else class="text-rem-warning">Transport Disabled</span>
                        </div>
                    </div>

                </div>
            </div>

            <!-- my addresses -->
            <div v-if="config" class="rem-panel">
                <div class="rem-heading pb-2">My addresses</div>
                <div class="rem-card !p-0 divide-y divide-zinc-700">
                    <div class="p-[0.78rem]">
                        <div class="rem-label">Identity Hash</div>
                        <div class="text-[0.85rem] text-rem-muted">{{ config.identity_hash }}</div>
                    </div>
                    <div class="p-[0.78rem]">
                        <div class="rem-label">LXMF Address</div>
                        <div class="text-[0.85rem] text-rem-muted">{{ config.lxmf_address_hash }}</div>
                    </div>
                    <div class="p-[0.78rem]">
                        <div class="rem-label">LXMF Propagation Node Address</div>
                        <div class="text-[0.85rem] text-rem-muted">{{ config.lxmf_local_propagation_node_address_hash }}</div>
                    </div>
                    <div class="p-[0.78rem]">
                        <div class="rem-label">Audio Call Address</div>
                        <div class="text-[0.85rem] text-rem-muted">{{ config.audio_call_address_hash }}</div>
                    </div>
                </div>
            </div>

            <!-- credits -->
            <div class="rem-panel space-y-2">
                <div class="rem-eyebrow">Credits</div>
                <div class="rem-heading">Built on open work</div>
                <p class="leading-relaxed">YARA is derived from <a target="_blank" href="https://github.com/liamcottle/reticulum-meshchat" class="text-rem-accent hover:text-rem-button">Reticulum MeshChat</a> by <a target="_blank" href="https://liamcottle.com" class="text-rem-accent hover:text-rem-button">Liam Cottle</a>, and stays compatible with its REST/WebSocket API and interface behaviour.</p>
                <p class="leading-relaxed">Runs on <a target="_blank" href="https://reticulum.network" class="text-rem-accent hover:text-rem-button">Reticulum</a> and LXMF by Mark Qvist, through the FreeTAKTeam Rust implementations reticulum-rs and LXMF-rs.</p>
                <p class="text-[0.82rem] text-rem-muted">Reticulum MeshChat © Liam Cottle, MIT License. Original copyright and license notices are retained in the source.</p>
            </div>

        </div>
    </div>
</template>

<script>
import Utils from "../../js/Utils";
import ElectronUtils from "../../js/ElectronUtils";
import YaraLogo from "../YaraLogo.vue";
export default {
    name: 'AboutPage',
    components: {
        YaraLogo,
    },
    data() {
        return {
            appInfo: null,
            config: null,
        };
    },
    mounted() {
        this.getAppInfo();
        this.getConfig();
    },
    methods: {
        async getAppInfo() {
            try {
                const response = await window.axios.get("/api/v1/app/info");
                this.appInfo = response.data.app_info;
            } catch(e) {
                // do nothing if failed to load app info
                console.log(e);
            }
        },
        async getConfig() {
            try {
                const response = await window.axios.get("/api/v1/config");
                this.config = response.data.config;
            } catch(e) {
                // do nothing if failed to load config
                console.log(e);
            }
        },
        showReticulumConfigFile() {
            const reticulumConfigPath = this.appInfo.reticulum_config_path;
            if(reticulumConfigPath){
                ElectronUtils.showPathInFolder(reticulumConfigPath);
            }
        },
        showDatabaseFile() {
            const databasePath = this.appInfo.database_path;
            if(databasePath){
                ElectronUtils.showPathInFolder(databasePath);
            }
        },
        formatBytes: function(bytes) {
            return Utils.formatBytes(bytes);
        },
    },
    computed: {
        isElectron() {
            return ElectronUtils.isElectron();
        },
    },
}
</script>
