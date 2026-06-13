import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useDashboardStore = defineStore("dashboard", () => {
    const stats = ref({
        netSales: 0,
        salesCount: 0,
        returnsCount: 0,
        totalReturns: 0,
        purchasesTotal: 0,
        purchasesCount: 0,
        totalProducts: 0,
        outOfStockCount: 0,
        lowStockItems: [],
        cashSalesTotal: 0,
        cashSalesCount: 0,
        cardSalesTotal: 0,
        cardSalesCount: 0,
        recentOrders: [],
        topProducts: []
    });

    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    async function fetchStats() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Dashboard/stats");
            stats.value = response.data || stats.value;
        } catch (err) {
            console.error("Failed to fetch dashboard stats:", err);
            error.value = err.message || "Failed to load dashboard stats";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل إحصائيات لوحة التحكم");
        } finally {
            loading.value = false;
        }
    }

    return {
        stats,
        loading,
        error,
        fetchStats
    };
});
