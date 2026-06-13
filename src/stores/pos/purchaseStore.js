import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useProductStore } from "./productStore";
import { useToastStore } from "@/stores/base/toastStore";

export const usePurchaseStore = defineStore("purchase", () => {
    const purchases = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();
    const productStore = useProductStore();

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

    async function addPurchase(supplierData, items) {
        loading.value = true;
        error.value = null;
        try {
            // Fetch products first to have the latest lookup cache
            await productStore.fetchProducts();

            const itemsPayload = [];
            for (const item of items) {
                let pId = item.productId;
                if (!pId && item.productName) {
                    // Search by name
                    const matched = productStore.products.find(
                        p => p.name.toLowerCase().trim() === item.productName.toLowerCase().trim()
                    );
                    if (matched) {
                        pId = matched.id;
                    } else {
                        // Create product dynamically on C# backend
                        const barcode = `628100${Date.now() + Math.floor(Math.random() * 1000)}`;
                        const newProd = await productStore.createProduct({
                            name: item.productName,
                            category: "عام",
                            barcode: barcode,
                            price: Math.ceil(item.cost * 1.3), // 30% markup
                            cost: item.cost,
                            trackExpiration: true,
                            trackSerialNumber: false,
                            isActive: true,
                            units: [{ name: "قطعة", factor: 1, barcode: barcode }]
                        });
                        if (newProd && newProd.id) {
                            pId = newProd.id;
                        } else {
                            throw new Error(`Failed to auto-create product: ${item.productName}`);
                        }
                    }
                }

                if (!pId) {
                    throw new Error("يجب تحديد منتج صالح");
                }

                itemsPayload.push({
                    productId: pId,
                    quantity: item.qty || 1,
                    costPrice: item.cost || 0,
                    batchNumber: `BATCH-${Date.now()}`, // Generate standard batch
                    expirationDate: null
                });
            }

            const payload = {
                supplierName: supplierData.supplier || "مورد عام",
                items: itemsPayload
            };

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

