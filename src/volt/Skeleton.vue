<template>
    <Skeleton
        unstyled
        :pt="theme"
        :ptOptions="{ mergeProps: ptViewMerge }"
    />
</template>

<script setup lang="ts">
import Skeleton, { type SkeletonPassThroughOptions, type SkeletonProps } from 'primevue/skeleton';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ SkeletonProps {}
defineProps<Props>();

const theme = ref<SkeletonPassThroughOptions>({
    root: ({ props }) => [
        'overflow-hidden border-none text-transparent bg-surface-200 dark:bg-surface-700',
        props.shape === 'circle' ? 'rounded-full' : 'rounded-md',
        props.animation !== 'none' ? 'animate-pulse' : ''
    ]
});
</script>
