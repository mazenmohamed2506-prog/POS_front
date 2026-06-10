<template>
    <div class="flex flex-col gap-2 relative">
        <label v-if="label" class="font-medium text-surface-900 dark:text-surface-0">{{ label }}</label>
        <InputText v-model="value" :disabled="disabled" :placeholder="placeholder || label" :class="{ 'p-invalid': errorMessage }" />
        <span class="text-red-500 text-sm absolute -bottom-5 start-0" v-if="errorMessage">
            {{ errorMessage }}
        </span>
    </div>
</template>
<script setup>
import { useField } from 'vee-validate';

const props = defineProps({
    name: String,
    label: String,
    disabled: Boolean,
    placeholder: String,
});
const { value, errorMessage } = useField(() => props.name);
</script>
