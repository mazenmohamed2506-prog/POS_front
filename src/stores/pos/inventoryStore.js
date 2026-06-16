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
        const grouped = {};
        
        rawInventory.forEach(item => {
            const pId = item.productId;
            const batchNum = item.batchNumber || '';
            const key = `${pId}_${batchNum}`;
            
            if (!grouped[key]) {
                grouped[key] = {
                    id: key,
                    productId: pId,
                    productName: item.productName || '',
                    sku: `PROD-${pId}`,
                    batchNumber: batchNum || '—',
                    shelfStock: 0,
                    warehouseStock: 0,
                    shelfStockId: null,
                    warehouseStockId: null,
                    unit: "قطعة",
                };
            }
            
            if (item.location === "StoreShelf") {
                grouped[key].shelfStock += item.quantity;
                grouped[key].shelfStockId = item.id;
            } else if (item.location === "BackWarehouse") {
                grouped[key].warehouseStock += item.quantity;
                grouped[key].warehouseStockId = item.id;
            }
            
            // Try to match SKU or Unit from productStore if available
            const matchedProduct = productsList.find(p => p.id === pId);
            if (matchedProduct) {
                grouped[key].sku = matchedProduct.sku || grouped[key].sku;
                grouped[key].unit = matchedProduct.units?.[0]?.name || grouped[key].unit;
            }
        });
        
        return Object.values(grouped);
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

    return {
        inventory,
        loading,
        error,
        fetchInventory,
        addInventory,
        getInventoryById,
        updateInventory,
        deleteInventory,
        transferStock
    };
});

