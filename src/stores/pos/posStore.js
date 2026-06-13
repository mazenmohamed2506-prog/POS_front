import { defineStore } from "pinia";
import { ref, computed } from "vue";
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
    const isAuthenticated = computed(() => !!user.value);

    // ═══════════════════════════════════════════
    //  SHIFT STATE
    // ═══════════════════════════════════════════
    const shiftStore = useShiftStore();
    const currentShift = computed(() => shiftStore.currentShift);
    const isShiftOpen = computed(() => !!shiftStore.currentShift);

    // ═══════════════════════════════════════════
    //  POS CART STATE
    // ═══════════════════════════════════════════
    const cart = ref([]);
    const settings = ref(getLocal("posSettings", initialSettings));
    const taxRate = ref((settings.value.taxRate || 14) / 100);

    const cartSubtotal = computed(() =>
        cart.value.reduce((sum, item) => sum + item.price * item.qty, 0)
    );
    const cartTax = computed(() => cartSubtotal.value * taxRate.value);
    const cartTotal = computed(() => cartSubtotal.value + cartTax.value);
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

    // Auto-fetch current shift if user is already authenticated
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
            const data = response.data; // Response contains token, username, role

            const userData = {
                id: data.username,
                name: data.username,
                username: data.username,
                role: data.role // "Manager" or "Cashier"
            };

            user.value = userData;
            role.value = userData.role;
            localStorage.setItem("posUser", JSON.stringify(userData));
            localStorage.setItem("posRole", userData.role);
            localStorage.setItem("accessToken", data.token);

            // Sync with base and auth stores
            try {
                const baseStore = useBaseStore();
                baseStore.setUser(userData);

                const authStore = useAuthStore();
                authStore.login({ token: data.token, userName: userData.name });
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
        cart.value = [];
        localStorage.removeItem("posUser");
        localStorage.removeItem("posRole");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("currentShift");

        try {
            const authStore = useAuthStore();
            authStore.logout();
        } catch (e) {
            window.location.replace("/login");
        }
    }

    // ═══════════════════════════════════════════
    //  BARCODE / CART ACTIONS
    // ═══════════════════════════════════════════
    async function scanBarcode(code) {
        loading.value = true;
        try {
            // Try API barcode lookup first
            const response = await apiGet(`/Products/barcode/${code}`);
            const apiProd = response.data;
            if (apiProd) {
                const units = apiProd.productUnits || [];
                const baseUnit = units.find(u => u.conversionFactor === 1) || units[0] || {};
                return {
                    id: apiProd.id,
                    name: apiProd.name,
                    sku: `PROD-${apiProd.id}`,
                    barcode: baseUnit.barcode || code,
                    price: baseUnit.price || 0,
                    unit: baseUnit.unitName || "قطعة",
                    category: apiProd.categoryName || "عام",
                    units: units.map(u => ({
                        id: u.id,
                        name: u.unitName,
                        barcode: u.barcode,
                        factor: u.conversionFactor,
                        price: u.price
                    }))
                };
            }
            return null;
        } catch {
            // Fallback: search locally in loaded products
            const found = products.value.find(
                (p) => p.barcode === code || p.sku === code
            );
            if (found) return found;

            for (const p of products.value) {
                const matchedUnit = p.units?.find((u) => u.barcode === code);
                if (matchedUnit) {
                    return {
                        ...p,
                        price: matchedUnit.price || p.price * (matchedUnit.factor || 1),
                        unit: matchedUnit.name
                    };
                }
            }
            return null;
        } finally {
            loading.value = false;
        }
    }

    function addToCart(product) {
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
            });
        }
    }

    function removeFromCart(productId) {
        cart.value = cart.value.filter((item) => item.id !== productId);
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

    function clearCart() {
        cart.value = [];
    }

    async function checkout(paymentMethod = "cash") {
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
                    discount: 0,
                };
            });

            const order = await orderStore.checkout(cartItems, paymentMethod, 0);

            // Refresh inventory to reflect stock changes
            try {
                await inventoryStore.fetchInventory();
            } catch (e) {
                console.error("Failed to refresh inventory after checkout", e);
            }

            clearCart();
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
                items: returnItems.map(item => ({
                    productUnitId: item.productUnitId || item.id,
                    quantity: item.qty,
                }))
            };

            const response = await apiPost(`/orders/${orderId}/return`, payload, false);
            toastStore.addSuccessToast("تم تنفيذ المرتجع بنجاح");

            // Refresh orders and inventory
            await orderStore.fetchOrders();
            await inventoryStore.fetchInventory();

            return response.data;
        } catch (err) {
            console.error("Failed to process return:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تنفيذ المرتجع";
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
        cart, taxRate, cartSubtotal, cartTax, cartTotal, cartItemCount,
        addToCart, removeFromCart, updateCartQty, clearCart,
        // Actions
        scanBarcode, checkout,
        fetchProducts, createProduct, updateProduct, deleteProduct,
        fetchInventory, transferStock,
        addPurchase,
        fetchOrders, processReturn,
        fetchSettings, updateSettings,
        // Data
        products, inventory, orders, purchases, settings, loading,
        // Demo
        resetDemo
    };
});
