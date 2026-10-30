<template>
    <div class="dark h-screen w-full flex flex-col gap-3 p-2 sm:p-3 text-rem-text">

        <!-- masthead -->
        <header class="rem-bar app-titlebar flex flex-wrap items-center gap-2.5 pl-3 py-2" :class="isElectron ? 'pr-[9.5rem]' : 'pr-3'">
            <div @click="onAppNameClick" class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                <span class="flex items-center justify-center size-11 rounded-xl border border-[rgb(73_173_255/48%)] bg-[rgb(7_25_54/84%)] drop-shadow-[0_0_8px_rgb(20_240_255/30%)]">
                    <YaraLogo role="img" aria-label="YARA" class="size-8"/>
                </span>
                <span class="font-ui font-bold text-[1.22rem] uppercase tracking-[0.15em] text-rem-strong">Yara</span>
            </div>
            <h1 class="hidden md:block flex-1 text-center font-ui font-bold text-[1.75rem] leading-none text-rem-strong">{{ pageTitle }}</h1>
            <div class="flex flex-1 flex-wrap justify-end items-center gap-2">

                <!-- audio calls -->
                <template v-if="config && !rustPoc">
                    <span v-if="activeAudioCalls.length > 0" class="rem-pill text-rem-ok">
                        <span v-if="activeInboundAudioCalls.length > 0">{{ activeInboundAudioCalls.length }} Incoming</span>
                        <span v-else>{{ activeOutboundAudioCalls.length }} Outgoing</span>
                    </span>
                    <button v-if="activeAudioCalls.length > 0" @click="hangupAllCalls" type="button" class="rem-btn text-rem-alert" title="Hang up all calls">Hang up</button>
                    <a href="../call.html" target="_blank" class="rem-btn">Phone</a>
                </template>

                <RouterLink :to="{ name: 'propagation-nodes' }" class="rem-btn" title="Choose propagation node">Node</RouterLink>
                <button @click="syncPropagationNode" type="button" class="rem-btn" :disabled="rustSyncing" title="Sync Messages" aria-label="Sync Messages">
                    <span :class="{ 'animate-spin': rustSyncing || isSyncingPropagationNode }">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor" class="size-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </span>
                    <span class="hidden sm:inline">Sync</span>
                </button>
                <button @click="composeNewMessage" type="button" class="rem-btn-cta">New message</button>
                <span v-if="appInfo" class="hidden lg:inline-flex rem-pill border border-[rgb(73_171_255/54%)] bg-[rgb(7_47_84/74%)] text-rem-running">
                    <span aria-hidden="true" class="size-2 rounded-full bg-rem-granted"></span>
                    {{ rustPoc ? 'Rust daemon' : 'Python backend' }}
                </span>
            </div>
        </header>

        <div class="flex flex-1 min-h-0 gap-3">

            <!-- navigation rail -->
            <nav aria-label="Main" class="rem-bar flex flex-col gap-1.5 p-1.5 w-[5.75rem] shrink-0 overflow-y-auto bg-[rgb(3_13_33/84%)]">
                <!-- messages -->
                <SidebarLink :to="{ name: 'messages' }">
                    <template v-slot:icon>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                                            </svg>
                    </template>
                    <template v-slot:text>
                        <span>Messages</span>
                        <span v-if="unreadConversationsCount > 0" class="tabular-nums">· {{ unreadConversationsCount }}</span>
                    </template>
                </SidebarLink>
                <!-- nomad network -->
                <SidebarLink v-if="!rustPoc" :to="{ name: 'nomadnetwork' }">
                    <template v-slot:icon>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                                            </svg>
                    </template>
                    <template v-slot:text>
                        Nomad Network
                    </template>
                </SidebarLink>
                <!-- interfaces -->
                <SidebarLink :to="{ name: 'network-settings' }">
                    <template v-slot:icon>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>
                    </template>
                    <template v-slot:text>
                        {{ rustPoc ? 'Settings' : 'Network' }}
                    </template>
                </SidebarLink>
                <!-- network visualiser -->
                <SidebarLink v-if="!rustPoc" :to="{ name: 'network-visualiser' }">
                    <template v-slot:icon>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" class="size-6">
                                                <path d="M200,152a31.84,31.84,0,0,0-19.53,6.68l-23.11-18A31.65,31.65,0,0,0,160,128c0-.74,0-1.48-.08-2.21l13.23-4.41A32,32,0,1,0,168,104c0,.74,0,1.48.08,2.21l-13.23,4.41A32,32,0,0,0,128,96a32.59,32.59,0,0,0-5.27.44L115.89,81A32,32,0,1,0,96,88a32.59,32.59,0,0,0,5.27-.44l6.84,15.4a31.92,31.92,0,0,0-8.57,39.64L73.83,165.44a32.06,32.06,0,1,0,10.63,12l25.71-22.84a31.91,31.91,0,0,0,37.36-1.24l23.11,18A31.65,31.65,0,0,0,168,184a32,32,0,1,0,32-32Zm0-64a16,16,0,1,1-16,16A16,16,0,0,1,200,88ZM80,56A16,16,0,1,1,96,72,16,16,0,0,1,80,56ZM56,208a16,16,0,1,1,16-16A16,16,0,0,1,56,208Zm56-80a16,16,0,1,1,16,16A16,16,0,0,1,112,128Zm88,72a16,16,0,1,1,16-16A16,16,0,0,1,200,200Z"></path>
                                            </svg>
                    </template>
                    <template v-slot:text>
                        Network
                    </template>
                </SidebarLink>
                <!-- tools -->
                <SidebarLink v-if="!rustPoc" :to="{ name: 'tools' }">
                    <template v-slot:icon>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
                                            </svg>
                    </template>
                    <template v-slot:text>
                        Tools
                    </template>
                </SidebarLink>
                <!-- settings -->
                <SidebarLink v-if="!rustPoc" :to="{ name: 'settings' }">
                    <template v-slot:icon>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>
                    </template>
                    <template v-slot:text>
                        Settings
                    </template>
                </SidebarLink>
                <!-- info -->
                <SidebarLink :to="{ name: 'about' }">
                    <template v-slot:icon>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                            </svg>
                    </template>
                    <template v-slot:text>
                        About
                    </template>
                </SidebarLink>
            </nav>

            <!-- content -->
            <main ref="middle" class="flex flex-1 min-h-0 w-full gap-3 overflow-auto">
                <RouterView/>
            </main>

        </div>

    </div>
</template>



<script>
import SidebarLink from "./SidebarLink.vue";
import YaraLogo from "./YaraLogo.vue";
import DialogUtils from "../js/DialogUtils";
import ElectronUtils from "../js/ElectronUtils";
import WebSocketConnection from "../js/WebSocketConnection";
import GlobalState from "../js/GlobalState";
import GlobalEmitter from "../js/GlobalEmitter";
import NotificationUtils from "../js/NotificationUtils";

export default {
    name: 'App',
    components: {
        SidebarLink,
        YaraLogo,
    },
    data() {
        return {

            reloadInterval: null,

            config: null,
            appInfo: null,

            audioCalls: [],
            propagationNodeStatus: null,
            rustSyncing: false,

        };
    },
    beforeUnmount() {

        clearInterval(this.reloadInterval);

        // stop listening for websocket messages
        WebSocketConnection.off("message", this.onWebsocketMessage);
        GlobalEmitter.off("sync-propagation-node", this.syncPropagationNode);

    },
    mounted() {

        // listen for websocket messages
        WebSocketConnection.on("message", this.onWebsocketMessage);
        GlobalEmitter.on("sync-propagation-node", this.syncPropagationNode);

        this.getAppInfo();
        this.updateCallsList();
        this.updatePropagationNodeStatus();

        // update info every few seconds
        this.reloadInterval = setInterval(() => {
            this.updateCallsList();
            this.updatePropagationNodeStatus();
        }, 3000);

    },
    methods: {
        async onWebsocketMessage(message) {
            const json = JSON.parse(message.data);
            switch(json.type){
                case 'config': {
                    this.config = json.config;
                    break;
                }
                case 'announced': {
                    // we just announced, update config so we can show the new last updated at
                    this.getConfig();
                    break;
                }
                case 'incoming_audio_call': {
                    NotificationUtils.showIncomingCallNotification();
                    break;
                }
            }
        },
        async getAppInfo() {
            try {
                const response = await window.axios.get(`/api/v1/app/info`);
                this.appInfo = response.data.app_info;
                GlobalState.rustPoc = this.appInfo.backend === "rust-poc";
            } catch(e) {
                // do nothing if failed to load app info
                console.log(e);
            }
        },
        async getConfig() {
            try {
                const response = await window.axios.get(`/api/v1/config`);
                this.config = response.data.config;
            } catch(e) {
                // do nothing if failed to load config
                console.log(e);
            }
        },
        async composeNewMessage() {

            // go to messages route
            await this.$router.push({ name: "messages" });

            // emit global event handled by MessagesPage
            GlobalEmitter.emit("compose-new-message");

        },
        async syncPropagationNode() {

            if(this.rustPoc){
                if(this.rustSyncing){
                    return;
                }
                if(!this.config?.lxmf_preferred_propagation_node_destination_hash){
                    // pick a node first; the propagation page lists the announced ones
                    await this.$router.push({ name: "propagation-nodes" });
                    return;
                }
                this.rustSyncing = true;
                try {
                    const response = await axios.get("/api/v1/lxmf/propagation-node/sync");
                    DialogUtils.alert(`Sync complete. ${response.data.messages_received ?? 0} messages received.`);
                } catch(e) {
                    DialogUtils.alert(e.response?.data?.message ?? e.message ?? "Sync failed");
                } finally {
                    this.rustSyncing = false;
                    await this.updatePropagationNodeStatus();
                }
                return;
            }

            // ask to stop syncing if already syncing
            if(this.isSyncingPropagationNode){
                if(await DialogUtils.confirm("Are you sure you want to stop syncing?")){
                    await this.stopSyncingPropagationNode();
                }
                return;
            }

            // request sync
            try {
                await axios.get("/api/v1/lxmf/propagation-node/sync");
            } catch(e) {
                const errorMessage = e.response?.data?.message ?? "Something went wrong. Try again later.";
                DialogUtils.alert(errorMessage);
                return;
            }

            // update propagation status
            await this.updatePropagationNodeStatus();

            // wait until sync has finished
            const syncFinishedInterval = setInterval(() => {

                // do nothing if still syncing
                if(this.isSyncingPropagationNode){
                    return;
                }

                // finished syncing, stop checking
                clearInterval(syncFinishedInterval);

                // show result
                const status = this.propagationNodeStatus?.state;
                const messagesReceived = this.propagationNodeStatus?.messages_received ?? 0;
                if(status === "complete" || status === "idle"){
                    DialogUtils.alert(`Sync complete. ${messagesReceived} messages received.`);
                } else {
                    DialogUtils.alert(`Sync error: ${status}`);
                }

            }, 500);

        },
        async stopSyncingPropagationNode() {

            // stop sync
            try {
                await axios.get("/api/v1/lxmf/propagation-node/stop-sync");
            } catch(e) {
                // do nothing on error
            }

            // update propagation status
            await this.updatePropagationNodeStatus();

        },
        async updatePropagationNodeStatus() {
            try {
                const response = await axios.get("/api/v1/lxmf/propagation-node/status");
                this.propagationNodeStatus = response.data.propagation_node_status;
            } catch(e) {
                // do nothing on error
            }
        },
        async updateCallsList() {
            try {

                // fetch calls
                const response = await axios.get("/api/v1/calls");

                // update ui
                this.audioCalls = response.data.audio_calls;

            } catch(e) {
                // do nothing on error
            }
        },
        async hangupAllCalls() {

            // confirm user wants to hang up calls
            if(!await DialogUtils.confirm("Are you sure you want to hang up all incoming and outgoing calls?")){
                return;
            }

            try {

                // hangup all calls
                await axios.get(`/api/v1/calls/hangup-all`);

                // reload calls list
                await this.updateCallsList();

            } catch(e) {
                // ignore error hanging up call
            }

        },
        onAppNameClick() {
            // user may be on mobile, and is unable to scroll back to sidebar, so let them tap app name to do it
            this.$refs["middle"].scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
            });
        },
    },
    computed: {
        isElectron() {
            return ElectronUtils.isElectron();
        },
        pageTitle() {
            return {
                "messages": "Messages",
                "interfaces": "Settings",
                "interfaces.add": "Add interface",
                "interfaces.edit": "Edit interface",
                "network-visualiser": "Network",
                "nomadnetwork": "Nomad Network",
                "propagation-nodes": "Settings",
                "ping": "Ping",
                "profile.icon": "Profile icon",
                "settings": "Settings",
                "tools": "Tools",
                "about": "About",
            }[this.$route.name] ?? "";
        },
        rustPoc() {
            return GlobalState.rustPoc;
        },
        unreadConversationsCount() {
            return GlobalState.unreadConversationsCount;
        },
        activeAudioCalls() {
            return this.audioCalls.filter(function(audioCall) {
                return audioCall.is_active;
            });
        },
        activeInboundAudioCalls() {
            return this.activeAudioCalls.filter(function(audioCall) {
                return !audioCall.is_outbound;
            });
        },
        activeOutboundAudioCalls() {
            return this.activeAudioCalls.filter(function(audioCall) {
                return audioCall.is_outbound;
            });
        },
        isSyncingPropagationNode() {
            return [
                "path_requested",
                "link_establishing",
                "link_established",
                "request_sent",
                "receiving",
                "response_received",
            ].includes(this.propagationNodeStatus?.state);
        },
    },
}
</script>
