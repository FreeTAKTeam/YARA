import { reactive } from "vue";

// global state
const globalState = reactive({
    unreadConversationsCount: 0,
    rustPoc: false,
});

export default globalState;
