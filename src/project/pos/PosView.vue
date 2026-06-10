<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { Barcode, Trash2, Plus, Minus, CreditCard, Banknote, ShoppingCart, XCircle, Search, RotateCcw, Receipt, ChevronLeft } from "lucide-vue-next";

const posStore = ref(null);
posStore.value = usePosStore();

const barcodeInput = ref("");
const barcodeInputRef = ref(null);
const lastScannedError = ref("");

// Category and search query
const selectedCategory = ref("الكل");
const searchQuery = ref("");

// ── POS Mode: 'sell' or 'returns' ──
const posMode = ref("sell");

// ── Returns state ──
const orderSearchQuery = ref("");
const showReturnDialog = ref(false);
const selectedOrder = ref(null);
const returnItems = ref([]);

// Focus barcode input on mount and after actions
const focusBarcode = async () => {
    await nextTick();
    barcodeInputRef.value?.$el?.focus();
};

onMounted(() => {
    posStore.value.fetchProducts();
    posStore.value.fetchInventory();
    posStore.value.fetchOrders();
    focusBarcode();
});

// Categories list computed dynamically
const categories = computed(() => {
    const cats = new Set(posStore.value.products.map((p) => p.category));
    return ["الكل", ...Array.from(cats)];
});

// Helper to get shelf stock from inventory state
const getShelfStock = (productId) => {
    const item = posStore.value.inventory.find((i) => i.productId === productId);
    return item ? item.shelfStock : 0;
};

// Filtered products list based on category & text search
const filteredProducts = computed(() => {
    return posStore.value.products.filter((p) => {
        const matchesCategory = selectedCategory.value === "الكل" || p.category === selectedCategory.value;
        const matchesQuery = !searchQuery.value.trim() ||
            p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            p.barcode.includes(searchQuery.value);
        return matchesCategory && matchesQuery;
    });
});

// ── Filtered sale orders for returns ──
const saleOrders = computed(() => {
    return posStore.value.orders.filter((o) => o.type === "sale");
});

const filteredSaleOrders = computed(() => {
    const q = orderSearchQuery.value.trim().toLowerCase();
    if (!q) return saleOrders.value;
    return saleOrders.value.filter((o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.cashier && o.cashier.toLowerCase().includes(q))
    );
});

// Click card handler
const handleProductClick = (product) => {
    if (!posStore.value.isShiftOpen) {
        alert("يجب فتح وردية أولاً من صفحة الورديات (Shifts) لتتمكن من إجراء المبيعات وإضافة المنتجات!");
        return;
    }
    const stock = getShelfStock(product.id);
    if (stock <= 0) return; // Block adding if out of stock
    posStore.value.addToCart(product);
    focusBarcode();
};

// Scan barcode
const handleScan = async () => {
    const code = barcodeInput.value.trim();
    if (!code) return;

    lastScannedError.value = "";
    try {
        const product = await posStore.value.scanBarcode(code);
        if (product) {
            const stock = getShelfStock(product.id);
            if (stock <= 0) {
                lastScannedError.value = "المنتج غير متوفر على الرف";
            } else {
                posStore.value.addToCart(product);
            }
        }
    } catch (err) {
        lastScannedError.value = "المنتج غير موجود";
    }
    barcodeInput.value = "";
    focusBarcode();
};

// Checkout
const handleCheckout = async (method) => {
    if (posStore.value.cart.length === 0) return;
    try {
        const order = await posStore.value.checkout(method);
        if (order) {
            focusBarcode();
        }
    } catch (err) {
        console.error("Checkout failed", err);
    }
};

// ── Returns logic ──
const openReturnDialog = (order) => {
    selectedOrder.value = order;
    returnItems.value = order.items.map((item) => ({
        ...item,
        returnQty: 0,
    }));
    showReturnDialog.value = true;
};

const handleReturn = async () => {
    const itemsToReturn = returnItems.value
        .filter((i) => i.returnQty > 0)
        .map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.returnQty }));

    if (itemsToReturn.length === 0) return;

    await posStore.value.processReturn(selectedOrder.value.id, itemsToReturn);
    showReturnDialog.value = false;
    selectedOrder.value = null;
};

const returnDialogTotal = computed(() => {
    if (!returnItems.value) return 0;
    return returnItems.value.reduce((sum, i) => sum + (i.price * i.returnQty), 0);
});

// Format currency
const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: posStore.value.settings.currency || "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Stock classes
const getStockClass = (stock) => {
    if (stock === 0) return "stock-out";
    if (stock <= 5) return "stock-low";
    return "stock-ok";
};
</script>

<template>
    <div class="pos-container">
        <!-- ═══ LEFT PANEL: Cart & Checkout ═══ -->
        <div class="pos-left-panel">
            <!-- Cart Header -->
            <div class="pos-cart-header">
                <div class="flex items-center gap-2">
                    <ShoppingCart :size="20" class="text-primary-500" />
                    <h2 class="text-lg font-bold text-surface-800 dark:text-surface-100">
                        السلة
                    </h2>
                    <span
                        v-if="posStore.cartItemCount > 0"
                        class="bg-primary-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                    >
                        {{ posStore.cartItemCount }}
                    </span>
                </div>
                <button
                    v-if="posStore.cart.length > 0"
                    class="pos-clear-btn"
                    @click="posStore.clearCart()"
                    title="مسح السلة"
                >
                    <XCircle :size="18" />
                    <span>مسح</span>
                </button>
            </div>

            <!-- Cart Table -->
            <div class="pos-cart-table-wrap">
                <DataTable
                    :value="posStore.cart"
                    scrollable
                    scrollHeight="flex"
                    :emptyMessage="'السلة فارغة — اختر منتجات لإضافتها'"
                    class="pos-cart-table"
                >
                    <Column header="#" style="width: 40px">
                        <template #body="{ index }">
                            <span class="text-surface-400 text-sm">{{ index + 1 }}</span>
                        </template>
                    </Column>
                    <Column field="name" header="المنتج" style="min-width: 140px">
                        <template #body="{ data }">
                            <div>
                                <div class="font-semibold text-surface-800 dark:text-surface-100 line-clamp-1">{{ data.name }}</div>
                                <div class="text-xs text-surface-400">{{ data.sku }}</div>
                            </div>
                        </template>
                    </Column>
                    <Column header="السعر" style="width: 80px">
                        <template #body="{ data }">
                            <span class="font-medium text-sm">{{ formatCurrency(data.price) }}</span>
                        </template>
                    </Column>
                    <Column header="الكمية" style="width: 110px">
                        <template #body="{ data }">
                            <div class="qty-controls">
                                <button class="qty-btn" @click="posStore.updateCartQty(data.id, data.qty - 1)">
                                    <Minus :size="12" />
                                </button>
                                <span class="qty-value">{{ data.qty }}</span>
                                <button class="qty-btn" @click="posStore.updateCartQty(data.id, data.qty + 1)">
                                    <Plus :size="12" />
                                </button>
                            </div>
                        </template>
                    </Column>
                    <Column style="width: 40px">
                        <template #body="{ data }">
                            <button class="remove-btn" @click="posStore.removeFromCart(data.id)" title="حذف">
                                <Trash2 :size="15" />
                            </button>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Summary Block sticky at bottom -->
            <div class="pos-summary-block">
                <div class="pos-summary-rows">
                    <div class="pos-summary-row">
                        <span>المجموع الفرعي</span>
                        <span>{{ formatCurrency(posStore.cartSubtotal) }}</span>
                    </div>
                    <div class="pos-summary-row">
                        <span>الضريبة ({{ (posStore.taxRate * 100).toFixed(0) }}%)</span>
                        <span>{{ formatCurrency(posStore.cartTax) }}</span>
                    </div>
                    <div class="pos-summary-divider"></div>
                    <div class="pos-summary-row pos-summary-total">
                        <span>الإجمالي</span>
                        <span>{{ formatCurrency(posStore.cartTotal) }}</span>
                    </div>
                </div>

                <!-- Payment Buttons -->
                <div class="pos-payment-actions">
                    <button
                        class="pos-pay-btn pos-pay-cash"
                        :disabled="posStore.cart.length === 0 || posStore.loading || !posStore.isShiftOpen"
                        @click="handleCheckout('cash')"
                    >
                        <Banknote :size="20" />
                        <span>دفع نقدي</span>
                    </button>
                    <button
                        class="pos-pay-btn pos-pay-card"
                        :disabled="posStore.cart.length === 0 || posStore.loading || !posStore.isShiftOpen"
                        @click="handleCheckout('card')"
                    >
                        <CreditCard :size="20" />
                        <span>بطاقة</span>
                    </button>
                </div>

                <!-- Shift Warning -->
                <div v-if="!posStore.isShiftOpen" class="pos-shift-warning">
                    ⚠️ يجب فتح وردية جديدة من صفحة الورديات لإجراء العمليات
                </div>
            </div>
        </div>

        <!-- ═══ RIGHT PANEL: Mode Toggle + Content ═══ -->
        <div class="pos-right-panel">
            <!-- Mode Toggle Bar -->
            <div class="pos-mode-bar">
                <button
                    class="pos-mode-btn"
                    :class="{ 'pos-mode-active': posMode === 'sell' }"
                    @click="posMode = 'sell'"
                >
                    <ShoppingCart :size="18" />
                    <span>البيع</span>
                </button>
                <button
                    class="pos-mode-btn pos-mode-btn-return"
                    :class="{ 'pos-mode-active-return': posMode === 'returns' }"
                    @click="posMode = 'returns'"
                >
                    <RotateCcw :size="18" />
                    <span>المرتجعات</span>
                </button>
            </div>

            <!-- ═══ SELL MODE ═══ -->
            <template v-if="posMode === 'sell'">
                <!-- Search & scan topbar -->
                <div class="pos-search-bar">
                    <form @submit.prevent="handleScan" class="flex-1">
                        <div class="relative w-full">
                            <Barcode :size="18" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                            <InputText
                                ref="barcodeInputRef"
                                v-model="barcodeInput"
                                placeholder="امسح الباركود..."
                                class="ps-10"
                                autocomplete="off"
                                fluid
                            />
                        </div>
                    </form>
                    <div class="relative flex-1">
                        <Search :size="18" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                        <InputText
                            v-model="searchQuery"
                            placeholder="ابحث باسم المنتج أو الرمز..."
                            class="ps-10"
                            autocomplete="off"
                            fluid
                        />
                    </div>
                </div>
                <p v-if="lastScannedError" class="text-red-500 text-sm px-4 mt-1">{{ lastScannedError }}</p>

                <!-- Categories Tabs -->
                <div class="pos-categories-tabs">
                    <button
                        v-for="cat in categories"
                        :key="cat"
                        class="category-tab-btn"
                        :class="{ active: selectedCategory === cat }"
                        @click="selectedCategory = cat"
                    >
                        {{ cat }}
                    </button>
                </div>

                <!-- Products Grid -->
                <div class="pos-grid-wrap">
                    <div v-if="filteredProducts.length === 0" class="pos-empty-grid">
                        لا توجد منتجات مطابقة لخيارات التصفية
                    </div>
                    <div v-else class="pos-product-grid">
                        <div
                            v-for="prod in filteredProducts"
                            :key="prod.id"
                            class="product-card"
                            :class="{
                                'disabled-card': getShelfStock(prod.id) === 0 || !posStore.isShiftOpen,
                                'out-of-stock': getShelfStock(prod.id) === 0
                            }"
                            @click="handleProductClick(prod)"
                        >
                            <div class="product-card-body">
                                <span class="product-card-cat">{{ prod.category }}</span>
                                <h4 class="product-card-title">{{ prod.name }}</h4>
                                <span class="product-card-sku">{{ prod.sku }}</span>
                                
                                <div class="product-card-footer mt-auto">
                                    <span class="product-card-price">{{ formatCurrency(prod.price) }}</span>
                                    <span
                                        class="product-card-stock"
                                        :class="getStockClass(getShelfStock(prod.id))"
                                    >
                                        {{ getShelfStock(prod.id) > 0 ? `الرف: ${getShelfStock(prod.id)}` : 'نفذ من الرف' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <!-- ═══ RETURNS MODE ═══ -->
            <template v-else>
                <!-- Search Orders -->
                <div class="pos-search-bar">
                    <div class="relative flex-1">
                        <Search :size="18" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                        <InputText
                            v-model="orderSearchQuery"
                            placeholder="ابحث برقم الفاتورة..."
                            class="ps-10"
                            autocomplete="off"
                            fluid
                        />
                    </div>
                </div>

                <!-- Invoices List -->
                <div class="returns-list-wrap">
                    <div v-if="filteredSaleOrders.length === 0" class="pos-empty-grid">
                        لا توجد فواتير بيع
                    </div>
                    <div v-else class="returns-invoice-list">
                        <div
                            v-for="order in filteredSaleOrders"
                            :key="order.id"
                            class="return-invoice-card"
                            @click="openReturnDialog(order)"
                        >
                            <div class="return-invoice-header">
                                <div class="return-invoice-number">
                                    <Receipt :size="16" class="text-primary-500" />
                                    <span>{{ order.orderNumber }}</span>
                                </div>
                                <span class="return-invoice-date">{{ formatDate(order.date) }}</span>
                            </div>
                            <div class="return-invoice-body">
                                <div class="return-invoice-items-list">
                                    <span
                                        v-for="(item, idx) in order.items.slice(0, 3)"
                                        :key="idx"
                                        class="return-invoice-item-chip"
                                    >
                                        {{ item.name }} × {{ item.qty }}
                                    </span>
                                    <span v-if="order.items.length > 3" class="return-invoice-item-chip return-invoice-more">
                                        +{{ order.items.length - 3 }} المزيد
                                    </span>
                                </div>
                                <div class="return-invoice-footer">
                                    <span class="return-invoice-cashier">{{ order.cashier || '—' }}</span>
                                    <span class="return-invoice-total">{{ formatCurrency(order.total) }}</span>
                                </div>
                            </div>
                            <div class="return-invoice-action">
                                <RotateCcw :size="14" />
                                <span>ارجاع أصناف</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <!-- ═══ RETURN DIALOG ═══ -->
        <Dialog
            v-model:visible="showReturnDialog"
            header="معالجة مرتجع"
            :style="{ width: '560px' }"
            modal
        >
            <div class="return-dialog-content" v-if="selectedOrder">
                <div class="return-dialog-order-info">
                    <Receipt :size="16" class="text-primary-500" />
                    <span>فاتورة رقم: <strong>{{ selectedOrder.orderNumber }}</strong></span>
                    <span class="return-dialog-order-date">{{ formatDate(selectedOrder.date) }}</span>
                </div>

                <div class="return-dialog-items">
                    <div
                        v-for="(item, idx) in returnItems"
                        :key="idx"
                        class="return-dialog-item"
                    >
                        <div class="return-dialog-item-info">
                            <span class="return-dialog-item-name">{{ item.name }}</span>
                            <span class="return-dialog-item-meta">
                                السعر: {{ formatCurrency(item.price) }} · الكمية الأصلية: {{ item.qty }}
                            </span>
                        </div>
                        <div class="return-dialog-item-qty">
                            <label class="return-qty-label">كمية المرتجع</label>
                            <InputNumber
                                v-model="item.returnQty"
                                :min="0"
                                :max="item.qty"
                                fluid
                                showButtons
                                buttonLayout="horizontal"
                                :inputStyle="{ width: '3rem', textAlign: 'center' }"
                            />
                        </div>
                    </div>
                </div>

                <div class="return-dialog-summary" v-if="returnDialogTotal > 0">
                    <span>إجمالي المبلغ المسترد:</span>
                    <span class="return-dialog-summary-total">{{ formatCurrency(returnDialogTotal) }}</span>
                </div>
            </div>
            <template #footer>
                <Button label="إلغاء" text @click="showReturnDialog = false" />
                <Button
                    label="تنفيذ المرتجع"
                    severity="warn"
                    @click="handleReturn"
                    :loading="posStore.loading"
                    :disabled="returnDialogTotal === 0"
                >
                    <template #icon><RotateCcw :size="14" /></template>
                </Button>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.pos-container {
    display: flex;
    height: calc(100vh - 3.5rem);
    overflow: hidden;
}

/* ── Left Panel (Cart & Payment) ── */
.pos-left-panel {
    width: 420px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--p-surface-0);
    border-inline-end: 1px solid var(--p-surface-200);
}

.dark .pos-left-panel {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.pos-cart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .pos-cart-header {
    border-color: var(--p-surface-800);
}

.pos-clear-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.15s;
}

.dark .pos-clear-btn {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
}

.pos-clear-btn:hover {
    background: #fee2e2;
}

.pos-cart-table-wrap {
    flex: 1;
    overflow: hidden;
}

.pos-cart-table {
    height: 100%;
}

.qty-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.qty-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    color: var(--p-surface-600);
    cursor: pointer;
    transition: all 0.15s;
}

.dark .qty-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-350);
}

.qty-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}

.qty-value {
    min-width: 1.5rem;
    text-align: center;
    font-weight: 750;
    font-size: 0.875rem;
}

.remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.25rem;
    border: none;
    background: transparent;
    color: var(--p-surface-400);
    cursor: pointer;
    transition: all 0.15s;
}

.remove-btn:hover {
    background: #fef2f2;
    color: #ef4444;
}

.pos-summary-block {
    padding: 1rem;
    background: var(--p-surface-50);
    border-top: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .pos-summary-block {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.pos-summary-rows {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.pos-summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: var(--p-surface-600);
}

.dark .pos-summary-row {
    color: var(--p-surface-400);
}

.pos-summary-divider {
    border-top: 2px dashed var(--p-surface-300);
    margin: 0.25rem 0;
}

.dark .pos-summary-divider {
    border-color: var(--p-surface-800);
}

.pos-summary-total {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--p-surface-900);
}

.dark .pos-summary-total {
    color: var(--p-surface-0);
}

.pos-payment-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

.pos-pay-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 2px solid transparent;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
}

.pos-pay-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.pos-pay-cash {
    background: #dcfce7;
    color: #15803d;
    border-color: #bbf7d0;
}

.pos-pay-cash:not(:disabled):hover {
    background: #bbf7d0;
    border-color: #86efac;
}

.dark .pos-pay-cash {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.3);
}

.pos-pay-card {
    background: #dbeafe;
    color: #1d4ed8;
    border-color: #bfdbfe;
}

.pos-pay-card:not(:disabled):hover {
    background: #bfdbfe;
    border-color: #93c5fd;
}

.dark .pos-pay-card {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.3);
}

.pos-shift-warning {
    margin-top: 0.75rem;
    padding: 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.8rem;
    font-weight: 600;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
    text-align: center;
}

.dark .pos-shift-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.3);
}

/* ── Right Panel (Catalog Grid) ── */
.pos-right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--p-surface-50);
}

.dark .pos-right-panel {
    background: var(--p-surface-950);
}

.pos-search-bar {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--p-surface-0);
    border-bottom: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .pos-search-bar {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.pos-categories-tabs {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    overflow-x: auto;
    background: var(--p-surface-0);
    border-bottom: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .pos-categories-tabs {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.pos-categories-tabs::-webkit-scrollbar {
    height: 4px;
}

.pos-categories-tabs::-webkit-scrollbar-thumb {
    background-color: var(--p-surface-300);
    border-radius: 2px;
}

.category-tab-btn {
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    color: var(--p-surface-700);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease-in-out;
}

.dark .category-tab-btn {
    border-color: var(--p-surface-700);
    background: var(--p-surface-800);
    color: var(--p-surface-300);
}

.category-tab-btn:hover {
    background: var(--p-surface-100);
    border-color: var(--p-surface-400);
}

.dark .category-tab-btn:hover {
    background: var(--p-surface-700);
}

.category-tab-btn.active {
    background: var(--p-primary-500);
    color: white;
    border-color: var(--p-primary-500);
}

.pos-grid-wrap {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

.pos-empty-grid {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60%;
    color: var(--p-surface-400);
    font-size: 1rem;
}

.pos-product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
}

.product-card {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0, 0, 0.2, 1);
    user-select: none;
    display: flex;
    flex-direction: column;
}

.dark .product-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.product-card:not(.disabled-card):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border-color: var(--p-primary-300);
}

.product-card.disabled-card {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--p-surface-100);
}

.dark .product-card.disabled-card {
    background: var(--p-surface-950);
}

.product-card-body {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.product-card-cat {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--p-primary-500);
    text-transform: uppercase;
}

.product-card-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--p-surface-800);
    margin: 0.25rem 0;
    line-clamp: 2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    height: 2.4rem;
}

.dark .product-card-title {
    color: var(--p-surface-100);
}

.product-card-sku {
    font-size: 0.7rem;
    color: var(--p-surface-400);
    margin-bottom: 0.5rem;
}

.product-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--p-surface-100);
    padding-top: 0.5rem;
}

.dark .product-card-footer {
    border-color: var(--p-surface-800);
}

.product-card-price {
    font-size: 0.9375rem;
    font-weight: 800;
    color: var(--p-surface-900);
}

.dark .product-card-price {
    color: var(--p-surface-0);
}

.product-card-stock {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
}

.stock-ok {
    background: #dcfce7;
    color: #166534;
}

.dark .stock-ok {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.stock-low {
    background: #fef3c7;
    color: #92400e;
}

.dark .stock-low {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
}

.stock-out {
    background: #fee2e2;
    color: #991b1b;
}

.dark .stock-out {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
}

@media (max-width: 900px) {
    .pos-container {
        flex-direction: column;
        overflow-y: auto;
    }
    .pos-left-panel {
        width: 100%;
        height: 400px;
        border-inline-end: none;
        border-bottom: 1px solid var(--p-surface-200);
    }
    .pos-right-panel {
        height: auto;
    }
}

/* ═══ Mode Toggle Bar ═══ */
.pos-mode-bar {
    display: flex;
    gap: 0;
    padding: 0.5rem 1rem;
    background: var(--p-surface-0);
    border-bottom: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .pos-mode-bar {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.pos-mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border: 2px solid var(--p-surface-200);
    background: var(--p-surface-50);
    color: var(--p-surface-500);
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
}

.pos-mode-btn:first-child {
    border-radius: 0.5rem 0 0 0.5rem;
    border-inline-end: 1px solid var(--p-surface-200);
}

.pos-mode-btn:last-child {
    border-radius: 0 0.5rem 0.5rem 0;
    border-inline-start: 1px solid var(--p-surface-200);
}

.dark .pos-mode-btn {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
    color: var(--p-surface-400);
}

.pos-mode-btn:hover {
    background: var(--p-surface-100);
}

.dark .pos-mode-btn:hover {
    background: var(--p-surface-800);
}

.pos-mode-active {
    background: var(--p-primary-500) !important;
    color: white !important;
    border-color: var(--p-primary-500) !important;
}

.pos-mode-active-return {
    background: #f59e0b !important;
    color: white !important;
    border-color: #f59e0b !important;
}

/* ═══ Returns Invoice List ═══ */
.returns-list-wrap {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

.returns-invoice-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.return-invoice-card {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    overflow: hidden;
}

.dark .return-invoice-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.return-invoice-card:hover {
    border-color: #f59e0b;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.12);
    transform: translateY(-1px);
}

.return-invoice-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem 0.5rem;
}

.return-invoice-number {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--p-surface-800);
}

.dark .return-invoice-number {
    color: var(--p-surface-100);
}

.return-invoice-date {
    font-size: 0.75rem;
    color: var(--p-surface-400);
}

.return-invoice-body {
    padding: 0 1rem 0.5rem;
}

.return-invoice-items-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
}

.return-invoice-item-chip {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: var(--p-surface-100);
    color: var(--p-surface-600);
    font-size: 0.75rem;
    font-weight: 600;
}

.dark .return-invoice-item-chip {
    background: var(--p-surface-800);
    color: var(--p-surface-300);
}

.return-invoice-more {
    background: var(--p-primary-50);
    color: var(--p-primary-600);
}

.dark .return-invoice-more {
    background: rgba(var(--p-primary-500), 0.15);
    color: var(--p-primary-400);
}

.return-invoice-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.return-invoice-cashier {
    font-size: 0.75rem;
    color: var(--p-surface-400);
}

.return-invoice-total {
    font-size: 1rem;
    font-weight: 800;
    color: var(--p-surface-900);
}

.dark .return-invoice-total {
    color: var(--p-surface-0);
}

.return-invoice-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem;
    background: #fef3c7;
    color: #92400e;
    font-size: 0.8rem;
    font-weight: 700;
    border-top: 1px solid #fde68a;
}

.dark .return-invoice-action {
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.2);
}

/* ═══ Return Dialog ═══ */
.return-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.return-dialog-order-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--p-surface-50);
    border-radius: 0.5rem;
    border: 1px solid var(--p-surface-200);
    font-size: 0.9rem;
    color: var(--p-surface-700);
}

.dark .return-dialog-order-info {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
    color: var(--p-surface-300);
}

.return-dialog-order-date {
    margin-inline-start: auto;
    font-size: 0.75rem;
    color: var(--p-surface-400);
}

.return-dialog-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 320px;
    overflow-y: auto;
}

.return-dialog-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-100);
}

.dark .return-dialog-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.return-dialog-item-info {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.return-dialog-item-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--p-surface-800);
}

.dark .return-dialog-item-name {
    color: var(--p-surface-100);
}

.return-dialog-item-meta {
    font-size: 0.75rem;
    color: var(--p-surface-400);
    margin-top: 0.125rem;
}

.return-dialog-item-qty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    min-width: 140px;
}

.return-qty-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.return-dialog-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: #fef3c7;
    border: 1px solid #fde68a;
    font-size: 0.9rem;
    font-weight: 700;
    color: #92400e;
}

.dark .return-dialog-summary {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.25);
    color: #fbbf24;
}

.return-dialog-summary-total {
    font-size: 1.125rem;
    font-weight: 800;
}
</style>
