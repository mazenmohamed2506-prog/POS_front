<script setup>
import { ref, onMounted, computed } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { RotateCcw, Search, HelpCircle } from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const posStore = usePosStore();

// ── Help Drawer ──
const showHelp = ref(false);
const returnsHelpSections = [
    {
        title: 'كيفية إجراء مرتجع',
        icon: RotateCcw,
        color: '#fef3c7',
        iconColor: '#d97706',
        steps: [
            { title: 'ابحث عن الطلب', desc: 'ابحث برقم الطلب أو طريقة الدفع' },
            { title: 'اضغط زر المرتجع', desc: 'اختر الطلب واضغط زر "مرتجع" لفتح نافذة المرتجع' },
            { title: 'حدد الأصناف والكميات', desc: 'اختر المنتجات المراد إرجاعها وحدد كمية كل صنف' },
            { title: 'تأكيد المرتجع', desc: 'اضغط "تأكيد" لإتمام عملية الإرجاع واسترداد المبلغ' },
        ]
    },
    {
        title: 'قواعد المرتجعات',
        icon: HelpCircle,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'طلبيات المرتجع فقط', desc: 'لا يمكن إرجاع طلبيات المرتجع السابقة' },
            { title: 'كمية جزئية', desc: 'يمكن إرجاع جزء من الطلبية وليس بالضرورة كلها' },
        ]
    },
];
const returnsHelpTips = [
    'المرتجع يعيد المخزون تلقائياً إلى رف البيع',
    'تأكد من رقم الطلب قبل إجراء المرتجع',
    'يمكن إرجاع جزء من منتجات الطلبية فقط',
];

const activeTab = ref("sales"); // 'sales' | 'returns'
const showReturnDialog = ref(false);
const selectedOrder = ref(null);
const returnItems = ref([]);
const searchQuery = ref("");

onMounted(() => {
    posStore.fetchOrders();
});

const openReturnDialog = (order) => {
    if (order.type === "return" || order.status === "FullyReturned") return;
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
        .filter((i) => i.returnQty > 0 && i.returnQty <= i.maxReturnable)
        .map((i) => ({
            id: i.id,
            name: i.productName || i.name,
            qty: Number(i.returnQty),
            quantity: Number(i.returnQty),
            productUnitId: i.productUnitId || i.product_unit_id,
            productId: i.productId || i.product_id,
            batchId: i.batchId,
            batchNumber: i.batchNumber,
            reason: i.reason,
            price: i.price
        }));

    if (itemsToReturn.length === 0) return;

    await posStore.processReturn(selectedOrder.value.id, itemsToReturn);
    showReturnDialog.value = false;
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
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

const salesOrders = computed(() => {
    return posStore.orders.filter(o => o.type !== "return" && o.status !== "FullyReturned");
});

const returnedOrders = computed(() => {
    return posStore.orders.filter(o =>
        o.type === "return" ||
        o.status === "FullyReturned" ||
        o.status === "PartiallyReturned" ||
        (o.items && o.items.some(i => (i.returnedQuantity || 0) > 0))
    );
});

const filteredOrders = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    const sourceList = activeTab.value === "sales" ? salesOrders.value : returnedOrders.value;

    if (!q) return sourceList;
    return sourceList.filter((o) =>
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
            <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                <HelpCircle :size="18" />
            </button>
        </div>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="المرتجعات"
            page-subtitle="إرجاع المنتجات واسترداد المبالغ"
            :page-icon="RotateCcw"
            header-gradient="linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
            :sections="returnsHelpSections"
            :tips="returnsHelpTips"
        />

        <!-- Table Container Card -->
        <div class="returns-card">
            <!-- Filter & Tabs Bar -->
            <div class="returns-filter-bar flex-wrap gap-3 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <button
                        class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                        :class="activeTab === 'sales' ? 'bg-primary-500 text-white shadow-sm' : 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'"
                        @click="activeTab = 'sales'"
                    >
                        <span>طلبيات البيع</span>
                        <span class="text-xs px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-black/20">{{ salesOrders.length }}</span>
                    </button>
                    <button
                        class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                        :class="activeTab === 'returns' ? 'bg-amber-500 text-white shadow-sm' : 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'"
                        @click="activeTab = 'returns'"
                    >
                        <span>سجل المرتجعات</span>
                        <span class="text-xs px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-black/20">{{ returnedOrders.length }}</span>
                    </button>
                </div>

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
                emptyMessage="لا توجد طلبات مطابقة"
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
                <Column field="type" header="النوع / الحالة" style="min-width: 140px">
                    <template #body="{ data }">
                        <Tag
                            v-if="data.status === 'FullyReturned'"
                            value="مرتجع بالكامل"
                            severity="danger"
                            class="font-medium"
                        />
                        <Tag
                            v-else-if="data.status === 'PartiallyReturned'"
                            value="مرتجع جزئي"
                            severity="warn"
                            class="font-medium"
                        />
                        <Tag
                            v-else
                            :value="data.type === 'sale' ? 'طلب بيع' : 'مرتجع'"
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
                <Column header="إجراء" style="min-width: 140px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex justify-center">
                            <Button
                                v-if="data.type === 'sale' && data.status !== 'FullyReturned'"
                                size="small"
                                label="إرجاع أصناف"
                                outlined
                                severity="warn"
                                @click="openReturnDialog(data)"
                            >
                                <template #icon><RotateCcw :size="14" class="me-1" /></template>
                            </Button>
                            <Tag v-else-if="data.status === 'FullyReturned'" value="مسترجع بالكامل" severity="secondary" />
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
            :style="{ width: '600px' }"
            modal
            dismissableMask
        >
            <div class="return-dialog-content" v-if="selectedOrder">
                <div class="return-order-info-card p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                        طلب بيع رقم: <strong class="text-surface-900 dark:text-surface-100 font-mono">{{ selectedOrder.orderNumber }}</strong>
                    </p>
                    <p class="text-xs text-surface-500 mt-1">التاريخ: {{ formatDate(selectedOrder.date) }}</p>
                </div>

                <div class="return-items-list mt-3 space-y-2">
                    <div
                        v-for="(item, idx) in returnItems"
                        :key="idx"
                        class="return-item-row p-3 rounded-lg border border-surface-200 dark:border-surface-700 flex items-center justify-between gap-3"
                        :class="{ 'opacity-65 bg-surface-50 dark:bg-surface-900': item.maxReturnable <= 0 }"
                    >
                        <div class="flex-1">
                            <div class="font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
                                <span>{{ item.name }}</span>
                                <Tag v-if="item.maxReturnable <= 0" value="مسترجع بالكامل" severity="danger" size="small" />
                                <Tag v-else-if="item.returnedQty > 0" :value="'تم إرجاع ' + item.returnedQty" severity="warn" size="small" />
                            </div>
                            <div class="text-xs text-surface-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                <span>السعر: {{ formatCurrency(item.price) }}</span>
                                <span>المباع الأصلي: {{ item.qty }}</span>
                                <span v-if="item.returnedQty > 0" class="text-amber-600 font-medium">المرتجع سابقاً: {{ item.returnedQty }}</span>
                                <span class="text-emerald-600 dark:text-emerald-400 font-bold">المتاح للإرجاع: {{ item.maxReturnable }}</span>
                            </div>
                        </div>
                        <div class="w-36">
                            <InputNumber
                                v-if="item.maxReturnable > 0"
                                v-model="item.returnQty"
                                :min="0"
                                :max="item.maxReturnable"
                                fluid
                                placeholder="0"
                                showButtons
                                buttonLayout="horizontal"
                                :inputStyle="{ textAlign: 'center' }"
                            />
                            <span v-else class="text-xs font-bold text-danger-500 block text-center">غير متاح للإرجاع</span>
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
