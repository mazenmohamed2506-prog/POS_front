import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const usePayrollStore = defineStore("payroll", () => {
    // Required State
    const employees = ref([]);
    const slips = ref([]);
    const employeeSlips = ref([]);
    const isLoading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    // 1. fetchEmployees (GET /api/Payroll/employees)
    async function fetchEmployees(params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Payroll/employees", { params });
            employees.value = response.data || [];
            return response.data;
        } catch (err) {
            console.error("Failed to fetch employees:", err);
            error.value = err.message || "Failed to load employees";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل بيانات الموظفين");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 2. addEmployee (POST /api/Payroll/employees)
    async function addEmployee(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Payroll/employees", payload, false);
            toastStore.addSuccessToast("تم تسجيل الموظف بنجاح");
            
            // Reactivity: Refresh employees list
            await fetchEmployees();
            
            return response.data;
        } catch (err) {
            console.error("Failed to add employee:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء تسجيل الموظف";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل الموظف");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 3. generateObligations (POST /api/Payroll/generate-obligations)
    async function generateObligations() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Payroll/generate-obligations", {}, false);
            toastStore.addSuccessToast("تم توليد التزامات الرواتب بنجاح");
            
            // Reactivity: Refresh slips list
            await fetchSlips();
            
            return response.data;
        } catch (err) {
            console.error("Failed to generate obligations:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء توليد التزامات الرواتب";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء توليد التزامات الرواتب");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 4. processPayment (POST /api/Payroll/payments)
    async function processPayment(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Payroll/payments", payload, false);
            toastStore.addSuccessToast("تم تسجيل الدفعة بنجاح");
            
            // Reactivity: Refresh slips list
            await fetchSlips();
            
            return response.data;
        } catch (err) {
            console.error("Failed to process payment:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء تسجيل الدفعة";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل الدفعة");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 5. fetchSlips (GET /api/Payroll/slips)
    async function fetchSlips(params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Payroll/slips", { params });
            slips.value = response.data || [];
            return response.data;
        } catch (err) {
            console.error("Failed to fetch salary slips:", err);
            error.value = err.message || "Failed to load salary slips";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل قسائم الرواتب");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 6. fetchEmployeeSlips (GET /api/Payroll/employees/{id}/slips)
    async function fetchEmployeeSlips(employeeId) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Payroll/employees/${employeeId}/slips`);
            employeeSlips.value = response.data || [];
            return response.data;
        } catch (err) {
            console.error("Failed to fetch employee salary slips:", err);
            error.value = err.message || "Failed to load employee salary slips";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل قسائم راتب الموظف");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Aliases for compatibility with older UI components
    const salaries = slips;
    const loading = isLoading;
    const fetchSalaries = fetchSlips;
    const logSalary = processPayment; // Old API used to expect similar logging payload

    return {
        // State
        employees,
        slips,
        employeeSlips,
        isLoading,
        error,
        
        // Aliases
        salaries,
        loading,

        // Actions
        fetchEmployees,
        addEmployee,
        generateObligations,
        processPayment,
        fetchSlips,
        fetchEmployeeSlips,

        // Aliased actions
        fetchSalaries,
        logSalary
    };
});
