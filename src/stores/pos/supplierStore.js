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

    async function fetchSupplierBalance(supplierId) {
        try {
            const response = await apiGet(`/suppliers/${supplierId}/balance`);
            return response.data; // { totalPurchases, totalPaid, remainingBalance }
        } catch (err) {
            console.error("Failed to fetch supplier balance:", err);
            return null;
        }
    }

    async function getSupplierById(id) {
        loading.value = true;
        error.value = null;
        try {
            const [supplierRes, balanceData] = await Promise.all([
                apiGet(`/Suppliers/${id}`).catch(err => {
                    console.error("Failed to fetch supplier main details:", err);
                    return { data: null };
                }),
                fetchSupplierBalance(id)
            ]);

            const responseData = supplierRes.data;

            if (responseData && responseData.supplier) {
                const finSummary = {
                    ...(responseData.financialSummary || {}),
                    ...(balanceData || {})
                };
                return {
                    supplier: mapApiSupplierToFrontend(responseData.supplier),
                    financialSummary: finSummary,
                    outstandingBalance: balanceData?.remainingBalance ?? responseData.outstandingBalance ?? 0,
                    purchases: responseData.purchases || [],
                    paymentHistory: responseData.paymentHistory || []
                };
            }

            const supplierData = responseData ? mapApiSupplierToFrontend(responseData) : { id, name: "" };
            const finSummary = balanceData || {
                totalPurchases: responseData?.totalPurchases || 0,
                totalPaid: responseData?.totalPaid || 0,
                remainingBalance: responseData?.remainingBalance || responseData?.outstandingBalance || 0
            };

            return {
                supplier: supplierData,
                financialSummary: finSummary,
                outstandingBalance: finSummary.remainingBalance ?? 0,
                purchases: responseData?.purchases || [],
                paymentHistory: responseData?.paymentHistory || []
            };
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


    async function recordPayment(paymentData) {
        loading.value = true;
        error.value = null;
        try {
            await apiPost("/suppliers/payments", paymentData, false);
            toastStore.addSuccessToast("تم تسجيل الدفعة بنجاح");
            await fetchSuppliers();
        } catch (err) {
            console.error("Failed to record payment:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تسجيل الدفعة";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل الدفعة");
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
        fetchSupplierBalance,
        createSupplier,
        updateSupplier,
        deleteSupplier,
        recordPayment,
    };
});
