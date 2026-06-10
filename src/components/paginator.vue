<template>
    <div
        v-if="totalItems > 0"
        class="px-6 py-3 border-t border-surface-200 dark:border-surface-700"
    >
        <div class="flex items-center justify-center">
            <div class="flex items-center gap-2">
                <!-- Previous Button -->
                <button
                    @click="goToPage(currentPage - 1)"
                    :disabled="currentPage <= 1"
                    class="px-3 py-2 text-sm border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center gap-1"
                >
                    <ChevronLeft class="w-4 h-4 rtl:rotate-180" />
                    السابق
                </button>

                <!-- Page Numbers -->
                <div class="flex items-center gap-1 mx-3">
                    <template v-for="page in visiblePages" :key="page">
                        <button
                            v-if="page !== '...'"
                            @click="goToPage(page)"
                            :class="[
                                'px-3 py-2 text-sm rounded-lg font-medium transition-colors',
                                page === currentPage
                                    ? 'bg-primary-900 dark:bg-primary-50 dark:text-primary-900 text-white shadow-sm'
                                    : 'text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700',
                            ]"
                        >
                            {{ page }}
                        </button>
                        <span
                            v-else
                            class="px-2 py-2 text-sm text-surface-500 dark:text-surface-400"
                        >
                            ...
                        </span>
                    </template>
                </div>

                <!-- Next Button -->
                <button
                    @click="goToPage(currentPage + 1)"
                    :disabled="currentPage >= totalPages"
                    class="px-3 py-2 text-sm border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center gap-1"
                >
                    التالي
                    <ChevronRight class="w-4 h-4 rtl:rotate-180" />
                </button>
            </div>
        </div>

        <!-- Show current page info -->
        <div class="text-center mt-2">
            <span class="text-xs text-surface-600 dark:text-surface-400">
                صفحة {{ currentPage }} من
                {{ totalPages }} (الإجمالي {{ totalItems }}
                عنصر)
            </span>
        </div>
    </div>
</template>

<script setup>
import { computed, defineProps, defineEmits } from "vue";
// Props
const props = defineProps({
    currentPage: {
        type: Number,
        required: true,
        default: 1,
    },
    itemsPerPage: {
        type: Number,
        required: true,
        default: 10,
    },
    totalItems: {
        type: Number,
        required: true,
        default: 0,
    },

    maxVisiblePages: {
        type: Number,
        default: 7,
    },
});

// Emits
const emit = defineEmits(["page-change"]);

// Computed properties
const totalPages = computed(() => {
    return Math.ceil(props.totalItems / props.itemsPerPage);
});

const visiblePages = computed(() => {
    const total = totalPages.value;
    const current = props.currentPage;
    const maxVisible = props.maxVisiblePages;
    const pages = [];

    if (total <= maxVisible) {
        // Show all pages if total is less than max visible
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        // Always show first page
        pages.push(1);

        if (current <= 4) {
            // Show pages 2-5 and ellipsis + last page
            for (let i = 2; i <= 5; i++) {
                pages.push(i);
            }
            pages.push("...");
            pages.push(total);
        } else if (current >= total - 3) {
            // Show ellipsis + last 5 pages
            pages.push("...");
            for (let i = total - 4; i <= total; i++) {
                pages.push(i);
            }
        } else {
            // Show ellipsis + current-1, current, current+1 + ellipsis + last page
            pages.push("...");
            for (let i = current - 1; i <= current + 1; i++) {
                pages.push(i);
            }
            pages.push("...");
            pages.push(total);
        }
    }

    return pages;
});

// Methods
const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value && page !== props.currentPage) {
        emit("page-change", page);
    }
};
</script>

<style scoped>
/* Component-specific styles can be added here if needed */
</style>
