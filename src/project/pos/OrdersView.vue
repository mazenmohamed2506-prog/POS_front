<script setup>
import { ref, computed, onMounted } from "vue";
import { useOrderStore } from "@/stores/pos/orderStore";
import { ClipboardList, Search, Eye } from "lucide-vue-next";

const orderStore = useOrderStore();

const searchQuery = ref("");
const selectedOrder = ref(null);
const showDetailDialog = ref(false);

onMounted(() => {
    orderStore.fetchOrders();
});

// Filtered orders based on search query
const filteredOrders = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return orderStore.orders;
    return orderStore.orders.filter((o) =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.cashier && o.cashier.toLowerCase().includes(q)) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(q))
    );
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
const getStatusSeverity = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "paid") return "success";
    if (s === "pending") return "warn";
    if (s === "cancelled" || s === "refunded") return "danger";
    return "info";
};

const getStatusLabel = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "paid") return "مكتمل";
    if (s === "pending") return "معلق";
    if (s === "cancelled") return "ملغي";
    if (s === "refunded") return "مسترد";
    return status || "—";
};

// Payment method display
const getPaymentLabel = (method) => {
    if (!method) return "—";
    const m = method.toLowerCase();
    if (m === "cash") return "نقدي";
    if (m === "card") return "بطاقة";
    return method;
};
</script>

<template>
    <div class="orders-page">
        <!-- Header -->
        <div class="orders-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <ClipboardList :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="orders-title">سجل الطلبات والفواتير</h1>
                    <p class="orders-subtitle">متابعة وعرض تفاصيل المبيعات والمبالغ المستلمة</p>
                </div>
            </div>
            
            <div class="orders-header-stats" v-if="orderStore.orders.length > 0">
                <div class="stat-chip">
                    <span class="stat-chip-label">إجمالي الطلبات</span>
                    <span class="stat-chip-value">{{ orderStore.orders.length }} طلب</span>
                </div>
                <div class="stat-chip stat-chip-green">
                    <span class="stat-chip-label">إجمالي المبيعات</span>
                    <span class="stat-chip-value font-extrabold text-green-600 dark:text-green-400">
                        {{ formatCurrency(orderStore.orders.reduce((sum, o) => sum + (o.total || 0), 0)) }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Table Container Card -->
        <div class="orders-card">
            <!-- Filter Bar -->
            <div class="orders-filter-bar">
                <div class="relative w-full max-w-sm">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="searchQuery"
                        placeholder="ابحث برقم الفاتورة، اسم الكاشير، أو طريقة الدفع..."
                        class="ps-9 w-full"
                        autocomplete="off"
                        size="small"
                    />
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
                <Column field="orderNumber" header="رقم الفاتورة" sortable style="min-width: 170px">
                    <template #body="{ data }">
                        <span class="order-number-cell font-mono">{{ data.orderNumber }}</span>
                    </template>
                </Column>
                <Column field="date" header="التاريخ" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="text-sm font-medium">{{ formatDate(data.date) }}</span>
                    </template>
                </Column>
                <Column field="subtotal" header="المجموع الفرعي" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="text-sm">{{ formatCurrency(data.subtotal) }}</span>
                    </template>
                </Column>
                <Column field="discount" header="الخصم" sortable style="min-width: 110px">
                    <template #body="{ data }">
                        <span :class="data.discount > 0 ? 'text-red-500 font-bold' : 'text-surface-400'">
                            {{ data.discount > 0 ? formatCurrency(data.discount) : '—' }}
                        </span>
                    </template>
                </Column>
                <Column field="tax" header="الضريبة" sortable style="min-width: 110px">
                    <template #body="{ data }">
                        <span class="text-sm">{{ formatCurrency(data.tax) }}</span>
                    </template>
                </Column>
                <Column field="total" header="الإجمالي النهائي" sortable style="min-width: 145px">
                    <template #body="{ data }">
                        <span class="order-total-cell font-bold text-surface-900 dark:text-surface-50">{{ formatCurrency(data.total) }}</span>
                    </template>
                </Column>
                <Column field="paymentMethod" header="طريقة الدفع" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <Tag
                            :value="getPaymentLabel(data.paymentMethod)"
                            :severity="data.paymentMethod === 'cash' ? 'success' : 'primary'"
                            class="font-medium"
                        />
                    </template>
                </Column>
                <Column field="status" header="الحالة" sortable style="min-width: 110px">
                    <template #body="{ data }">
                        <Tag
                            :value="getStatusLabel(data.status)"
                            :severity="getStatusSeverity(data.status)"
                            class="font-medium"
                        />
                    </template>
                </Column>
                <Column field="cashier" header="الكاشير" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="text-sm text-surface-600 dark:text-surface-400">{{ data.cashier }}</span>
                    </template>
                </Column>
                <Column header="عرض" style="min-width: 80px; text-align: center">
                    <template #body="{ data }">
                        <button
                            class="order-view-btn"
                            @click="viewOrderDetails(data)"
                            title="عرض التفاصيل"
                        >
                            <Eye :size="15" />
                        </button>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Order Detail Dialog -->
        <Dialog
            v-model:visible="showDetailDialog"
            header="تفاصيل الفاتورة والعملية"
            :style="{ width: '650px' }"
            modal
            dismissableMask
        >
            <div class="order-detail-content" v-if="selectedOrder">
                <!-- Order Info Header -->
                <div class="order-detail-header-card">
                    <div class="detail-row">
                        <span class="detail-label">رقم الفاتورة:</span>
                        <span class="detail-value font-mono font-bold text-primary-650 dark:text-primary-400">{{ selectedOrder.orderNumber }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">تاريخ المعاملة:</span>
                        <span class="detail-value font-medium">{{ formatDate(selectedOrder.date) }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">الكاشير المسؤول:</span>
                        <span class="detail-value font-bold text-surface-900 dark:text-surface-100">{{ selectedOrder.cashier }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">طريقة السداد:</span>
                        <Tag
                            :value="getPaymentLabel(selectedOrder.paymentMethod)"
                            :severity="selectedOrder.paymentMethod === 'cash' ? 'success' : 'primary'"
                            class="font-medium"
                        />
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">حالة الطلب:</span>
                        <Tag
                            :value="getStatusLabel(selectedOrder.status)"
                            :severity="getStatusSeverity(selectedOrder.status)"
                            class="font-medium"
                        />
                    </div>
                </div>

                <!-- Order Items -->
                <div class="order-detail-section" v-if="selectedOrder.items && selectedOrder.items.length > 0">
                    <h3 class="section-title">أصناف الطلب</h3>
                    <div class="border border-surface-200 dark:border-surface-800 rounded-lg overflow-hidden mt-2">
                        <DataTable :value="selectedOrder.items" size="small" scrollable class="order-detail-items-table">
                            <Column field="name" header="المنتج" style="min-width: 180px">
                                <template #body="{ data }">
                                    <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.name }}</span>
                                </template>
                            </Column>
                            <Column field="qty" header="الكمية" style="min-width: 80px">
                                <template #body="{ data }">
                                    <span class="font-bold text-surface-700 dark:text-surface-300">{{ data.qty }}</span>
                                </template>
                            </Column>
                            <Column field="price" header="السعر" style="min-width: 100px">
                                <template #body="{ data }">
                                    <span class="text-sm">{{ formatCurrency(data.price) }}</span>
                                </template>
                            </Column>
                            <Column field="discount" header="الخصم" style="min-width: 90px">
                                <template #body="{ data }">
                                    <span :class="data.discount > 0 ? 'text-red-500 font-bold' : 'text-surface-400'">
                                        {{ data.discount > 0 ? formatCurrency(data.discount) : '—' }}
                                    </span>
                                </template>
                            </Column>
                            <Column header="الإجمالي" style="min-width: 120px">
                                <template #body="{ data }">
                                    <span class="font-black text-surface-900 dark:text-surface-100">
                                        {{ formatCurrency(data.total || (data.price * data.qty - (data.discount || 0))) }}
                                    </span>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
                <div v-else class="order-detail-no-items">
                    لا تتوفر تفاصيل الأصناف لهذا الطلب
                </div>

                <!-- Order Totals -->
                <div class="order-totals-summary">
                    <div class="totals-row">
                        <span>المجموع الفرعي:</span>
                        <span class="font-semibold">{{ formatCurrency(selectedOrder.subtotal) }}</span>
                    </div>
                    <div class="totals-row text-red-500 font-semibold" v-if="selectedOrder.discount > 0">
                        <span>الخصم المطبق:</span>
                        <span>-{{ formatCurrency(selectedOrder.discount) }}</span>
                    </div>
                    <div class="totals-row">
                        <span>الضريبة:</span>
                        <span class="font-semibold">{{ formatCurrency(selectedOrder.tax) }}</span>
                    </div>
                    <div class="border-t border-dashed border-surface-200 dark:border-surface-800 my-2"></div>
                    <div class="totals-row totals-row-final">
                        <span class="font-extrabold text-surface-800 dark:text-surface-200 text-lg">الإجمالي النهائي:</span>
                        <span class="font-black text-xl text-primary-600 dark:text-primary-450">{{ formatCurrency(selectedOrder.total) }}</span>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="إغلاق الفاتورة" outlined severity="secondary" @click="showDetailDialog = false" class="w-full" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
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

/* Header */
.orders-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    width: 100%;
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

.orders-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .orders-title {
    color: var(--p-surface-0);
}

.orders-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

.orders-header-stats {
    display: flex;
    gap: 0.75rem;
}

.stat-chip {
    display: flex;
    flex-direction: column;
    padding: 0.625rem 1.25rem;
    border-radius: 0.75rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.dark .stat-chip {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.stat-chip-green {
    background: #dcfce7;
    border-color: #bbf7d0;
}

.dark .stat-chip-green {
    background: rgba(34, 197, 94, 0.12);
    border-color: rgba(34, 197, 94, 0.25);
}

.stat-chip-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-surface-500);
    text-transform: uppercase;
}

.stat-chip-value {
    font-size: 1.05rem;
    font-weight: 850;
    color: var(--p-surface-800);
}

.dark .stat-chip-value {
    color: var(--p-surface-100);
}

/* Card Wrapper */
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

.orders-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .orders-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

.order-number-cell {
    font-weight: 700;
    color: var(--p-primary-600);
    font-size: 0.875rem;
}

.dark .order-number-cell {
    color: var(--p-primary-400);
}

.order-total-cell {
    font-size: 0.95rem;
}

.order-view-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    color: var(--p-surface-500);
    cursor: pointer;
    transition: all 0.15s;
}

.dark .order-view-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}

.order-view-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}

.dark .order-view-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
}

/* Detail dialog contents */
.order-detail-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.order-detail-header-card {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .order-detail-header-card {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
}

.detail-label {
    color: var(--p-surface-500);
}

.detail-value {
    color: var(--p-surface-800);
}

.dark .detail-value {
    color: var(--p-surface-100);
}

.order-detail-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.section-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--p-surface-650);
    margin: 0;
    padding-bottom: 0.25rem;
    border-bottom: 2px solid var(--p-primary-500);
    width: fit-content;
}

.dark .section-title {
    color: var(--p-surface-350);
}

.order-totals-summary {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .order-totals-summary {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: var(--p-surface-600);
}

.dark .totals-row {
    color: var(--p-surface-400);
}

.totals-row-final {
    color: var(--p-surface-900);
}
</style>
