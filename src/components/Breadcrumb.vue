<template>
    <nav class="hidden md:flex items-center gap-2 ps-2 rtl:flex-row-reverse">
        <template v-for="(crumb, index) in breadcrumbs" :key="index">
            <span 
                @click="crumb.path && navigateTo(crumb.path)" 
                :class="[
                    'breadcrumb-item',
                    index === 0 ? 'breadcrumb-active' : 'breadcrumb-link',
                ]"
            >
                {{ crumb.name }}
            </span>
            <ChevronRight 
                v-if="index < breadcrumbs.length - 1" 
                class="breadcrumb-separator" 
            />
        </template>
    </nav>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronRight } from "lucide-vue-next";
import { useBaseStore } from "@/stores/base/baseStore";

const route = useRoute();
const router = useRouter();
const baseStore = useBaseStore();

const navigateTo = (path) => {
    router.push(path);
};

const breadcrumbs = computed(() => {
    const crumbs = baseStore.getBreadcrumbs(route.path, "ar");
    return [...crumbs].reverse();
});
</script>

<style scoped>
/* Breadcrumb Navigation */
.breadcrumb-nav {
    padding-inline-start: 0.6rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
}
[dir="rtl"] .breadcrumb-nav {
    flex-direction: row-reverse;
}
.breadcrumb-item {
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
}

.breadcrumb-active {
    color: var(--p-primary-600);
    font-weight: 600;
}

.dark .breadcrumb-active {
    color: var(--p-primary-400);
}

.breadcrumb-link {
    color: #6b7280;
    cursor: pointer;
}

.dark .breadcrumb-link {
    color: #d1d5db;
}

.breadcrumb-link:hover {
    color: var(--p-primary-600);
}

.dark .breadcrumb-link:hover {
    color: var(--p-primary-400);
}

.breadcrumb-separator {
    height: 1rem;
    width: 1rem;
    color: #9ca3af;
    margin: 0 0.25rem;
}

.dark .breadcrumb-separator {
    color: #6b7280;
}

[dir="rtl"] .breadcrumb-separator {
    transform: rotate(180deg);
}
</style>

