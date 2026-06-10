<template>
    <PrimeAutoComplete v-bind="$attrs" unstyled :pt="theme" showClear :ptOptions="{
        mergeProps: ptViewMerge,
    }">
        <template #dropdownicon>
            <ChevronDownIcon />
        </template>
        <template #loadingicon>
            <SpinnerIcon class="animate-spin" />
        </template>
        <template #clearicon="{ clearCallback }">
            <TimesIcon @click="clearCallback" class="text-surface-400 absolute top-1/2 -mt-2 end-10" />
        </template>
        <template #empty>
            <div class="text-surface-500 dark:text-surface-400">
                {{ t("emptyMessage") }}
            </div>
        </template>
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </PrimeAutoComplete>
</template>

<script setup lang="ts">
import ChevronDownIcon from "@primevue/icons/chevrondown";
import SpinnerIcon from "@primevue/icons/spinner";
import TimesIcon from "@primevue/icons/times";
import PrimeAutoComplete, {
    type AutoCompletePassThroughOptions,
} from "primevue/autocomplete";
import { ref } from "vue";
import { ptViewMerge } from "./utils";
import { useI18n } from "vue-i18n";

defineOptions({
    inheritAttrs: false
});

const { t } = useI18n();

const theme = ref<AutoCompletePassThroughOptions>({
    root: `relative inline-flex rounded-md p-fluid:flex
        bg-surface-0 dark:bg-surface-950
        border border-surface-300 hover:border-surface-400 dark:border-surface-700 dark:hover:border-surface-600
        p-focus:border-primary
        p-filled:bg-surface-50 dark:p-filled:bg-surface-800
        p-invalid:border-red-400 dark:p-invalid:border-red-300
        p-disabled:bg-surface-200 p-disabled:text-surface-500 dark:p-disabled:bg-surface-700 dark:p-disabled:text-surface-400 p-disabled:pointer-events-none
        shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]
        transition-colors duration-200 rounded-lg`,
    pcInputText: {
        root: `flex-auto w-[1%] appearance-none rounded-md outline-hidden
            bg-transparent text-surface-700 dark:text-surface-0
            placeholder:text-surface-500 dark:placeholder:text-surface-400
            border-none px-3 py-2 p-fluid:w-full
            p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
            p-large:text-lg p-large:px-[0.875rem] p-large:py-[0.625rem]
            p-clearable:pe-7`,
    },
    inputMultiple: `m-0 py-[0.375rem] ps-3 list-none flex items-center flex-wrap flex-auto w-[1%] gap-[0.375rem]
        text-surface-700 dark:text-surface-0
        bg-transparent border-none rounded-md outline-hidden
        p-disabled:bg-surface-200 p-disabled:text-surface-500 dark:p-disabled:bg-surface-700 dark:p-disabled:text-surface-400`,
    chipItem: `inline-flex cursor-default items-center
        px-3 py-[0.375rem] rounded-md bg-surface-200 dark:bg-surface-700
        text-surface-700 dark:text-surface-0`,
    pcChip: {
        root: `inline-flex items-center py-[0.375rem] px-3 rounded-md
            bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-0`,
        label: `text-sm leading-5`,
        removeIcon: `ms-[0.375rem] w-4 h-4`,
    },
    chipIcon: `leading-6 ms-[0.375rem]`,
    inputChip: `flex-auto inline-flex py-[0.375rem] pe-3
        text-surface-700 dark:text-surface-0 bg-transparent border-none rounded-md outline-hidden
        placeholder:text-surface-500 dark:placeholder:text-surface-400`,
    loader: `absolute top-1/2 -mt-2 end-3 leading-none`,
    dropdown: `flex items-center justify-center shrink-0 bg-transparent
        text-surface-400 w-10 rounded-e-md cursor-pointer`,
    dropdownIcon: ``,
    overlay: `absolute top-0 left-0 rounded-md p-portal-self:min-w-full
        bg-surface-0 dark:bg-surface-900
        border border-surface-200 dark:border-surface-700
        text-surface-700 dark:text-surface-0
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]`,
    listContainer: `overflow-auto`,
    list: `m-0 p-1 list-none gap-[2px] flex flex-col`,
    optionGroup: `m-0 px-3 py-2 bg-transparent text-surface-500 dark:text-surface-400 font-semibold`,
    option: `cursor-pointer font-normal whitespace-nowrap relative overflow-hidden flex items-center
        px-3 py-2 border-none text-surface-700 dark:text-surface-0 bg-transparent rounded-sm
        p-focus:bg-surface-100 dark:p-focus:bg-surface-800 p-focus:text-surface-800 dark:p-focus:text-surface-0
        p-selected:bg-highlight p-focus:p-selected:bg-highlight-emphasis
        transition-colors duration-200`,
    emptyMessage: `px-3 py-2 text-surface-500 dark:text-surface-400`,
    transition: {
        enterFromClass: "opacity-0 scale-y-75",
        enterActiveClass:
            "transition duration-120 ease-[cubic-bezier(0,0,0.2,1)]",
        leaveActiveClass: "transition-opacity duration-100 ease-linear",
        leaveToClass: "opacity-0",
    },
});
</script>
