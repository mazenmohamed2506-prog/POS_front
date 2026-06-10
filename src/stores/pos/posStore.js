import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useBaseStore } from "@/stores/base/baseStore";
import { useAuthStore } from "@/stores/base/authStore";
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
    const currentShift = ref(JSON.parse(localStorage.getItem("currentShift") || "null"));
    const isShiftOpen = computed(() => !!currentShift.value && !currentShift.value.closedAt);

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
    const products = ref(getLocal("posProducts", initialProducts));
    const inventory = ref(getLocal("posInventory", initialInventory));
    const orders = ref(getLocal("posOrders", initialOrders));
    const purchases = ref(getLocal("posPurchases", initialPurchases));
    const loading = ref(false);

    // ═══════════════════════════════════════════
    //  AUTH ACTIONS
    // ═══════════════════════════════════════════
    async function login(username, password) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // const response = await apiPost("/auth/login", { username, password });
            // const data = response.data;

            // Mock response
            const mockUsers = {
                manager: { id: 1, name: "أحمد المدير", username: "manager", role: "Manager" },
                cashier: { id: 2, name: "محمد الكاشير", username: "cashier", role: "Cashier" },
            };

            const found = mockUsers[username.toLowerCase()];
            if (!found || password !== "1234") {
                throw new Error("بيانات الدخول غير صحيحة");
            }

            user.value = found;
            role.value = found.role;
            localStorage.setItem("posUser", JSON.stringify(found));
            localStorage.setItem("posRole", found.role);
            localStorage.setItem("accessToken", "mock-token-" + found.id);

            // Sync with base and auth stores
            try {
                const baseStore = useBaseStore();
                baseStore.setUser(found);

                const authStore = useAuthStore();
                authStore.login({ token: "mock-token-" + found.id, userName: found.name });
            } catch (e) {
                console.error("Failed to sync auth stores", e);
            }

            return found;
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
            // TODO: REPLACE WITH REAL API
            // const response = await apiGet(`/products/barcode/${code}`);
            // return response.data;

            // Lookup from products
            const found = products.value.find(
                (p) => p.barcode === code || p.sku === code
            );
            if (found) return found;

            // If not found, try to look up in units barcodes
            for (const p of products.value) {
                const matchedUnit = p.units?.find((u) => u.barcode === code);
                if (matchedUnit) {
                    return {
                        ...p,
                        price: p.price * (matchedUnit.factor || 1),
                        unit: matchedUnit.name
                    };
                }
            }

            // Mock fallback product
            return {
                id: Date.now(),
                name: `منتج ${code}`,
                sku: code,
                barcode: code,
                price: Math.floor(Math.random() * 100) + 10,
                unit: "قطعة",
                category: "عام",
            };
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
            // TODO: REPLACE WITH REAL API
            // const response = await apiPost("/orders", { ... });

            const order = {
                id: Date.now(),
                orderNumber: `ORD-${Date.now()}`,
                items: [...cart.value],
                subtotal: cartSubtotal.value,
                tax: cartTax.value,
                total: cartTotal.value,
                paymentMethod,
                date: new Date().toISOString(),
                type: "sale",
                status: "completed",
                cashier: user.value?.name,
            };

            orders.value.unshift(order);
            localStorage.setItem("posOrders", JSON.stringify(orders.value));

            // Cycle Integration: Deduct shelf stock in inventory
            cart.value.forEach((cartItem) => {
                const inv = inventory.value.find((i) => i.productId === cartItem.id);
                if (inv) {
                    inv.shelfStock = Math.max(0, inv.shelfStock - cartItem.qty);
                }
            });
            localStorage.setItem("posInventory", JSON.stringify(inventory.value));

            // If shift is active, track sales stats
            if (currentShift.value) {
                currentShift.value.salesCount++;
                currentShift.value.totalSales += order.total;
                localStorage.setItem("currentShift", JSON.stringify(currentShift.value));
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
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // Data is loaded from localStorage on store creation
        } finally {
            loading.value = false;
        }
    }

    async function createProduct(product) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // const response = await apiPost("/products", product);

            const newProduct = {
                ...product,
                id: Date.now(),
                units: product.units || [{ name: "قطعة", barcode: product.barcode, factor: 1 }]
            };
            products.value.push(newProduct);
            localStorage.setItem("posProducts", JSON.stringify(products.value));

            // Sync with inventory: Automatically create inventory record
            const newInventory = {
                id: Date.now() + 1,
                productId: newProduct.id,
                productName: newProduct.name,
                sku: newProduct.sku,
                shelfStock: 0,
                warehouseStock: 0,
                unit: newProduct.units?.[0]?.name || "قطعة"
            };
            inventory.value.push(newInventory);
            localStorage.setItem("posInventory", JSON.stringify(inventory.value));

            return newProduct;
        } finally {
            loading.value = false;
        }
    }

    async function updateProduct(product) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // await apiPut(`/products/${product.id}`, product);

            const idx = products.value.findIndex((p) => p.id === product.id);
            if (idx !== -1) {
                products.value[idx] = { ...product };
                localStorage.setItem("posProducts", JSON.stringify(products.value));
            }

            // Sync with inventory: Update name and sku
            const invIdx = inventory.value.findIndex((i) => i.productId === product.id);
            if (invIdx !== -1) {
                inventory.value[invIdx].productName = product.name;
                inventory.value[invIdx].sku = product.sku;
                localStorage.setItem("posInventory", JSON.stringify(inventory.value));
            }
        } finally {
            loading.value = false;
        }
    }

    async function deleteProduct(productId) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // await apiDelete(`/products/${productId}`);

            products.value = products.value.filter((p) => p.id !== productId);
            localStorage.setItem("posProducts", JSON.stringify(products.value));

            // Sync with inventory: Delete matching inventory
            inventory.value = inventory.value.filter((i) => i.productId !== productId);
            localStorage.setItem("posInventory", JSON.stringify(inventory.value));
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  INVENTORY ACTIONS
    // ═══════════════════════════════════════════
    async function fetchInventory() {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // Data is loaded from localStorage on store creation
        } finally {
            loading.value = false;
        }
    }

    async function transferStock(productId, qty, from = "BackWarehouse", to = "StoreShelf") {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // await apiPost("/inventory/transfer", { productId, qty, from, to });

            const item = inventory.value.find((i) => i.productId === productId);
            if (item) {
                if (from === "BackWarehouse" && to === "StoreShelf") {
                    item.warehouseStock = Math.max(0, item.warehouseStock - qty);
                    item.shelfStock += qty;
                } else {
                    item.shelfStock = Math.max(0, item.shelfStock - qty);
                    item.warehouseStock += qty;
                }
                localStorage.setItem("posInventory", JSON.stringify(inventory.value));
            }
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  SHIFT ACTIONS
    // ═══════════════════════════════════════════
    async function openShift(startingCash) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // const response = await apiPost("/shifts/open", { startingCash });

            const shift = {
                id: Date.now(),
                cashier: user.value?.name,
                startingCash: parseFloat(startingCash),
                openedAt: new Date().toISOString(),
                closedAt: null,
                expectedCash: null,
                actualCash: null,
                variance: null,
                salesCount: 0,
                totalSales: 0,
            };

            currentShift.value = shift;
            localStorage.setItem("currentShift", JSON.stringify(shift));
            return shift;
        } finally {
            loading.value = false;
        }
    }

    async function closeShift(actualCash) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // const response = await apiPost("/shifts/close", { actualCash, shiftId: currentShift.value?.id });

            if (currentShift.value) {
                const expectedCash = currentShift.value.startingCash + currentShift.value.totalSales;

                currentShift.value.closedAt = new Date().toISOString();
                currentShift.value.actualCash = parseFloat(actualCash);
                currentShift.value.expectedCash = expectedCash;
                currentShift.value.variance = parseFloat(actualCash) - expectedCash;

                const closedShift = { ...currentShift.value };
                currentShift.value = null;
                localStorage.removeItem("currentShift");
                return closedShift;
            }
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  PURCHASES ACTIONS
    // ═══════════════════════════════════════════
    async function addPurchase(supplierData, items) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // const response = await apiPost("/purchases", { ...supplierData, items });

            // Cycle Integration:
            // Process purchase items list. Check if product exists by name/productId.
            // If doesn't exist, create product & inventory record. Then add to warehouse stock.
            const processedItems = items.map((item) => {
                let prod = null;
                if (item.productId) {
                    prod = products.value.find((p) => p.id === item.productId);
                } else if (item.productName) {
                    prod = products.value.find(
                        (p) => p.name.toLowerCase().trim() === item.productName.toLowerCase().trim()
                    );
                    if (!prod) {
                        prod = products.value.find((p) => p.name.includes(item.productName.trim()));
                    }
                }

                if (prod) {
                    // Update matching inventory
                    const inv = inventory.value.find((i) => i.productId === prod.id);
                    if (inv) {
                        inv.warehouseStock += item.qty;
                    }
                    return {
                        productId: prod.id,
                        productName: prod.name,
                        qty: item.qty,
                        cost: item.cost
                    };
                } else {
                    // Create new product dynamically
                    const newId = Date.now() + Math.floor(Math.random() * 1000);
                    const newSku = `PUR-SKU-${newId}`;
                    const newProd = {
                        id: newId,
                        name: item.productName,
                        sku: newSku,
                        barcode: `628100${newId}`,
                        category: "عام",
                        price: Math.ceil(item.cost * 1.3), // 30% markup
                        cost: item.cost,
                        units: [{ name: "قطعة", barcode: `628100${newId}`, factor: 1 }]
                    };
                    products.value.push(newProd);

                    // Add to inventory
                    inventory.value.push({
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        productId: newId,
                        productName: item.productName,
                        sku: newSku,
                        shelfStock: 0,
                        warehouseStock: item.qty,
                        unit: "قطعة"
                    });

                    return {
                        productId: newId,
                        productName: item.productName,
                        qty: item.qty,
                        cost: item.cost
                    };
                }
            });

            // Save new items and products
            localStorage.setItem("posProducts", JSON.stringify(products.value));
            localStorage.setItem("posInventory", JSON.stringify(inventory.value));

            const purchase = {
                id: Date.now(),
                invoiceNumber: `PUR-${Date.now()}`,
                supplier: supplierData.supplier || "مورد غير معروف",
                date: new Date().toISOString(),
                items: processedItems,
                total: processedItems.reduce((sum, i) => sum + i.cost * i.qty, 0),
                status: "received",
            };

            purchases.value.unshift(purchase);
            localStorage.setItem("posPurchases", JSON.stringify(purchases.value));

            return purchase;
        } finally {
            loading.value = false;
        }
    }

    // ═══════════════════════════════════════════
    //  ORDERS / RETURNS ACTIONS
    // ═══════════════════════════════════════════
    async function fetchOrders() {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // Data is loaded from localStorage on store creation
        } finally {
            loading.value = false;
        }
    }

    async function processReturn(orderId, returnItems) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // const response = await apiPost(`/orders/${orderId}/return`, { items: returnItems });

            const returnTotal = returnItems.reduce((sum, i) => sum + i.price * i.qty, 0);
            const returnOrder = {
                id: Date.now(),
                orderNumber: `RET-${Date.now()}`,
                originalOrderId: orderId,
                type: "return",
                status: "completed",
                items: [...returnItems],
                subtotal: returnTotal,
                tax: returnTotal * taxRate.value,
                total: returnTotal * (1 + taxRate.value),
                date: new Date().toISOString(),
                cashier: user.value?.name,
            };

            orders.value.unshift(returnOrder);
            localStorage.setItem("posOrders", JSON.stringify(orders.value));

            // Cycle Integration: Return items go back to shelf stock
            returnItems.forEach((item) => {
                const inv = inventory.value.find(
                    (i) => i.productId === item.id || i.productName === item.name
                );
                if (inv) {
                    inv.shelfStock += item.qty;
                }
            });
            localStorage.setItem("posInventory", JSON.stringify(inventory.value));

            return returnOrder;
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
            // TODO: REPLACE WITH REAL API
            // Loaded from localStorage in state init
        } finally {
            loading.value = false;
        }
    }

    async function updateSettings(newSettings) {
        loading.value = true;
        try {
            // TODO: REPLACE WITH REAL API
            // await apiPut("/settings", newSettings);

            settings.value = { ...settings.value, ...newSettings };
            localStorage.setItem("posSettings", JSON.stringify(settings.value));
            if (newSettings.taxRate !== undefined) {
                taxRate.value = newSettings.taxRate / 100;
            }
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
