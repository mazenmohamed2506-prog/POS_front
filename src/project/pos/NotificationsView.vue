<template>
    <div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        <!-- Header Banner & Action Bar -->
        <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-5 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="p-3 bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 rounded-xl">
                        <Bell class="w-7 h-7" />
                    </div>
                    <div>
                        <h1 class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">
                            مركز التنبيهات والإشعارات
                        </h1>
                        <p class="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
                            متابعة وإدارة جميع إشعارات النظام، تنبيهات المخزون، المبيعات، والورديات
                        </p>
                    </div>
                </div>

                <!-- Stats & Actions -->
                <div class="flex flex-wrap items-center gap-2">
                    <!-- Unread Chip -->
                    <div class="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <AlertCircle class="w-4 h-4" />
                        <span>{{ store.unreadCount }} إشعار غير مقروء</span>
                    </div>

                    <!-- Action Buttons -->
                    <button
                        @click="store.scanAlerts"
                        class="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                        <RefreshCw :class="['w-4 h-4', store.isLoading ? 'animate-spin' : '']" />
                        <span>فحص التنبيهات الآن</span>
                    </button>

                    <button
                        v-if="store.unreadCount > 0"
                        @click="store.markAllAsRead"
                        class="px-3.5 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                        <CheckCheck class="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span>تحديد الكل كتقروء</span>
                    </button>

                    <button
                        v-if="store.notifications.length > 0"
                        @click="confirmClearAll"
                        class="px-3.5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                        <Trash2 class="w-4 h-4" />
                        <span>مسح الكل</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Filters & Search Bar -->
        <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <!-- Category Tabs -->
            <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
                <button
                    v-for="cat in categories"
                    :key="cat.key"
                    @click="onSelectCategory(cat.key)"
                    :class="[
                        'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                        selectedCategory === cat.key
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                    ]"
                >
                    {{ cat.label }}
                </button>
            </div>

            <!-- Options: Search & Unread Only toggle -->
            <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <label class="flex items-center gap-2 text-xs font-medium text-surface-700 dark:text-surface-300 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        v-model="unreadOnly"
                        @change="onFilterChange"
                        class="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span>غير المقروءة فقط</span>
                </label>

                <!-- Search Input -->
                <div class="relative w-48 sm:w-64">
                    <Search class="w-4 h-4 absolute right-3 top-2.5 text-surface-400" />
                    <input
                        type="text"
                        v-model="searchQuery"
                        placeholder="البحث في التنبيهات..."
                        class="w-full pl-3 pr-9 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white focus:outline-none focus:border-primary-500"
                    />
                </div>
            </div>
        </div>

        <!-- Notifications Grid/List -->
        <div v-if="store.isLoading" class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-12 text-center">
            <RefreshCw class="w-8 h-8 animate-spin mx-auto mb-3 text-primary-500" />
            <p class="text-sm font-medium text-surface-600 dark:text-surface-300">جاري تحميل قائمة التنبيهات...</p>
        </div>

        <div v-else-if="filteredNotifications.length === 0" class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-12 text-center space-y-3">
            <BellOff class="w-12 h-12 mx-auto text-surface-400 opacity-60" />
            <h3 class="text-base font-bold text-surface-800 dark:text-surface-200">لا يوجد تنبيهات مطابقة</h3>
            <p class="text-xs text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
                لم يتم العثور على أي إشعارات بناءً على الفلاتر المحددة حالياً.
            </p>
            <button
                @click="resetFilters"
                class="px-4 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg text-xs font-semibold transition-colors"
            >
                إعادة ضبط الفلاتر
            </button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
                v-for="item in filteredNotifications"
                :key="item.id"
                :class="[
                    'bg-surface-0 dark:bg-surface-900 border rounded-xl p-4 shadow-sm transition-all hover:shadow-md flex flex-col justify-between gap-3 relative overflow-hidden',
                    !item.isRead ? 'border-primary-400 dark:border-primary-600 ring-1 ring-primary-400/30' : 'border-surface-200 dark:border-surface-700'
                ]"
            >
                <!-- Severity Strip -->
                <div :class="['absolute top-0 right-0 left-0 h-1', getSeverityBarColor(item.type)]"></div>

                <div>
                    <!-- Top row: Category tag, status badge, timestamp -->
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2">
                            <span :class="['p-1.5 rounded-lg text-xs', getTypeBadgeStyle(item.type)]">
                                <component :is="getCategoryIcon(item.category)" class="w-4 h-4" />
                            </span>
                            <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
                                {{ getCategoryLabel(item.category) }}
                            </span>
                        </div>

                        <div class="flex items-center gap-2">
                            <span v-if="!item.isRead" class="px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300 text-[10px] font-bold rounded-full">
                                غير مقروء
                            </span>
                            <span class="text-[11px] text-surface-400 font-medium">
                                {{ formatDate(item.createdAt) }}
                            </span>
                        </div>
                    </div>

                    <!-- Title & Message -->
                    <h3 class="text-sm font-bold text-surface-900 dark:text-white mb-1">
                        {{ item.title }}
                    </h3>
                    <p class="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                        {{ item.message }}
                    </p>
                </div>

                <!-- Card Actions -->
                <div class="pt-3 border-t border-surface-100 dark:border-surface-800/80 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <button
                            v-if="item.actionUrl"
                            @click="navigateToAction(item)"
                            class="px-3 py-1.5 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/60 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                            <span>الانتقال للتفاصيل</span>
                            <ExternalLink class="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div class="flex items-center gap-1">
                        <button
                            v-if="!item.isRead"
                            @click="store.markAsRead(item.id)"
                            class="p-1.5 text-surface-500 hover:text-green-600 dark:hover:text-green-400 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            title="تحديد كـ مقروء"
                        >
                            <Check class="w-4 h-4" />
                        </button>

                        <button
                            @click="store.deleteNotification(item.id)"
                            class="p-1.5 text-surface-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            title="حذف التنبيه"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useNotificationStore } from "@/stores/pos/notificationStore";
import {
    Bell,
    BellOff,
    CheckCheck,
    Check,
    RefreshCw,
    Trash2,
    Search,
    AlertCircle,
    ExternalLink,
    Package,
    ShoppingBag,
    Repeat,
    DollarSign,
    ShieldAlert
} from "lucide-vue-next";

const store = useNotificationStore();
const router = useRouter();

const selectedCategory = ref("all");
const unreadOnly = ref(false);
const searchQuery = ref("");

const categories = [
    { key: "all", label: "الكل" },
    { key: "stock", label: "المخزون" },
    { key: "sales", label: "المبيعات" },
    { key: "shift", label: "الورديات" },
    { key: "receivables", label: "الديون والتحصيل" },
    { key: "system", label: "النظام" }
];

const filteredNotifications = computed(() => {
    return store.notifications.filter(n => {
        const matchesCategory = selectedCategory.value === "all" || n.category?.toLowerCase() === selectedCategory.value;
        const matchesUnread = !unreadOnly.value || !n.isRead;
        const query = searchQuery.value.trim().toLowerCase();
        const matchesSearch = !query || n.title?.toLowerCase().includes(query) || n.message?.toLowerCase().includes(query);
        return matchesCategory && matchesUnread && matchesSearch;
    });
});

function onSelectCategory(key) {
    selectedCategory.value = key;
    store.fetchNotifications(key, unreadOnly.value);
}

function onFilterChange() {
    store.fetchNotifications(selectedCategory.value, unreadOnly.value);
}

function resetFilters() {
    selectedCategory.value = "all";
    unreadOnly.value = false;
    searchQuery.value = "";
    store.fetchNotifications("all", false);
}

function confirmClearAll() {
    if (confirm("هل أنت تأكد من رغبتك في مسح جميع التنبيهات بالكامل؟")) {
        store.clearAllNotifications();
    }
}

function navigateToAction(item) {
    if (!item.isRead) {
        store.markAsRead(item.id);
    }
    if (item.actionUrl) {
        router.push(item.actionUrl);
    }
}

function getCategoryLabel(cat) {
    const target = categories.find(c => c.key === cat?.toLowerCase());
    return target ? target.label : "عام";
}

function getCategoryIcon(category) {
    switch (category?.toLowerCase()) {
        case "stock": return Package;
        case "sales": return ShoppingBag;
        case "shift": return Repeat;
        case "receivables": return DollarSign;
        default: return ShieldAlert;
    }
}

function getTypeBadgeStyle(type) {
    switch (type) {
        case "error": return "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300";
        case "warning": return "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300";
        case "success": return "bg-green-100 text-green-700 dark:bg-green-950/70 dark:text-green-300";
        default: return "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300";
    }
}

function getSeverityBarColor(type) {
    switch (type) {
        case "error": return "bg-red-500";
        case "warning": return "bg-amber-500";
        case "success": return "bg-green-500";
        default: return "bg-blue-500";
    }
}

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

onMounted(() => {
    store.fetchNotifications("all", false);
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
