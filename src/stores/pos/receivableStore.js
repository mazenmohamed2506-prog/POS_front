import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useReceivableStore = defineStore("receivable", () => {
    const receivables = ref([]);
    const clientDetails = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    async function fetchReceivables() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/receivables");
            receivables.value = response.data || [];
        } catch (err) {
            console.error("Failed to fetch receivables:", err);
            error.value = err.message || "Failed to load receivables";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل سجل الذمم المدينة");
        } finally {
            loading.value = false;
        }
    }

    async function getClientReceivables(clientId) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/receivables/client/${clientId}`);
            clientDetails.value = response.data;
            return response.data;
        } catch (err) {
            console.error("Failed to fetch client receivables:", err);
            error.value = err.message || "Failed to load client details";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل تفاصيل حساب العميل");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function recordPayment(payload) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/receivables/payments", payload, false);
            toastStore.addSuccessToast("تم تسجيل الدفعة بنجاح");
            await fetchReceivables();
            if (clientDetails.value && clientDetails.value.clientId === payload.clientId) {
                await getClientReceivables(payload.clientId);
            }
            return response.data;
        } catch (err) {
            console.error("Failed to record payment:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تسجيل الدفعة";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل الدفعة");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        receivables,
        clientDetails,
        loading,
        error,
        fetchReceivables,
        getClientReceivables,
        recordPayment,
    };
});
