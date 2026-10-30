<template>
    <!-- YARA mark: a "Y" whose tips and junction are mesh nodes, joined by faint mesh links -->
    <svg viewBox="0 0 24 24" fill="none" stroke="#14f0ff" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 4H19M5 4 12 20.5M19 4 12 20.5" stroke-width="1" opacity="0.45"/>
        <path d="M5 4 12 12.5 19 4M12 12.5V20.5" stroke-width="2.4"/>
        <circle cx="5" cy="4" r="2" fill="#071936" stroke-width="1.6"/>
        <circle cx="19" cy="4" r="2" fill="#071936" stroke-width="1.6"/>
        <circle cx="12" cy="20.5" r="2" fill="#071936" stroke-width="1.6"/>
        <circle cx="12" cy="12.5" r="1.7" fill="#14f0ff" stroke="none"/>
    </svg>
</template>

<script>
export default {
    name: 'YaraLogo',
};
</script>
