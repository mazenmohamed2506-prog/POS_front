<script setup>
import { onMounted } from "vue";
import { useBaseStore } from "@/stores/base/baseStore";

const baseStore = useBaseStore();

onMounted(() => {
    baseStore.init();
});
</script>

<template>
    <router-view />
    <Toast :position="'bottom-left'" />
</template>

<style scoped></style>
