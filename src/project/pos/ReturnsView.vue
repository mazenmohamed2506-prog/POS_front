<script setup>
import { ref, onMounted, computed } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { RotateCcw, Search } from "lucide-vue-next";

const posStore = usePosStore();

const showReturnDialog = ref(false);
const selectedOrder = ref(null);
const returnItems = ref([]);
const searchQuery = ref("");

onMounted(() => {
    posStore.fetchOrders();
});

const openReturnDialog = (order) => {
    if (order.type === "return") return;
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
        .map((i) => ({ name: i.name, price: i.price, qty: i.returnQty }));

    if (itemsToReturn.length === 0) return;

    await posStore.processReturn(selectedOrder.value.id, itemsToReturn);
    showReturnDialog.value = false;
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: posStore.settings.currency || "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};

const filteredOrders = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return posStore.orders;
    return posStore.orders.filter((o) =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(q))
    );
});
</script>

<template>
    <div class="returns-page">
        <!-- Header -->
        <div class="returns-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <RotateCcw :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="returns-title">المرتجعات</h1>
                    <p class="returns-subtitle">إرجاع المنتجات المباعة وتحديث المخزون واسترداد المبالغ</p>
                </div>
            </div>
        </div>

        <!-- Table Container Card -->
        <div class="returns-card">
            <!-- Filter Bar -->
            <div class="returns-filter-bar">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="searchQuery"
                        placeholder="ابحث برقم الطلب..."
                        class="ps-9 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Orders Table -->
            <DataTable
                :value="filteredOrders"
                :loading="posStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                emptyMessage="لا توجد طلبات بيع مطابقة"
                stripedRows
                removableSort
                scrollable
                class="returns-table"
            >
                <Column field="orderNumber" header="رقم الطلب" sortable style="min-width: 170px">
                    <template #body="{ data }">
                        <span class="order-number-cell font-mono">{{ data.orderNumber }}</span>
                    </template>
                </Column>
                <Column field="type" header="النوع" style="min-width: 120px">
                    <template #body="{ data }">
                        <Tag
                            :value="data.type === 'sale' ? 'بيع' : 'مرتجع'"
                            :severity="data.type === 'sale' ? 'info' : 'warn'"
                            class="font-medium"
                        />
                    </template>
                </Column>
                <Column field="date" header="التاريخ" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="text-sm font-medium">{{ formatDate(data.date) }}</span>
                    </template>
                </Column>
                <Column header="عدد الأصناف" style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="text-sm font-semibold text-surface-600 dark:text-surface-400">
                            {{ data.items?.length || 0 }} صنف
                        </span>
                    </template>
                </Column>
                <Column field="total" header="الإجمالي" sortable style="min-width: 140px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-900 dark:text-surface-50">{{ formatCurrency(data.total) }}</span>
                    </template>
                </Column>
                <Column field="paymentMethod" header="طريقة الدفع" style="min-width: 145px">
                    <template #body="{ data }">
                        <Tag
                            :value="data.paymentMethod === 'cash' ? 'نقدي' : data.paymentMethod === 'card' ? 'بطاقة' : data.paymentMethod || '—'"
                            :severity="data.paymentMethod === 'cash' ? 'success' : 'primary'"
                            class="font-medium"
                        />
                    </template>
                </Column>
                <Column header="إجراء" style="min-width: 120px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex justify-center">
                            <Button
                                v-if="data.type === 'sale'"
                                size="small"
                                label="إرجاع أصناف"
                                outlined
                                severity="warn"
                                @click="openReturnDialog(data)"
                            >
                                <template #icon><RotateCcw :size="14" class="me-1" /></template>
                            </Button>
                            <span v-else class="text-sm text-surface-400 font-medium">—</span>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Return Dialog -->
        <Dialog
            v-model:visible="showReturnDialog"
            header="معالجة مرتجع الفاتورة"
            :style="{ width: '560px' }"
            modal
            dismissableMask
        >
            <div class="return-dialog-content" v-if="selectedOrder">
                <div class="return-order-info-card">
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                        طلب بيع رقم: <strong class="text-surface-900 dark:text-surface-100 font-mono">{{ selectedOrder.orderNumber }}</strong>
                    </p>
                    <p class="text-xs text-surface-500 mt-1">التاريخ: {{ formatDate(selectedOrder.date) }}</p>
                </div>

                <div class="return-items-list mt-3">
                    <div
                        v-for="(item, idx) in returnItems"
                        :key="idx"
                        class="return-item-row"
                    >
                        <div class="flex-1">
                            <div class="font-bold text-surface-800 dark:text-surface-100">{{ item.name }}</div>
                            <div class="text-xs text-surface-450 mt-0.5">
                                السعر: {{ formatCurrency(item.price) }} · الكمية الأصلية: {{ item.qty }}
                            </div>
                        </div>
                        <div class="w-32">
                            <InputNumber
                                v-model="item.returnQty"
                                :min="0"
                                :max="item.qty"
                                fluid
                                placeholder="كمية المرتجع"
                                showButtons
                                buttonLayout="horizontal"
                                :inputStyle="{ textAlign: 'center' }"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showReturnDialog = false" />
                    <Button label="تأكيد تنفيذ المرتجع" severity="warn" @click="handleReturn" :loading="posStore.loading" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.returns-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .returns-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* Header */
.returns-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    flex-wrap: wrap;
    gap: 1rem;
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

.returns-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .returns-title {
    color: var(--p-surface-0);
}

.returns-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* Card Wrapper */
.returns-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .returns-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.returns-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .returns-filter-bar {
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

/* Dialog styling */
.return-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.return-order-info-card {
    padding: 0.875rem 1rem;
    border-radius: 0.5rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .return-order-info-card {
    background: var(--p-surface-950);
    border-color: var(--p-surface-850);
}

.return-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 250px;
    overflow-y: auto;
    padding-inline-end: 0.25rem;
}

.return-item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--p-surface-200);
}

.dark .return-item-row {
    border-color: var(--p-surface-800);
}

.return-item-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}
</style>
