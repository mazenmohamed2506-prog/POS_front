import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useProductStore } from "./productStore";
import { useToastStore } from "@/stores/base/toastStore";

export const useInventoryStore = defineStore("inventory", () => {
    // Required State
    const inventoryItems = ref([]);
    const currentItem = ref(null);
    const workflowData = ref(null);
    const explanations = ref({});
    const isLoading = ref(false);
    const error = ref(null);

    // Existing State to preserve UI KPIs
    const stats = ref({
        totalUnits: 0,
        healthyStock: 0,
        lowStock: 0,
        outOfStock: 0,
        expiringSoon: 0,
        expired: 0
    });

    const toastStore = useToastStore();
    const productStore = useProductStore();

    function processApiInventory(rawInventory, productsList) {
        return rawInventory.map(item => {
            const matchedProduct = productsList.find(p => p.id === item.productId);
            return {
                ...item,
                productName: item.productName || matchedProduct?.name || '',
                isActive: item.productIsActive ?? true
            };
        });
    }

    // 1. fetchInventory (GET /api/Inventory)
    async function fetchInventory(filters = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            if (productStore.products.length === 0) {
                await productStore.fetchProducts();
            }

            const params = {};
            if (filters.productStatus !== undefined && filters.productStatus !== null) {
                params.productStatus = filters.productStatus;
            }

            const response = await apiGet("/Inventory", { params });

            const rawInventory = Array.isArray(response.data)
                ? response.data
                : (response.data?.stocks || []);

            if (response.data && !Array.isArray(response.data) && response.data.stats) {
                stats.value = response.data.stats;
            }

            inventoryItems.value = processApiInventory(rawInventory, productStore.products);
        } catch (err) {
            console.error("Failed to fetch inventory:", err);
            error.value = err.message || "Failed to load inventory";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل المخزون");
        } finally {
            isLoading.value = false;
        }
    }

    // 2. fetchInventoryById (GET /api/Inventory/{id})
    async function fetchInventoryById(id) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Inventory/${id}`);
            currentItem.value = response.data;
            return response.data;
        } catch (err) {
            console.error("Failed to fetch inventory item:", err);
            error.value = err.message || "Failed to load inventory item";
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 3. addInventory (POST /api/Inventory)
    async function addInventory(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            await apiPost("/Inventory", payload, false);
            toastStore.addSuccessToast("تم إضافة المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to add inventory:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إضافة المخزون";
            error.value = detail;
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Alias for existing UI components until updated
    async function addInventoryStock(payload) {
        return await addInventory(payload);
    }

    // 4. updateInventory (PUT /api/Inventory/{id})
    async function updateInventory(id, payload) {
        isLoading.value = true;
        error.value = null;
        try {
            await apiPut(`/Inventory/${id}`, payload, false);
            toastStore.addSuccessToast("تم تعديل المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to update inventory:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعديل المخزون";
            error.value = detail;
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 5. deleteInventory (DELETE /api/Inventory/{id})
    async function deleteInventory(id) {
        isLoading.value = true;
        error.value = null;
        try {
            await apiDelete(`/Inventory/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to delete inventory:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف المخزون";
            error.value = detail;
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 6. transferInventory (POST /api/Inventory/transfer)
    async function transferInventory(productId, quantity, fromLocation = "BackWarehouse", toLocation = "StoreShelf", inventoryStockId = null) {
        isLoading.value = true;
        error.value = null;
        try {
            // Support passing payload directly or distinct args
            const payload = typeof productId === 'object' ? productId : {
                productId,
                quantity,
                fromLocation,
                toLocation,
                inventoryStockId
            };
            
            await apiPost("/Inventory/transfer", payload, false);
            toastStore.addSuccessToast("تم نقل المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to transfer stock:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء نقل المخزون";
            error.value = detail;
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Alias for backward compatibility
    async function transferStock(...args) {
        return await transferInventory(...args);
    }

    // 7. receiveManagerInventory (POST /api/manager/inventory/receive)
    async function receiveManagerInventory(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            await apiPost("/manager/inventory/receive", payload, false);
            toastStore.addSuccessToast("تم استلام المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to receive inventory:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء استلام المخزون";
            error.value = detail;
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 8. fetchReceivingWorkflow (GET /api/Inventory/receiving-workflow)
    async function fetchReceivingWorkflow() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Inventory/receiving-workflow");
            workflowData.value = response.data;
            return response.data;
        } catch (err) {
            console.error("Failed to fetch receiving workflow:", err);
            error.value = err.message || "Failed to load receiving workflow";
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 9. fetchExplanation (GET /api/Inventory/explanation)
    async function fetchExplanation() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Inventory/explanation");
            explanations.value.general = response.data;
            return response.data;
        } catch (err) {
            console.error("Failed to fetch explanation:", err);
            error.value = err.message || "Failed to fetch explanation";
            return null;
        } finally {
            isLoading.value = false;
        }
    }

    // Alias for backward compatibility
    async function fetchInventoryExplanation() {
        return await fetchExplanation();
    }

    // 10. fetchConversionExplanation (GET /api/Inventory/explain-conversion/{productId})
    async function fetchConversionExplanation(productId) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Inventory/explain-conversion/${productId}`);
            explanations.value[productId] = response.data;
            return response.data;
        } catch (err) {
            console.error("Failed to fetch conversion explanation:", err);
            error.value = err.message || "Failed to fetch conversion explanation";
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Export compatibility aliases
    const loading = isLoading;
    const inventory = inventoryItems;

    return {
        // State
        inventoryItems,
        inventory,
        currentItem,
        workflowData,
        explanations,
        isLoading,
        loading,
        error,
        stats,

        // Actions
        fetchInventory,
        fetchInventoryById,
        addInventory,
        addInventoryStock,
        updateInventory,
        deleteInventory,
        transferInventory,
        transferStock,
        receiveManagerInventory,
        fetchReceivingWorkflow,
        fetchExplanation,
        fetchInventoryExplanation,
        fetchConversionExplanation
    };
});
