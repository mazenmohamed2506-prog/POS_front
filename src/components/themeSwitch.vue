<script setup>
import { useDark, useToggle } from "@vueuse/core";
import { Sun, Moon } from "lucide-vue-next";
const isDark = useDark();
const toggleDark = useToggle(isDark);
</script>
<template>
    <Button
        type="button"
        @click="toggleDark()"
        aria-haspopup="true"
        aria-controls="overlay_menu"
        rounded
        :pt="{
            root: 'bg-surface-0 dark:bg-surface-800 dark:hover:bg-surface-700 hover:bg-surface-100 rounded-full aspect-square h-9 flex items-center justify-center dark:text-white',
        }"
    >
        <component :is="isDark ? 'Moon' : 'Sun'" size="24" />
    </Button>
</template>
