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
            class="flex-1 min-w-[4.5rem] h-[54px] px-2 rounded-[13px] flex flex-col items-center justify-center gap-0.5 font-ui text-[0.72rem] whitespace-nowrap"
        >
            <slot name="icon"></slot>
            <span class="flex gap-1">
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
