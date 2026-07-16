import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useDamageStore = defineStore("damage", () => {
    const damagesList = ref([]);
    const stats = ref({
        todayTotalLoss: 0,
        monthlyTotalLoss: 0,
        yearlyTotalLoss: 0
    });
    const isLoading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    async function fetchDamages(params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Damages", { params });
            damagesList.value = response.data || [];
        } catch (err) {
            console.error("Failed to fetch damages:", err);
            error.value = err.message || "Failed to load damages";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل سجل التوالف");
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchDamageStats() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Damages/stats");
            stats.value = response.data || {
                todayTotalLoss: 0,
                monthlyTotalLoss: 0,
                yearlyTotalLoss: 0
            };
        } catch (err) {
            console.error("Failed to fetch damage stats:", err);
            error.value = err.message || "Failed to load damage stats";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل إحصائيات التوالف");
        } finally {
            isLoading.value = false;
        }
    }

    async function addDamage(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Damages", payload, false);
            toastStore.addSuccessToast("تم تسجيل التالف بنجاح");
            
            // Refresh damages list and stats
            await fetchDamages();
            await fetchDamageStats();
            
            return response.data;
        } catch (err) {
            console.error("Failed to add damage:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.message || "حدث خطأ أثناء تسجيل التالف";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل التالف");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        damagesList,
        stats,
        isLoading,
        error,
        fetchDamages,
        fetchDamageStats,
        addDamage,
    };
});
