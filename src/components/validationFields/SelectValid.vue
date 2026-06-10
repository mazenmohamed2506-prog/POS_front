<template>
    <div class="w-full flex flex-col relative">
        <Select
            :id="name"
            v-model="field.value"
            :placeholder="placeholder"
            :options="safeOptions"
            :option-label="optionLabel"
            :option-value="optionValue"
            :option-value-label="optionValueLabel"
            :disabled="disabled"
            class="w-full"
            @blur="field.handleBlur"
            :filter="filter"
        >
            <slot name="option" v-bind="slotProps ?? {}" />
            <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps ?? {}" />
            </template>
        </Select>
        <span v-if="field.errorMessage" class="text-red-500  start-0">{{ field.errorMessage }}</span>
    </div>
</template>
<script setup>
import { useField } from "vee-validate";
import { computed } from "vue";

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
    placeholder: {
        type: String,
        default: "",
    },
    options: {
        type: Array,
        default: () => [],
    },
    optionLabel: {
        type: String,
        default: "name",
    },
    optionValue: {
        type: String,
        default: "id",
    },
    optionValueLabel: {
        type: String,
        default: undefined,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    filter: {
        type: Boolean,
        default: false,
    },
});

const field = useField(props.name);

// Ensure options is always an array to prevent findIndex errors
const safeOptions = computed(() => {
    return Array.isArray(props.options) ? props.options : [];
});
</script>
