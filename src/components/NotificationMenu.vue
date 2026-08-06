<template>
    <div class="relative inline-block">
        <!-- Bell Icon Button -->
        <button
            @click="toggleMenu"
            type="button"
            class="relative p-2 text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus:outline-none"
            title="التنبيهات والإشعارات"
            aria-label="التنبيهات والإشعارات"
        >
            <Bell class="w-5 h-5" />
            <!-- Unread Badge Counter -->
            <span
                v-if="store.unreadCount > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 bg-red-600 text-white font-bold text-xs rounded-full flex items-center justify-center shadow-md animate-pulse"
            >
                {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
            </span>
        </button>

        <!-- Popover Overlay -->
        <Popover ref="menuPopoverRef">
            <div class="w-80 sm:w-96 max-w-sm flex flex-col max-h-[85vh] text-surface-800 dark:text-surface-100">
                <!-- Header -->
                <div class="flex items-center justify-between p-3.5 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 rounded-t-lg">
                    <div class="flex items-center gap-2">
                        <Bell class="w-5 h-5 text-primary-500" />
                        <h3 class="font-bold text-sm text-surface-900 dark:text-white">التنبيهات والإشعارات</h3>
                        <span v-if="store.unreadCount > 0" class="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold rounded-full">
                            {{ store.unreadCount }} جديد
                        </span>
                    </div>

                    <div class="flex items-center gap-1">
                        <button
                            @click="onScanAlerts"
                            class="p-1.5 text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                            title="فحص التنبيهات الآن"
                        >
                            <RefreshCw :class="['w-4 h-4', store.isLoading ? 'animate-spin' : '']" />
                        </button>

                        <button
                            v-if="store.unreadCount > 0"
                            @click="store.markAllAsRead"
                            class="p-1.5 text-surface-500 hover:text-green-600 dark:hover:text-green-400 rounded-md hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                            title="تحديد الكل كتقروء"
                        >
                            <CheckCheck class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Category Filters -->
                <div class="flex items-center gap-1.5 p-2 overflow-x-auto border-b border-surface-200 dark:border-surface-700 no-scrollbar bg-surface-100/50 dark:bg-surface-900/50 text-xs">
                    <button
                        v-for="cat in categories"
                        :key="cat.key"
                        @click="selectCategory(cat.key)"
                        :class="[
                            'px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all',
                            store.activeCategory === cat.key
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-700'
                        ]"
                    >
                        {{ cat.label }}
                    </button>
                </div>

                <!-- Notifications List -->
                <div class="flex-1 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800 max-h-96">
                    <div v-if="store.isLoading" class="p-8 text-center text-surface-400 text-sm">
                        <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                        جاري تحميل التنبيهات...
                    </div>

                    <div v-else-if="!store.notifications.length" class="p-8 text-center text-surface-400 dark:text-surface-500">
                        <BellOff class="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p class="text-xs font-medium">لا يوجد تنبيهات حالياً في هذا القسم</p>
                    </div>

                    <div
                        v-else
                        v-for="item in store.notifications"
                        :key="item.id"
                        @click="handleNotificationClick(item)"
                        :class="[
                            'p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800/80',
                            !item.isRead ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''
                        ]"
                    >
                        <!-- Type Icon -->
                        <div :class="['flex-shrink-0 p-2 rounded-lg mt-0.5', getTypeStyle(item.type)]">
                            <component :is="getCategoryIcon(item.category)" class="w-4 h-4" />
                        </div>

                        <!-- Content -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-1 mb-1">
                                <h4 class="text-xs font-bold text-surface-900 dark:text-white truncate">
                                    {{ item.title }}
                                </h4>
                                <span class="text-[10px] text-surface-400 whitespace-nowrap">
                                    {{ formatTimeAgo(item.createdAt) }}
                                </span>
                            </div>
                            <p class="text-xs text-surface-600 dark:text-surface-300 leading-relaxed line-clamp-2">
                                {{ item.message }}
                            </p>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-1 flex-shrink-0 self-center">
                            <span v-if="!item.isRead" class="w-2 h-2 rounded-full bg-primary-600"></span>
                            <button
                                @click.stop="store.deleteNotification(item.id)"
                                class="p-1 text-surface-400 hover:text-red-500 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors opacity-0 group-hover:opacity-100"
                                title="حذف"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="p-2.5 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 rounded-b-lg text-center">
                    <button
                        @click="goToFullNotifications"
                        class="w-full py-1.5 px-3 bg-surface-200 dark:bg-surface-700 hover:bg-primary-600 hover:text-white text-surface-800 dark:text-surface-200 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5"
                    >
                        <span>عرض جميع التنبيهات والسجل الكامل</span>
                        <ArrowLeft class="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </Popover>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import Popover from "@/volt/Popover.vue";
import { useNotificationStore } from "@/stores/pos/notificationStore";
import {
    Bell,
    BellOff,
    CheckCheck,
    RefreshCw,
    Trash2,
    ArrowLeft,
    Package,
    ShoppingBag,
    Repeat,
    DollarSign,
    ShieldAlert
} from "lucide-vue-next";

const store = useNotificationStore();
const router = useRouter();
const menuPopoverRef = ref(null);

const categories = [
    { key: "all", label: "الكل" },
    { key: "stock", label: "المخزون" },
    { key: "sales", label: "المبيعات" },
    { key: "shift", label: "الورديات" },
    { key: "receivables", label: "الديون" },
    { key: "system", label: "النظام" }
];

function toggleMenu(event) {
    if (menuPopoverRef.value) {
        menuPopoverRef.value.toggle(event);
    }
    store.fetchNotifications(store.activeCategory);
}

function selectCategory(key) {
    store.fetchNotifications(key);
}

async function onScanAlerts() {
    await store.scanAlerts();
}

function handleNotificationClick(item) {
    if (!item.isRead) {
        store.markAsRead(item.id);
    }
    if (menuPopoverRef.value) {
        menuPopoverRef.value.hide();
    }
    if (item.actionUrl) {
        router.push(item.actionUrl);
    }
}

function goToFullNotifications() {
    if (menuPopoverRef.value) {
        menuPopoverRef.value.hide();
    }
    router.push("/notifications");
}

function getTypeStyle(type) {
    switch (type) {
        case "error":
            return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300";
        case "warning":
            return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
        case "success":
            return "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300";
        default:
            return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
    }
}

function getCategoryIcon(category) {
    switch (category?.toLowerCase()) {
        case "stock":
            return Package;
        case "sales":
            return ShoppingBag;
        case "shift":
            return Repeat;
        case "receivables":
            return DollarSign;
        default:
            return ShieldAlert;
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return "الآن";
    if (diffSeconds < 3600) return `منذ ${Math.floor(diffSeconds / 60)} د`;
    if (diffSeconds < 86400) return `منذ ${Math.floor(diffSeconds / 3600)} س`;
    return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

onMounted(() => {
    store.startPolling();
});

onUnmounted(() => {
    store.stopPolling();
});
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
