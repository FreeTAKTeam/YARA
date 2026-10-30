<template>
    <div class="rem-panel space-y-4">
        <div>
            <div class="rem-eyebrow">Reticulum</div>
            <div class="rem-heading">Transport</div>
        </div>

        <!-- this device -->
        <div class="rem-card flex flex-wrap items-center gap-3">
            <div class="flex-1 min-w-[16rem]">
                <div class="rem-label">This device</div>
                <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 my-1 font-ui font-bold text-[0.95rem]" :class="transportEnabled ? 'text-rem-ok border-[rgb(65_227_106/48%)]' : 'text-rem-muted border-zinc-600'">
                    <span aria-hidden="true" class="size-2 rounded-full bg-current"></span>
                    {{ transportEnabled ? 'Forwarding' : 'Not forwarding' }}
                </span>
                <div class="text-[0.82rem] text-rem-muted">Turn on only when this device should route between its interfaces. Not needed for chat.</div>
            </div>
            <button v-if="!transportEnabled" type="button" @click="setTransport(true)" class="rem-btn">Enable transport</button>
            <button v-else type="button" @click="setTransport(false)" class="rem-btn">Disable transport</button>
        </div>

        <!-- discovered replication nodes, folded by default -->
        <details class="group space-y-3">
            <summary class="flex flex-wrap items-center gap-2 cursor-pointer list-none">
                <svg aria-hidden="true" class="size-4 text-rem-accent transition group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                <span class="rem-label">Discovered replication nodes</span>
                <span v-if="discoveryEnabled" class="rem-pill !text-[0.75rem] !px-2 tabular-nums">{{ validNodes.length }}</span>
            </summary>
            <div class="flex flex-wrap items-end gap-2">
                <div class="flex-1 text-[0.82rem] text-rem-muted">Nodes announced on the network. Connect to add one as an interface; this device then reaches the network through it.</div>
                <button v-if="discoveryEnabled" @click="loadDiscovered" type="button" class="rem-btn">Reload</button>
            </div>

            <div v-if="!discoveryEnabled" class="rem-card flex flex-wrap items-center gap-3">
                <div class="flex-1 min-w-[16rem] text-rem-muted">Interface discovery is off, so no replication nodes are listed.</div>
                <button @click="setDiscovery(true)" type="button" class="rem-btn">Enable discovery</button>
            </div>

            <div v-else-if="validNodes.length > 0" class="grid gap-2 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]">
                <div v-for="node of validNodes" :key="node.discovery_hash" class="rem-card flex flex-col gap-2">
                    <div class="flex items-start gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="rem-eyebrow">{{ node.type }}</div>
                            <div class="font-ui font-bold text-[1.05rem] text-rem-strong truncate">{{ node.name }}</div>
                        </div>
                        <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-ui font-bold text-[0.85rem] capitalize" :class="statusClass(node.status)">
                            <span aria-hidden="true" class="size-2 rounded-full bg-current"></span>{{ node.status }}
                        </span>
                    </div>
                    <div class="font-mono text-[0.82rem] break-all">{{ address(node) }}</div>
                    <div class="text-[0.82rem] text-rem-muted">
                        {{ node.hops === 0 || node.hops === 1 ? 'Direct' : `${node.hops} hops` }}
                        · Heard {{ formatTimeAgo(node.last_heard) }}
                        <span v-if="node.ifac_netname"> · Network {{ node.ifac_netname }}</span>
                    </div>
                    <div class="flex items-center gap-2 pt-1">
                        <span v-if="isAdded(node)" class="rem-pill !text-[0.75rem] !px-2">Added</span>
                        <button v-else @click="connect(node)" type="button" class="rem-btn">Connect</button>
                    </div>
                </div>
            </div>

            <div v-else class="text-center text-rem-muted py-4">
                No replication nodes discovered yet. They appear here once a node announces; this can take a few minutes after a restart.
            </div>
            <p v-if="hiddenCount > 0" class="text-[0.82rem] text-rem-muted">{{ hiddenCount }} other discovered interfaces are hidden because they are not reachable over TCP.</p>
        </details>

        <p v-if="message" :role="isError ? 'alert' : 'status'" :class="isError ? 'text-rem-alert' : 'text-rem-warning'">{{ message }}</p>
    </div>
</template>

<script>
import Utils from "../../js/Utils";

// discovered interface types a TCP client can connect to
const TCP_REACHABLE_TYPES = ["TCPServerInterface", "BackboneInterface"];

export default {
    name: 'TransportPanel',
    emits: ['interfaces-changed'],
    props: {
        interfaces: Object,
    },
    data() {
        return {
            transportEnabled: false,
            discoveryEnabled: true,
            discovered: [],
            message: '',
            isError: false,
        };
    },
    mounted() {
        this.loadTransportState();
        this.loadDiscovered();
    },
    methods: {
        async loadTransportState() {
            try {
                const response = await window.axios.get("/api/v1/config");
                this.transportEnabled = response.data.config.is_transport_enabled === true;
            } catch(e) {
                // keep the last known state
            }
        },
        async loadDiscovered() {
            try {
                const response = await window.axios.get("/api/v1/reticulum/discovered-interfaces");
                this.discoveryEnabled = response.data.discovery_enabled;
                this.discovered = response.data.interfaces;
            } catch(e) {
                this.showResult(e.response?.data?.message ?? "This daemon cannot list discovered interfaces.", true);
            }
        },
        async setTransport(enabled) {
            if(await this.post(`/api/v1/reticulum/${enabled ? 'enable' : 'disable'}-transport`)){
                this.transportEnabled = enabled;
            }
        },
        async setDiscovery(enabled) {
            if(await this.post(`/api/v1/reticulum/${enabled ? 'enable' : 'disable'}-discovery`)){
                await this.loadDiscovered();
            }
        },
        async connect(node) {
            const body = {
                name: this.uniqueName(node.name),
                type: "TCPClientInterface",
                target_host: node.reachable_on,
                target_port: String(node.port),
            };
            if(node.ifac_netname) body.network_name = node.ifac_netname;
            if(node.ifac_netkey) body.passphrase = node.ifac_netkey;
            if(await this.post("/api/v1/reticulum/interfaces/add", body)){
                this.$emit('interfaces-changed');
            }
        },
        async post(url, body) {
            try {
                const response = await window.axios.post(url, body);
                this.showResult(response.data.message, false);
                return true;
            } catch(e) {
                this.showResult(e.response?.data?.message ?? e.message, true);
                return false;
            }
        },
        showResult(message, isError) {
            this.message = message;
            this.isError = isError;
        },
        isAdded(node) {
            return Object.values(this.interfaces ?? {}).some((iface) => {
                return iface.target_host === node.reachable_on && Number(iface.target_port) === Number(node.port);
            });
        },
        uniqueName(name) {
            let candidate = name;
            for(let i = 2; this.interfaces?.[candidate]; i++){
                candidate = `${name} ${i}`;
            }
            return candidate;
        },
        statusClass(status) {
            return {
                available: 'text-rem-ok border-[rgb(65_227_106/48%)]',
                unknown: 'text-rem-pending border-[rgb(255_178_72/54%)]',
                stale: 'text-rem-muted border-zinc-600',
            }[status] ?? 'text-rem-muted border-zinc-600';
        },
        address(node) {
            // bracket IPv6 hosts so the port stays readable
            return node.reachable_on.includes(":") ? `[${node.reachable_on}]:${node.port}` : `${node.reachable_on}:${node.port}`;
        },
        formatTimeAgo(seconds) {
            return Utils.formatTimeAgo(Math.floor(seconds));
        },
    },
    computed: {
        validNodes() {
            return this.discovered
                .filter((node) => TCP_REACHABLE_TYPES.includes(node.type) && node.reachable_on && node.port)
                .sort((a, b) => b.last_heard - a.last_heard);
        },
        hiddenCount() {
            return this.discovered.length - this.validNodes.length;
        },
    },
}
</script>
