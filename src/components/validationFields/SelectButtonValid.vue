<template>
    <div class="w-full flex flex-col relative">
        <SelectButton
            :id="name"
            v-model="field.value"
            :options="options"
            :option-label="optionLabel"
            :option-value="optionValue"
            :disabled="disabled"
            :allow-empty="allowEmpty"
            @blur="field.handleBlur"
            class="border! border-surface-300 dark:border-surface-700 rounded-lg"
        />
        <span
            v-if="field.errorMessage"
            class="text-red-500 absolute -bottom-6 start-0"
        >
            {{ field.errorMessage }}
        </span>
    </div>
</template>

<script setup>
import { useField } from "vee-validate";

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    options: {
        type: Array,
        default: () => [],
    },
    optionLabel: {
        type: String,
        default: "label",
    },
    optionValue: {
        type: String,
        default: "value",
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    allowEmpty: {
        type: Boolean,
        default: true,
    },
});

const field = useField(props.name);
</script>
