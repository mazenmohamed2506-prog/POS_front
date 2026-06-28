import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const usePurchaseStore = defineStore("purchase", () => {
    const purchases = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    function mapApiPurchaseToFrontend(apiPur) {
        return {
            id: apiPur.id,
            invoiceNumber: `PUR-${apiPur.id}`,
            supplier: apiPur.supplierName,
            date: apiPur.invoiceDate,
            total: apiPur.totalAmount,
            status: "received",
            items: (apiPur.items || []).map(i => ({
                id: i.id,
                productId: i.productId,
                productName: i.productName,
                qty: i.quantity,
                cost: i.costPrice,
                batchNumber: i.batchNumber || null,
                expirationDate: i.expirationDate || null,
            }))
        };
    }

    async function fetchPurchases() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Purchases");
            const rawPurchases = response.data || [];
            purchases.value = rawPurchases.map(mapApiPurchaseToFrontend);
        } catch (err) {
            console.error("Failed to fetch purchases:", err);
            error.value = err.message || "Failed to load purchases";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل فواتير المشتريات");
        } finally {
            loading.value = false;
        }
    }

    async function addPurchase(payload) {
        loading.value = true;
        error.value = null;
        try {
            // payload should already be { supplierName: "...", items: [...] }
            // Validate items have productId
            for (const item of payload.items) {
                if (!item.productId) {
                    throw new Error("يجب تحديد منتج صالح لكل صنف");
                }
                // Ensure required numeric fields
                item.quantity = item.quantity || 1;
                item.costPrice = item.costPrice || 0;
                item.batchNumber = item.batchNumber || `BATCH-${Date.now()}`;
                // expirationDate can be null
            }

            await apiPost("/Purchases", payload, false);
            toastStore.addSuccessToast("تم إضافة فاتورة المشتريات بنجاح");
            await fetchPurchases();
        } catch (err) {
            console.error("Failed to add purchase:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.message || "حدث خطأ أثناء إضافة الفاتورة";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function getPurchaseById(id) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Purchases/${id}`);
            return response.data ? mapApiPurchaseToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to fetch purchase:", err);
            error.value = err.message || "Failed to load purchase";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        purchases,
        loading,
        error,
        fetchPurchases,
        addPurchase,
        getPurchaseById
    };
});

