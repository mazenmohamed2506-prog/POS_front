import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useSupplierStore = defineStore("supplier", () => {
    const suppliers = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    function mapApiSupplierToFrontend(apiSupplier) {
        return {
            id: apiSupplier.id,
            name: apiSupplier.name || "",
            phone: apiSupplier.phone || "",
            email: apiSupplier.email || "",
            address: apiSupplier.address || "",
            taxNumber: apiSupplier.taxNumber || "",
            notes: apiSupplier.notes || "",
        };
    }

    async function fetchSuppliers() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Suppliers");
            const rawSuppliers = response.data || [];
            suppliers.value = rawSuppliers.map(mapApiSupplierToFrontend);
        } catch (err) {
            console.error("Failed to fetch suppliers:", err);
            error.value = err.message || "Failed to load suppliers";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل الموردين");
        } finally {
            loading.value = false;
        }
    }

    async function getSupplierById(id) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Suppliers/${id}`);
            return response.data ? mapApiSupplierToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to fetch supplier:", err);
            error.value = err.message || "Failed to load supplier";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function createSupplier(supplierData) {
        loading.value = true;
        error.value = null;
        try {
            const payload = {
                name: supplierData.name,
                phone: supplierData.phone || null,
                email: supplierData.email || null,
                address: supplierData.address || null,
                taxNumber: supplierData.taxNumber || null,
                notes: supplierData.notes || null,
            };

            await apiPost("/Suppliers", payload, false);
            toastStore.addSuccessToast("تم إضافة المورد بنجاح");
            await fetchSuppliers();
        } catch (err) {
            console.error("Failed to create supplier:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إضافة المورد";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء إضافة المورد");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateSupplier(id, supplierData) {
        loading.value = true;
        error.value = null;
        try {
            const payload = {
                name: supplierData.name,
                phone: supplierData.phone || null,
                email: supplierData.email || null,
                address: supplierData.address || null,
                taxNumber: supplierData.taxNumber || null,
                notes: supplierData.notes || null,
            };

            await apiPut(`/Suppliers/${id}`, payload, false);
            toastStore.addSuccessToast("تم تعديل المورد بنجاح");
            await fetchSuppliers();
        } catch (err) {
            console.error("Failed to update supplier:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعديل المورد";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تعديل المورد");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function deleteSupplier(id) {
        loading.value = true;
        error.value = null;
        try {
            await apiDelete(`/Suppliers/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف المورد بنجاح");
            await fetchSuppliers();
        } catch (err) {
            console.error("Failed to delete supplier:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف المورد";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء حذف المورد");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        suppliers,
        loading,
        error,
        fetchSuppliers,
        getSupplierById,
        createSupplier,
        updateSupplier,
        deleteSupplier,
    };
});
