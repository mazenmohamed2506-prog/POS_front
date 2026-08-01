import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useShiftStore = defineStore("shift", () => {
    const currentShift = ref(null);
    const shifts = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    function mapApiShiftToFrontend(apiShift) {
        if (!apiShift) return null;
        return {
            id: apiShift.id,
            cashier: apiShift.username,
            openedAt: apiShift.startTime,
            closedAt: apiShift.endTime,
            startingCash: apiShift.startingCash,
            totalSales: apiShift.cashSales, // CashSales represents the total sales in cash for shift
            totalExpenses: apiShift.totalExpenses || 0,
            totalCollections: apiShift.totalCashCollections || 0,
            expectedCash: apiShift.expectedCash !== undefined ? apiShift.expectedCash : (apiShift.startingCash + apiShift.cashSales),
            actualCash: apiShift.actualCash,
            variance: apiShift.difference,
            status: apiShift.status
        };
    }

    async function fetchCurrentShift() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Shift/current");
            currentShift.value = mapApiShiftToFrontend(response.data);
        } catch (err) {
            if (err.response?.status === 404) {
                currentShift.value = null;
            } else {
                console.error("Failed to fetch current shift:", err);
                error.value = err.message || "Failed to load current shift";
            }
        } finally {
            loading.value = false;
        }
    }

    async function fetchAllShifts() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Shift");
            const rawShifts = response.data || [];
            shifts.value = rawShifts.map(mapApiShiftToFrontend);
        } catch (err) {
            console.error("Failed to fetch shifts:", err);
            error.value = err.message || "Failed to load shifts";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل سجل الورديات");
        } finally {
            loading.value = false;
        }
    }

    async function getShiftById(id) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Shift/${id}`);
            return mapApiShiftToFrontend(response.data);
        } catch (err) {
            console.error("Failed to fetch shift:", err);
            error.value = err.message || "Failed to load shift";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function openShift(startingCashVal) {
        loading.value = true;
        error.value = null;
        try {
            const startingCashNum = parseFloat(startingCashVal || 0);
            const payload = {
                startingCash: startingCashNum
            };
            const response = await apiPost("/Shift/open", payload, false);
            currentShift.value = mapApiShiftToFrontend(response.data);
            toastStore.addSuccessToast(`تم فتح وردية جديدة بمبلغ رصيد بداية ${startingCashNum} ج.م بنجاح`, "فتح وردية جديدة");
            return currentShift.value;
        } catch (err) {
            console.error("Failed to open shift:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء فتح الوردية";
            toastStore.addErrorToast(`السبب: ${detail}`, "فشل فتح الوردية");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function closeShift(actualCashVal) {
        loading.value = true;
        error.value = null;
        try {
            const actualCashNum = parseFloat(actualCashVal || 0);
            const payload = {
                actualCash: actualCashNum
            };
            const response = await apiPost("/Shift/close", payload, false);
            const closedShift = mapApiShiftToFrontend(response.data);
            currentShift.value = null;
            toastStore.addSuccessToast(`تم إغلاق الوردية الحالية وتسليم النقدية الفعلية بقيمة ${actualCashNum} ج.م بنجاح`, "إغلاق الوردية");
            return closedShift;
        } catch (err) {
            console.error("Failed to close shift:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إغلاق الوردية";
            toastStore.addErrorToast(`السبب: ${detail}`, "فشل إغلاق الوردية");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        currentShift,
        shifts,
        loading,
        error,
        fetchCurrentShift,
        fetchAllShifts,
        getShiftById,
        openShift,
        closeShift
    };
});

