import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useUnitStore = defineStore("unit", () => {
    const units = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    async function fetchUnits() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Units");
            units.value = response.data || [];
        } catch (err) {
            console.error("Failed to fetch units:", err);
            error.value = err.message || "Failed to load units";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل الوحدات");
        } finally {
            loading.value = false;
        }
    }

    async function createUnit(data) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/Units", data, false);
            toastStore.addSuccessToast("تم إضافة الوحدة بنجاح");
            await fetchUnits();
            return response.data;
        } catch (err) {
            console.error("Failed to create unit:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إضافة الوحدة";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateUnit(id, data) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiPut(`/Units/${id}`, data, false);
            toastStore.addSuccessToast("تم تعديل الوحدة بنجاح");
            await fetchUnits();
            return response.data;
        } catch (err) {
            console.error("Failed to update unit:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعديل الوحدة";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function deleteUnit(id) {
        loading.value = true;
        error.value = null;
        try {
            await apiDelete(`/Units/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف الوحدة بنجاح");
            await fetchUnits();
        } catch (err) {
            console.error("Failed to delete unit:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف الوحدة";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        units,
        loading,
        error,
        fetchUnits,
        createUnit,
        updateUnit,
        deleteUnit
    };
});
