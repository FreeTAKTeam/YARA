<template>
    <div v-if="config" class="rem-card flex flex-col gap-2.5">
        <span class="rem-eyebrow">My identity</span>

        <div class="flex items-center gap-2.5">
            <RouterLink :to="{ name: 'profile.icon' }" title="Change profile icon">
                <LxmfUserIcon
                    :icon-name="config.lxmf_user_icon_name"
                    :icon-foreground-colour="config.lxmf_user_icon_foreground_colour"
                    :icon-background-colour="config.lxmf_user_icon_background_colour"/>
            </RouterLink>
            <div class="flex-1 min-w-0">
                <div class="font-ui font-bold text-[1.05rem] text-rem-strong truncate">{{ config.display_name }}</div>
                <div class="font-mono text-xs text-rem-muted truncate" :title="config.lxmf_address_hash">&lt;{{ config.lxmf_address_hash }}&gt;</div>
            </div>
            <button @click="sendAnnounce" type="button" class="rem-btn">Announce</button>
        </div>

        <div class="text-[0.82rem] text-rem-muted">
            <span v-if="config.last_announced_at">Last announced {{ formatSecondsAgo(config.last_announced_at) }}</span>
            <span v-else>Not announced yet</span>
        </div>

        <details class="text-sm">
            <summary class="rem-label cursor-pointer">Edit identity</summary>
            <div class="flex flex-col gap-2 pt-2">
                <label for="identity-display-name" class="rem-label">Display name</label>
                <div class="flex gap-2">
                    <input id="identity-display-name" v-model="displayName" type="text" class="rem-input">
                    <button @click="saveIdentitySettings" type="button" class="rem-btn">Save</button>
                </div>
                <template v-if="!rustPoc">
                    <label for="identity-auto-announce" class="rem-label">Auto announce</label>
                    <select id="identity-auto-announce" v-model="config.auto_announce_interval_seconds" @change="onAnnounceIntervalSecondsChange" class="rem-input">
                        <option value="0">Disabled</option>
                        <option value="900">Every 15 Minutes</option>
                        <option value="1800">Every 30 Minutes</option>
                        <option value="3600">Every 1 Hour</option>
                        <option value="10800">Every 3 Hours</option>
                        <option value="21600">Every 6 Hours</option>
                        <option value="43200">Every 12 Hours</option>
                        <option value="86400">Every 24 Hours</option>
                    </select>
                </template>
                <div class="rem-label">Identity hash</div>
                <div class="font-mono text-xs text-rem-muted break-all">{{ config.identity_hash }}</div>
                <div class="rem-label">LXMF address</div>
                <div class="font-mono text-xs text-rem-muted break-all">{{ config.lxmf_address_hash }}</div>
            </div>
        </details>
    </div>
</template>

<script>
import DialogUtils from "../js/DialogUtils";
import WebSocketConnection from "../js/WebSocketConnection";
import GlobalState from "../js/GlobalState";
import Utils from "../js/Utils";
import LxmfUserIcon from "./LxmfUserIcon.vue";

export default {
    name: 'IdentityCard',
    components: {
        LxmfUserIcon,
    },
    data() {
        return {
            config: null,
            displayName: "Anonymous Peer",
        };
    },
    mounted() {
        WebSocketConnection.on("message", this.onWebsocketMessage);
        this.getConfig();
    },
    beforeUnmount() {
        WebSocketConnection.off("message", this.onWebsocketMessage);
    },
    methods: {
        async onWebsocketMessage(message) {
            const json = JSON.parse(message.data);
            switch(json.type){
                case 'config': {
                    this.config = json.config;
                    this.displayName = json.config.display_name;
                    break;
                }
                case 'announced': {
                    // we just announced, update config so we can show the new last updated at
                    this.getConfig();
                    break;
                }
            }
        },
        async getConfig() {
            try {
                const response = await window.axios.get(`/api/v1/config`);
                this.config = response.data.config;
                this.displayName = this.config.display_name;
            } catch(e) {
                // do nothing if failed to load config
                console.log(e);
            }
        },
        async sendAnnounce() {

            try {
                await window.axios.get(`/api/v1/announce`);
            } catch(e) {
                DialogUtils.alert("failed to announce");
                console.log(e);
            }

            // fetch config so it updates last announced timestamp
            await this.getConfig();

        },
        async updateConfig(config) {
            try {
                WebSocketConnection.send(JSON.stringify({
                    "type": "config.set",
                    "config": config,
                }));
            } catch(e) {
                console.error(e);
            }
        },
        async saveIdentitySettings() {
            await this.updateConfig({
                "display_name": this.displayName,
            });
        },
        async onAnnounceIntervalSecondsChange() {
            await this.updateConfig({
                "auto_announce_interval_seconds": this.config.auto_announce_interval_seconds,
            });
        },
        formatSecondsAgo: function(seconds) {
            return Utils.formatSecondsAgo(seconds);
        },
    },
    computed: {
        rustPoc() {
            return GlobalState.rustPoc;
        },
    },
}
</script>
