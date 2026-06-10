<template>
    <TreeSelect v-bind="$props" unstyled :pt="theme" :ptOptions="{
        mergeProps: ptViewMerge,
    }">
        <template #dropdownicon>
            <ChevronDownIcon />
        </template>
        <template #empty>
            <div class="text-surface-500 dark:text-surface-400 px-3 py-2">
                {{ t("emptyMessage") }}
            </div>
        </template>
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </TreeSelect>
</template>

<script setup lang="ts">
import ChevronDownIcon from "@primevue/icons/chevrondown";
import TreeSelect, {
    type TreeSelectPassThroughOptions,
    type TreeSelectProps,
} from "primevue/treeselect";
import { ref } from "vue";
import { ptViewMerge } from "./utils";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
interface Props extends /* @vue-ignore */ TreeSelectProps { }
defineProps<Props>();

const theme = ref<TreeSelectPassThroughOptions>({
    root: `flex w-full justify-between cursor-pointer relative select-none rounded-md p-fluid:flex
        bg-surface-0 dark:bg-surface-950
        border border-surface-300 hover:border-surface-400 dark:border-surface-700 dark:hover:border-surface-600
        p-focus:border-primary
        p-invalid:border-red-400 dark:p-invalid:border-red-300
        p-disabled:bg-surface-200 p-disabled:text-surface-500 dark:p-disabled:bg-surface-700 dark:p-disabled:text-surface-400 p-disabled:pointer-events-none
        shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]
        transition-colors duration-200 rounded-lg`,
    label: `block flex-1 min-w-0
        py-2 px-3 truncate
        text-surface-700 dark:text-surface-0 bg-transparent border-none outline-none
        p-placeholder:text-surface-500 dark:p-placeholder:text-surface-400
        p-disabled:text-surface-500 dark:p-disabled:text-surface-400`,
    dropdown: `flex items-center justify-center shrink-0 bg-transparent
        text-surface-400 w-10 rounded-e-md`,
    panel: `absolute top-0 left-0 rounded-md
        bg-surface-0 dark:bg-surface-900
        border border-surface-200 dark:border-surface-700
        text-surface-700 dark:text-surface-0
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]`,
    treeContainer: `overflow-auto max-h-[200px] p-1`,
    pcTree: {
        root: `m-0 p-1`,
        node: `p-0 outline-none`,
        nodeContent: `cursor-pointer flex items-center rounded-sm px-2 py-1.5
            hover:bg-surface-100 dark:hover:bg-surface-800
            p-selected:bg-highlight
            transition-colors duration-200`,
        nodeToggleButton: `cursor-pointer select-none inline-flex items-center justify-center
            overflow-hidden relative shrink-0 me-1
            w-6 h-6 border-none rounded-full
            bg-transparent text-surface-500 dark:text-surface-400
            hover:bg-surface-100 dark:hover:bg-surface-800
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
            transition-colors duration-200`,
        nodeToggleIcon: `w-4 h-4`,
        pcNodeCheckbox: {
            root: `relative inline-flex items-center justify-center
                w-5 h-5 me-1
                border border-surface-300 dark:border-surface-700
                rounded
                bg-surface-0 dark:bg-surface-950
                p-checked:bg-primary p-checked:border-primary
                transition-colors duration-200`,
            icon: `w-3 h-3 text-white`,
            box: ``,
        },
        nodeIcon: `text-surface-500 dark:text-surface-400 me-1`,
        nodeLabel: `text-surface-700 dark:text-surface-0`,
        nodeChildren: `m-0 list-none ps-5`,
        loadingIcon: `animate-spin w-4 h-4`,
        emptyMessage: `px-3 py-2 text-gray-500 dark:text-gray-400`,
    },
    transition: {
        enterFromClass: "opacity-0 scale-y-75",
        enterActiveClass:
            "transition duration-120 ease-[cubic-bezier(0,0,0.2,1)]",
        leaveActiveClass: "transition-opacity duration-100 ease-linear",
        leaveToClass: "opacity-0",
    },
});
</script>
