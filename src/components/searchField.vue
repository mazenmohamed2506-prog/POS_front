<template>
    <div class="relative">
        <Search
            class="absolute top-1/2 -mt-2.5 text-surface-400 leading-none start-1.5 z-1 h-5"
        />
        <InputText
            pt:root="ps-8 rounded-lg"
            id="search-employee"
            v-model="searchValue"
            :placeholder="placeholder"
            aria-describedby="search-employee-help"
            aria-label="Search Employee"
            class="text-sm h-8 w-full"
            @input="onSearchChange"
        />
    </div>
</template>
<script setup>
const props = defineProps({
    placeholder: {
        type: String,
        default: "بحث",
    },
});
const searchValue = defineModel();
const emit = defineEmits(["searchChange"]);
const onSearchChange = () => {
    emit("input", searchValue.value);
};
</script>
