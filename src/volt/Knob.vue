<template>
    <Knob v-bind="$props" unstyled :pt="theme" :ptOptions="{
        mergeProps: ptViewMerge,
    }" />
</template>

<script setup lang="ts">
import Knob, {
    type KnobPassThroughOptions,
    type KnobProps,
} from "primevue/knob";
import { ref } from "vue";
import { ptViewMerge } from "./utils";

interface Props extends /* @vue-ignore */ KnobProps { }
defineProps<Props>();

const theme = ref<KnobPassThroughOptions>({
    root: "inline-flex flex-col items-center justify-center relative select-none",
    range: "stroke-primary fill-none transition-[stroke-dasharray] duration-100 ease-in-out",
    value: "stroke-surface-200 dark:stroke-surface-700 fill-none",
    text: "text-xl font-medium fill-surface-900 dark:fill-surface-0",
});
</script>
