<template>
    <div class="flex gap-2 flex-grow justify-end items-center">
        <span class="font-semibold text-surface-500">من تاريخ</span>
        <DatePicker
            v-model="baseStore.dateRange.fromDate"
            class="w-28 h-8"
            @update:model-value="dateRangeChange"
        />
        <span class="font-semibold text-surface-500">إلى تاريخ</span>
        <DatePicker
            v-model="baseStore.dateRange.toDate"
            class="w-28 h-8"
            @update:model-value="dateRangeChange"
        />
    </div>
</template>
<script setup>
import { useBaseStore } from "@/stores/base/baseStore";
const baseStore = useBaseStore();
const dateRange = defineModel("dateRange");
watch(baseStore.dateRange, (newDateRange) => {
    dateRange.value = newDateRange;
});
const emit = defineEmits(["dateRangeChange"]);
const dateRangeChange = () => {
    emit("dateRangeChange", baseStore.dateRange);
};
onMounted(() => {
    dateRange.value = baseStore.dateRange;
});
</script>
