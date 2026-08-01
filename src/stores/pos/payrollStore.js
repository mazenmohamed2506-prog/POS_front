import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const usePayrollStore = defineStore("payroll", () => {
    const employees = ref([]);
    const slips = ref([]);
    const employeeSlips = ref([]);
    const payments = ref([]);
    const adjustments = ref([]);
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

    // 2b. updateEmployee (PUT /api/Payroll/employees/{id})
    async function updateEmployee(id, payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPut(`/Payroll/employees/${id}`, payload, false);
            toastStore.addSuccessToast("تم تحديث بيانات الموظف بنجاح");
            
            // Reactivity: Refresh employees list
            await fetchEmployees();
            
            return response.data;
        } catch (err) {
            console.error("Failed to update employee:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء تحديث بيانات الموظف";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تحديث بيانات الموظف");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 3. generateObligations (POST /api/Payroll/generate-obligations?month=X&year=Y)
    async function generateObligations(month, year) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost(`/Payroll/generate-obligations?month=${month}&year=${year}`, {}, false);
            toastStore.addSuccessToast("تم توليد التزامات الرواتب بنجاح");
            
            // Reactivity: Refresh slips list for the same month
            await fetchSlips(month, year);
            
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

    // 4. processPayment (POST /api/Payroll/direct-payment) — direct payment by employeeId
    async function processPayment(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Payroll/direct-payment", payload, false);
            toastStore.addSuccessToast("تم تسجيل الدفعة بنجاح");
            
            // Reactivity: Refresh payments list
            await fetchPayments();
            
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

    // 4b. recordSlipPayment (POST /api/Payroll/payments) — payment against a specific salarySlipId
    async function recordSlipPayment(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Payroll/payments", payload, false);
            toastStore.addSuccessToast("تم تسجيل الدفعة على القسيمة بنجاح");
            
            // Reactivity: Refresh slips and payments
            await fetchPayments();
            
            return response.data;
        } catch (err) {
            console.error("Failed to record slip payment:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء تسجيل الدفعة";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل الدفعة");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 5. fetchSlips (GET /api/Payroll/slips?month=X&year=Y)
    async function fetchSlips(month, year) {
        isLoading.value = true;
        error.value = null;
        try {
            const params = {};
            if (month) params.month = month;
            if (year) params.year = year;
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

    // 7. fetchPayments (GET /api/Payroll/payments)
    async function fetchPayments(params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Payroll/payments", { params });
            payments.value = response.data || [];
            return response.data;
        } catch (err) {
            console.error("Failed to fetch salary payments:", err);
            error.value = err.message || "Failed to load salary payments";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل سجل المدفوعات");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 8. Adjustments Actions (GET, POST, DELETE /api/Payroll/adjustments)
    async function fetchAdjustments(params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Payroll/adjustments", { params });
            adjustments.value = response.data || [];
            return response.data;
        } catch (err) {
            console.error("Failed to fetch adjustments:", err);
            error.value = err.message || "Failed to load adjustments";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل التعديلات (السلف/الخصومات/البونص)");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function addAdjustment(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Payroll/adjustments", payload, false);
            toastStore.addSuccessToast("تم تسجيل التعديل بنجاح");
            
            // Refresh adjustments
            await fetchAdjustments();
            return response.data;
        } catch (err) {
            console.error("Failed to add adjustment:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء تسجيل التعديل";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل التعديل");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    async function deleteAdjustment(id) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiDelete(`/Payroll/adjustments/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف التعديل بنجاح");
            
            await fetchAdjustments();
            return response.data;
        } catch (err) {
            console.error("Failed to delete adjustment:", err);
            toastStore.addErrorToast("حدث خطأ أثناء حذف التعديل");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Aliases for compatibility with older UI components
    const salaries = payments;
    const loading = isLoading;
    const fetchSalaries = fetchPayments;
    const logSalary = processPayment;

    return {
        // State
        employees,
        slips,
        employeeSlips,
        payments,
        adjustments,
        isLoading,
        error,
        
        // Aliases
        salaries,
        loading,

        // Actions
        fetchEmployees,
        addEmployee,
        updateEmployee,
        generateObligations,
        processPayment,
        recordSlipPayment,
        fetchSlips,
        fetchEmployeeSlips,
        fetchPayments,
        fetchAdjustments,
        addAdjustment,
        deleteAdjustment,

        // Aliased actions
        fetchSalaries,
        logSalary
    };
});
