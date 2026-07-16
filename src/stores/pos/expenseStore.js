import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useExpenseStore = defineStore("expense", () => {
    // Required State
    const expensesList = ref([]);
    const expenseStats = ref({});
    const isLoading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    // 1. fetchExpenses (GET /api/Expenses)
    async function fetchExpenses(params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Expenses", { params });
            expensesList.value = response.data || [];
            return response.data;
        } catch (err) {
            console.error("Failed to fetch expenses:", err);
            error.value = err.message || "Failed to load expenses";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل المصروفات");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 2. addExpense (POST /api/Expenses)
    async function addExpense(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Expenses", payload, false);
            toastStore.addSuccessToast("تم تسجيل المصروف بنجاح");
            
            // Reactivity: Refresh lists and stats
            await Promise.all([
                fetchExpenses(),
                fetchExpenseStats()
            ]);
            
            return response.data;
        } catch (err) {
            console.error("Failed to add expense:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء تسجيل المصروف";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل المصروف");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 3. fetchExpenseStats (GET /api/Expenses/stats)
    async function fetchExpenseStats() {
        // Can fail silently to avoid blocking the main view if stats aren't needed yet
        try {
            const response = await apiGet("/Expenses/stats");
            expenseStats.value = response.data || {};
            return response.data;
        } catch (err) {
            console.error("Failed to fetch expense stats:", err);
            // Don't throw or show toast here unless specifically required by the UI
            return null;
        }
    }

    // Aliases for compatibility with older UI components
    const expenses = expensesList;
    const loading = isLoading;
    const logExpense = addExpense;

    return {
        // State
        expensesList,
        expenseStats,
        isLoading,
        error,
        
        // Aliases
        expenses,
        loading,

        // Actions
        fetchExpenses,
        addExpense,
        fetchExpenseStats,

        // Aliased actions
        logExpense
    };
});
