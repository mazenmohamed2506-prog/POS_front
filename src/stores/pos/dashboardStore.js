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

    // Active date filter – null means "all time"
    const dateFilter = ref({ startDate: null, endDate: null });

    async function fetchStats(startDate = null, endDate = null) {
        loading.value = true;
        error.value = null;

        // Persist the active filter so the view can display it
        dateFilter.value = { startDate, endDate };

        try {
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate)   params.endDate   = endDate;

            const response = await apiGet("/Dashboard/stats", { params });
            stats.value = response.data || stats.value;
        } catch (err) {
            console.error("Failed to fetch dashboard stats:", err);
            error.value = err.message || "Failed to load dashboard stats";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل إحصائيات لوحة التحكم");
        } finally {
            loading.value = false;
        }
    }

    function clearFilter() {
        fetchStats(null, null);
    }

    return {
        stats,
        loading,
        error,
        dateFilter,
        fetchStats,
        clearFilter
    };
});
