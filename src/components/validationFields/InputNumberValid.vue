<template>
    <div class="flex flex-col relative w-full gap-2">
        <label v-if="label" class="font-medium text-surface-900 dark:text-surface-0">{{ label }}</label>
        <InputNumber 
            v-model="value" 
            :disabled="disabled" 
            :min="min" 
            :max="max" 
            :placeholder="placeholder || label"
            :class="{ 'p-invalid': errorMessage }"
            fluid
        />
        <span class="text-red-500 absolute -bottom-6 start-0" v-if="errorMessage">
            {{ errorMessage }}
        </span>
    </div>
</template>
<script setup>
import { useField } from 'vee-validate';

const props = defineProps({
    name: String,
    label: String,
    placeholder: String,
    disabled: Boolean,
    min: Number,
    max: Number,
});
const { value, errorMessage } = useField(() => props.name);
</script>

