<template>
    <Divider
        unstyled
        :pt="theme"
        :ptOptions="{ mergeProps: ptViewMerge }"
    >
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </Divider>
</template>

<script setup lang="ts">
import Divider, { type DividerPassThroughOptions, type DividerProps } from 'primevue/divider';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ DividerProps {}
defineProps<Props>();

const theme = ref<DividerPassThroughOptions>({
    root: ({ props }) => [
        'flex relative justify-center items-center',
        props.layout === 'vertical' ? 'flex-col mx-4 min-w-[1px] min-h-full' : 'my-4 min-h-[1px] w-full',
        props.layout === 'vertical' ? 'before:w-px before:h-full before:absolute before:border-l' : 'before:h-px before:w-full before:absolute before:border-t',
        props.type === 'dashed' ? 'before:border-dashed' : props.type === 'dotted' ? 'before:border-dotted' : 'before:border-solid',
        'before:border-surface-200 dark:before:border-surface-700'
    ],
    content: 'bg-surface-0 dark:bg-surface-900 z-10 px-2'
});
</script>
