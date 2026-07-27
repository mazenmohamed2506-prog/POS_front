<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { useToastStore } from "@/stores/base/toastStore";
import { Barcode, Trash2, Plus, Minus, CreditCard, Banknote, ShoppingCart, XCircle, Search, RotateCcw, Receipt, Package, AlertTriangle, HelpCircle, User, Wallet, Printer, CheckCircle, UserPlus } from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";

const posStore = ref(null);
posStore.value = usePosStore();
const toastStore = useToastStore();

const barcodeInput = ref("");
const barcodeInputRef = ref(null);

// Category and search query
const selectedCategory = ref("الكل");
const searchQuery = ref("");

// ── POS Mode: 'sell' or 'returns' ──
const posMode = ref("sell");

// ── Customers state ──
const customers = ref([]);
const selectedCustomerId = ref(null);
const showAddCustomerDialog = ref(false);
const newCustomerForm = ref({ name: "", phone: "", notes: "" });

// ── Receipt dialog state ──
const showReceiptModal = ref(false);
const completedOrder = ref(null);

const fetchCustomers = async () => {
    try {
        const res = await apiGet("/receivables/customers");
        customers.value = res.data || [];
    } catch (e) {
        console.error("Failed to load customers", e);
    }
};

const handleCreateCustomer = async () => {
    if (!newCustomerForm.value.name.trim()) return;
    try {
        const res = await apiPost("/receivables/customers", newCustomerForm.value, false);
        toastStore.addSuccessToast("تم إضافة العميل بنجاح");
        await fetchCustomers();
        selectedCustomerId.value = res.data.id;
        showAddCustomerDialog.value = false;
        newCustomerForm.value = { name: "", phone: "", notes: "" };
    } catch (e) {
        toastStore.addErrorToast("حدث خطأ أثناء إضافة العميل");
    }
};

const printReceipt = () => {
    window.print();
};

// ── Help Drawer ──
const showHelp = ref(false);
const posHelpSections = [
    {
        title: 'شاشة البيع',
        icon: ShoppingCart,
        color: '#ede9fe',
        iconColor: '#7c3aed',
        steps: [
            { title: 'اختر وضع البيع', desc: 'اضغط على "شاشة البيع" في أعلى القائمة' },
            { title: 'أضف المنتجات', desc: 'امسح الباركود أو ابحث بالاسم ثم اضغط على البطاقة' },
            { title: 'راجع السلة', desc: 'تحقق من الكميات والأسعار في قائمة السلة على اليسار' },
            { title: 'اختر طريقة الدفع', desc: 'اضغط "دفع نقدي" أو "بطاقة" أو "آجل" لإتمام عملية البيع' },
        ]
    },
    {
        title: 'وضع المرتجعات',
        icon: RotateCcw,
        color: '#fef3c7',
        iconColor: '#d97706',
        steps: [
            { title: 'انتقل لوضع المرتجعات', desc: 'اضغط على "المرتجعات" في شريط التبديل العلوي' },
            { title: 'ابحث عن الطلب', desc: 'أدخل رقم الطلب أو بيانات العميل للبحث' },
            { title: 'اختر الأصناف المرتجعة', desc: 'حدد المنتجات المراد إرجاعها والكميات المطلوبة' },
            { title: 'أكد المرتجع', desc: 'اضغط تأكيد لإتمام عملية الإرجاع واسترداد المبلغ' },
        ]
    },
    {
        title: 'إدارة السلة',
        icon: Package,
        color: '#d1fae5',
        iconColor: '#059669',
        steps: [
            { title: 'تعديل الكميات', desc: 'استخدم + و - بجانب كل منتج لضبط الكمية' },
            { title: 'حذف عنصر', desc: 'اضغط على أيقونة الحذف لإزالة منتج من السلة' },
            { title: 'تفريغ السلة', desc: 'اضغط "تفريغ" في أعلى السلة لحذف جميع العناصر' },
        ]
    },
];
const posHelpTips = [
    'تأكد من فتح وردية قبل البدء في البيع',
    'يمكنك مسح الباركود مباشرة وسيُضاف المنتج تلقائياً',
    'استخدم الفئات للتصفية السريعة للمنتجات',
    'المنتجات المنفدة تظهر بلون مختلف ولا يمكن إضافتها',
    'يمكن تطبيق خصم على الفاتورة كلها قبل الدفع',
];

// ── Returns state ──
const orderSearchQuery = ref("");
const showReturnDialog = ref(false);
const selectedOrder = ref(null);
const returnItems = ref([]);

const shakingCardId = ref(null);

// Focus barcode input on mount and after actions
const focusBarcode = async () => {
    await nextTick();
    barcodeInputRef.value?.$el?.focus();
};

onMounted(() => {
    posStore.value.fetchProducts();
    posStore.value.fetchInventory();
    posStore.value.fetchOrders();
    fetchCustomers();
    focusBarcode();
});

// Categories list computed dynamically
const categories = computed(() => {
    const cats = new Set(posStore.value.products.map((p) => p.category));
    return ["الكل", ...Array.from(cats)];
});

// Helper to get shelf stock from inventory state
const getShelfStock = (productId) => {
    const items = posStore.value.inventory.filter((i) => i.productId === productId);
    return items.reduce((sum, item) => sum + (item.shelfStock || 0), 0);
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
    if (product.isActive === false) {
        toastStore.addWarningToast(`المنتج "${product.name}" غير نشط ولا يمكن بيعه.`);
        shakingCardId.value = product.id;
        setTimeout(() => {
            if (shakingCardId.value === product.id) shakingCardId.value = null;
        }, 400);
        return;
    }
    if (!posStore.value.isShiftOpen) {
        toastStore.addWarningToast("يجب فتح وردية أولاً من صفحة الورديات لتتمكن من إجراء المبيعات وإضافة المنتجات!");
        return;
    }
    const stock = getShelfStock(product.id);
    if (stock <= 0) {
        toastStore.addWarningToast("المنتج غير متوفر على الرف");
        shakingCardId.value = product.id;
        setTimeout(() => {
            if (shakingCardId.value === product.id) shakingCardId.value = null;
        }, 400);
        return;
    }
    posStore.value.addToCart(product);
    focusBarcode();
};

// Scan barcode
const handleScan = async () => {
    const code = barcodeInput.value.trim();
    if (!code) return;

    try {
        const product = await posStore.value.scanBarcode(code);
        if (product) {
            if (product.isActive === false) {
                toastStore.addWarningToast(`المنتج "${product.name}" غير نشط ولا يمكن بيعه.`);
            } else {
                const stock = getShelfStock(product.id);
                if (stock <= 0) {
                    toastStore.addWarningToast("المنتج غير متوفر على الرف");
                } else {
                    posStore.value.addToCart(product);
                }
            }
        }
    } catch (err) {
        toastStore.addErrorToast("المنتج غير موجود");
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
    returnItems.value = (order.items || []).map((item) => {
        const retQty = item.returnedQuantity ?? 0;
        const remQty = item.remainingReturnableQuantity ?? Math.max(0, (item.qty || item.quantity || 0) - retQty);
        return {
            ...item,
            returnedQty: retQty,
            maxReturnable: remQty,
            returnQty: 0,
        };
    });
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
        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="شاشة نقطة البيع"
            page-subtitle="دليل البيع والمرتجعات"
            :page-icon="ShoppingCart"
            header-gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            :sections="posHelpSections"
            :tips="posHelpTips"
        />

        <!-- ═══ LEFT PANEL: Cart & Checkout ═══ -->
        <div class="pos-cart-panel">
            <!-- Cart Header -->
            <div class="pos-cart-header">
                <div class="cart-header-left">
                    <div class="cart-icon-wrap">
                        <ShoppingCart :size="20" />
                    </div>
                    <div class="cart-header-info">
                        <h2 class="cart-header-title">سلة المبيعات</h2>
                        <span class="cart-header-count" v-if="posStore.cartItemCount > 0">
                            {{ posStore.cartItemCount }} عنصر
                        </span>
                        <span class="cart-header-count empty" v-else>فارغة</span>
                    </div>
                </div>
                <div class="cart-header-actions">
                    <button
                        class="pos-help-btn"
                        @click="showHelp = true"
                        title="دليل الاستخدام"
                    >
                        <HelpCircle :size="16" />
                    </button>
                    <button
                        v-if="posStore.cart.length > 0"
                        class="pos-clear-btn"
                        @click="posStore.clearCart()"
                        title="مسح السلة"
                    >
                        <XCircle :size="14" />
                        <span>تفريغ</span>
                    </button>
                </div>
            </div>

            <!-- Cart Items List -->
            <div class="pos-cart-items-wrap">
                <div v-if="posStore.cart.length === 0" class="cart-empty-state">
                    <div class="cart-empty-icon">
                        <ShoppingCart :size="40" />
                    </div>
                    <p class="cart-empty-text">السلة فارغة</p>
                    <p class="cart-empty-hint">اختر منتجات من القائمة لإضافتها</p>
                </div>

                <TransitionGroup v-else name="cart-item" tag="div" class="cart-items-list">
                    <div
                        v-for="(item, index) in posStore.cart"
                        :key="item.id"
                        class="cart-item-card"
                    >
                        <div class="cart-item-index">{{ index + 1 }}</div>
                        <div class="cart-item-info">
                            <span class="cart-item-name">{{ item.name }}</span>
                            <span class="cart-item-sku">{{ item.sku }}</span>
                        </div>
                        <div class="cart-item-qty-controls">
                            <button class="qty-btn qty-btn-minus" @click="posStore.updateCartQty(item.id, item.qty - 1)">
                                <Minus :size="14" />
                            </button>
                            <span class="qty-value">{{ item.qty }}</span>
                            <button class="qty-btn qty-btn-plus" @click="posStore.updateCartQty(item.id, item.qty + 1)">
                                <Plus :size="14" />
                            </button>
                        </div>
                        <div class="cart-item-total-col">
                            <template v-if="item.itemDiscount > 0">
                                <span class="cart-item-original">{{ formatCurrency(item.price * item.qty) }}</span>
                                <span class="cart-item-discount-badge">-{{ formatCurrency(item.itemDiscount * item.qty) }}</span>
                                <span class="cart-item-net">{{ formatCurrency((item.price - item.itemDiscount) * item.qty) }}</span>
                            </template>
                            <span v-else class="cart-item-net">{{ formatCurrency(item.price * item.qty) }}</span>
                        </div>
                        <button class="cart-item-remove" @click="posStore.removeFromCart(item.id)" title="حذف">
                            <Trash2 :size="14" />
                        </button>
                    </div>
                </TransitionGroup>
            </div>

            <!-- Summary & Payment -->
            <div class="pos-checkout-section">
                <!-- Customer Selection Bar -->
                <div class="customer-select-bar mb-3 p-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-xs font-bold text-surface-700 dark:text-surface-300 flex items-center gap-1">
                            <User :size="13" class="text-primary-500" />
                            <span>العميل:</span>
                        </label>
                        <button class="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline flex items-center gap-1" @click="showAddCustomerDialog = true">
                            <UserPlus :size="12" />
                            <span>+ عميل جديد</span>
                        </button>
                    </div>
                    <Select
                        v-model="selectedCustomerId"
                        :options="customers"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="عميل نقدي (عام)"
                        showClear
                        filter
                        fluid
                        size="small"
                        class="w-full text-xs"
                    />
                </div>

                <div class="checkout-summary">
                    <div class="summary-row">
                        <span class="summary-label">المجموع الفرعي</span>
                        <span class="summary-value">{{ formatCurrency(posStore.cartSubtotal) }}</span>
                    </div>
                    <div class="summary-row" v-if="posStore.cartItemDiscountTotal > 0">
                        <span class="summary-label discount-label">خصم الأصناف</span>
                        <span class="summary-value discount-value">-{{ formatCurrency(posStore.cartItemDiscountTotal) }}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">الضريبة ({{ (posStore.taxRate * 100).toFixed(0) }}%)</span>
                        <span class="summary-value">{{ formatCurrency(posStore.cartTax) }}</span>
                    </div>
                    <div class="summary-divider"></div>
                    <div class="summary-row total-row">
                        <span class="summary-label total-label">الإجمالي</span>
                        <span class="summary-value total-value">{{ formatCurrency(posStore.cartTotal) }}</span>
                    </div>
                </div>

                <div class="checkout-actions">
                    <button
                        class="pay-btn pay-cash"
                        :disabled="posStore.cart.length === 0 || posStore.loading || !posStore.isShiftOpen"
                        @click="handleCheckout('cash')"
                    >
                        <Banknote :size="20" />
                        <span class="pay-btn-label">نقدي</span>
                    </button>
                    <button
                        class="pay-btn pay-card"
                        :disabled="posStore.cart.length === 0 || posStore.loading || !posStore.isShiftOpen"
                        @click="handleCheckout('card')"
                    >
                        <CreditCard :size="20" />
                        <span class="pay-btn-label">بطاقة</span>
                    </button>
                    <button
                        class="pay-btn pay-credit"
                        :disabled="posStore.cart.length === 0 || posStore.loading || !posStore.isShiftOpen"
                        @click="handleCheckout('credit')"
                    >
                        <Wallet :size="20" />
                        <span class="pay-btn-label">آجل</span>
                    </button>
                </div>

                <div v-if="!posStore.isShiftOpen" class="shift-warning">
                    <AlertTriangle :size="16" />
                    <span>يجب فتح وردية جديدة لإجراء العمليات</span>
                </div>
            </div>
        </div>

        <!-- ═══ RIGHT PANEL: Mode Toggle + Content ═══ -->
        <div class="pos-catalog-panel">
            <!-- Mode Toggle (Segmented Control) -->
            <div class="pos-mode-bar">
                <div class="mode-segmented">
                    <div class="mode-slider" :class="{ 'mode-slider-returns': posMode === 'returns' }"></div>
                    <button
                        class="mode-btn"
                        :class="{ 'mode-active': posMode === 'sell' }"
                        @click="posMode = 'sell'"
                    >
                        <ShoppingCart :size="16" />
                        <span>شاشة البيع</span>
                    </button>
                    <button
                        class="mode-btn"
                        :class="{ 'mode-active': posMode === 'returns' }"
                        @click="posMode = 'returns'"
                    >
                        <RotateCcw :size="16" />
                        <span>المرتجعات</span>
                    </button>
                </div>
            </div>


            <!-- ═══ SELL MODE ═══ -->
            <template v-if="posMode === 'sell'">
                <!-- Search & scan topbar -->
                <div class="pos-search-bar">
                    <form @submit.prevent="handleScan" class="search-group">
                        <div class="search-field">
                            <Barcode :size="16" class="search-icon" />
                            <InputText
                                ref="barcodeInputRef"
                                v-model="barcodeInput"
                                placeholder= "مسح الباركود..."
                                autocomplete="off"
                                size="small"
                                fluid
                                class="search-input"
                            />
                        </div>
                    </form>
                    <div class="search-field">
                        <Search :size="16" class="search-icon" />
                        <InputText
                            v-model="searchQuery"
                            placeholder="بحث بالاسم أو الرمز..."
                            
                            autocomplete="off"
                            size="small"
                            fluid
                            class="search-input"
                        />
                    </div>
                </div>

                <!-- Categories Tabs -->
                <div class="pos-categories">
                    <div class="categories-scroll">
                        <button
                            v-for="cat in categories"
                            :key="cat"
                            class="cat-pill"
                            :class="{ active: selectedCategory === cat }"
                            @click="selectedCategory = cat"
                        >
                            {{ cat }}
                        </button>
                    </div>
                </div>

                <!-- Products Grid -->
                <div class="pos-grid-wrap">
                    <Transition name="fade" mode="out-in">
                        <div v-if="filteredProducts.length === 0" class="pos-empty-state">
                            <Package :size="48" class="empty-icon" />
                            <span>لا توجد منتجات مطابقة</span>
                        </div>
                        <TransitionGroup v-else name="grid" tag="div" class="product-grid">
                            <div
                                v-for="prod in filteredProducts"
                                :key="prod.id"
                                class="p-card"
                                :class="{
                                    'p-card-disabled': prod.isActive === false || getShelfStock(prod.id) === 0 || !posStore.isShiftOpen,
                                    'p-card-oos': getShelfStock(prod.id) === 0 || prod.isActive === false,
                                    'shake': shakingCardId === prod.id
                                }"
                                @click="handleProductClick(prod)"
                            >
                                <div class="p-card-cat-strip">
                                    <span>{{ prod.category }}</span>
                                </div>
                                <div class="p-card-body">
                                    <h4 class="p-card-name">{{ prod.name }}</h4>
                                    <span class="p-card-sku">{{ prod.sku }}</span>
                                </div>
                                <div class="p-card-footer">
                                    <span class="p-card-price">{{ formatCurrency(prod.price) }}</span>
                                    <span class="p-card-stock" :class="prod.isActive === false ? 'stock-danger' : getStockClass(getShelfStock(prod.id))">
                                        {{ prod.isActive === false ? 'غير نشط' : (getShelfStock(prod.id) > 0 ? getShelfStock(prod.id) : 'نفذ') }}
                                    </span>
                                </div>
                                <div v-if="prod.isActive === false" class="p-card-oos-overlay" style="background: rgba(239, 68, 68, 0.15);">
                                    <span style="background: #ef4444; color: white;">غير نشط</span>
                                </div>
                                <div v-else-if="getShelfStock(prod.id) === 0" class="p-card-oos-overlay">
                                    <span>نفذ المخزون</span>
                                </div>
                            </div>
                        </TransitionGroup>
                    </Transition>
                </div>
            </template>

            <!-- ═══ RETURNS MODE ═══ -->
            <template v-else>
                <div class="pos-search-bar">
                    <div class="search-field" style="flex:1">
                        <Search :size="16" class="search-icon" />
                        <InputText
                            v-model="orderSearchQuery"
                            placeholder="ابحث برقم الفاتورة أو الكاشير..."
                            autocomplete="off"
                            size="small"
                            fluid
                            class="search-input"
                        />
                    </div>
                </div>

                <div class="returns-wrap">
                    <Transition name="fade" mode="out-in">
                        <div v-if="filteredSaleOrders.length === 0" class="pos-empty-state">
                            <Receipt :size="48" class="empty-icon" />
                            <span>لا توجد فواتير بيع مسجلة</span>
                        </div>
                        <TransitionGroup v-else name="grid" tag="div" class="returns-grid">
                            <div
                                v-for="order in filteredSaleOrders"
                                :key="order.id"
                                class="return-card"
                                @click="openReturnDialog(order)"
                            >
                                <div class="return-card-header">
                                    <div class="return-card-id">
                                        <Receipt :size="14" />
                                        <span>{{ order.orderNumber }}</span>
                                    </div>
                                    <span class="return-card-date">{{ formatDate(order.date) }}</span>
                                </div>
                                <div class="return-card-items">
                                    <span
                                        v-for="(item, idx) in order.items.slice(0, 3)"
                                        :key="idx"
                                        class="return-item-chip"
                                    >
                                        {{ item.name }} × {{ item.qty }}
                                    </span>
                                    <span v-if="order.items.length > 3" class="return-item-chip more">
                                        +{{ order.items.length - 3 }}
                                    </span>
                                </div>
                                <div class="return-card-footer">
                                    <span class="return-card-cashier">{{ order.cashier || '—' }}</span>
                                    <span class="return-card-total">{{ formatCurrency(order.total) }}</span>
                                </div>
                                <div class="return-card-action">
                                    <RotateCcw :size="13" />
                                    <span>اختيار أصناف للإرجاع</span>
                                </div>
                            </div>
                        </TransitionGroup>
                    </Transition>
                </div>
            </template>
        </div>

        <!-- ═══ RETURN DIALOG ═══ -->
        <Dialog
            v-model:visible="showReturnDialog"
            header="معالجة مرتجع الفاتورة"
            :style="{ width: '560px' }"
            modal
            dismissableMask
        >
            <div class="return-dialog-content" v-if="selectedOrder">
                <div class="return-dialog-order-info">
                    <Receipt :size="16" class="text-primary-500" />
                    <span>فاتورة رقم: <strong class="font-mono text-surface-900 dark:text-surface-50">{{ selectedOrder.orderNumber }}</strong></span>
                    <span class="return-dialog-order-date">{{ formatDate(selectedOrder.date) }}</span>
                </div>

                <div class="return-dialog-items">
                    <div
                        v-for="(item, idx) in returnItems"
                        :key="idx"
                        class="return-dialog-item"
                        :class="{ 'opacity-60': item.maxReturnable <= 0 }"
                    >
                        <div class="return-dialog-item-info flex-1">
                            <div class="flex items-center gap-2">
                                <span class="return-dialog-item-name font-bold">{{ item.name }}</span>
                                <Tag v-if="item.maxReturnable <= 0" value="مسترجع بالكامل" severity="danger" size="small" />
                                <Tag v-else-if="item.returnedQty > 0" :value="'مرتجع: ' + item.returnedQty" severity="warn" size="small" />
                            </div>
                            <span class="return-dialog-item-meta text-xs">
                                السعر: {{ formatCurrency(item.price) }} · المتاح للإرجاع: <strong class="text-emerald-600 dark:text-emerald-400 font-bold">{{ item.maxReturnable }}</strong> (من أصل {{ item.qty }})
                            </span>
                        </div>
                        <div class="return-dialog-item-qty">
                            <label class="return-qty-label">المستردة</label>
                            <InputNumber
                                v-if="item.maxReturnable > 0"
                                v-model="item.returnQty"
                                :min="0"
                                :max="item.maxReturnable"
                                fluid
                                showButtons
                                buttonLayout="horizontal"
                                :inputStyle="{ width: '3.5rem', textAlign: 'center' }"
                            />
                            <span v-else class="text-xs text-red-500 font-bold block text-center">غير متاح</span>
                        </div>
                    </div>
                </div>

                <div class="return-dialog-summary mt-2" v-if="returnDialogTotal > 0">
                    <span>إجمالي القيمة المستردة:</span>
                    <span class="return-dialog-summary-total font-mono">{{ formatCurrency(returnDialogTotal) }}</span>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showReturnDialog = false" />
                    <Button
                        label="تأكيد المرتجع"
                        severity="warn"
                        @click="handleReturn"
                        :loading="posStore.loading"
                        :disabled="returnDialogTotal === 0"
                    />
                </div>
            </template>
        </Dialog>

        <!-- Add Customer Dialog -->
        <Dialog
            v-model:visible="showAddCustomerDialog"
            header="إضافة عميل جديد"
            :style="{ width: '420px' }"
            modal
            dismissableMask
        >
            <div class="flex flex-col gap-4 py-2">
                <div class="flex flex-col gap-1.5">
                    <label class="font-bold text-sm">اسم العميل <span class="text-red-500">*</span></label>
                    <InputText v-model="newCustomerForm.name" placeholder="أدخل اسم العميل" fluid size="small" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="font-bold text-sm">رقم الهاتف</label>
                    <InputText v-model="newCustomerForm.phone" placeholder="01xxxxxxxxx" fluid size="small" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="font-bold text-sm">ملاحظات</label>
                    <Textarea v-model="newCustomerForm.notes" rows="2" placeholder="أي ملاحظات إضافية" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showAddCustomerDialog = false" />
                    <Button label="حفظ العميل" severity="primary" @click="handleCreateCustomer" :disabled="!newCustomerForm.name.trim()" />
                </div>
            </template>
        </Dialog>

        <!-- Thermal Receipt Modal -->
        <Dialog
            v-model:visible="showReceiptModal"
            header="إيصال فاتورة البيع"
            :style="{ width: '400px' }"
            modal
            dismissableMask
        >
            <div class="receipt-printable-area p-4 text-surface-900 bg-white font-mono text-sm leading-tight border border-surface-200 rounded-lg shadow-inner" v-if="completedOrder">
                <!-- Header -->
                <div class="text-center pb-3 mb-3 border-b border-dashed border-surface-300">
                    <h2 class="font-black text-xl text-black">{{ posStore.settings.storeName || 'نقطة البيع' }}</h2>
                    <p class="text-xs text-surface-600 mt-0.5">فاتورة بيع إلكترونية</p>
                    <div class="mt-2 text-xs text-surface-600 flex justify-between px-1">
                        <span>رقم الفاتورة: <strong class="text-black font-bold">{{ completedOrder.orderNumber }}</strong></span>
                        <span>{{ formatDate(completedOrder.date) }}</span>
                    </div>
                </div>

                <!-- Items -->
                <div class="space-y-2 pb-3 border-b border-dashed border-surface-300 text-xs">
                    <div v-for="item in completedOrder.items" :key="item.id" class="flex justify-between items-start">
                        <div>
                            <div class="font-bold text-black text-sm">{{ item.name }}</div>
                            <div class="text-surface-500">{{ item.qty }} × {{ formatCurrency(item.price) }}</div>
                        </div>
                        <div class="font-bold text-black text-end text-sm">{{ formatCurrency(item.total) }}</div>
                    </div>
                </div>

                <!-- Financial Totals -->
                <div class="py-2.5 border-b border-dashed border-surface-300 text-xs space-y-1.5">
                    <div class="flex justify-between">
                        <span>المجموع الفرعي:</span>
                        <span>{{ formatCurrency(completedOrder.subtotal) }}</span>
                    </div>
                    <div class="flex justify-between text-red-600" v-if="completedOrder.discount > 0">
                        <span>الخصم:</span>
                        <span>-{{ formatCurrency(completedOrder.discount) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>الضريبة:</span>
                        <span>{{ formatCurrency(completedOrder.tax) }}</span>
                    </div>
                    <div class="flex justify-between font-extrabold text-base text-black pt-2 border-t border-surface-200">
                        <span>الإجمالي الكلي:</span>
                        <span>{{ formatCurrency(completedOrder.total) }}</span>
                    </div>
                </div>

                <!-- Payment Info -->
                <div class="pt-3 text-xs text-center space-y-1">
                    <p class="font-bold text-surface-800">
                        طريقة الدفع: 
                        <span class="text-primary-700 font-extrabold px-2 py-0.5 rounded bg-primary-50 border border-primary-200">
                            {{ completedOrder.paymentMethod === 'cash' ? 'نقدي (كاش)' : completedOrder.paymentMethod === 'card' ? 'بطاقة بنكية' : 'آجل (حساب عميل)' }}
                        </span>
                    </p>
                    <p class="text-surface-500 text-xs mt-3">شكراً لزيارتكم ونتطلع لخدمتكم دائماً!</p>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-between w-full no-print">
                    <Button label="إغلاق" outlined severity="secondary" @click="showReceiptModal = false" class="flex-1" />
                    <Button label="طباعة الفاتورة" severity="primary" @click="printReceipt" class="flex-1">
                        <template #icon><Printer :size="16" class="me-1" /></template>
                    </Button>
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════
   POS CONTAINER
   ══════════════════════════════════════════════ */
.pos-container {
    display: flex;
    height: calc(100vh - 3.5rem);
    overflow: hidden;
    background: var(--p-surface-50);
}

.dark .pos-container {
    background: var(--p-surface-950);
}

/* ══════════════════════════════════════════════
   LEFT PANEL — CART
   ══════════════════════════════════════════════ */
.pos-cart-panel {
    width: clamp(360px, 28vw, 480px);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--p-surface-0);
    border-inline-end: 1px solid var(--p-surface-200);
    box-shadow: 4px 0 24px -8px rgba(0, 0, 0, 0.06);
    z-index: 2;
}

.dark .pos-cart-panel {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: 4px 0 24px -8px rgba(0, 0, 0, 0.3);
}

/* ── Cart Header ── */
.pos-cart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    flex-shrink: 0;
}

.cart-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.cart-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    color: white;
}

.cart-header-info {
    display: flex;
    flex-direction: column;
}

.cart-header-title {
    font-size: 1rem;
    font-weight: 800;
    color: white;
    margin: 0;
    line-height: 1.2;
}

.cart-header-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
}

.cart-header-count.empty {
    opacity: 0.6;
}

.cart-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pos-help-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    color: white;
    cursor: pointer;
    transition: all 0.2s;
}

.pos-help-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

.pos-clear-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    color: white;
    cursor: pointer;
    transition: all 0.2s;
}

.pos-clear-btn:hover {
    background: rgba(239, 68, 68, 0.9);
    border-color: transparent;
}

/* ── Cart Items ── */
.pos-cart-items-wrap {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
}

.pos-cart-items-wrap::-webkit-scrollbar {
    width: 4px;
}

.pos-cart-items-wrap::-webkit-scrollbar-thumb {
    background: var(--p-surface-300);
    border-radius: 2px;
}

.dark .pos-cart-items-wrap::-webkit-scrollbar-thumb {
    background: var(--p-surface-700);
}

.cart-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 0.5rem;
    padding: 2rem;
}

.cart-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5rem;
    height: 5rem;
    border-radius: 50%;
    background: var(--p-surface-100);
    color: var(--p-surface-300);
    margin-bottom: 0.5rem;
}

.dark .cart-empty-icon {
    background: var(--p-surface-800);
    color: var(--p-surface-600);
}

.cart-empty-text {
    font-size: 1rem;
    font-weight: 700;
    color: var(--p-surface-400);
    margin: 0;
}

.cart-empty-hint {
    font-size: 0.8rem;
    color: var(--p-surface-350);
    margin: 0;
}

.cart-items-list {
    display: flex;
    flex-direction: column;
}

.cart-item-card {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--p-surface-100);
    transition: background 0.15s;
}

.dark .cart-item-card {
    border-color: var(--p-surface-800);
}

.cart-item-card:hover {
    background: var(--p-surface-50);
}

.dark .cart-item-card:hover {
    background: var(--p-surface-850);
}

.cart-item-index {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--p-surface-100);
    color: var(--p-surface-500);
    font-size: 0.65rem;
    font-weight: 800;
    flex-shrink: 0;
}

.dark .cart-item-index {
    background: var(--p-surface-800);
    color: var(--p-surface-400);
}

.cart-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.cart-item-name {
    font-size: 0.825rem;
    font-weight: 700;
    color: var(--p-surface-800);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
}

.dark .cart-item-name {
    color: var(--p-surface-100);
}

.cart-item-sku {
    font-size: 0.65rem;
    font-family: monospace;
    color: var(--p-surface-400);
}

/* ── Qty Controls ── */
.cart-item-qty-controls {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    flex-shrink: 0;
}

.qty-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    color: var(--p-surface-500);
    cursor: pointer;
    transition: all 0.15s;
}

.dark .qty-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}

.qty-btn-minus:hover {
    background: #fef2f2;
    border-color: #fecaca;
    color: #ef4444;
}

.dark .qty-btn-minus:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #f87171;
}

.qty-btn-plus:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}

.dark .qty-btn-plus:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
}

.qty-value {
    min-width: 1.75rem;
    text-align: center;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--p-surface-800);
}

.dark .qty-value {
    color: var(--p-surface-100);
}

/* ── Cart Item Total ── */
.cart-item-total-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
    min-width: 5rem;
    gap: 1px;
}

.cart-item-original {
    font-size: 0.65rem;
    color: var(--p-surface-400);
    text-decoration: line-through;
}

.cart-item-discount-badge {
    font-size: 0.6rem;
    color: #ef4444;
    font-weight: 700;
}

.cart-item-net {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--p-surface-800);
}

.dark .cart-item-net {
    color: var(--p-surface-100);
}

.cart-item-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    border: none;
    background: transparent;
    color: var(--p-surface-350);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}

.cart-item-remove:hover {
    background: #fef2f2;
    color: #ef4444;
}

.dark .cart-item-remove:hover {
    background: rgba(239, 68, 68, 0.12);
    color: #f87171;
}

/* Cart Item Transitions */
.cart-item-enter-active { transition: all 0.3s ease; }
.cart-item-leave-active { transition: all 0.2s ease; }
.cart-item-enter-from { opacity: 0; transform: translateX(20px); }
.cart-item-leave-to { opacity: 0; transform: translateX(-20px); }

/* ══════════════════════════════════════════════
   CHECKOUT SECTION
   ══════════════════════════════════════════════ */
.pos-checkout-section {
    flex-shrink: 0;
    padding: 1rem 1.25rem 1.25rem;
    background: var(--p-surface-0);
    border-top: 1px solid var(--p-surface-200);
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04);
}

.dark .pos-checkout-section {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2);
}

.checkout-summary {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.summary-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.summary-value {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--p-surface-700);
}

.dark .summary-value {
    color: var(--p-surface-300);
}

.discount-label,
.discount-value {
    color: #ef4444 !important;
}

.summary-divider {
    border-top: 2px dashed var(--p-surface-200);
    margin: 0.25rem 0;
}

.dark .summary-divider {
    border-color: var(--p-surface-700);
}

.total-label {
    font-size: 1.05rem !important;
    font-weight: 900 !important;
    color: var(--p-surface-800) !important;
}

.dark .total-label {
    color: var(--p-surface-100) !important;
}

.total-value {
    font-size: 1.35rem !important;
    font-weight: 900 !important;
    color: var(--p-primary-600) !important;
    letter-spacing: -0.02em;
}

.dark .total-value {
    color: var(--p-primary-400) !important;
}

/* ── Payment Buttons ── */
.checkout-actions {
    display: flex;
    gap: 0.625rem;
}

.pay-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    padding: 1rem;
    border-radius: 0.75rem;
    border: none;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    color: white;
}

.pay-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%);
    pointer-events: none;
}

.pay-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none !important;
}

.pay-btn:not(:disabled):hover {
    transform: translateY(-2px);
}

.pay-btn:not(:disabled):active {
    transform: translateY(0) scale(0.98);
}

.pay-cash {
    background: linear-gradient(135deg, #22c55e, #16a34a);
}

.pay-cash:not(:disabled):hover {
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
}

.pay-card {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.pay-card:not(:disabled):hover {
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
}

.pay-credit {
    background: linear-gradient(135deg, #ec4899, #db2777);
}

.pay-credit:not(:disabled):hover {
    box-shadow: 0 6px 20px rgba(236, 72, 153, 0.35);
}

.pay-card {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.pay-card:not(:disabled):hover {
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
}

.pay-btn-label {
    position: relative;
    z-index: 1;
}

/* ── Shift Warning ── */
.shift-warning {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.625rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    color: #92400e;
    border: 1px solid #fcd34d;
}

.dark .shift-warning {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.08));
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.25);
}

/* ══════════════════════════════════════════════
   RIGHT PANEL — CATALOG
   ══════════════════════════════════════════════ */
.pos-catalog-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--p-surface-50);
    min-width: 0;
}

.dark .pos-catalog-panel {
    background: var(--p-surface-950);
}

/* ── Mode Toggle ── */
.pos-mode-bar {
    padding: 0.75rem 1.25rem;
    background: var(--p-surface-0);
    border-bottom: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .pos-mode-bar {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.mode-segmented {
    display: flex;
    position: relative;
    background: var(--p-surface-150, var(--p-surface-200));
    border-radius: 0.625rem;
    padding: 0.25rem;
    gap: 0.25rem;
}

.dark .mode-segmented {
    background: var(--p-surface-800);
}

.mode-slider {
    position: absolute;
    top: 0.25rem;
    bottom: 0.25rem;
    inset-inline-start: 0.25rem;
    width: calc(50% - 0.375rem);
    border-radius: 0.5rem;
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 0;
}

.mode-slider-returns {
    inset-inline-start: calc(50% + 0.125rem);
    background: linear-gradient(135deg, #f59e0b, #d97706);
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--p-surface-700);
    font-size: 0.875rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
    z-index: 1;
}

.dark .mode-btn {
    color: var(--p-surface-300);
}

.mode-btn:hover:not(.mode-active) {
    color: var(--p-surface-900);
}

.dark .mode-btn:hover:not(.mode-active) {
    color: var(--p-surface-100);
}

.mode-btn.mode-active {
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* ── Search Bar ── */
.pos-search-bar {
    display: flex;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    background: var(--p-surface-0);
    border-bottom: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .pos-search-bar {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.search-group {
    flex: 1;
}

.search-field {
    position: relative;
    flex: 1;
}

.search-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--p-surface-400);
    z-index: 1;
    pointer-events: none;
}

.search-input {
    padding-right: 2.75rem !important;
}

/* ── Categories ── */
.pos-categories {
    background: var(--p-surface-0);
    border-bottom: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .pos-categories {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.categories-scroll {
    display: flex;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    overflow-x: auto;
    mask-image: linear-gradient(to left, transparent, black 3%, black 97%, transparent);
    -webkit-mask-image: linear-gradient(to left, transparent, black 3%, black 97%, transparent);
}

.categories-scroll::-webkit-scrollbar {
    height: 3px;
}

.categories-scroll::-webkit-scrollbar-thumb {
    background: var(--p-surface-300);
    border-radius: 2px;
}

.cat-pill {
    padding: 0.375rem 1rem;
    border-radius: 9999px;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    color: var(--p-surface-600);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
}

.dark .cat-pill {
    border-color: var(--p-surface-700);
    background: var(--p-surface-800);
    color: var(--p-surface-400);
}

.cat-pill:hover {
    background: var(--p-surface-100);
    border-color: var(--p-surface-300);
    color: var(--p-surface-700);
}

.dark .cat-pill:hover {
    background: var(--p-surface-700);
    color: var(--p-surface-200);
}

.cat-pill.active {
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    color: white;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}

/* ══════════════════════════════════════════════
   PRODUCT GRID
   ══════════════════════════════════════════════ */
.pos-grid-wrap {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
}

.pos-grid-wrap::-webkit-scrollbar {
    width: 5px;
}

.pos-grid-wrap::-webkit-scrollbar-thumb {
    background: var(--p-surface-300);
    border-radius: 3px;
}

.pos-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 50%;
    gap: 0.75rem;
    color: var(--p-surface-400);
    font-size: 0.95rem;
    font-weight: 600;
}

.empty-icon {
    color: var(--p-surface-250);
}

.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
    gap: 0.875rem;
}

/* ── Product Card ── */
.p-card {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 0.875rem;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}

.dark .p-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.p-card:not(.p-card-disabled):hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--p-primary-400);
    border-color: var(--p-primary-400);
}

.dark .p-card:not(.p-card-disabled):hover {
    box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--p-primary-500);
    border-color: var(--p-primary-500);
}

.p-card:not(.p-card-disabled):active {
    transform: translateY(-1px) scale(0.98);
}

.p-card-cat-strip {
    padding: 0.375rem 0.875rem;
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    color: white;
    font-size: 0.625rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.p-card-body {
    padding: 0.75rem 0.875rem 0.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
}

.p-card-name {
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--p-surface-800);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.35;
    min-height: 2.4em;
}

.dark .p-card-name {
    color: var(--p-surface-100);
}

.p-card-sku {
    font-size: 0.65rem;
    font-family: monospace;
    color: var(--p-surface-400);
    margin-top: 0.25rem;
}

.p-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 0.875rem;
    border-top: 1px solid var(--p-surface-100);
    margin-top: auto;
}

.dark .p-card-footer {
    border-color: var(--p-surface-800);
}

.p-card-price {
    font-size: 0.9rem;
    font-weight: 900;
    color: var(--p-surface-900);
}

.dark .p-card-price {
    color: var(--p-surface-50);
}

.p-card-stock {
    font-size: 0.675rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    line-height: 1.2;
}

.stock-ok {
    background: #dcfce7;
    color: #15803d;
}

.dark .stock-ok {
    background: rgba(34, 197, 94, 0.12);
    color: #4ade80;
}

.stock-low {
    background: #fef3c7;
    color: #92400e;
}

.dark .stock-low {
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
}

.stock-out {
    background: #fee2e2;
    color: #991b1b;
}

.dark .stock-out {
    background: rgba(239, 68, 68, 0.12);
    color: #f87171;
}

/* ── Out of Stock Card ── */
.p-card-disabled {
    cursor: not-allowed;
}

.p-card-oos {
    opacity: 0.6;
}

.p-card-oos .p-card-cat-strip {
    background: linear-gradient(135deg, var(--p-surface-400), var(--p-surface-500));
}

.p-card-oos-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(1px);
    pointer-events: none;
}

.dark .p-card-oos-overlay {
    background: rgba(0, 0, 0, 0.4);
}

.p-card-oos-overlay span {
    padding: 0.375rem 1rem;
    border-radius: 0.375rem;
    background: rgba(239, 68, 68, 0.9);
    color: white;
    font-size: 0.75rem;
    font-weight: 800;
    transform: rotate(-8deg);
}

/* ══════════════════════════════════════════════
   RETURNS SECTION
   ══════════════════════════════════════════════ */
.returns-wrap {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
}

.returns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 0.875rem;
}

.return-card {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 0.875rem;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    border-inline-start: 3px solid var(--p-surface-300);
}

.dark .return-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    border-inline-start-color: var(--p-surface-600);
}

.return-card:hover {
    border-inline-start-color: #f59e0b;
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.12);
}

.dark .return-card:hover {
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.08);
}

.return-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem 0.5rem;
}

.return-card-id {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--p-surface-800);
    font-family: monospace;
}

.return-card-id svg {
    color: var(--p-primary-500);
}

.dark .return-card-id {
    color: var(--p-surface-100);
}

.return-card-date {
    font-size: 0.7rem;
    color: var(--p-surface-400);
}

.return-card-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0.25rem 1rem 0.5rem;
}

.return-item-chip {
    display: inline-block;
    padding: 0.2rem 0.625rem;
    border-radius: 9999px;
    background: var(--p-surface-100);
    color: var(--p-surface-600);
    font-size: 0.7rem;
    font-weight: 700;
}

.dark .return-item-chip {
    background: var(--p-surface-800);
    color: var(--p-surface-300);
}

.return-item-chip.more {
    background: var(--p-primary-50);
    color: var(--p-primary-600);
}

.dark .return-item-chip.more {
    background: rgba(99, 102, 241, 0.15);
    color: var(--p-primary-400);
}

.return-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--p-surface-100);
}

.dark .return-card-footer {
    border-color: var(--p-surface-800);
}

.return-card-cashier {
    font-size: 0.7rem;
    color: var(--p-surface-400);
}

.return-card-total {
    font-size: 1rem;
    font-weight: 900;
    color: var(--p-surface-800);
    font-family: monospace;
}

.dark .return-card-total {
    color: var(--p-surface-100);
}

.return-card-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    color: #92400e;
    font-size: 0.75rem;
    font-weight: 800;
    transition: all 0.2s;
}

.dark .return-card-action {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
    color: #fbbf24;
}

.return-card:hover .return-card-action {
    background: linear-gradient(135deg, #fde68a, #fcd34d);
}

.dark .return-card:hover .return-card-action {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.1));
}

/* ══════════════════════════════════════════════
   RETURN DIALOG
   ══════════════════════════════════════════════ */
.return-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.return-dialog-order-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    background: var(--p-surface-50);
    border-radius: 0.75rem;
    border: 1px solid var(--p-surface-200);
    font-size: 0.9rem;
    color: var(--p-surface-700);
}

.dark .return-dialog-order-info {
    background: var(--p-surface-950);
    border-color: var(--p-surface-850);
    color: var(--p-surface-300);
}

.return-dialog-order-date {
    margin-inline-start: auto;
    font-size: 0.75rem;
    color: var(--p-surface-450);
}

.return-dialog-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 320px;
    overflow-y: auto;
    padding-inline-end: 0.25rem;
}

.return-dialog-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .return-dialog-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-850);
}

.return-dialog-item-info {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.return-dialog-item-name {
    font-size: 0.9rem;
    font-weight: 750;
    color: var(--p-surface-800);
}

.dark .return-dialog-item-name {
    color: var(--p-surface-100);
}

.return-dialog-item-meta {
    font-size: 0.75rem;
    color: var(--p-surface-450);
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
    font-weight: 700;
    color: var(--p-surface-500);
}

.return-dialog-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 1px solid #fde68a;
    font-size: 0.95rem;
    font-weight: 800;
    color: #92400e;
}

.dark .return-dialog-summary {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.06));
    border-color: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
}

.return-dialog-summary-total {
    font-size: 1.15rem;
}

/* ══════════════════════════════════════════════
   ANIMATIONS
   ══════════════════════════════════════════════ */
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
    75% { transform: translateX(-5px); }
}

.shake {
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
    border-color: #ef4444 !important;
}

.grid-enter-active { transition: all 0.3s ease; }
.grid-leave-active { transition: all 0.2s ease; }
.grid-enter-from { opacity: 0; transform: scale(0.9); }
.grid-leave-to { opacity: 0; transform: scale(0.9); }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* ══════════════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════════════ */
@media (max-width: 1024px) {
    .pos-container {
        flex-direction: column;
        overflow-y: auto;
    }

    .pos-cart-panel {
        width: 100%;
        max-height: 55vh;
        border-inline-end: none;
        border-bottom: 1px solid var(--p-surface-200);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }

    .dark .pos-cart-panel {
        border-color: var(--p-surface-800);
    }

    .pos-catalog-panel {
        height: auto;
        min-height: 50vh;
    }

    .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }

    .returns-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .pos-search-bar {
        flex-direction: column;
        gap: 0.5rem;
    }

    .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 0.625rem;
    }

    .checkout-actions {
        flex-direction: column;
    }
}
</style>
