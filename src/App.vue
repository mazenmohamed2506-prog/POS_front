<script setup>
import { onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { useToastStore } from "@/stores/base/toastStore";
import { useBaseStore } from "@/stores/base/baseStore";
import Toast from "@/volt/Toast.vue";
import ConnectionLostOverlay from "@/components/ConnectionLostOverlay.vue";

const baseStore = useBaseStore();
const toastStore = useToastStore();
const toast = useToast();

onMounted(() => {
    toastStore.setToastService(toast);
    baseStore.init();
});
</script>

<template>
    <router-view />
    <Toast position="bottom-left" />
    <ConnectionLostOverlay />
</template>

<style scoped></style>

