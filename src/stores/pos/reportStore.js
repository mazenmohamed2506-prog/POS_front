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

    function formatParamDate(val, isEnd = false) {
        if (!val) return null;
        if (typeof val === 'string') {
            const clean = val.split('T')[0];
            return isEnd ? `${clean}T23:59:59` : `${clean}T00:00:00`;
        }
        if (val instanceof Date) {
            const yyyy = val.getFullYear();
            const mm = String(val.getMonth() + 1).padStart(2, '0');
            const dd = String(val.getDate()).padStart(2, '0');
            return isEnd ? `${yyyy}-${mm}-${dd}T23:59:59` : `${yyyy}-${mm}-${dd}T00:00:00`;
        }
        return val;
    }

    // Helper function for DRYness
    async function fetchReportData(endpoint, stateRef, params = {}, errorMessage = "حدث خطأ أثناء تحميل التقرير") {
        isLoading.value = true;
        error.value = null;
        try {
            const cleanParams = {};
            for (const [key, val] of Object.entries(params || {})) {
                if (val !== null && val !== undefined && val !== "") {
                    if (key.toLowerCase().includes('startdate')) {
                        cleanParams[key] = formatParamDate(val, false);
                    } else if (key.toLowerCase().includes('enddate')) {
                        cleanParams[key] = formatParamDate(val, true);
                    } else {
                        cleanParams[key] = val;
                    }
                }
            }
            const response = await apiGet(endpoint, { params: cleanParams });
            stateRef.value = response.data;
            return response.data;
        } catch (err) {
            console.error(`Failed to fetch report from ${endpoint}:`, err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.message || errorMessage;
            error.value = detail;
            toastStore.addErrorToast(typeof detail === 'string' ? detail : errorMessage);
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
