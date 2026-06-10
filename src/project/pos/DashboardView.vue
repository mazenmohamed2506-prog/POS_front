<script setup>
import { computed, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
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
    CreditCard
} from "lucide-vue-next";

const posStore = usePosStore();

onMounted(() => {
    posStore.fetchProducts();
    posStore.fetchInventory();
    posStore.fetchOrders();
});

// ── Summary Cards ──
const totalProducts = computed(() => posStore.products.length);

const totalSales = computed(() =>
    posStore.orders.filter((o) => o.type === "sale").reduce((sum, o) => sum + o.total, 0)
);

const salesCount = computed(() =>
    posStore.orders.filter((o) => o.type === "sale").length
);

const returnsCount = computed(() =>
    posStore.orders.filter((o) => o.type === "return").length
);

const totalReturns = computed(() =>
    posStore.orders.filter((o) => o.type === "return").reduce((sum, o) => sum + o.total, 0)
);

const netSales = computed(() => totalSales.value - totalReturns.value);

const purchasesTotal = computed(() =>
    posStore.purchases.reduce((sum, p) => sum + p.total, 0)
);

const lowStockItems = computed(() =>
    posStore.inventory.filter((i) => i.shelfStock <= 5)
);

const outOfStockItems = computed(() =>
    posStore.inventory.filter((i) => i.shelfStock === 0)
);

const cashSales = computed(() =>
    posStore.orders.filter((o) => o.type === "sale" && o.paymentMethod === "cash")
);

const cardSales = computed(() =>
    posStore.orders.filter((o) => o.type === "sale" && o.paymentMethod === "card")
);

const cashTotal = computed(() =>
    cashSales.value.reduce((sum, o) => sum + o.total, 0)
);

const cardTotal = computed(() =>
    cardSales.value.reduce((sum, o) => sum + o.total, 0)
);

// Recent orders (last 5)
const recentOrders = computed(() =>
    posStore.orders.slice(0, 5)
);

// Top selling products (from orders)
const topProducts = computed(() => {
    const productMap = new Map();
    posStore.orders
        .filter((o) => o.type === "sale")
        .forEach((order) => {
            order.items.forEach((item) => {
                const existing = productMap.get(item.name) || { name: item.name, qty: 0, revenue: 0 };
                existing.qty += item.qty;
                existing.revenue += item.price * item.qty;
                productMap.set(item.name, existing);
            });
        });
    return Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
});

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
                <LayoutDashboard :size="28" class="text-primary-500" />
                <div>
                    <h1 class="dashboard-title">لوحة التحكم</h1>
                    <p class="dashboard-subtitle">نظرة عامة على أداء المتجر</p>
                </div>
            </div>
        </div>

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
                    <span class="kpi-sub">
                        <ArrowUpRight :size="14" class="text-green-500" />
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
                    <span class="kpi-sub">
                        {{ posStore.purchases.length }} فاتورة
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
                    <span class="kpi-sub">
                        <ArrowDownRight :size="14" class="text-amber-500" />
                        {{ returnsCount }} عملية
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
                    <span class="kpi-sub">
                        <AlertTriangle v-if="outOfStockItems.length > 0" :size="14" class="text-red-500" />
                        {{ outOfStockItems.length }} نفذ من الرف
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
                            ></div>
                            <div
                                class="payment-bar-fill payment-bar-card"
                                :style="{ width: totalSales > 0 ? `${(cardTotal / totalSales) * 100}%` : '50%' }"
                            ></div>
                        </div>
                    </div>
                    <div class="payment-legend">
                        <div class="payment-legend-item">
                            <Banknote :size="16" class="text-green-600" />
                            <span class="payment-legend-label">نقدي</span>
                            <span class="payment-legend-value">{{ formatCurrency(cashTotal) }}</span>
                            <span class="payment-legend-count">({{ cashSales.length }})</span>
                        </div>
                        <div class="payment-legend-item">
                            <CreditCard :size="16" class="text-blue-600" />
                            <span class="payment-legend-label">بطاقة</span>
                            <span class="payment-legend-value">{{ formatCurrency(cardTotal) }}</span>
                            <span class="payment-legend-count">({{ cardSales.length }})</span>
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
                    لا توجد منتجات منخفضة المخزون ✓
                </div>
                <div v-else class="stock-alert-list">
                    <div
                        v-for="item in lowStockItems"
                        :key="item.id"
                        class="stock-alert-item"
                        :class="{ 'stock-alert-critical': item.shelfStock === 0 }"
                    >
                        <div class="stock-alert-info">
                            <span class="stock-alert-name">{{ item.productName }}</span>
                            <span class="stock-alert-sku">{{ item.sku }}</span>
                        </div>
                        <div class="stock-alert-counts">
                            <span class="stock-alert-shelf" :class="item.shelfStock === 0 ? 'text-red-600' : 'text-amber-600'">
                                الرف: {{ item.shelfStock }}
                            </span>
                            <span class="stock-alert-warehouse">
                                المستودع: {{ item.warehouseStock }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Third row: Recent Orders + Top Products -->
        <div class="dashboard-row">
            <!-- Recent Orders -->
            <div class="dashboard-card">
                <h3 class="card-title">
                    <ShoppingBag :size="18" class="text-primary-500" />
                    آخر العمليات
                </h3>
                <div v-if="recentOrders.length === 0" class="empty-state">
                    لا توجد عمليات بعد
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
                    الأكثر مبيعاً
                </h3>
                <div v-if="topProducts.length === 0" class="empty-state">
                    لا توجد بيانات مبيعات بعد
                </div>
                <div v-else class="top-products-list">
                    <div
                        v-for="(prod, idx) in topProducts"
                        :key="prod.name"
                        class="top-product-item"
                    >
                        <span class="top-product-rank">#{{ idx + 1 }}</span>
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
    gap: 1.25rem;
    max-width: 1400px;
    margin: 0 auto;
}

/* Header */
.dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    margin: 0;
}

/* KPI Grid */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
}

.kpi-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 0.75rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    transition: transform 0.2s, box-shadow 0.2s;
}

.dark .kpi-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.kpi-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
}

.kpi-icon-green {
    background: #dcfce7;
    color: #15803d;
}

.dark .kpi-icon-green {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.kpi-icon-blue {
    background: #dbeafe;
    color: #1d4ed8;
}

.dark .kpi-icon-blue {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
}

.kpi-icon-amber {
    background: #fef3c7;
    color: #b45309;
}

.dark .kpi-icon-amber {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
}

.kpi-icon-purple {
    background: #f3e8ff;
    color: #7c3aed;
}

.dark .kpi-icon-purple {
    background: rgba(124, 58, 237, 0.15);
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
    font-size: 1.375rem;
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
    color: var(--p-surface-500);
}

/* Dashboard Row */
.dashboard-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    gap: 1rem;
}

/* Dashboard Card */
.dashboard-card {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 0.75rem;
    padding: 1.25rem;
}

.dark .dashboard-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--p-surface-800);
    margin: 0 0 1rem;
}

.dark .card-title {
    color: var(--p-surface-100);
}

.empty-state {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--p-surface-400);
    font-size: 0.9rem;
}

/* Payment Breakdown */
.payment-breakdown {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.payment-bar-wrap {
    padding: 0.25rem 0;
}

.payment-bar {
    display: flex;
    height: 1rem;
    border-radius: 0.5rem;
    overflow: hidden;
    background: var(--p-surface-100);
}

.dark .payment-bar {
    background: var(--p-surface-800);
}

.payment-bar-fill {
    transition: width 0.5s ease;
}

.payment-bar-cash {
    background: linear-gradient(90deg, #22c55e, #16a34a);
}

.payment-bar-card {
    background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.payment-legend {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.payment-legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.payment-legend-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--p-surface-700);
    min-width: 3rem;
}

.dark .payment-legend-label {
    color: var(--p-surface-300);
}

.payment-legend-value {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--p-surface-900);
    margin-inline-start: auto;
}

.dark .payment-legend-value {
    color: var(--p-surface-0);
}

.payment-legend-count {
    font-size: 0.75rem;
    color: var(--p-surface-400);
}

/* Stock Alerts */
.stock-alert-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 280px;
    overflow-y: auto;
}

.stock-alert-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-100);
}

.dark .stock-alert-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.stock-alert-critical {
    border-color: #fecaca;
    background: #fef2f2;
}

.dark .stock-alert-critical {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.08);
}

.stock-alert-info {
    display: flex;
    flex-direction: column;
}

.stock-alert-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--p-surface-800);
}

.dark .stock-alert-name {
    color: var(--p-surface-100);
}

.stock-alert-sku {
    font-size: 0.7rem;
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
    font-weight: 700;
}

.stock-alert-warehouse {
    color: var(--p-surface-500);
}

/* Recent Orders */
.recent-orders-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.recent-order-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-100);
}

.dark .recent-order-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.recent-order-info {
    display: flex;
    flex-direction: column;
}

.recent-order-number {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-800);
}

.dark .recent-order-number {
    color: var(--p-surface-100);
}

.recent-order-date {
    font-size: 0.7rem;
    color: var(--p-surface-400);
}

.recent-order-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.recent-order-type {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
}

.type-sale {
    background: #dcfce7;
    color: #166534;
}

.dark .type-sale {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.type-return {
    background: #fef3c7;
    color: #92400e;
}

.dark .type-return {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
}

.recent-order-total {
    font-size: 0.9375rem;
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
    gap: 0.5rem;
}

.top-product-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-100);
}

.dark .top-product-item {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.top-product-rank {
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--p-primary-500);
    min-width: 2rem;
}

.top-product-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.top-product-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--p-surface-800);
}

.dark .top-product-name {
    color: var(--p-surface-100);
}

.top-product-qty {
    font-size: 0.7rem;
    color: var(--p-surface-400);
}

.top-product-revenue {
    font-size: 0.9375rem;
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
}
</style>
