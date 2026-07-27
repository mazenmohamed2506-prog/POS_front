import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useStockCountStore = defineStore("stockCount", () => {
    const sessions = ref([]);
    const currentSession = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    async function fetchSessions() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/StockCounts/sessions");
            sessions.value = response.data || [];
        } catch (err) {
            console.error("Failed to fetch stock count sessions:", err);
            error.value = err.message || "Failed to load sessions";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل جلسات الجرد");
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchSessionById(id) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/StockCounts/session/${id}`);
            currentSession.value = response.data;
            return response.data;
        } catch (err) {
            console.error("Failed to fetch session details:", err);
            error.value = err.message || "Failed to load session details";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل تفاصيل الجلسة");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function createSession(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/StockCounts/session", payload, false);
            toastStore.addSuccessToast("تم إنشاء جلسة الجرد بنجاح");
            currentSession.value = response.data;
            await fetchSessions();
            return response.data;
        } catch (err) {
            console.error("Failed to create session:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إنشاء الجلسة";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء إنشاء الجلسة");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function updateSessionItems(id, itemsPayload) {
        isLoading.value = true;
        error.value = null;
        try {
            await apiPut(`/StockCounts/session/${id}/items`, itemsPayload, false);
            toastStore.addSuccessToast("تم تحديث أصناف الجرد بنجاح");
            await fetchSessionById(id);
        } catch (err) {
            console.error("Failed to update session items:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تحديث الأصناف";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تحديث الأصناف");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function completeSession(id) {
        isLoading.value = true;
        error.value = null;
        try {
            await apiPost(`/StockCounts/session/${id}/complete`, {}, false);
            toastStore.addSuccessToast("تم إنهاء الجلسة وتحديث المخزون بنجاح");
            await fetchSessions();
            if (currentSession.value && currentSession.value.id === id) {
                await fetchSessionById(id);
            }
        } catch (err) {
            console.error("Failed to complete session:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إنهاء الجلسة";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء إنهاء الجلسة");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteSession(id) {
        isLoading.value = true;
        error.value = null;
        try {
            await apiDelete(`/StockCounts/session/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف جلسة الجرد بنجاح");
            await fetchSessions();
        } catch (err) {
            console.error("Failed to delete session:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف الجلسة";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء حذف الجلسة");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        sessions,
        currentSession,
        isLoading,
        error,
        fetchSessions,
        fetchSessionById,
        createSession,
        updateSessionItems,
        completeSession,
        deleteSession,
    };
});
