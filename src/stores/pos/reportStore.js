import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useReportStore = defineStore("report", () => {
    // State properties for each report
    const accountsPayableData = ref(null);
    const accountsReceivableData = ref(null);
    const profitLossData = ref(null);
    const monthlyFinancialData = ref(null);
    const inventoryData = ref(null);
    const expensesData = ref(null);
    const damagesData = ref(null);
    const payrollData = ref(null);
    const stockCountsData = ref(null);

    const isLoading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    // Helper function for DRYness
    async function fetchReportData(endpoint, stateRef, params = {}, errorMessage = "حدث خطأ أثناء تحميل التقرير") {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet(endpoint, { params });
            stateRef.value = response.data;
            return response.data;
        } catch (err) {
            console.error(`Failed to fetch report from ${endpoint}:`, err);
            error.value = err.message || errorMessage;
            toastStore.addErrorToast(errorMessage);
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Actions
    function fetchAccountsPayableReport(params = {}) {
        return fetchReportData("/Reports/accounts-payable", accountsPayableData, params, "حدث خطأ أثناء تحميل تقرير حسابات الدفع");
    }

    function fetchAccountsReceivableReport(params = {}) {
        return fetchReportData("/Reports/accounts-receivable", accountsReceivableData, params, "حدث خطأ أثناء تحميل تقرير حسابات القبض");
    }

    function fetchProfitLossReport(params = {}) {
        return fetchReportData("/Reports/profit-loss", profitLossData, params, "حدث خطأ أثناء تحميل تقرير الأرباح والخسائر");
    }

    function fetchMonthlyFinancialReport(params = {}) {
        return fetchReportData("/Reports/monthly-financial", monthlyFinancialData, params, "حدث خطأ أثناء تحميل التقرير المالي الشهري");
    }

    function fetchInventoryReport(params = {}) {
        return fetchReportData("/Reports/inventory", inventoryData, params, "حدث خطأ أثناء تحميل تقرير المخزون");
    }

    function fetchExpensesReport(params = {}) {
        return fetchReportData("/Reports/expenses", expensesData, params, "حدث خطأ أثناء تحميل تقرير المصروفات");
    }

    function fetchDamagesReport(params = {}) {
        return fetchReportData("/Reports/damages", damagesData, params, "حدث خطأ أثناء تحميل تقرير التوالف");
    }

    function fetchPayrollReport(params = {}) {
        return fetchReportData("/Reports/payroll", payrollData, params, "حدث خطأ أثناء تحميل تقرير الرواتب");
    }

    function fetchStockCountsReport(params = {}) {
        return fetchReportData("/Reports/stock-counts", stockCountsData, params, "حدث خطأ أثناء تحميل تقرير جرد المخزون");
    }

    return {
        // State
        accountsPayableData,
        accountsReceivableData,
        profitLossData,
        monthlyFinancialData,
        inventoryData,
        expensesData,
        damagesData,
        payrollData,
        stockCountsData,
        isLoading,
        error,
        
        // Actions
        fetchAccountsPayableReport,
        fetchAccountsReceivableReport,
        fetchProfitLossReport,
        fetchMonthlyFinancialReport,
        fetchInventoryReport,
        fetchExpensesReport,
        fetchDamagesReport,
        fetchPayrollReport,
        fetchStockCountsReport,
    };
});
