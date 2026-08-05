import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { apiGet, apiPost, apiPut } from "@/utilities/fetchApi";
import { useBaseStore } from "@/stores/base/baseStore";
import { useAuthStore } from "@/stores/base/authStore";
import { useProductStore } from "./productStore";
import { useInventoryStore } from "./inventoryStore";
import { usePurchaseStore } from "./purchaseStore";
import { useShiftStore } from "./shiftStore";
import { useOrderStore } from "./orderStore";
import { useToastStore } from "@/stores/base/toastStore";
import {
    initialProducts,
    initialInventory,
    initialPurchases,
    initialOrders,
    initialSettings
} from "./seedData";

export const usePosStore = defineStore("pos", () => {
    // Helper to load or initialize key from localStorage
    const getLocal = (key, fallback) => {
        const value = localStorage.getItem(key);
        if (value) {
            try {
                return JSON.parse(value);
            } catch (e) {
                console.error(`Error parsing localStorage key ${key}`, e);
            }
        }
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
    };

    // ═══════════════════════════════════════════
    //  AUTH STATE
    // ═══════════════════════════════════════════
    const user = ref(JSON.parse(localStorage.getItem("posUser") || "null"));
    const role = ref(localStorage.getItem("posRole") || ""); // "Manager" | "Cashier"
    const pages = ref(JSON.parse(localStorage.getItem("posPages") || "[]")); // Array of authorized paths
    const hasValidAccessToken = () => !!localStorage.getItem("accessToken");
    const isAuthenticated = computed(() => !!user.value && hasValidAccessToken());

    // ═══════════════════════════════════════════
    //  SHIFT STATE
    // ═══════════════════════════════════════════
    const shiftStore = useShiftStore();
    const currentShift = computed(() => shiftStore.currentShift);
    const isShiftOpen = computed(() => !!shiftStore.currentShift);

    // ═══════════════════════════════════════════
    //  POS CART STATE
    // ═══════════════════════════════════════════
    const cart = ref(getLocal("posCart", []));
    watch(cart, (newVal) => {
        localStorage.setItem("posCart", JSON.stringify(newVal));
    }, { deep: true });
    const settings = ref(getLocal("posSettings", initialSettings));
    const taxRate = ref((settings.value.taxRate || 14) / 100);

    const useQZTray = ref(getLocal("useQZTray", false));
    const qzPrinterName = ref(getLocal("qzPrinterName", "Thermal Printer"));
    const autoOpenDrawer = ref(getLocal("autoOpenDrawer", true));

    watch(useQZTray, (newVal) => {
        localStorage.setItem("useQZTray", JSON.stringify(newVal));
    });
    watch(qzPrinterName, (newVal) => {
        localStorage.setItem("qzPrinterName", JSON.stringify(newVal));
    });
    watch(autoOpenDrawer, (newVal) => {
        localStorage.setItem("autoOpenDrawer", JSON.stringify(newVal));
    });

    const cartSubtotal = computed(() =>
        cart.value.reduce((sum, item) => sum + item.price * item.qty, 0)
    );
    const cartItemDiscountTotal = computed(() =>
        cart.value.reduce((sum, item) => sum + (item.itemDiscount || 0) * item.qty, 0)
    );
    const cartAfterDiscount = computed(() => cartSubtotal.value - cartItemDiscountTotal.value);
    const cartTax = computed(() => cartAfterDiscount.value * taxRate.value);
    const cartTotal = computed(() => cartAfterDiscount.value + cartTax.value);
    const cartItemCount = computed(() =>
        cart.value.reduce((sum, item) => sum + item.qty, 0)
    );

    // ═══════════════════════════════════════════
    //  DATA STATE (Offline database via LocalStorage)
    // ═══════════════════════════════════════════
    const productStore = useProductStore();
    const inventoryStore = useInventoryStore();
    const purchaseStore = usePurchaseStore();
    const orderStore = useOrderStore();
    const products = computed(() => productStore.products);
    const inventory = computed(() => inventoryStore.inventory);
    const purchases = computed(() => purchaseStore.purchases);
    const orders = computed(() => orderStore.orders);
    const posLoading = ref(false);
    const loading = computed({
        get: () => posLoading.value || productStore.loading || inventoryStore.loading || purchaseStore.loading || shiftStore.loading || orderStore.loading,
        set: (val) => { posLoading.value = val; }
    });

    // Auto-fetch current shift only when a real session token exists
    if (isAuthenticated.value) {
        shiftStore.fetchCurrentShift();
    }

    // ═══════════════════════════════════════════
    //  AUTH ACTIONS
    // ═══════════════════════════════════════════
    async function login(username, password) {
        loading.value = true;
        try {
            // Call the real API endpoint
            const response = await apiPost("/Auth/login", { username, password });
            const data = response.data; // Response contains token, username, role, pages

            const userData = {
                id: data.username,
                name: data.username,
                username: data.username,
                role: data.role // "Manager" or "Cashier"
            };

            user.value = userData;
            role.value = userData.role;
            pages.value = data.pages || [];
            localStorage.setItem("posUser", JSON.stringify(userData));
            localStorage.setItem("posRole", userData.role);
            localStorage.setItem("posPages", JSON.stringify(pages.value));
            localStorage.setItem("accessToken", data.token);
            if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
            }

            // Sync with base and auth stores
            try {
                const baseStore = useBaseStore();
                baseStore.setUser(userData);

                const authStore = useAuthStore();
                authStore.login({ 
                    token: data.token, 
                    refreshToken: data.refreshToken,
                    userName: userData.name 
                });
            } catch (e) {
                console.error("Failed to sync auth stores", e);
            }

            // Load current shift from API
            try {
                await shiftStore.fetchCurrentShift();
            } catch (e) {
                console.error("Failed to load shift on login", e);
            }

            return userData;
        } catch (err) {
            console.error("Login failed:", err);
            const errorMsg = err.response?.data?.message || err.message || "بيانات الدخول غير صحيحة";
            throw new Error(errorMsg);
        } finally {
            loading.value = false;
        }
    }

    function logout() {
        user.value = null;
        role.value = "";
        pages.value = [];
        cart.value = [];
        localStorage.removeItem("posUser");
        localStorage.removeItem("posRole");
        localStorage.removeItem("posPages");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("currentShift");

        try {
            const authStore = useAuthStore();
            authStore.logout();
        } catch (e) {
            window.location.hash = "/login";
        }
    }

    // ═══════════════════════════════════════════
    //  BARCODE / CART ACTIONS
    // ═══════════════════════════════════════════
    async function scanBarcode(code) {
        if (!code) return null;
        const cleanCode = code.trim().toLowerCase();
        loading.value = true;
        try {
            // 1. Search locally in loaded products first (fast & offline capable)
            const localDirectMatch = products.value.find(
                (p) => (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
                       (p.sku && p.sku.toLowerCase() === cleanCode)
            );
            if (localDirectMatch) return localDirectMatch;

            for (const p of products.value) {
                const matchedUnit = p.units?.find(
                    (u) => u.barcode && u.barcode.toLowerCase() === cleanCode
                );
                if (matchedUnit) {
                    return {
                        ...p,
                        price: matchedUnit.sellingPrice || matchedUnit.price || (p.price * (matchedUnit.factor || 1)),
                        unit: matchedUnit.name || matchedUnit.unitName || p.unit,
                        selectedUnitId: matchedUnit.id
                    };
                }
            }

            // 2. Try API barcode lookup if not found locally
            try {
                const response = await apiGet(`/Products/barcode/${encodeURIComponent(code.trim())}`);
                const apiProd = response.data;
                if (apiProd) {
                    // Match with local products array by Id if available
                    const localProd = products.value.find(p => p.id === apiProd.id);
                    if (localProd) {
                        const matchedUnit = localProd.units?.find(u =>
                            (u.barcode && u.barcode.toLowerCase() === cleanCode) ||
                            u.id === apiProd.productUnitId
                        );
                        if (matchedUnit) {
                            return {
                                ...localProd,
                                price: matchedUnit.sellingPrice || matchedUnit.price || localProd.price,
                                unit: matchedUnit.name || localProd.unit,
                                selectedUnitId: matchedUnit.id
                            };
                        }
                        return localProd;
                    }

                    // Format from API BarcodeSearchResponseDto
                    const unitPrice = apiProd.sellingPrice ?? apiProd.price ?? 0;
                    return {
                        id: apiProd.id,
                        name: apiProd.name,
                        sku: apiProd.sku || `PROD-${apiProd.id}`,
                        barcode: apiProd.barcode || code,
                        price: unitPrice,
                        costPrice: apiProd.costPrice ?? 0,
                        unit: apiProd.unit || "قطعة",
                        category: apiProd.category || "عام",
                        isActive: true,
                        units: [
                            {
                                id: apiProd.productUnitId,
                                name: apiProd.unit || "قطعة",
                                barcode: apiProd.barcode || code,
                                factor: 1,
                                price: unitPrice,
                                sellingPrice: unitPrice,
                                costPrice: apiProd.costPrice ?? 0
                            }
                        ]
                    };
                }
            } catch {
                // Not found on API
            }

            return null;
        } finally {
            loading.value = false;
        }
    }

    function addToCart(product) {
        if (product.isActive === false) {
            useToastStore().addWarningToast(`المنتج "${product.name}" غير نشط ولا يمكن بيعه.`);
            return false;
        }
        const existing = cart.value.find((item) => item.id === product.id && item.unit === (product.unit || "قطعة"));
        if (existing) {
            existing.qty++;
        } else {
            cart.value.push({
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                unit: product.unit || "قطعة",
                qty: 1,
                itemDiscount: product.itemDiscount || 0,
                isActive: product.isActive ?? true
            });
        }
        useToastStore().addInfoToast(`تمت إضافة "${product.name}" إلى السلة`);
        return true;
    }

    function removeFromCart(productId) {
        const item = cart.value.find((i) => i.id === productId);
        cart.value = cart.value.filter((i) => i.id !== productId);
        if (item) {
            useToastStore().addInfoToast(`تم حرق/إزالة "${item.name}" من السلة`);
        }
    }

    function updateCartQty(productId, qty) {
        const item = cart.value.find((i) => i.id === productId);
        if (item) {
            if (qty <= 0) {
                removeFromCart(productId);
            } else {
                item.qty = qty;
            }
        }
    }

    function clearCart(silent = false) {
        if (cart.value.length > 0 && !silent) {
            useToastStore().addInfoToast("تم تفريغ السلة");
        }
        cart.value = [];
    }

    async function checkout(paymentMethod = "cash", customerId = null, paidAmount = null) {
        loading.value = true;
        try {
            // Map cart items to API format using productUnitId
            const cartItems = cart.value.map(cartItem => {
                // Find the product to resolve the productUnitId
                const product = productStore.products.find(p => p.id === cartItem.id);
                let productUnitId = cartItem.id; // fallback
                if (product && product.units && product.units.length > 0) {
                    // Match by unit name, or default to the base unit (factor=1)
                    const matchedUnit = product.units.find(u => u.name === cartItem.unit)
                        || product.units.find(u => u.factor === 1)
                        || product.units[0];
                    productUnitId = matchedUnit.id;
                }
                return {
                    productUnitId,
                    qty: cartItem.qty,
                    discount: cartItem.itemDiscount || 0,
                };
            });

            const order = await orderStore.checkout(cartItems, paymentMethod, 0, customerId, paidAmount);

            // Refresh inventory to reflect stock changes
            try {
                await inventoryStore.fetchInventory();
            } catch (e) {
                console.error("Failed to refresh inventory after checkout", e);
            }

            clearCart(true);
            useToastStore().addSuccessToast("تم إتمام الطلب وطباعة الفاتورة بنجاح");
            return order;
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  PRODUCTS ACTIONS
    // ═══════════════════════════════════════════
    async function fetchProducts() {
        return await productStore.fetchProducts();
    }

    async function createProduct(product) {
        loading.value = true;
        try {
            const newProduct = await productStore.createProduct(product);
            await inventoryStore.fetchInventory();
            return newProduct;
        } finally {
            loading.value = false;
        }
    }

    async function updateProduct(product) {
        loading.value = true;
        try {
            await productStore.updateProduct(product);
            await inventoryStore.fetchInventory();
        } finally {
            loading.value = false;
        }
    }

    async function deleteProduct(productId) {
        loading.value = true;
        try {
            await productStore.deleteProduct(productId);
            await inventoryStore.fetchInventory();
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  INVENTORY ACTIONS
    // ═══════════════════════════════════════════
    async function fetchInventory() {
        return await inventoryStore.fetchInventory();
    }

    async function transferStock(productId, qty, from = "BackWarehouse", to = "StoreShelf") {
        return await inventoryStore.transferStock(productId, qty, from, to);
    }

    // ═══════════════════════════════════════════
    //  SHIFT ACTIONS
    // ═══════════════════════════════════════════
    async function openShift(startingCash) {
        return await shiftStore.openShift(startingCash);
    }

    async function closeShift(actualCash) {
        return await shiftStore.closeShift(actualCash);
    }

    // ═══════════════════════════════════════════
    //  PURCHASES ACTIONS
    // ═══════════════════════════════════════════
    async function addPurchase(supplierData, items) {
        loading.value = true;
        try {
            await purchaseStore.addPurchase(supplierData, items);
            await inventoryStore.fetchInventory();
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  ORDERS / RETURNS ACTIONS
    // ═══════════════════════════════════════════
    async function fetchOrders() {
        return await orderStore.fetchOrders();
    }

    async function processReturn(orderId, returnItems) {
        loading.value = true;
        const toastStore = useToastStore();
        try {
            const payload = {
                items: returnItems.map(item => {
                    const q = Number(item.qty || item.quantity || item.returnQty || 0);
                    return {
                        id: item.id || item.orderItemId,
                        name: item.name || item.productName,
                        qty: q,
                        quantity: q,
                        productUnitId: item.productUnitId || undefined,
                        productId: item.productId || undefined,
                        batchId: item.batchId || undefined,
                        batchNumber: item.batchNumber || undefined,
                        action: item.action || "shelf",
                        damageReason: item.damageReason || item.reason || undefined,
                        notes: item.notes || undefined
                    };
                })
            };

            const response = await apiPost(`/orders/${orderId}/return`, payload, false);
            toastStore.addSuccessToast("تم تنفيذ المرتجع بنجاح");

            // Refresh orders and inventory
            await orderStore.fetchOrders();
            await inventoryStore.fetchInventory();

            return response.data;
        } catch (err) {
            console.error("Failed to process return:", err);
            const detail = err.response?.data?.message || err.response?.data?.detail || (typeof err.response?.data === 'string' ? err.response.data : null) || "حدث خطأ أثناء تنفيذ المرتجع";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تنفيذ المرتجع");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  SETTINGS ACTIONS
    // ═══════════════════════════════════════════
    async function fetchSettings() {
        loading.value = true;
        try {
            const response = await apiGet("/Settings");
            if (response.data) {
                settings.value = { ...settings.value, ...response.data };
                localStorage.setItem("posSettings", JSON.stringify(settings.value));
                if (response.data.taxRate !== undefined) {
                    taxRate.value = response.data.taxRate / 100;
                }
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
            // Fallback: keep using localStorage values
        } finally {
            loading.value = false;
        }
    }

    async function updateSettings(newSettings) {
        loading.value = true;
        try {
            await apiPut("/Settings", newSettings, false);
            settings.value = { ...settings.value, ...newSettings };
            localStorage.setItem("posSettings", JSON.stringify(settings.value));
            if (newSettings.taxRate !== undefined) {
                taxRate.value = newSettings.taxRate / 100;
            }
        } catch (err) {
            console.error("Failed to update settings:", err);
            const toastStore = useToastStore();
            toastStore.addErrorToast("حدث خطأ أثناء حفظ الإعدادات");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  DEMO HELPERS
    // ═══════════════════════════════════════════
    function resetDemo() {
        localStorage.setItem("posProducts", JSON.stringify(initialProducts));
        localStorage.setItem("posInventory", JSON.stringify(initialInventory));
        localStorage.setItem("posPurchases", JSON.stringify(initialPurchases));
        localStorage.setItem("posOrders", JSON.stringify(initialOrders));
        localStorage.setItem("posSettings", JSON.stringify(initialSettings));

        products.value = [...initialProducts];
        inventory.value = [...initialInventory];
        purchases.value = [...initialPurchases];
        orders.value = [...initialOrders];
        settings.value = { ...initialSettings };
        taxRate.value = initialSettings.taxRate / 100;
        cart.value = [];
    }

    return {
        // Auth
        user, role, isAuthenticated, login, logout,
        // Shift
        currentShift, isShiftOpen, openShift, closeShift,
        // Cart
        cart, taxRate, cartSubtotal, cartItemDiscountTotal, cartAfterDiscount, cartTax, cartTotal, cartItemCount,
        addToCart, removeFromCart, updateCartQty, clearCart,
        // Actions
        scanBarcode, checkout,
        fetchProducts, createProduct, updateProduct, deleteProduct,
        fetchInventory, transferStock,
        addPurchase,
        fetchOrders, processReturn,
        fetchSettings, updateSettings,
        // QZ Tray settings
        useQZTray, qzPrinterName, autoOpenDrawer,
        // Data
        products, inventory, orders, purchases, settings, loading, pages,
        // Demo
        resetDemo
    };
});
