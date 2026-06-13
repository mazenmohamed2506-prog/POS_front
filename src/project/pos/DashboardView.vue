<script setup>
import { computed, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { useDashboardStore } from "@/stores/pos/dashboardStore";
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
const dashboardStore = useDashboardStore();

onMounted(() => {
    dashboardStore.fetchStats();
    posStore.fetchSettings();
});

// ── Summary Cards ──
const totalProducts = computed(() => dashboardStore.stats.totalProducts);
const totalSales = computed(() => dashboardStore.stats.cashSalesTotal + dashboardStore.stats.cardSalesTotal);
const salesCount = computed(() => dashboardStore.stats.salesCount);
const returnsCount = computed(() => dashboardStore.stats.returnsCount);
const totalReturns = computed(() => dashboardStore.stats.totalReturns);
const netSales = computed(() => dashboardStore.stats.netSales);
const purchasesTotal = computed(() => dashboardStore.stats.purchasesTotal);
const purchasesCount = computed(() => dashboardStore.stats.purchasesCount);
const lowStockItems = computed(() => dashboardStore.stats.lowStockItems);
const outOfStockCount = computed(() => dashboardStore.stats.outOfStockCount);
const cashTotal = computed(() => dashboardStore.stats.cashSalesTotal);
const cashSalesCount = computed(() => dashboardStore.stats.cashSalesCount);
const cardTotal = computed(() => dashboardStore.stats.cardSalesTotal);
const cardSalesCount = computed(() => dashboardStore.stats.cardSalesCount);
const recentOrders = computed(() => dashboardStore.stats.recentOrders);
const topProducts = computed(() => dashboardStore.stats.topProducts);

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
}
</style>
