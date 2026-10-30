<template>
    <RouterLink :to="to" v-slot="{ href, route, navigate, isActive }" custom>
        <a
            :href="href"
            @click="handleNavigate($event, navigate)"
            :aria-current="isActive ? 'page' : undefined"
            :class="[
                isActive
                    ? 'rem-tab-active font-bold'
                    : 'text-rem-tab font-semibold hover:text-rem-button'
            ]"
            class="w-full min-h-[64px] px-1 py-2 rounded-[13px] flex flex-col items-center justify-center gap-1 font-ui text-[0.72rem] text-center leading-tight"
        >
            <slot name="icon"></slot>
            <span class="flex flex-wrap justify-center gap-x-1">
                <slot name="text"></slot>
            </span>
        </a>
    </RouterLink>
</template>


<script>
export default {
    name: 'SidebarLink',
    props: {
        to: Object,
    },
    methods: {
        handleNavigate(event, navigate) {

            // emit click event for SidebarLink element
            this.$emit('click');

            // handle navigation
            navigate(event);

        },
    },
};
</script>
