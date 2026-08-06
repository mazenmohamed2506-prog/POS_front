import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useNotificationStore = defineStore("notification", () => {
    const notifications = ref([]);
    const unreadCount = ref(0);
    const totalCount = ref(0);
    const isLoading = ref(false);
    const activeCategory = ref("all");
    const pollingTimer = ref(null);
    const toastStore = useToastStore();

    const hasUnread = computed(() => unreadCount.value > 0);

    async function fetchNotifications(category = "all", unreadOnly = false, skip = 0, take = 30) {
        isLoading.value = true;
        try {
            activeCategory.value = category;
            const params = new URLSearchParams();
            if (category && category !== "all") params.append("category", category);
            if (unreadOnly) params.append("unreadOnly", "true");
            params.append("skip", skip);
            params.append("take", take);

            const res = await apiGet(`/Notifications?${params.toString()}`);
            if (res?.data) {
                notifications.value = res.data.items || [];
                unreadCount.value = res.data.unreadCount ?? 0;
                totalCount.value = res.data.totalCount ?? 0;
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchUnreadCount() {
        try {
            const res = await apiGet("/Notifications/unread-count");
            if (res?.data) {
                unreadCount.value = res.data.unreadCount ?? 0;
            }
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    }

    async function markAsRead(id) {
        try {
            await apiPut(`/Notifications/${id}/read`, {}, false);
            const target = notifications.value.find(n => n.id === id);
            if (target && !target.isRead) {
                target.isRead = true;
                if (unreadCount.value > 0) unreadCount.value--;
            }
        } catch (err) {
            console.error(`Failed to mark notification ${id} as read:`, err);
        }
    }

    async function markAllAsRead() {
        try {
            await apiPut("/Notifications/read-all", {}, false);
            notifications.value.forEach(n => (n.isRead = true));
            unreadCount.value = 0;
            toastStore.addSuccessToast("تم تحديد جميع التنبيهات كـ مقروءة", "تم الإجراء");
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    }

    async function deleteNotification(id) {
        try {
            await apiDelete(`/Notifications/${id}`, {}, false);
            const idx = notifications.value.findIndex(n => n.id === id);
            if (idx !== -1) {
                if (!notifications.value[idx].isRead && unreadCount.value > 0) {
                    unreadCount.value--;
                }
                notifications.value.splice(idx, 1);
                totalCount.value = Math.max(0, totalCount.value - 1);
            }
        } catch (err) {
            console.error(`Failed to delete notification ${id}:`, err);
        }
    }

    async function clearAllNotifications() {
        try {
            await apiDelete("/Notifications/clear-all", {}, false);
            notifications.value = [];
            unreadCount.value = 0;
            totalCount.value = 0;
            toastStore.addSuccessToast("تم تفريغ جميع التنبيهات بنجاح", "تم المسح");
        } catch (err) {
            console.error("Failed to clear notifications:", err);
        }
    }

    async function scanAlerts() {
        try {
            const res = await apiPost("/Notifications/scan-alerts", {}, false);
            if (res?.data?.generatedAlertsCount > 0) {
                await fetchNotifications(activeCategory.value);
                toastStore.addInfoToast(`تم اكتشاف ${res.data.generatedAlertsCount} تنبيهات جديدة في النظام`, "فحص التنبيهات");
            }
        } catch (err) {
            console.error("Failed to scan alerts:", err);
        }
    }

    function startPolling(intervalMs = 30000) {
        if (pollingTimer.value) return;
        fetchUnreadCount();
        pollingTimer.value = setInterval(() => {
            fetchUnreadCount();
        }, intervalMs);
    }

    function stopPolling() {
        if (pollingTimer.value) {
            clearInterval(pollingTimer.value);
            pollingTimer.value = null;
        }
    }

    return {
        notifications,
        unreadCount,
        totalCount,
        isLoading,
        activeCategory,
        hasUnread,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        scanAlerts,
        startPolling,
        stopPolling
    };
});
