<template>
    <div class="flex flex-col flex-1 min-w-full sm:min-w-[500px] overflow-hidden gap-3">

        <!-- sections -->
        <nav aria-label="Settings sections" class="rem-card !p-1 flex gap-1 w-full max-w-md mx-auto shrink-0">
            <RouterLink v-for="section of sections" :key="section.name" :to="{ name: section.name }" v-slot="{ href, navigate, isExactActive }" custom>
                <a :href="href" @click="navigate" :aria-current="isExactActive ? 'page' : undefined" class="flex-1 h-10 rounded-[10px] flex items-center justify-center font-ui font-bold text-[0.85rem] uppercase tracking-[0.07em]" :class="isExactActive ? 'rem-tab-active' : 'text-rem-tab hover:text-rem-button'">{{ section.label }}</a>
            </RouterLink>
        </nav>

        <RouterView/>

    </div>
</template>

<script>
export default {
    name: 'NetworkSettingsPage',
    data() {
        return {
            sections: [
                { name: "interfaces", label: "Interfaces" },
                { name: "propagation-nodes", label: "Propagation" },
            ],
        };
    },
}
</script>
