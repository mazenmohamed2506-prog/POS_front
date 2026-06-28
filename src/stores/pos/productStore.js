import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useProductStore = defineStore("product", () => {
    const products = ref([]);
    const categories = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    // Map API product DTO to frontend model
    function mapApiProductToFrontend(apiProd) {
        const units = apiProd.productUnits || [];
        const baseUnit = units.find(u => u.conversionFactor === 1) || units[0] || {};

        return {
            id: apiProd.id,
            name: apiProd.name,
            sku: `PROD-${apiProd.id}`, // Fallback since C# model doesn't have SKU
            barcode: baseUnit.barcode || '',
            category: apiProd.categoryName || 'عام',
            categoryId: apiProd.categoryId,
            price: baseUnit.price || 0,
            cost: baseUnit.costPrice || 0,
            sellingPrice: baseUnit.sellingPrice || baseUnit.price || 0,
            costPrice: baseUnit.costPrice || 0,
            itemDiscount: baseUnit.itemDiscount ?? 0,
            trackExpiration: apiProd.trackExpiration ?? false,
            trackSerialNumber: apiProd.trackSerialNumber ?? false,
            isActive: apiProd.isActive ?? true,
            units: units.map(u => ({
                id: u.id,
                name: u.unitName,
                barcode: u.barcode || null,
                factor: u.conversionFactor,
                price: u.price,
                sellingPrice: u.sellingPrice || u.price || 0,
                costPrice: u.costPrice || 0,
                itemDiscount: u.itemDiscount ?? 0,
                isBaseUnit: u.isBaseUnit ?? (u.conversionFactor === 1),
                unitId: u.unitId,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt
            }))
        };
    }

    async function fetchCategories() {
        try {
            const response = await apiGet("/Categories");
            categories.value = response.data || [];
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        }
    }

    async function fetchProducts() {
        loading.value = true;
        error.value = null;
        try {
            // Fetch categories first to have up to date mapping
            await fetchCategories();

            const response = await apiGet("/Products");
            const rawProducts = response.data || [];
            products.value = rawProducts.map(mapApiProductToFrontend);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            error.value = err.message || "Failed to load products";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل المنتجات");
        } finally {
            loading.value = false;
        }
    }

    // Helper to resolve category name to ID
    async function getOrCreateCategoryId(categoryName) {
        const trimmedName = (categoryName || "عام").trim();
        let cat = categories.value.find(
            c => c.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (cat) {
            return cat.id;
        }

        try {
            // Create category if it doesn't exist (disableToast = true)
            const response = await apiPost("/Categories", { name: trimmedName }, false);
            const newCat = response.data;
            if (newCat && newCat.id) {
                categories.value.push(newCat);
                return newCat.id;
            }
        } catch (err) {
            console.error("Failed to create category dynamically:", err);
        }

        // Fallback to 1 if we can't resolve/create
        return 1;
    }

    async function createProduct(product) {
        loading.value = true;
        error.value = null;
        try {
            const categoryId = await getOrCreateCategoryId(product.category);

            // Map units
            const productUnits = (product.units && product.units.length > 0)
                ? product.units.map(u => {
                    const sPrice = u.sellingPrice || u.price || (u.factor ? (product.sellingPrice || product.price) * u.factor : (product.sellingPrice || product.price));
                    const cPrice = u.costPrice || u.cost || (u.factor ? (product.costPrice || product.cost) * u.factor : (product.costPrice || product.cost));
                    return {
                        unitName: u.name || "قطعة",
                        barcode: u.barcode || product.barcode || null,
                        price: sPrice,
                        sellingPrice: sPrice,
                        costPrice: cPrice,
                        conversionFactor: u.factor || 1,
                        itemDiscount: u.itemDiscount ?? product.itemDiscount ?? 0
                    };
                })
                : [
                    {
                        unitName: "قطعة",
                        barcode: product.barcode || null,
                        price: product.sellingPrice || product.price || 0,
                        sellingPrice: product.sellingPrice || product.price || 0,
                        costPrice: product.costPrice || product.cost || 0,
                        conversionFactor: 1,
                        itemDiscount: product.itemDiscount ?? 0
                    }
                ];

            const payload = {
                name: product.name,
                categoryId: categoryId,
                trackExpiration: product.trackExpiration ?? true,
                trackSerialNumber: product.trackSerialNumber ?? false,
                isActive: product.isActive ?? true,
                productUnits: productUnits
            };

            const response = await apiPost("/Products", payload, false);
            toastStore.addSuccessToast("تم إضافة المنتج بنجاح");
            await fetchProducts();
            return response.data ? mapApiProductToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to create product:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إضافة المنتج";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateProduct(product) {
        loading.value = true;
        error.value = null;
        try {
            const categoryId = await getOrCreateCategoryId(product.category);

            // Sync units
            let productUnits = [];
            const baseSellingPrice = product.price ?? product.sellingPrice ?? 0;
            const baseCostPrice = product.cost ?? product.costPrice ?? 0;

            if (product.units && product.units.length > 0) {
                productUnits = product.units.map((u, idx) => {
                    const uSellingPrice = idx === 0
                        ? (product.price ?? product.sellingPrice ?? u.sellingPrice ?? u.price ?? 0)
                        : (u.sellingPrice ?? u.price ?? (baseSellingPrice * (u.factor || 1)));

                    const uCostPrice = idx === 0
                        ? (product.cost ?? product.costPrice ?? u.costPrice ?? u.cost ?? 0)
                        : (u.costPrice ?? u.cost ?? (baseCostPrice * (u.factor || 1)));

                    return {
                        id: u.id || 0,
                        unitName: u.name || "قطعة",
                        barcode: (idx === 0 ? (product.barcode || u.barcode) : u.barcode) || null,
                        price: uSellingPrice,
                        sellingPrice: uSellingPrice,
                        costPrice: uCostPrice,
                        conversionFactor: u.factor || 1,
                        itemDiscount: idx === 0 ? (product.itemDiscount ?? u.itemDiscount ?? 0) : (u.itemDiscount ?? 0)
                    };
                });
            } else {
                productUnits = [
                    {
                        id: 0,
                        unitName: "قطعة",
                        barcode: product.barcode || null,
                        price: baseSellingPrice,
                        sellingPrice: baseSellingPrice,
                        costPrice: baseCostPrice,
                        conversionFactor: 1,
                        itemDiscount: product.itemDiscount ?? 0
                    }
                ];
            }

            const payload = {
                name: product.name,
                categoryId: categoryId,
                trackExpiration: product.trackExpiration ?? true,
                trackSerialNumber: product.trackSerialNumber ?? false,
                isActive: product.isActive ?? true,
                productUnits: productUnits
            };

            const response = await apiPut(`/Products/${product.id}`, payload, false);
            toastStore.addSuccessToast("تم تعديل المنتج بنجاح");
            await fetchProducts();
            return response.data ? mapApiProductToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to update product:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعديل المنتج";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function deleteProduct(productId) {
        loading.value = true;
        error.value = null;
        try {
            await apiDelete(`/Products/${productId}`, {}, false);
            toastStore.addSuccessToast("تم حذف المنتج بنجاح");
            await fetchProducts();
        } catch (err) {
            console.error("Failed to delete product:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف المنتج";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function getProductById(id) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Products/${id}`);
            return response.data ? mapApiProductToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to fetch product:", err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function getCategoryById(id) {
        try {
            const response = await apiGet(`/Categories/${id}`);
            return response.data || null;
        } catch (err) {
            console.error("Failed to fetch category:", err);
            throw err;
        }
    }

    async function updateCategory(id, data) {
        try {
            await apiPut(`/Categories/${id}`, data, false);
            toastStore.addSuccessToast("تم تعديل الفئة بنجاح");
            await fetchCategories();
        } catch (err) {
            console.error("Failed to update category:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعديل الفئة";
            toastStore.addErrorToast(detail);
            throw err;
        }
    }

    async function deleteCategory(id) {
        try {
            await apiDelete(`/Categories/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف الفئة بنجاح");
            await fetchCategories();
        } catch (err) {
            console.error("Failed to delete category:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف الفئة";
            toastStore.addErrorToast(detail);
            throw err;
        }
    }

    async function fetchUnitConversions(productId) {
        loading.value = true;
        try {
            const response = await apiGet(`/Inventory/explain-conversion/${productId}`);
            return response.data;
        } catch (err) {
            console.error("Failed to fetch unit conversions:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تحميل تحويلات الوحدات";
            toastStore.addErrorToast(detail);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        products,
        categories,
        loading,
        error,
        fetchCategories,
        fetchProducts,
        createProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        getCategoryById,
        updateCategory,
        deleteCategory,
        fetchUnitConversions
    };
});

