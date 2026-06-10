<script setup>
import AppMenuItemSimple from "./AppMenuItemSimple.vue";

defineProps({
    model: {
        type: Array,
        default: null,
    },
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item.nameEn">
            <AppMenuItemSimple :item="item" root :index="i" />
            <li class="menu-separator"></li>
        </template>
    </ul>
</template>