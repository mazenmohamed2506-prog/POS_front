import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useProductStore } from "./productStore";
import { useToastStore } from "@/stores/base/toastStore";

export const useInventoryStore = defineStore("inventory", () => {
    const inventory = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();
    const productStore = useProductStore();

    function processApiInventory(rawInventory, productsList) {
        return rawInventory.map(item => {
            const matchedProduct = productsList.find(p => p.id === item.productId);
            return {
                ...item,
                productName: item.productName || matchedProduct?.name || ''
            };
        });
    }

    async function fetchInventory() {
        loading.value = true;
        error.value = null;
        try {
            // Make sure we have latest product definitions to resolve SKU / units
            if (productStore.products.length === 0) {
                await productStore.fetchProducts();
            }
            
            const response = await apiGet("/Inventory");
            const rawInventory = response.data || [];
            inventory.value = processApiInventory(rawInventory, productStore.products);
        } catch (err) {
            console.error("Failed to fetch inventory:", err);
            error.value = err.message || "Failed to load inventory";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل المخزون");
        } finally {
            loading.value = false;
        }
    }

    async function addInventory(data) {
        loading.value = true;
        error.value = null;
        try {
            await apiPost("/Inventory", data, false);
            toastStore.addSuccessToast("تم إضافة المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to add inventory:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إضافة المخزون";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function addInventoryStock(data) {
        // Alias for backwards compatibility or clarity
        return await addInventory(data);
    }

    async function getInventoryById(id) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Inventory/${id}`);
            return response.data || null;
        } catch (err) {
            console.error("Failed to fetch inventory item:", err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateInventory(id, data) {
        loading.value = true;
        error.value = null;
        try {
            await apiPut(`/Inventory/${id}`, data, false);
            toastStore.addSuccessToast("تم تعديل المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to update inventory:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعديل المخزون";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function deleteInventory(id) {
        loading.value = true;
        error.value = null;
        try {
            await apiDelete(`/Inventory/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to delete inventory:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف المخزون";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function transferStock(productId, qty, fromLocation = "BackWarehouse", toLocation = "StoreShelf", inventoryStockId = null) {
        loading.value = true;
        error.value = null;
        try {
            const payload = {
                productId: productId,
                quantity: qty,
                fromLocation: fromLocation,
                toLocation: toLocation,
                inventoryStockId: inventoryStockId
            };
            
            await apiPost("/Inventory/transfer", payload, false);
            toastStore.addSuccessToast("تم نقل المخزون بنجاح");
            await fetchInventory();
        } catch (err) {
            console.error("Failed to transfer stock:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء نقل المخزون";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function fetchInventoryExplanation() {
        try {
            const response = await apiGet("/Inventory/explanation");
            return response.data;
        } catch (err) {
            console.error("Failed to fetch inventory explanation:", err);
            return null;
        }
    }

    return {
        inventory,
        loading,
        error,
        fetchInventory,
        addInventory,
        addInventoryStock,
        getInventoryById,
        updateInventory,
        deleteInventory,
        transferStock,
        fetchInventoryExplanation
    };
});

