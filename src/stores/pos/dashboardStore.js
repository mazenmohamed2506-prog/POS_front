import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useDashboardStore = defineStore("dashboard", () => {
    // Top-level stats
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

    const outstandingBalance = ref(0);
    const totalPaidSuppliers = ref(0);
    const totalUnpaidPurchases = ref(0);
    const totalPartiallyPaidPurchases = ref(0);
    const suppliersOutstandingBalances = ref([]);

    const isLoading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    // Active date filter – null means "all time"
    const dateFilter = ref({ startDate: null, endDate: null });

    const handleError = (err, defaultMsg) => {
        console.error(defaultMsg, err);
        error.value = err.message || defaultMsg;
        toastStore.addErrorToast(defaultMsg);
    };

    async function fetchStats(startDate = null, endDate = null) {
        isLoading.value = true;
        error.value = null;
        dateFilter.value = { startDate, endDate };

        try {
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await apiGet("/Dashboard/stats", { params });
            if (response.data) {
                stats.value = {
                    ...stats.value,
                    ...response.data
                };
            }
        } catch (err) {
            handleError(err, "حدث خطأ أثناء تحميل إحصائيات لوحة التحكم");
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchOutstandingBalance() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Dashboard/outstanding-balance");
            // API might return an object like { totalOutstandingBalance: 123 } or just a number
            outstandingBalance.value = response.data?.totalOutstandingBalance ?? response.data ?? 0;
        } catch (err) {
            handleError(err, "حدث خطأ أثناء تحميل إجمالي الرصيد المستحق");
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchTotalPaidSuppliers() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Dashboard/total-paid-suppliers");
            totalPaidSuppliers.value = response.data?.totalPaidToSuppliers ?? response.data ?? 0;
        } catch (err) {
            handleError(err, "حدث خطأ أثناء تحميل إجمالي المدفوع للموردين");
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchTotalUnpaidPurchases() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Dashboard/total-unpaid-purchases");
            totalUnpaidPurchases.value = response.data?.totalUnpaidPurchases ?? response.data ?? 0;
        } catch (err) {
            handleError(err, "حدث خطأ أثناء تحميل إجمالي المشتريات غير المدفوعة");
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchTotalPartiallyPaidPurchases() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Dashboard/total-partially-paid-purchases");
            totalPartiallyPaidPurchases.value = response.data?.totalPartiallyPaidPurchases ?? response.data ?? 0;
        } catch (err) {
            handleError(err, "حدث خطأ أثناء تحميل إجمالي المشتريات المدفوعة جزئياً");
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchSuppliersOutstandingBalances() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Dashboard/suppliers-outstanding-balances");
            suppliersOutstandingBalances.value = response.data || [];
        } catch (err) {
            handleError(err, "حدث خطأ أثناء تحميل أرصدة الموردين المستحقة");
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchAllDashboardMetrics(startDate = null, endDate = null) {
        isLoading.value = true;
        error.value = null;

        const results = await Promise.allSettled([
            fetchStats(startDate, endDate),
            fetchOutstandingBalance(),
            fetchTotalPaidSuppliers(),
            fetchTotalUnpaidPurchases(),
            fetchTotalPartiallyPaidPurchases(),
            fetchSuppliersOutstandingBalances()
        ]);

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.warn("Some dashboard metrics failed to load", failures);
        }

        isLoading.value = false;
    }

    function clearFilter() {
        fetchAllDashboardMetrics(null, null);
    }

    return {
        stats,
        outstandingBalance,
        totalPaidSuppliers,
        totalUnpaidPurchases,
        totalPartiallyPaidPurchases,
        suppliersOutstandingBalances,
        isLoading,
        error,
        dateFilter,
        fetchStats,
        fetchOutstandingBalance,
        fetchTotalPaidSuppliers,
        fetchTotalUnpaidPurchases,
        fetchTotalPartiallyPaidPurchases,
        fetchSuppliersOutstandingBalances,
        fetchAllDashboardMetrics,
        clearFilter
    };
});
