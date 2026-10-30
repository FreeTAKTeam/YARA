<template>
    <div class="flex flex-col flex-1 overflow-hidden min-w-full sm:min-w-[500px]">
        <div class="overflow-y-auto w-full max-w-[1100px] mx-auto space-y-4">

            <!-- selected node -->
            <div class="rem-panel space-y-3">
                <div>
                    <div class="rem-eyebrow">LXMF</div>
                    <div class="rem-heading">Propagation node</div>
                    <p class="text-rem-muted">Messages for you are stored on this node while you are offline. Sync to collect them.</p>
                </div>

                <div class="rem-card flex flex-wrap items-center gap-3">
                    <div class="flex-1 min-w-[14rem]">
                        <template v-if="selectedHash">
                            <div class="font-ui font-bold text-[1.05rem] text-rem-strong">{{ selectedNode?.operator_display_name ?? 'Unnamed node' }}</div>
                            <div class="font-mono text-xs text-rem-muted break-all">&lt;{{ selectedHash }}&gt;</div>
                            <div class="text-[0.82rem] text-rem-muted mt-1">
                                <span v-if="!selectedNode" class="text-rem-warning">Not heard recently</span>
                                <span v-else>Heard {{ formatTimeAgo(selectedNode.updated_at) }}</span>
                                <span v-if="config.lxmf_preferred_propagation_node_last_synced_at"> · Last synced {{ formatTimeAgo(config.lxmf_preferred_propagation_node_last_synced_at) }}</span>
                                <span v-if="syncState"> · Sync {{ syncState }}</span>
                            </div>
                        </template>
                        <div v-else class="text-rem-muted">No node selected. Pick one from the list below.</div>
                    </div>
                    <button v-if="selectedHash" @click="syncNow" type="button" class="rem-btn-cta">Sync now</button>
                    <button v-if="selectedHash" @click="useNode(null)" type="button" class="rem-btn">Stop using</button>
                </div>

                <!-- manual entry -->
                <form @submit.prevent="useManualNode" class="flex flex-wrap items-end gap-2">
                    <div class="flex-1 min-w-[16rem]">
                        <label for="propagation-node-hash" class="rem-label">Or enter a node address</label>
                        <input id="propagation-node-hash" v-model.trim="manualHash" type="text" placeholder="32-character destination hash" class="rem-input mt-1 font-mono" :aria-invalid="manualError ? 'true' : undefined">
                    </div>
                    <button type="submit" class="rem-btn">Use address</button>
                </form>
                <p v-if="manualError" role="alert" class="text-sm text-rem-alert">{{ manualError }}</p>
                <p v-if="saveError" role="alert" class="text-sm text-rem-alert">{{ saveError }}</p>
            </div>

            <!-- announced nodes -->
            <div class="rem-panel space-y-3">
                <div class="flex flex-wrap items-end gap-2">
                    <div class="flex-1">
                        <div class="rem-eyebrow">Announced on the network</div>
                        <div class="rem-heading">Available nodes <span class="text-rem-accent tabular-nums">{{ propagationNodes.length }}</span></div>
                    </div>
                    <button @click="loadPropagationNodes" type="button" class="rem-btn">Reload</button>
                </div>

                <input v-if="propagationNodes.length > 0" v-model="searchTerm" type="search" aria-label="Search propagation nodes" :placeholder="`Search ${propagationNodes.length} nodes by name or address`" class="rem-input">

                <div v-if="searchedPropagationNodes.length > 0" class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
                    <div v-for="node of searchedPropagationNodes" :key="node.destination_hash" class="rem-card flex items-center gap-3" :class="{ 'rem-card-active': node.destination_hash === selectedHash }">
                        <div class="flex-1 min-w-0">
                            <div class="font-ui font-bold text-[1.05rem] text-rem-strong truncate">{{ node.operator_display_name ?? 'Unnamed node' }}</div>
                            <div class="font-mono text-xs text-rem-muted truncate">&lt;{{ node.destination_hash }}&gt;</div>
                            <div class="text-[0.82rem] text-rem-muted">
                                Heard {{ formatTimeAgo(node.updated_at) }}
                                <span v-if="node.is_propagation_enabled === false" class="text-rem-alert"> · Disabled by operator</span>
                            </div>
                        </div>
                        <span v-if="node.destination_hash === selectedHash" class="rem-pill !text-[0.75rem] !px-2">In use</span>
                        <button v-else @click="useNode(node.destination_hash)" :disabled="node.is_propagation_enabled === false" type="button" class="rem-btn">Use</button>
                    </div>
                </div>
                <div v-else class="text-center text-rem-muted py-6">
                    <template v-if="propagationNodes.length === 0">No propagation nodes heard yet. They appear here once they announce.</template>
                    <template v-else>No node matches your search.</template>
                </div>
            </div>

        </div>
    </div>
</template>

<script>
import Utils from "../../js/Utils";
import WebSocketConnection from "../../js/WebSocketConnection";
import GlobalState from "../../js/GlobalState";
import GlobalEmitter from "../../js/GlobalEmitter";

export default {
    name: 'PropagationNodesPage',
    data() {
        return {
            searchTerm: "",
            propagationNodes: [],
            config: {
                lxmf_preferred_propagation_node_destination_hash: null,
            },
            manualHash: "",
            manualError: "",
            saveError: "",
            syncState: "",
            reloadInterval: null,
        };
    },
    beforeUnmount() {
        clearInterval(this.reloadInterval);
        WebSocketConnection.off("message", this.onWebsocketMessage);
    },
    mounted() {
        WebSocketConnection.on("message", this.onWebsocketMessage);
        this.getConfig();
        this.loadPropagationNodes();
        this.updateSyncState();
        this.reloadInterval = setInterval(this.updateSyncState, 3000);
    },
    methods: {
        async onWebsocketMessage(message) {
            const json = JSON.parse(message.data);
            if(json.type === 'config'){
                this.config = json.config;
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
        async updateConfig(config) {
            this.saveError = "";
            try {
                // the rust daemon expects the patch wrapped in "config", the python backend takes it flat
                const body = GlobalState.rustPoc ? { config } : config;
                const response = await window.axios.patch("/api/v1/config", body);
                this.config = response.data.config;
                return true;
            } catch(e) {
                this.saveError = e.response?.data?.message ?? "Failed to save the propagation node.";
                return false;
            }
        },
        async loadPropagationNodes() {
            try {
                const response = await window.axios.get(`/api/v1/lxmf/propagation-nodes`, {
                    params: {
                        limit: 500,
                    },
                });
                this.propagationNodes = response.data.lxmf_propagation_nodes;
            } catch(e) {
                // do nothing if failed to load
            }
        },
        async updateSyncState() {
            try {
                const response = await window.axios.get("/api/v1/lxmf/propagation-node/status");
                const state = response.data.propagation_node_status?.state;
                this.syncState = state && state !== "idle" ? state.replaceAll("_", " ") : "";
            } catch(e) {
                // do nothing if failed to load
            }
        },
        async useNode(destinationHash) {
            await this.updateConfig({
                lxmf_preferred_propagation_node_destination_hash: destinationHash,
            });
        },
        async useManualNode() {
            // input feedback only; the backend validates the address again
            if(!/^[0-9a-fA-F]{32}$/.test(this.manualHash)){
                this.manualError = "Enter the node's 32-character hexadecimal destination hash.";
                return;
            }
            this.manualError = "";
            if(await this.updateConfig({ lxmf_preferred_propagation_node_destination_hash: this.manualHash.toLowerCase() })){
                this.manualHash = "";
            }
        },
        syncNow() {
            // App owns the sync flow (progress, result dialog)
            GlobalEmitter.emit("sync-propagation-node");
        },
        formatTimeAgo: function(datetimeString) {
            return Utils.formatTimeAgo(datetimeString);
        },
    },
    computed: {
        selectedHash() {
            return this.config?.lxmf_preferred_propagation_node_destination_hash;
        },
        selectedNode() {
            return this.propagationNodes.find((node) => node.destination_hash === this.selectedHash);
        },
        searchedPropagationNodes() {
            const search = this.searchTerm.toLowerCase();
            return this.propagationNodes.filter((propagationNode) => {
                const matchesOperatorDisplayName = propagationNode.operator_display_name?.toLowerCase()?.includes(search) ?? false;
                const matchesDestinationHash = propagationNode.destination_hash.toLowerCase().includes(search);
                return matchesOperatorDisplayName || matchesDestinationHash;
            }).sort((a, b) => Utils.timestampToMillis(b.updated_at) - Utils.timestampToMillis(a.updated_at));
        },
    },
}
</script>
