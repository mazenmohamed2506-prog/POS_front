<script setup>
import { ref, computed, onMounted } from "vue";
import { useOrderStore } from "@/stores/pos/orderStore";
import {
    ClipboardList, Search, Eye, HelpCircle, Receipt, Calendar,
    DollarSign, CheckCircle2, Clock, XCircle, RotateCcw,
    CreditCard, Banknote, ShoppingBag, Hash, Package, User as UserIcon, Filter
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const orderStore = useOrderStore();

// ── Help Drawer ──
const showHelp = ref(false);
const ordersHelpSections = [
    {
        title: 'عرض الطلبيات',
        icon: ClipboardList,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'قائمة الطلبيات', desc: 'تظهر جميع الطلبيات مرتبة من الأحدث إلى الأقدم' },
            { title: 'البحث في الطلبيات', desc: 'ابحث برقم الطلب أو اسم الكاشير أو طريقة الدفع' },
            { title: 'حالة الطلب', desc: 'مكتمل = أخضر، معلق = أصفر، ملغي = أحمر، مسترد = رمادي' },
        ]
    },
    {
        title: 'عرض تفاصيل طلب',
        icon: Eye,
        color: '#d1fae5',
        iconColor: '#059669',
        steps: [
            { title: 'اضغط أيقونة العين', desc: 'تفتح نافذة تفاصيل الطلب بالكامل' },
            { title: 'قائمة الأصناف', desc: 'تعرض كل منتج مباع مع الكمية والسعر والمجموع' },
            { title: 'المبالغ والتواريخ', desc: 'تجد مجموع الفاتورة وتاريخ البيع في التفاصيل' },
        ]
    },
];
const ordersHelpTips = [
    'يمكن البحث برقم الطلب لعرض فاتورة محددة',
    'الطلبيات المستردة مرتبطة بعملية مرتجع سابقة',
    'الإجمالي في أعلى الصفحة يشمل جميع الفترات',
];

const searchQuery = ref("");
const selectedOrder = ref(null);
const showDetailDialog = ref(false);

// ── Date Filter ──
const dateFrom = ref("");
const dateTo = ref("");
const statusFilter = ref("all");

onMounted(() => {
    orderStore.fetchOrders();
});

// ── Computed Stats ──
const orderStats = computed(() => {
    const orders = orderStore.orders;
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completedOrders = orders.filter(o => {
        const s = (o.status || "").toLowerCase();
        return s === "completed" || s === "paid";
    }).length;
    const pendingOrders = orders.filter(o => (o.status || "").toLowerCase() === "pending").length;
    const cancelledOrders = orders.filter(o => (o.status || "").toLowerCase() === "cancelled").length;
    const refundedOrders = orders.filter(o => (o.status || "").toLowerCase() === "refunded").length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    return { totalOrders, totalSales, completedOrders, pendingOrders, cancelledOrders, refundedOrders, avgOrderValue };
});

// Filtered orders based on search query, date range, and status
const filteredOrders = computed(() => {
    let result = orderStore.orders;

    // Status filter
    if (statusFilter.value !== "all") {
        result = result.filter(o => {
            const s = (o.status || "").toLowerCase();
            if (statusFilter.value === "completed") return s === "completed" || s === "paid";
            return s === statusFilter.value;
        });
    }

    // Date filter
    if (dateFrom.value) {
        const from = new Date(dateFrom.value);
        from.setHours(0, 0, 0, 0);
        result = result.filter(o => o.date && new Date(o.date) >= from);
    }
    if (dateTo.value) {
        const to = new Date(dateTo.value);
        to.setHours(23, 59, 59, 999);
        result = result.filter(o => o.date && new Date(o.date) <= to);
    }

    // Search filter
    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
        result = result.filter((o) =>
            (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
            (o.cashier && o.cashier.toLowerCase().includes(q)) ||
            (o.paymentMethod && o.paymentMethod.toLowerCase().includes(q))
        );
    }

    return result;
});

const clearFilters = () => {
    searchQuery.value = "";
    dateFrom.value = "";
    dateTo.value = "";
    statusFilter.value = "all";
};

const hasActiveFilters = computed(() => {
    return searchQuery.value || dateFrom.value || dateTo.value || statusFilter.value !== "all";
});

// Open detail dialog
const viewOrderDetails = (order) => {
    selectedOrder.value = order;
    showDetailDialog.value = true;
};

// Format currency
const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};

// Format date
const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Status display
const getStatusConfig = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "paid") return { label: "مكتمل", class: "status-success", icon: CheckCircle2 };
    if (s === "pending") return { label: "معلق", class: "status-warning", icon: Clock };
    if (s === "cancelled") return { label: "ملغي", class: "status-danger", icon: XCircle };
    if (s === "refunded") return { label: "مسترد", class: "status-refunded", icon: RotateCcw };
    return { label: status || "—", class: "status-info", icon: ClipboardList };
};

// Payment method display
const getPaymentConfig = (method) => {
    if (!method) return { label: "—", class: "payment-default", icon: DollarSign };
    const m = method.toLowerCase();
    if (m === "cash") return { label: "نقدي", class: "payment-cash", icon: Banknote };
    if (m === "card") return { label: "بطاقة", class: "payment-card", icon: CreditCard };
    return { label: method, class: "payment-default", icon: DollarSign };
};
</script>

<template>
    <div class="orders-page">
        <!-- Header -->
        <div class="orders-header">
            <div class="header-start">
                <div class="header-icon-wrap">
                    <Receipt :size="26" />
                </div>
                <div class="header-text">
                    <h1 class="orders-title">سجل الطلبات والفواتير</h1>
                    <p class="orders-subtitle">متابعة وعرض تفاصيل المبيعات والمبالغ المستلمة</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
            </div>
        </div>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="سجل الطلبيات"
            page-subtitle="متابعة الفواتير والمبيعات"
            :page-icon="ClipboardList"
            header-gradient="linear-gradient(135deg, #059669 0%, #0ea5e9 100%)"
            :sections="ordersHelpSections"
            :tips="ordersHelpTips"
        />

        <!-- Stats Cards -->
        <div class="orders-stats-grid">
            <div class="stat-card">
                <div class="stat-icon-circle blue">
                    <ClipboardList :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ orderStats.totalOrders }}</span>
                    <span class="stat-label">إجمالي الطلبات</span>
                </div>
                <div class="stat-accent blue"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-circle green">
                    <DollarSign :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ formatCurrency(orderStats.totalSales) }}</span>
                    <span class="stat-label">إجمالي المبيعات</span>
                </div>
                <div class="stat-accent green"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-circle emerald">
                    <CheckCircle2 :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ orderStats.completedOrders }}</span>
                    <span class="stat-label">طلبات مكتملة</span>
                </div>
                <div class="stat-accent emerald"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-circle orange">
                    <Clock :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ orderStats.pendingOrders }}</span>
                    <span class="stat-label">طلبات معلقة</span>
                </div>
                <div class="stat-accent orange"></div>
            </div>
        </div>

        <!-- Table Container Card -->
        <div class="orders-card">
            <!-- Filter Bar -->
            <div class="orders-filter-bar">
                <div class="filter-row">
                    <div class="search-input-wrap">
                        <Search :size="16" class="search-icon" />
                        <InputText
                            v-model="searchQuery"
                            placeholder="ابحث برقم الفاتورة، اسم الكاشير، أو طريقة الدفع..."
                            class="pr-10 pl-4 w-full search-input"
                            autocomplete="off"
                            size="small"
                        />
                    </div>
                    <div class="filter-controls">
                        <div class="date-filter-group">
                            <Calendar :size="14" class="filter-icon" />
                            <input type="date" v-model="dateFrom" class="date-input" placeholder="من" />
                            <span class="date-sep">—</span>
                            <input type="date" v-model="dateTo" class="date-input" placeholder="إلى" />
                        </div>
                        <select v-model="statusFilter" class="status-select">
                            <option value="all">كل الحالات</option>
                            <option value="completed">مكتمل</option>
                            <option value="pending">معلق</option>
                            <option value="cancelled">ملغي</option>
                            <option value="refunded">مسترد</option>
                        </select>
                        <button v-if="hasActiveFilters" class="clear-filter-btn" @click="clearFilters" title="مسح الفلاتر">
                            <XCircle :size="14" />
                            <span>مسح</span>
                        </button>
                    </div>
                </div>
                <div class="filter-results-info" v-if="hasActiveFilters">
                    <Filter :size="13" />
                    <span>عرض {{ filteredOrders.length }} من {{ orderStore.orders.length }} طلب</span>
                </div>
            </div>

            <!-- Orders Table -->
            <DataTable
                :value="filteredOrders"
                :loading="orderStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                emptyMessage="لا توجد فواتير بيع مطابقة"
                stripedRows
                removableSort
                scrollable
                class="orders-table"
            >
                <Column field="orderNumber" header="رقم الفاتورة" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <div class="inv-number-cell">
                            <div class="inv-number-icon">
                                <Receipt :size="14" />
                            </div>
                            <span class="inv-number-text">{{ data.orderNumber }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="date" header="التاريخ" sortable style="min-width: 200px">
                    <template #body="{ data }">
                        <div class="date-cell">
                            <Calendar :size="13" class="date-icon" />
                            <span>{{ formatDate(data.date) }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="cashier" header="الكاشير" sortable style="min-width: 140px">
                    <template #body="{ data }">
                        <div class="cashier-cell">
                            <UserIcon :size="13" class="cashier-icon" />
                            <span class="cashier-name">{{ data.cashier }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="total" header="الإجمالي" sortable style="min-width: 150px">
                    <template #body="{ data }">
                        <span class="total-cell">{{ formatCurrency(data.total) }}</span>
                    </template>
                </Column>
                <Column field="paymentMethod" header="طريقة الدفع" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="payment-chip" :class="getPaymentConfig(data.paymentMethod).class">
                            <component :is="getPaymentConfig(data.paymentMethod).icon" :size="12" />
                            {{ getPaymentConfig(data.paymentMethod).label }}
                        </span>
                    </template>
                </Column>
                <Column field="status" header="الحالة" sortable style="min-width: 120px">
                    <template #body="{ data }">
                        <span class="status-chip" :class="getStatusConfig(data.status).class">
                            <component :is="getStatusConfig(data.status).icon" :size="12" />
                            {{ getStatusConfig(data.status).label }}
                        </span>
                    </template>
                </Column>
                <Column header="عرض" style="min-width: 80px; text-align: center">
                    <template #body="{ data }">
                        <button class="act-btn act-view" @click="viewOrderDetails(data)" title="عرض التفاصيل">
                            <Eye :size="15" />
                        </button>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Order Detail Dialog -->
        <Dialog
            v-model:visible="showDetailDialog"
            header="تفاصيل الفاتورة"
            :style="{ width: '700px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body" v-if="selectedOrder">
                <!-- Invoice Header Card -->
                <div class="detail-header-card">
                    <div class="detail-header-top">
                        <div class="detail-invoice-icon">
                            <Receipt :size="22" />
                        </div>
                        <div class="detail-invoice-info">
                            <span class="detail-invoice-no">{{ selectedOrder.orderNumber }}</span>
                            <span class="detail-invoice-meta">
                                <UserIcon :size="13" />
                                {{ selectedOrder.cashier }}
                            </span>
                        </div>
                        <span class="status-chip" :class="getStatusConfig(selectedOrder.status).class" style="margin-inline-start: auto;">
                            <component :is="getStatusConfig(selectedOrder.status).icon" :size="12" />
                            {{ getStatusConfig(selectedOrder.status).label }}
                        </span>
                    </div>
                    <div class="detail-meta-strip">
                        <div class="detail-meta-item">
                            <Calendar :size="13" />
                            <span>{{ formatDate(selectedOrder.date) }}</span>
                        </div>
                        <div class="detail-meta-item">
                            <Package :size="13" />
                            <span>{{ selectedOrder.items?.length || 0 }} صنف</span>
                        </div>
                        <div class="detail-meta-item">
                            <component :is="getPaymentConfig(selectedOrder.paymentMethod).icon" :size="13" />
                            <span>{{ getPaymentConfig(selectedOrder.paymentMethod).label }}</span>
                        </div>
                    </div>
                </div>

                <!-- Order Items -->
                <div v-if="selectedOrder.items && selectedOrder.items.length > 0">
                    <div class="detail-section-title">
                        <ShoppingBag :size="15" />
                        <span>أصناف الطلب</span>
                    </div>
                    <div class="detail-items-list">
                        <div v-for="(item, idx) in selectedOrder.items" :key="idx" class="detail-item-row">
                            <div class="detail-item-index">{{ idx + 1 }}</div>
                            <div class="detail-item-info">
                                <span class="detail-item-name">{{ item.name }}</span>
                                <span class="detail-item-id">سعر الوحدة: {{ formatCurrency(item.price) }}</span>
                            </div>
                            <div class="detail-item-qty">{{ item.qty }} وحدة</div>
                            <div class="detail-item-discount" v-if="item.discount > 0">
                                -{{ formatCurrency(item.discount) }}
                            </div>
                            <div class="detail-item-total">{{ formatCurrency(item.total || (item.price * item.qty - (item.discount || 0))) }}</div>
                        </div>
                    </div>
                </div>
                <div v-else class="detail-empty">
                    <Package :size="32" />
                    <span>لا تتوفر تفاصيل الأصناف لهذا الطلب</span>
                </div>

                <!-- Order Totals -->
                <div class="detail-totals-card">
                    <div class="totals-row">
                        <span class="totals-label">المجموع الفرعي</span>
                        <span class="totals-value">{{ formatCurrency(selectedOrder.subtotal) }}</span>
                    </div>
                    <div class="totals-row totals-discount" v-if="selectedOrder.discount > 0">
                        <span class="totals-label">الخصم المطبق</span>
                        <span class="totals-value-discount">-{{ formatCurrency(selectedOrder.discount) }}</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">الضريبة</span>
                        <span class="totals-value">{{ formatCurrency(selectedOrder.tax) }}</span>
                    </div>
                    <div class="totals-divider"></div>
                    <div class="totals-row totals-final">
                        <span class="totals-label">الإجمالي النهائي</span>
                        <span class="totals-value-final">{{ formatCurrency(selectedOrder.total) }}</span>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <Button label="إغلاق" outlined severity="secondary" @click="showDetailDialog = false" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* ─── Page Layout ───────────────────────────────────────── */
.orders-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .orders-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* ─── Header ────────────────────────────────────────────── */
.orders-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    width: 100%;
}

.header-start {
    display: flex;
    align-items: center;
    gap: 0.875rem;
}

.header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    color: white;
    box-shadow: 0 4px 12px rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.3);
}

.orders-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}
.dark .orders-title { color: var(--p-surface-0); }

.orders-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* ─── Stats Cards Grid ──────────────────────────────────── */
.orders-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

@media (max-width: 1024px) {
    .orders-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 480px) {
    .orders-stats-grid {
        grid-template-columns: 1fr;
    }
}

.stat-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    transition: all 0.2s ease;
}
.stat-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
}
.dark .stat-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}
.dark .stat-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stat-icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
}

.stat-icon-circle.blue {
    background: #dbeafe;
    color: #2563eb;
}
.dark .stat-icon-circle.blue {
    background: rgba(37, 99, 235, 0.15);
    color: #60a5fa;
}

.stat-icon-circle.green {
    background: #dcfce7;
    color: #16a34a;
}
.dark .stat-icon-circle.green {
    background: rgba(22, 163, 74, 0.15);
    color: #4ade80;
}

.stat-icon-circle.emerald {
    background: #d1fae5;
    color: #059669;
}
.dark .stat-icon-circle.emerald {
    background: rgba(5, 150, 105, 0.15);
    color: #34d399;
}

.stat-icon-circle.orange {
    background: #fef3c7;
    color: #d97706;
}
.dark .stat-icon-circle.orange {
    background: rgba(217, 119, 6, 0.15);
    color: #fbbf24;
}

.stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.stat-value {
    font-size: 1.25rem;
    font-weight: 850;
    color: var(--p-surface-900);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .stat-value { color: var(--p-surface-50); }

.stat-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.stat-accent {
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    width: 4px;
    height: 100%;
    border-radius: 0 4px 4px 0;
}

.stat-accent.blue { background: linear-gradient(to bottom, #3b82f6, #2563eb); }
.stat-accent.green { background: linear-gradient(to bottom, #22c55e, #16a34a); }
.stat-accent.emerald { background: linear-gradient(to bottom, #10b981, #059669); }
.stat-accent.orange { background: linear-gradient(to bottom, #f59e0b, #d97706); }

/* ─── Table Card ────────────────────────────────────────── */
.orders-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.dark .orders-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

/* ─── Filter Bar ────────────────────────────────────────── */
.orders-filter-bar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}
.dark .orders-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

.filter-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.search-input-wrap {
    position: relative;
    flex: 1;
    min-width: 220px;
}

.search-icon {
    position: absolute;
    inset-inline-start: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--p-surface-400);
    pointer-events: none;
}
.dark .search-icon { color: var(--p-surface-500); }

.search-input {
    padding-inline-start: 2.25rem !important;
}

.filter-controls {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
}

.date-filter-group {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 0.5rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
}
.dark .date-filter-group {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
}

.filter-icon {
    color: var(--p-surface-400);
    flex-shrink: 0;
}

.date-input {
    border: none;
    background: transparent;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--p-surface-700);
    padding: 0.3rem 0.25rem;
    width: 120px;
    outline: none;
}
.dark .date-input {
    color: var(--p-surface-200);
    color-scheme: dark;
}

.date-sep {
    font-size: 0.75rem;
    color: var(--p-surface-400);
}

.status-select {
    border: 1px solid var(--p-surface-200);
    border-radius: 0.5rem;
    background: var(--p-surface-0);
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--p-surface-700);
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
}
.status-select:focus { border-color: var(--p-primary-400); }
.dark .status-select {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-200);
}

.clear-filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.5rem;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #ef4444;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
}
.clear-filter-btn:hover { background: #fee2e2; border-color: #fca5a5; }
.dark .clear-filter-btn {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
}

.filter-results-info {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-primary-600);
    padding: 0.25rem 0;
}
.dark .filter-results-info { color: var(--p-primary-400); }

/* ─── Table Cell Styles ─────────────────────────────────── */
.inv-number-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.inv-number-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    background: var(--p-primary-50);
    color: var(--p-primary-500);
    flex-shrink: 0;
}
.dark .inv-number-icon {
    background: rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.12);
    color: var(--p-primary-400);
}

.inv-number-text {
    font-size: 0.875rem;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    color: var(--p-primary-600);
}
.dark .inv-number-text { color: var(--p-primary-400); }

.date-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--p-surface-600);
}
.dark .date-cell { color: var(--p-surface-350); }
.date-icon { color: var(--p-surface-400); flex-shrink: 0; }

.cashier-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.cashier-icon { color: var(--p-surface-400); flex-shrink: 0; }
.cashier-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--p-surface-700);
}
.dark .cashier-name { color: var(--p-surface-200); }

.items-count-chip {
    display: inline-flex;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    background: #f5f3ff;
    color: #7c3aed;
    border: 1px solid #ddd6fe;
}
.dark .items-count-chip {
    background: rgba(124, 58, 237, 0.1);
    color: #a78bfa;
    border-color: rgba(124, 58, 237, 0.25);
}

.amount-cell {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--p-surface-700);
}
.dark .amount-cell { color: var(--p-surface-250); }

.amount-cell-secondary {
    font-size: 0.825rem;
    font-weight: 500;
    color: var(--p-surface-500);
}
.dark .amount-cell-secondary { color: var(--p-surface-400); }

.discount-active {
    font-size: 0.85rem;
    font-weight: 700;
    color: #ef4444;
}
.dark .discount-active { color: #f87171; }

.discount-none {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--p-surface-400);
}

.total-cell {
    font-size: 0.9rem;
    font-weight: 850;
    color: var(--p-surface-900);
}
.dark .total-cell { color: var(--p-surface-50); }

/* ─── Status & Payment Chips ────────────────────────────── */
.status-chip, .payment-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    border: 1px solid;
    white-space: nowrap;
}

.status-success {
    background: #ecfdf5; color: #059669; border-color: #a7f3d0;
}
.dark .status-success {
    background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.25);
}

.status-warning {
    background: #fef3c7; color: #d97706; border-color: #fde68a;
}
.dark .status-warning {
    background: rgba(245, 158, 11, 0.1); color: #fbbf24; border-color: rgba(245, 158, 11, 0.25);
}

.status-danger {
    background: #fef2f2; color: #dc2626; border-color: #fecaca;
}
.dark .status-danger {
    background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.25);
}

.status-refunded {
    background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe;
}
.dark .status-refunded {
    background: rgba(124, 58, 237, 0.1); color: #a78bfa; border-color: rgba(124, 58, 237, 0.25);
}

.status-info {
    background: #eff6ff; color: #2563eb; border-color: #bfdbfe;
}
.dark .status-info {
    background: rgba(37, 99, 235, 0.1); color: #60a5fa; border-color: rgba(37, 99, 235, 0.25);
}

.payment-cash {
    background: #ecfdf5; color: #059669; border-color: #a7f3d0;
}
.dark .payment-cash {
    background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.25);
}

.payment-card {
    background: #dbeafe; color: #2563eb; border-color: #93c5fd;
}
.dark .payment-card {
    background: rgba(37, 99, 235, 0.1); color: #60a5fa; border-color: rgba(37, 99, 235, 0.25);
}

.payment-default {
    background: var(--p-surface-100); color: var(--p-surface-600); border-color: var(--p-surface-200);
}
.dark .payment-default {
    background: var(--p-surface-800); color: var(--p-surface-400); border-color: var(--p-surface-700);
}

/* ─── Action Button ─────────────────────────────────────── */
.act-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    border: 1px solid;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
}

.act-btn.act-view {
    color: #7c3aed;
    border-color: #ddd6fe;
    background: #f5f3ff;
}
.dark .act-btn.act-view {
    background: rgba(124, 58, 237, 0.1);
    border-color: rgba(124, 58, 237, 0.25);
    color: #a78bfa;
}
.act-btn.act-view:hover {
    background: #ede9fe;
    border-color: #c4b5fd;
    transform: scale(1.05);
}
.dark .act-btn.act-view:hover { background: rgba(124, 58, 237, 0.2); }

/* ─── Dialog Body ───────────────────────────────────────── */
.dialog-body {
    display: flex;
    flex-direction: column;
    gap: 1.125rem;
    padding: 0.25rem 0;
}

.dialog-footer {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
    width: 100%;
}

/* ─── Detail Dialog ─────────────────────────────────────── */
.detail-header-card {
    padding: 1.125rem;
    border-radius: 0.875rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}
.dark .detail-header-card {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.detail-header-top {
    display: flex;
    align-items: center;
    gap: 0.875rem;
}

.detail-invoice-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    color: white;
    flex-shrink: 0;
}

.detail-invoice-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.detail-invoice-no {
    font-size: 1rem;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    color: var(--p-primary-600);
}
.dark .detail-invoice-no { color: var(--p-primary-400); }

.detail-invoice-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.detail-meta-strip {
    display: flex;
    gap: 1.25rem;
    padding-top: 0.625rem;
    border-top: 1px solid var(--p-surface-150);
    flex-wrap: wrap;
}
.dark .detail-meta-strip { border-color: var(--p-surface-750); }

.detail-meta-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.775rem;
    font-weight: 500;
    color: var(--p-surface-450);
}

.detail-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 750;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding-bottom: 0.375rem;
    border-bottom: 1px dashed var(--p-surface-200);
}
.dark .detail-section-title { border-color: var(--p-surface-750); color: var(--p-surface-400); }

.detail-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    max-height: 280px;
    overflow-y: auto;
    margin-top: 0.5rem;
}

.detail-item-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    border-radius: 0.625rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-100);
    transition: background-color 0.15s;
}
.dark .detail-item-row {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}
.detail-item-row:hover { background: var(--p-surface-50); }
.dark .detail-item-row:hover { background: var(--p-surface-800); }

.detail-item-index {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    background: var(--p-surface-100);
    color: var(--p-surface-500);
    font-size: 0.75rem;
    font-weight: 800;
    flex-shrink: 0;
}
.dark .detail-item-index { background: var(--p-surface-800); color: var(--p-surface-400); }

.detail-item-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
}

.detail-item-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--p-surface-800);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .detail-item-name { color: var(--p-surface-100); }

.detail-item-id {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--p-surface-400);
}

.detail-item-qty {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--p-surface-600);
    white-space: nowrap;
}
.dark .detail-item-qty { color: var(--p-surface-350); }

.detail-item-discount {
    font-size: 0.75rem;
    font-weight: 700;
    color: #ef4444;
    white-space: nowrap;
}
.dark .detail-item-discount { color: #f87171; }

.detail-item-total {
    font-size: 0.85rem;
    font-weight: 850;
    color: var(--p-surface-900);
    white-space: nowrap;
}
.dark .detail-item-total { color: var(--p-surface-50); }

.detail-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2.5rem;
    color: var(--p-surface-350);
    text-align: center;
    font-size: 0.875rem;
    font-weight: 500;
}

/* ─── Totals Card ───────────────────────────────────────── */
.detail-totals-card {
    padding: 1rem 1.125rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.dark .detail-totals-card {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.totals-label {
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.totals-value {
    font-size: 0.875rem;
    font-weight: 750;
    color: var(--p-surface-700);
}
.dark .totals-value { color: var(--p-surface-250); }

.totals-value-discount {
    font-size: 0.875rem;
    font-weight: 750;
    color: #ef4444;
}
.dark .totals-value-discount { color: #f87171; }

.totals-divider {
    border-top: 1px dashed var(--p-surface-200);
    margin: 0.25rem 0;
}
.dark .totals-divider { border-color: var(--p-surface-700); }

.totals-final .totals-label {
    font-size: 1rem;
    font-weight: 800;
    color: var(--p-surface-800);
}
.dark .totals-final .totals-label { color: var(--p-surface-150); }

.totals-value-final {
    font-size: 1.2rem;
    font-weight: 900;
    color: var(--p-primary-600);
}
.dark .totals-value-final { color: var(--p-primary-400); }

/* ─── Deep Overrides ────────────────────────────────────── */
:deep(.p-datatable-tbody > tr > td) {
    border-bottom: none !important;
}
</style>
