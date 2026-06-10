<template>
    <Dialog
        unstyled
        :pt="theme"
        :ptOptions="{
            mergeProps: ptViewMerge,
        }"
        modal
    >
        <template #closebutton="{ closeCallback }">
            <!-- <SecondaryButton
                variant="text"
                rounded
                @click="closeCallback"
                autofocus
            >
                <template #icon>
                    <TimesIcon />
                </template>
            </SecondaryButton> -->
            <Button
                variant="text"
                class="!p-2 rounded-full !size-10 !bg-surface-50 dark:!bg-surface-800 hover:!bg-surface-100 dark:hover:!bg-surface-700 !border !border-surface-200 dark:!border-surface-700 !text-surface-500 dark:!text-surface-400"
                @click="closeCallback"
                autofocus
            >
                <template #icon>
                    <X class="w-8 h-8" strokeWidth="2.7" />
                </template>
            </Button>
        </template>
        <template #maximizebutton="{ maximized, maximizeCallback }">
            <SecondaryButton
                variant="text"
                rounded
                @click="maximizeCallback"
                autofocus
            >
                <template #icon>
                    <WindowMinimizeIcon v-if="maximized" />
                    <WindowMaximizeIcon v-else />
                </template>
            </SecondaryButton>
        </template>
        <template #header>
            <div
                class="flex items-center justify-between shrink-0 pe-5 select-none"
            >
                <div class="flex items-center gap-2">
                    <div
                        v-if="imageUrl"
                        class="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800"
                    >
                        <img :src="imageUrl" class="w-full h-full object-cover" />
                    </div>
                    <div
                        v-else-if="icon"
                        class="flex items-center justify-center p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800"
                    >
                        <component :is="icon" class="w-6 h-6" strokeWidth="2" />
                    </div>

                    <div class="flex flex-col">
                        <h1 class="font-semibold text-xl">
                            {{ title }}
                        </h1>
                        <p
                            class="text-sm text-surface-500 dark:text-surface-400"
                        >
                            {{ subtitle }}
                        </p>
                    </div>
                </div>
            </div>
        </template>
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import TimesIcon from "@primevue/icons/times";
import WindowMaximizeIcon from "@primevue/icons/windowmaximize";
import WindowMinimizeIcon from "@primevue/icons/windowminimize";
import Dialog, {
    type DialogPassThroughOptions,
    type DialogProps,
} from "primevue/dialog";
import { ref } from "vue";
import SecondaryButton from "./SecondaryButton.vue";
import { ptViewMerge } from "./utils";

interface Props extends /* @vue-ignore */ DialogProps {
    title?: string;
    subtitle?: string;
    icon?: string;
    imageUrl?: string;
}
defineProps<Props>();

const theme = ref<DialogPassThroughOptions>({
    root: `max-h-[90%] max-w-screen rounded-xl min-w-96
        border border-surface-200 dark:border-surface-700
        bg-surface-0 dark:bg-surface-900
        text-surface-700 dark:text-surface-0 shadow-lg
        p-maximized:w-screen p-maximized:h-screen p-maximized:top-0 p-maximized:start-0p-maximized: max-h-full p-maximized:rounded-none transition-[width] transition-[height] duration-300`,
    header: `flex items-center justify-between shrink-0 p-5`,
    title: `font-semibold text-xl`,
    headerActions: `flex items-center gap-2`,
    content: `overflow-y-auto pt-0 px-5 pb-5 p-maximized:grow`,
    footer: `shrink-0 pt-0 px-5 pb-5 flex justify-end gap-2`,
    mask: `p-modal:bg-black/50 p-modal:fixed p-modal:top-0 p-modal:start-0 p-modal:w-full p-modal:h-full`,
    transition: {
        enterFromClass: "opacity-0 scale-75",
        enterActiveClass:
            "transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)]",
        leaveActiveClass:
            "transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
        leaveToClass: "opacity-0 scale-75",
    },
});
</script>
