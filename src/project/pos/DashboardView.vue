<script setup>
import { computed, onMounted, ref } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { useDashboardStore } from "@/stores/pos/dashboardStore";
import { useProductStore } from "@/stores/pos/productStore";
import { useInventoryStore } from "@/stores/pos/inventoryStore";
import {
    LayoutDashboard,
    TrendingUp,
    ShoppingBag,
    DollarSign,
    AlertTriangle,
    Package,
    ArrowDownRight,
    ArrowUpRight,
    RotateCcw,
    Banknote,
    CreditCard,
    CalendarRange,
    X,
    ChevronDown,
    CheckCircle
} from "lucide-vue-next";

const posStore = usePosStore();
const dashboardStore = useDashboardStore();
const productStore = useProductStore();
const inventoryStore = useInventoryStore();

onMounted(() => {
    dashboardStore.fetchStats();
    posStore.fetchSettings();
    productStore.fetchProducts();
    inventoryStore.fetchInventory();
});

// Computed expiration stats across all products
const expirationStats = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expired = 0;
    let expiringSoon = 0;
    let healthy = 0;

    productStore.products.forEach(product => {
        // Find all active inventory batches for this product in inventoryStore.inventory
        // where total quantity (shelf + warehouse) > 0
        const productBatches = inventoryStore.inventory.filter(item => 
            item.productId === product.id && (item.shelfStock + item.warehouseStock) > 0
        );

        if (!product.trackExpiration || productBatches.length === 0) {
            healthy++;
            return;
        }

        // Filter batches with expiration date
        const expiringBatches = productBatches.filter(b => b.expirationDate);

        if (expiringBatches.length === 0) {
            healthy++;
            return;
        }

        // Find nearest expiry among active batches
        let minDate = new Date(expiringBatches[0].expirationDate);
        for (let i = 1; i < expiringBatches.length; i++) {
            const d = new Date(expiringBatches[i].expirationDate);
            if (d < minDate) {
                minDate = d;
            }
        }

        const timeDiff = minDate.getTime() - today.getTime();
        const daysToExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysToExpiration < 0) {
            expired++;
        } else if (daysToExpiration <= 30) {
            expiringSoon++;
        } else {
            healthy++;
        }
    });

    return {
        expired,
        expiringSoon,
        healthy
    };
});

// Computed list of products expiring within 30 days or already expired
const expiringSoonProducts = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list = [];
    productStore.products.forEach(product => {
        if (!product.trackExpiration) return;

        const productBatches = inventoryStore.inventory.filter(item => 
            item.productId === product.id && (item.shelfStock + item.warehouseStock) > 0
        );

        const expiringBatches = productBatches.filter(b => b.expirationDate);
        if (expiringBatches.length === 0) return;

        // Find nearest expiry date
        let nearestBatch = expiringBatches[0];
        let minDate = new Date(nearestBatch.expirationDate);

        for (let i = 1; i < expiringBatches.length; i++) {
            const d = new Date(expiringBatches[i].expirationDate);
            if (d < minDate) {
                minDate = d;
                nearestBatch = expiringBatches[i];
            }
        }

        const timeDiff = minDate.getTime() - today.getTime();
        const daysToExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysToExpiration <= 30) {
            list.push({
                productId: product.id,
                productName: product.name,
                sku: product.sku || `PROD-${product.id}`,
                expirationDate: nearestBatch.expirationDate,
                daysToExpiration,
                quantity: nearestBatch.shelfStock + nearestBatch.warehouseStock,
                batchNumber: nearestBatch.batchNumber
            });
        }
    });

    // Sort by daysToExpiration ascending (expired first, then nearest)
    return list.sort((a, b) => a.daysToExpiration - b.daysToExpiration);
});

// ── Date Filter State ──
const showDatePicker = ref(false);
const startDateInput = ref("");
const endDateInput   = ref("");

// Quick-range presets
const presets = [
    { label: "اليوم",         key: "today" },
    { label: "أمس",           key: "yesterday" },
    { label: "آخر 7 أيام",   key: "last7" },
    { label: "آخر 30 يوم",   key: "last30" },
    { label: "هذا الشهر",    key: "thisMonth" },
    { label: "الشهر الماضي", key: "lastMonth" },
];

function applyPreset(key) {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let start, end;

    if (key === "today") {
        start = today;
        end   = new Date(today.getTime() + 86399999);
    } else if (key === "yesterday") {
        start = new Date(today.getTime() - 86400000);
        end   = new Date(today.getTime() - 1);
    } else if (key === "last7") {
        start = new Date(today.getTime() - 6 * 86400000);
        end   = new Date(today.getTime() + 86399999);
    } else if (key === "last30") {
        start = new Date(today.getTime() - 29 * 86400000);
        end   = new Date(today.getTime() + 86399999);
    } else if (key === "thisMonth") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (key === "lastMonth") {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    startDateInput.value = toLocalDateInputValue(start);
    endDateInput.value   = toLocalDateInputValue(end);
    applyFilter();
}

function toLocalDateInputValue(d) {
    // Returns YYYY-MM-DD in local time for the <input type="date">
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function applyFilter() {
    const s = startDateInput.value ? new Date(startDateInput.value).toISOString() : null;
    const e = endDateInput.value   ? new Date(endDateInput.value + "T23:59:59").toISOString() : null;
    dashboardStore.fetchStats(s, e);
    showDatePicker.value = false;
}

function clearFilter() {
    startDateInput.value = "";
    endDateInput.value   = "";
    dashboardStore.clearFilter();
    showDatePicker.value = false;
}

const isFiltered = computed(
    () => !!dashboardStore.dateFilter.startDate || !!dashboardStore.dateFilter.endDate
);

const filterLabel = computed(() => {
    const { startDate, endDate } = dashboardStore.dateFilter;
    if (!startDate && !endDate) return "كل الفترات";
    const fmt = (d) =>
        new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
    if (startDate && endDate) return `${fmt(startDate)} — ${fmt(endDate)}`;
    if (startDate)            return `من ${fmt(startDate)}`;
    return `حتى ${fmt(endDate)}`;
});

// ── Summary Cards ──
const totalProducts = computed(() => dashboardStore.stats.totalProducts);
const totalSales    = computed(() => dashboardStore.stats.cashSalesTotal + dashboardStore.stats.cardSalesTotal);
const salesCount    = computed(() => dashboardStore.stats.salesCount);
const returnsCount  = computed(() => dashboardStore.stats.returnsCount);
const totalReturns  = computed(() => dashboardStore.stats.totalReturns);
const netSales      = computed(() => dashboardStore.stats.netSales);
const purchasesTotal  = computed(() => dashboardStore.stats.purchasesTotal);
const purchasesCount  = computed(() => dashboardStore.stats.purchasesCount);
const lowStockItems   = computed(() => dashboardStore.stats.lowStockItems);
const outOfStockCount = computed(() => dashboardStore.stats.outOfStockCount);
const cashTotal       = computed(() => dashboardStore.stats.cashSalesTotal);
const cashSalesCount  = computed(() => dashboardStore.stats.cashSalesCount);
const cardTotal       = computed(() => dashboardStore.stats.cardSalesTotal);
const cardSalesCount  = computed(() => dashboardStore.stats.cardSalesCount);
const recentOrders    = computed(() => dashboardStore.stats.recentOrders);
const topProducts     = computed(() => dashboardStore.stats.topProducts);

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: posStore.settings.currency || "EGP",
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
</script>

<template>
    <div class="dashboard-page">
        <!-- Header -->
        <div class="dashboard-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <LayoutDashboard :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="dashboard-title">لوحة التحكم</h1>
                    <p class="dashboard-subtitle">نظرة عامة على أداء المتجر في الوقت الفعلي</p>
                </div>
            </div>

            <!-- Date Filter Control -->
            <div class="filter-control" v-click-outside="() => (showDatePicker = false)">
                <button
                    class="filter-btn"
                    :class="{ 'filter-btn-active': isFiltered }"
                    @click="showDatePicker = !showDatePicker"
                    id="dashboard-date-filter-btn"
                >
                    <CalendarRange :size="16" />
                    <span class="filter-btn-label">{{ filterLabel }}</span>
                    <span v-if="isFiltered" class="filter-badge"></span>
                    <ChevronDown :size="14" class="filter-chevron" :class="{ rotated: showDatePicker }" />
                </button>

                <!-- Clear active filter shortcut -->
                <button
                    v-if="isFiltered"
                    class="filter-clear-btn"
                    @click="clearFilter"
                    title="مسح الفلتر"
                    id="dashboard-clear-filter-btn"
                >
                    <X :size="14" />
                </button>

                <!-- Dropdown Panel -->
                <Transition name="dropdown">
                    <div v-if="showDatePicker" class="filter-panel" id="dashboard-filter-panel">
                        <!-- Quick presets -->
                        <div class="filter-section">
                            <span class="filter-section-label">فترات سريعة</span>
                            <div class="preset-grid">
                                <button
                                    v-for="preset in presets"
                                    :key="preset.key"
                                    class="preset-btn"
                                    :id="`preset-${preset.key}`"
                                    @click="applyPreset(preset.key)"
                                >
                                    {{ preset.label }}
                                </button>
                            </div>
                        </div>

                        <div class="filter-divider"></div>

                        <!-- Custom range -->
                        <div class="filter-section">
                            <span class="filter-section-label">نطاق مخصص</span>
                            <div class="date-inputs">
                                <div class="date-input-group">
                                    <label class="date-input-label">من</label>
                                    <input
                                        id="dashboard-start-date"
                                        type="date"
                                        class="date-input"
                                        v-model="startDateInput"
                                        :max="endDateInput || undefined"
                                    />
                                </div>
                                <div class="date-input-group">
                                    <label class="date-input-label">إلى</label>
                                    <input
                                        id="dashboard-end-date"
                                        type="date"
                                        class="date-input"
                                        v-model="endDateInput"
                                        :min="startDateInput || undefined"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="filter-actions">
                            <button class="filter-apply-btn" @click="applyFilter" id="dashboard-apply-filter-btn">
                                تطبيق
                            </button>
                            <button class="filter-reset-btn" @click="clearFilter" id="dashboard-reset-filter-btn">
                                إعادة تعيين
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>
        </div>

        <!-- Active filter pill -->
        <Transition name="fade">
            <div v-if="isFiltered" class="filter-active-banner">
                <CalendarRange :size="15" class="text-primary-500" />
                <span>تعرض الإحصائيات للفترة: <strong>{{ filterLabel }}</strong></span>
                <button class="filter-banner-clear" @click="clearFilter">
                    <X :size="13" /> مسح الفلتر
                </button>
                <div v-if="dashboardStore.loading" class="filter-loading-dot"></div>
            </div>
        </Transition>

        <!-- KPI Cards Row -->
        <div class="kpi-grid">
            <!-- Net Sales -->
            <div class="kpi-card kpi-sales">
                <div class="kpi-icon-wrap kpi-icon-green">
                    <TrendingUp :size="22" />
                </div>
                <div class="kpi-info">
                    <span class="kpi-label">صافي المبيعات</span>
                    <span class="kpi-value">{{ formatCurrency(netSales) }}</span>
                    <span class="kpi-sub text-green-600 dark:text-green-400">
                        <ArrowUpRight :size="14" class="inline" />
                        {{ salesCount }} عملية بيع
                    </span>
                </div>
            </div>

            <!-- Total Purchases -->
            <div class="kpi-card kpi-purchases">
                <div class="kpi-icon-wrap kpi-icon-blue">
                    <ShoppingBag :size="22" />
                </div>
                <div class="kpi-info">
                    <span class="kpi-label">المشتريات</span>
                    <span class="kpi-value">{{ formatCurrency(purchasesTotal) }}</span>
                    <span class="kpi-sub text-blue-600 dark:text-blue-400">
                        {{ purchasesCount }} فاتورة مستلمة
                    </span>
                </div>
            </div>

            <!-- Returns -->
            <div class="kpi-card kpi-returns">
                <div class="kpi-icon-wrap kpi-icon-amber">
                    <RotateCcw :size="22" />
                </div>
                <div class="kpi-info">
                    <span class="kpi-label">المرتجعات</span>
                    <span class="kpi-value">{{ formatCurrency(totalReturns) }}</span>
                    <span class="kpi-sub text-amber-600 dark:text-amber-400">
                        <ArrowDownRight :size="14" class="inline" />
                        {{ returnsCount }} عملية ارجاع
                    </span>
                </div>
            </div>

            <!-- Products Count -->
            <div class="kpi-card kpi-products">
                <div class="kpi-icon-wrap kpi-icon-purple">
                    <Package :size="22" />
                </div>
                <div class="kpi-info">
                    <span class="kpi-label">المنتجات</span>
                    <span class="kpi-value">{{ totalProducts }}</span>
                    <span class="kpi-sub" :class="outOfStockCount > 0 ? 'text-red-500 font-semibold' : 'text-purple-600 dark:text-purple-400'">
                        <AlertTriangle v-if="outOfStockCount > 0" :size="14" class="inline me-1" />
                        {{ outOfStockCount }} منتج نفذ من الرف
                    </span>
                </div>
            </div>
        </div>

        <!-- Second row: Payment breakdown + Low Stock -->
        <div class="dashboard-row">
            <!-- Payment Breakdown -->
            <div class="dashboard-card">
                <h3 class="card-title">
                    <DollarSign :size="18" class="text-primary-500" />
                    توزيع المبيعات حسب طريقة الدفع
                </h3>
                <div class="payment-breakdown">
                    <div class="payment-bar-wrap">
                        <div class="payment-bar">
                            <div
                                class="payment-bar-fill payment-bar-cash"
                                :style="{ width: totalSales > 0 ? `${(cashTotal / totalSales) * 100}%` : '50%' }"
                                title="نقدي"
                            ></div>
                            <div
                                class="payment-bar-fill payment-bar-card"
                                :style="{ width: totalSales > 0 ? `${(cardTotal / totalSales) * 100}%` : '50%' }"
                                title="بطاقة"
                            ></div>
                        </div>
                    </div>
                    <div class="payment-legend">
                        <div class="payment-legend-item payment-legend-cash">
                            <div class="legend-color-dot bg-green-500"></div>
                            <Banknote :size="16" class="text-green-600 dark:text-green-400" />
                            <span class="payment-legend-label">نقدي</span>
                            <span class="payment-legend-value">{{ formatCurrency(cashTotal) }}</span>
                            <span class="payment-legend-count">({{ cashSalesCount }})</span>
                        </div>
                        <div class="payment-legend-item payment-legend-card">
                            <div class="legend-color-dot bg-blue-500"></div>
                            <CreditCard :size="16" class="text-blue-600 dark:text-blue-400" />
                            <span class="payment-legend-label">بطاقة</span>
                            <span class="payment-legend-value">{{ formatCurrency(cardTotal) }}</span>
                            <span class="payment-legend-count">({{ cardSalesCount }})</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Low Stock Alerts -->
            <div class="dashboard-card">
                <h3 class="card-title">
                    <AlertTriangle :size="18" class="text-amber-500" />
                    تنبيهات المخزون المنخفض
                </h3>
                <div v-if="lowStockItems.length === 0" class="empty-state">
                    <CheckCircle :size="32" class="text-green-500 mb-2 mx-auto" />
                    <div>لا توجد منتجات منخفضة المخزون حالياً</div>
                </div>
                <div v-else class="stock-alert-list">
                    <div
                        v-for="item in lowStockItems"
                        :key="item.productId"
                        class="stock-alert-item"
                        :class="{ 'stock-alert-critical': item.shelfStock === 0 }"
                    >
                        <div class="stock-alert-info">
                            <span class="stock-alert-name">{{ item.productName }}</span>
                            <span class="stock-alert-sku">{{ item.sku }}</span>
                        </div>
                        <div class="stock-alert-counts">
                            <span class="stock-alert-shelf" :class="item.shelfStock === 0 ? 'text-red-500' : 'text-amber-500'">
                                الرف: {{ item.shelfStock }}
                            </span>
                            <span class="stock-alert-warehouse">
                                المستودع: {{ item.warehouseStock }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Expiration Summary Widget -->
            <div class="dashboard-card">
                <h3 class="card-title">
                    <AlertTriangle :size="18" class="text-red-500" />
                    تنبيهات صلاحية المنتجات
                </h3>

                <!-- Counts Summary -->
                <div class="grid grid-cols-3 gap-2 mb-4">
                    <router-link :to="{ path: '/products', query: { filter: 'Expired' } }" class="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-center block hover:scale-102 transition-transform cursor-pointer">
                        <span class="block text-[10px] text-red-500 font-bold">منتهي</span>
                        <span class="text-base font-black text-red-700 dark:text-red-300">{{ expirationStats.expired }}</span>
                    </router-link>
                    <router-link :to="{ path: '/products', query: { filter: 'Expiring Soon' } }" class="p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 text-center block hover:scale-102 transition-transform cursor-pointer">
                        <span class="block text-[10px] text-amber-500 font-bold">ينتهي قريباً</span>
                        <span class="text-base font-black text-amber-700 dark:text-amber-300">{{ expirationStats.expiringSoon }}</span>
                    </router-link>
                    <router-link :to="{ path: '/products', query: { filter: 'Healthy Stock' } }" class="p-2 rounded bg-green-50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30 text-center block hover:scale-102 transition-transform cursor-pointer">
                        <span class="block text-[10px] text-green-500 font-bold">سليم</span>
                        <span class="text-base font-black text-green-700 dark:text-green-300">{{ expirationStats.healthy }}</span>
                    </router-link>
                </div>

                <!-- Expiring Soon List -->
                <div v-if="expiringSoonProducts.length === 0" class="empty-state !py-8">
                    <CheckCircle :size="32" class="text-green-500 mb-2 mx-auto" />
                    <div>لا توجد تنبيهات صلاحية حالياً</div>
                </div>
                <div v-else class="stock-alert-list max-h-[180px] overflow-y-auto">
                    <router-link
                        v-for="item in expiringSoonProducts"
                        :key="item.productId"
                        :to="{ path: '/products', query: { filter: item.daysToExpiration < 0 ? 'Expired' : 'Expiring Soon' } }"
                        class="stock-alert-item block cursor-pointer"
                        :class="item.daysToExpiration < 0 ? 'stock-alert-critical' : 'stock-alert-warning'"
                    >
                        <div class="flex justify-between items-center w-full">
                            <div class="stock-alert-info">
                                <span class="stock-alert-name">{{ item.productName }}</span>
                                <span class="stock-alert-sku text-[11px] text-surface-500 dark:text-surface-400">دفعة: {{ item.batchNumber }} ({{ item.sku }})</span>
                            </div>
                            <div class="stock-alert-counts text-end">
                                <span class="block text-xs font-bold" :class="item.daysToExpiration < 0 ? 'text-red-500' : 'text-amber-500'">
                                    {{ item.daysToExpiration < 0 ? 'منتهي' : `خلال ${item.daysToExpiration} يوم` }}
                                </span>
                                <span class="text-[10px] text-surface-400">
                                    تاريخ: {{ new Date(item.expirationDate).toLocaleDateString('ar-EG') }}
                                </span>
                            </div>
                        </div>
                    </router-link>
                </div>
            </div>
        </div>

        <!-- Third row: Recent Orders + Top Products -->
        <div class="dashboard-row">
            <!-- Recent Orders -->
            <div class="dashboard-card">
                <h3 class="card-title">
                    <ShoppingBag :size="18" class="text-primary-500" />
                    آخر العمليات والطلبات
                </h3>
                <div v-if="recentOrders.length === 0" class="empty-state">
                    لا توجد عمليات مسجلة بعد
                </div>
                <div v-else class="recent-orders-list">
                    <div
                        v-for="order in recentOrders"
                        :key="order.id"
                        class="recent-order-item"
                    >
                        <div class="recent-order-info">
                            <span class="recent-order-number">{{ order.orderNumber }}</span>
                            <span class="recent-order-date">{{ formatDate(order.date) }}</span>
                        </div>
                        <div class="recent-order-meta">
                            <span
                                class="recent-order-type"
                                :class="order.type === 'sale' ? 'type-sale' : 'type-return'"
                            >
                                {{ order.type === "sale" ? "بيع" : "مرتجع" }}
                            </span>
                            <span class="recent-order-total">{{ formatCurrency(order.total) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Selling Products -->
            <div class="dashboard-card">
                <h3 class="card-title">
                    <TrendingUp :size="18" class="text-primary-500" />
                    المنتجات الأكثر مبيعاً
                </h3>
                <div v-if="topProducts.length === 0" class="empty-state">
                    لا توجد بيانات مبيعات متوفرة
                </div>
                <div v-else class="top-products-list">
                    <div
                        v-for="(prod, idx) in topProducts"
                        :key="prod.name"
                        class="top-product-item"
                    >
                        <span class="top-product-rank" :class="`rank-${idx + 1}`">#{{ idx + 1 }}</span>
                        <div class="top-product-info">
                            <span class="top-product-name">{{ prod.name }}</span>
                            <span class="top-product-qty">{{ prod.qty }} وحدة مباعة</span>
                        </div>
                        <span class="top-product-revenue">{{ formatCurrency(prod.revenue) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.dashboard-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

/* Header */
.dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.dark .header-icon-wrap {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.dashboard-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .dashboard-title {
    color: var(--p-surface-0);
}

.dashboard-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* ─── Date Filter Control ─── */
.filter-control {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-inline-start: auto;
}

.filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-0);
    border: 1.5px solid var(--p-surface-200);
    color: var(--p-surface-700);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    white-space: nowrap;
}

.dark .filter-btn {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
    color: var(--p-surface-200);
}

.filter-btn:hover {
    border-color: var(--p-primary-400);
    color: var(--p-primary-600);
    box-shadow: 0 2px 8px rgba(var(--p-primary-500-rgb, 99, 102, 241), 0.15);
}

.filter-btn-active {
    background: var(--p-primary-50, #eef2ff);
    border-color: var(--p-primary-400, #818cf8);
    color: var(--p-primary-700, #4338ca);
}

.dark .filter-btn-active {
    background: rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.5);
    color: #a5b4fc;
}

.filter-btn-label {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.filter-badge {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--p-primary-500, #6366f1);
    flex-shrink: 0;
}

.filter-chevron {
    transition: transform 0.2s ease;
    flex-shrink: 0;
}

.filter-chevron.rotated {
    transform: rotate(180deg);
}

.filter-clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    border: 1.5px solid var(--p-surface-200);
    background: var(--p-surface-0);
    color: var(--p-surface-500);
    cursor: pointer;
    transition: all 0.15s ease;
}

.dark .filter-clear-btn {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}

.filter-clear-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #dc2626;
}

.dark .filter-clear-btn:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.35);
    color: #f87171;
}

/* ─── Filter Dropdown Panel ─── */
.filter-panel {
    position: absolute;
    top: calc(100% + 0.5rem);
    inset-inline-end: 0;
    width: 340px;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 1rem;
    box-shadow: 0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06);
    z-index: 200;
    overflow: hidden;
}

.dark .filter-panel {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
}

.filter-section {
    padding: 1rem 1.25rem;
}

.filter-section-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--p-surface-400);
    margin-bottom: 0.6rem;
}

.preset-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.45rem;
}

.preset-btn {
    padding: 0.45rem 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
    color: var(--p-surface-700);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;
}

.dark .preset-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-200);
}

.preset-btn:hover {
    background: var(--p-primary-50, #eef2ff);
    border-color: var(--p-primary-300, #a5b4fc);
    color: var(--p-primary-700, #4338ca);
}

.dark .preset-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.4);
    color: #a5b4fc;
}

.filter-divider {
    height: 1px;
    background: var(--p-surface-150, var(--p-surface-200));
    margin: 0 1.25rem;
}

.dark .filter-divider {
    background: var(--p-surface-700);
}

.date-inputs {
    display: flex;
    gap: 0.75rem;
}

.date-input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.date-input-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.date-input {
    width: 100%;
    padding: 0.5rem 0.65rem;
    border-radius: 0.5rem;
    border: 1.5px solid var(--p-surface-200);
    background: var(--p-surface-50);
    color: var(--p-surface-800);
    font-size: 0.82rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
}

.dark .date-input {
    background: var(--p-surface-800);
    border-color: var(--p-surface-600);
    color: var(--p-surface-100);
    color-scheme: dark;
}

.date-input:focus {
    border-color: var(--p-primary-400, #818cf8);
}

.filter-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem 1rem;
}

.filter-apply-btn {
    flex: 1;
    padding: 0.55rem;
    border-radius: 0.6rem;
    border: none;
    background: var(--p-primary-500, #6366f1);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
}

.filter-apply-btn:hover {
    background: var(--p-primary-600, #4f46e5);
    transform: translateY(-1px);
}

.filter-apply-btn:active {
    transform: translateY(0);
}

.filter-reset-btn {
    padding: 0.55rem 1rem;
    border-radius: 0.6rem;
    border: 1.5px solid var(--p-surface-200);
    background: transparent;
    color: var(--p-surface-600);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
}

.dark .filter-reset-btn {
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}

.filter-reset-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #dc2626;
}

.dark .filter-reset-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239,68,68,0.3);
    color: #f87171;
}

/* ─── Active Filter Banner ─── */
.filter-active-banner {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
    background: var(--p-primary-50, #eef2ff);
    border: 1px solid var(--p-primary-200, #c7d2fe);
    border-radius: 0.75rem;
    font-size: 0.85rem;
    color: var(--p-primary-800, #3730a3);
}

.dark .filter-active-banner {
    background: rgba(99,102,241,0.1);
    border-color: rgba(99,102,241,0.3);
    color: #a5b4fc;
}

.filter-banner-clear {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-inline-start: auto;
    padding: 0.3rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--p-primary-300, #a5b4fc);
    background: transparent;
    color: var(--p-primary-700, #4338ca);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
}

.dark .filter-banner-clear {
    border-color: rgba(99,102,241,0.35);
    color: #a5b4fc;
}

.filter-banner-clear:hover {
    background: var(--p-primary-100, #e0e7ff);
}

.dark .filter-banner-clear:hover {
    background: rgba(99,102,241,0.18);
}

.filter-loading-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--p-primary-400);
    animation: pulse-dot 1s infinite;
    margin-inline-start: 0.25rem;
}

@keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.7); }
}

/* ─── Dropdown Animation ─── */
.dropdown-enter-active,
.dropdown-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
}

/* ─── Fade Animation ─── */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* KPI Grid */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
}

.kpi-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .kpi-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.kpi-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.kpi-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
}

.kpi-icon-green {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #15803d;
}

.dark .kpi-icon-green {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.3) 100%);
    color: #4ade80;
}

.kpi-icon-blue {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1d4ed8;
}

.dark .kpi-icon-blue {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.3) 100%);
    color: #60a5fa;
}

.kpi-icon-amber {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #b45309;
}

.dark .kpi-icon-amber {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.3) 100%);
    color: #fbbf24;
}

.kpi-icon-purple {
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    color: #7c3aed;
}

.dark .kpi-icon-purple {
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.3) 100%);
    color: #a78bfa;
}

.kpi-info {
    display: flex;
    flex-direction: column;
}

.kpi-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.kpi-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0.125rem 0;
}

.dark .kpi-value {
    color: var(--p-surface-0);
}

.kpi-sub {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
}

/* Dashboard Row */
.dashboard-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.25rem;
}

/* Dashboard Card */
.dashboard-card {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .dashboard-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--p-surface-800);
    margin: 0 0 1.25rem;
}

.dark .card-title {
    color: var(--p-surface-100);
}

.empty-state {
    text-align: center;
    padding: 3rem 1.5rem;
    color: var(--p-surface-400);
    font-size: 0.9rem;
    border: 2px dashed var(--p-surface-200);
    border-radius: 0.75rem;
}

.dark .empty-state {
    border-color: var(--p-surface-800);
}

/* Payment Breakdown */
.payment-breakdown {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.payment-bar-wrap {
    padding: 0.5rem 0;
}

.payment-bar {
    display: flex;
    height: 1.25rem;
    border-radius: 9999px;
    overflow: hidden;
    background: var(--p-surface-100);
}

.dark .payment-bar {
    background: var(--p-surface-800);
}

.payment-bar-fill {
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.payment-bar-cash {
    background: linear-gradient(90deg, #10b981, #059669);
}

.payment-bar-card {
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.payment-legend {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.payment-legend-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-100);
}

.dark .payment-legend-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.legend-color-dot {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 9999px;
}

.payment-legend-label {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-700);
}

.dark .payment-legend-label {
    color: var(--p-surface-300);
}

.payment-legend-value {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin-inline-start: auto;
}

.dark .payment-legend-value {
    color: var(--p-surface-0);
}

.payment-legend-count {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--p-surface-450);
}

/* Stock Alerts */
.stock-alert-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
    padding-inline-end: 0.25rem;
}

.stock-alert-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
    transition: background-color 0.15s;
}

.dark .stock-alert-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.stock-alert-item:hover {
    background: var(--p-surface-100);
}

.dark .stock-alert-item:hover {
    background: var(--p-surface-800);
}

.stock-alert-critical {
    border-color: #fecaca;
    background: #fef2f2;
}

.dark .stock-alert-critical {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.08);
}

.stock-alert-critical:hover {
    background: #fee2e2;
}

.dark .stock-alert-critical:hover {
    background: rgba(239, 68, 68, 0.12);
}

.stock-alert-info {
    display: flex;
    flex-direction: column;
}

.stock-alert-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-800);
}

.dark .stock-alert-name {
    color: var(--p-surface-100);
}

.stock-alert-sku {
    font-size: 0.75rem;
    color: var(--p-surface-400);
}

.stock-alert-counts {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
}

.stock-alert-shelf,
.stock-alert-warehouse {
    font-size: 0.75rem;
    font-weight: 750;
}

.stock-alert-warehouse {
    color: var(--p-surface-500);
}

/* Recent Orders */
.recent-orders-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
}

.recent-order-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
    transition: background-color 0.15s;
}

.dark .recent-order-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.recent-order-item:hover {
    background: var(--p-surface-100);
}

.dark .recent-order-item:hover {
    background: var(--p-surface-800);
}

.recent-order-info {
    display: flex;
    flex-direction: column;
}

.recent-order-number {
    font-size: 0.875rem;
    font-weight: 750;
    color: var(--p-surface-800);
}

.dark .recent-order-number {
    color: var(--p-surface-100);
}

.recent-order-date {
    font-size: 0.75rem;
    color: var(--p-surface-400);
}

.recent-order-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.recent-order-type {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.625rem;
    border-radius: 9999px;
}

.type-sale {
    background: #dcfce7;
    color: #15803d;
}

.dark .type-sale {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.type-return {
    background: #fef3c7;
    color: #b45309;
}

.dark .type-return {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
}

.recent-order-total {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--p-surface-900);
}

.dark .recent-order-total {
    color: var(--p-surface-0);
}

/* Top Products */
.top-products-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 300px;
    overflow-y: auto;
}

.top-product-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
    transition: background-color 0.15s;
}

.dark .top-product-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.top-product-item:hover {
    background: var(--p-surface-100);
}

.dark .top-product-item:hover {
    background: var(--p-surface-800);
}

.top-product-rank {
    font-size: 0.875rem;
    font-weight: 800;
    min-width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--p-surface-200);
    color: var(--p-surface-700);
}

.dark .top-product-rank {
    background: var(--p-surface-850);
    color: var(--p-surface-300);
}

.top-product-rank.rank-1 {
    background: #fef3c7;
    color: #b45309;
}

.dark .top-product-rank.rank-1 {
    background: rgba(245, 158, 11, 0.25);
    color: #fbbf24;
}

.top-product-rank.rank-2 {
    background: #e2e8f0;
    color: #475569;
}

.dark .top-product-rank.rank-2 {
    background: rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
}

.top-product-rank.rank-3 {
    background: #ffedd5;
    color: #ea580c;
}

.dark .top-product-rank.rank-3 {
    background: rgba(234, 88, 12, 0.2);
    color: #ff9d66;
}

.top-product-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.top-product-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-800);
}

.dark .top-product-name {
    color: var(--p-surface-100);
}

.top-product-qty {
    font-size: 0.75rem;
    color: var(--p-surface-400);
}

.top-product-revenue {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--p-surface-900);
}

.dark .top-product-revenue {
    color: var(--p-surface-0);
}

@media (max-width: 768px) {
    .dashboard-page {
        padding: 1rem;
    }

    .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .dashboard-row {
        grid-template-columns: 1fr;
    }

    .filter-panel {
        width: 300px;
    }

    .preset-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

.stock-alert-warning {
    border-color: #fde68a;
    background: #fffbeb;
}

.dark .stock-alert-warning {
    border-color: rgba(245, 158, 11, 0.3);
    background: rgba(245, 158, 11, 0.08);
}

.stock-alert-warning:hover {
    background: #fef3c7;
}

.dark .stock-alert-warning:hover {
    background: rgba(245, 158, 11, 0.12);
}
</style>
