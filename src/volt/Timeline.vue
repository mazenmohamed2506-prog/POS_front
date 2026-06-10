<template>
    <Timeline unstyled :pt="theme" :ptOptions="{
        mergeProps: ptViewMerge
    }">
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </Timeline>
</template>

<script setup lang="ts">
import Timeline, { type TimelinePassThroughOptions, type TimelineProps } from 'primevue/timeline';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

// @vue-ignore
interface Props extends TimelineProps {}
defineProps<Props>();

const theme = ref<TimelinePassThroughOptions>({
    root: ({ props }) => `flex flex-col grow-1 ${props.layout === 'horizontal' ? 'flex-row' : 'flex-col'}`,
    event: ({ props, context }) => `flex relative min-h-[70px] ${props.layout === 'horizontal' ? 'flex-col flex-1' : props.layout === 'vertical' && props.align === 'alternate' && context.index % 2 !== 0 ? 'flex-row-reverse' : 'flex-row'}`,
    eventOpposite: ({ props, context }) => `${props.align === 'left' || props.align === 'right' ? 'hidden' : 'flex-1 px-4'} ${props.layout === 'horizontal' ? 'text-center' : 'text-end'} ${props.layout === 'vertical' && props.align === 'alternate' && context.index % 2 === 0 ? 'text-end' : props.layout === 'vertical' && props.align === 'alternate' ? 'text-start' : ''}`,
    eventSeparator: ({ props }) => `flex items-center flex-initial px-4 ${props.layout === 'horizontal' ? 'flex-row w-full' : 'flex-col'}`,
    eventMarker: `w-4 h-4 rounded-full border-2 border-primary bg-surface-0 dark:bg-surface-900 z-10`,
    eventConnector: ({ props }) => `${props.layout === 'horizontal' ? 'h-[2px] w-full' : 'w-[2px] flex-1'} bg-surface-200 dark:bg-surface-700`,
    eventContent: ({ props, context }) => `flex-1 pb-4 px-4 ${props.layout === 'horizontal' ? 'text-center' : 'text-start'} ${props.align === 'left' ? 'text-start' : props.align === 'right' ? 'text-end' : ''} ${props.layout === 'vertical' && props.align === 'alternate' && context.index % 2 === 0 ? 'text-start' : props.layout === 'vertical' && props.align === 'alternate' ? 'text-end' : ''}`
});
</script>
