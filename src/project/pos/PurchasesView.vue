<script setup>
import { ref, onMounted, computed } from "vue";
import { usePurchaseStore } from "@/stores/pos/purchaseStore";
import { Receipt, Plus, Trash2, Eye, Search } from "lucide-vue-next";

const purchaseStore = usePurchaseStore();

const showPurchaseDialog = ref(false);
const showDetailDialog = ref(false);
const selectedPurchase = ref(null);
const searchQuery = ref("");

const purchaseForm = ref({
    supplier: "",
    items: [{ productId: null, productName: "", qty: 1, cost: 0 }],
});

onMounted(() => {
    purchaseStore.fetchPurchases();
});

const filteredPurchases = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return purchaseStore.purchases;
    return purchaseStore.purchases.filter((p) =>
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q))
    );
});

const purchaseTotal = computed(() =>
    purchaseForm.value.items.reduce((sum, i) => sum + i.qty * i.cost, 0)
);

const addPurchaseLine = () => {
    purchaseForm.value.items.push({ productId: null, productName: "", qty: 1, cost: 0 });
};

const removePurchaseLine = (idx) => {
    purchaseForm.value.items.splice(idx, 1);
};

const openNewPurchase = () => {
    purchaseForm.value = {
        supplier: "",
        items: [{ productId: null, productName: "", qty: 1, cost: 0 }],
    };
    showPurchaseDialog.value = true;
};

const savePurchase = async () => {
    await purchaseStore.addPurchase(
        { supplier: purchaseForm.value.supplier },
        purchaseForm.value.items
    );
    showPurchaseDialog.value = false;
};

const viewDetails = (purchase) => {
    selectedPurchase.value = purchase;
    showDetailDialog.value = true;
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};
</script>

<template>
    <div class="purchases-page">
        <!-- Header -->
        <div class="purchases-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <Receipt :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="purchases-title">فواتير المشتريات</h1>
                    <p class="purchases-subtitle">تسجيل وإدارة فواتير شراء المنتجات من الموردين</p>
                </div>
            </div>
            <Button label="فاتورة جديدة" @click="openNewPurchase">
                <template #icon><Plus :size="18" /></template>
            </Button>
        </div>

        <!-- Table Container Card -->
        <div class="purchases-card">
            <!-- Filter Bar -->
            <div class="purchases-filter-bar">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="searchQuery"
                        placeholder="ابحث برقم الفاتورة أو المورد..."
                        class="ps-9 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Purchases Table -->
            <DataTable
                :value="filteredPurchases"
                :loading="purchaseStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                emptyMessage="لا توجد فواتير مشتريات مطابقة"
                stripedRows
                removableSort
                scrollable
                class="purchases-table"
            >
                <Column field="invoiceNumber" header="رقم الفاتورة" sortable style="min-width: 170px">
                    <template #body="{ data }">
                        <span class="purchase-inv-number font-mono">{{ data.invoiceNumber }}</span>
                    </template>
                </Column>
                <Column field="supplier" header="المورد" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="font-semibold text-surface-800 dark:text-surface-100">{{ data.supplier }}</span>
                    </template>
                </Column>
                <Column field="date" header="التاريخ" sortable style="min-width: 200px">
                    <template #body="{ data }">
                        <span class="text-sm font-medium">{{ formatDate(data.date) }}</span>
                    </template>
                </Column>
                <Column header="عدد الأصناف" style="min-width: 130px">
                    <template #body="{ data }">
                        <Tag :value="`${data.items?.length || 0} صنف`" severity="info" class="font-medium" />
                    </template>
                </Column>
                <Column field="total" header="الإجمالي" sortable style="min-width: 160px">
                    <template #body="{ data }">
                        <span class="purchase-total-cell font-bold text-surface-900 dark:text-surface-50">{{ formatCurrency(data.total) }}</span>
                    </template>
                </Column>
                <Column field="status" header="الحالة" style="min-width: 120px">
                    <template #body="{ data }">
                        <Tag :value="data.status === 'received' ? 'مستلم' : data.status" severity="success" class="font-medium" />
                    </template>
                </Column>
                <Column header="عرض" style="min-width: 90px; text-align: center">
                    <template #body="{ data }">
                        <button class="purchase-view-btn" @click="viewDetails(data)" title="عرض التفاصيل">
                            <Eye :size="15" />
                        </button>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- ═══ Detail Dialog ═══ -->
        <Dialog
            v-model:visible="showDetailDialog"
            header="تفاصيل فاتورة المشتريات"
            :style="{ width: '680px' }"
            modal
            dismissableMask
        >
            <div class="purchase-detail-content" v-if="selectedPurchase">
                <!-- Invoice Info -->
                <div class="purchase-detail-header-card">
                    <div class="detail-row">
                        <span class="detail-label">رقم الفاتورة:</span>
                        <span class="detail-value font-mono font-bold text-primary-600 dark:text-primary-400">{{ selectedPurchase.invoiceNumber }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">المورد:</span>
                        <span class="detail-value font-bold text-surface-900 dark:text-surface-50">{{ selectedPurchase.supplier }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">التاريخ:</span>
                        <span class="detail-value font-medium">{{ formatDate(selectedPurchase.date) }}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">الحالة:</span>
                        <Tag :value="selectedPurchase.status === 'received' ? 'مستلم' : selectedPurchase.status" severity="success" class="font-medium" />
                    </div>
                </div>

                <!-- Items Table -->
                <div class="purchase-detail-section" v-if="selectedPurchase.items && selectedPurchase.items.length > 0">
                    <h3 class="section-title">أصناف الفاتورة</h3>
                    <div class="border border-surface-200 dark:border-surface-800 rounded-lg overflow-hidden mt-2">
                        <DataTable :value="selectedPurchase.items" size="small" scrollable class="purchase-detail-items-table">
                            <Column header="#" style="min-width: 50px">
                                <template #body="{ index }">
                                    <span class="text-surface-450 text-xs">{{ index + 1 }}</span>
                                </template>
                            </Column>
                            <Column field="productName" header="المنتج" style="min-width: 180px">
                                <template #body="{ data }">
                                    <div>
                                        <div class="font-bold text-surface-800 dark:text-surface-100">{{ data.productName }}</div>
                                        <div class="text-xs text-surface-400">كود: {{ data.productId }}</div>
                                    </div>
                                </template>
                            </Column>
                            <Column field="qty" header="الكمية" style="min-width: 90px">
                                <template #body="{ data }">
                                    <span class="font-bold text-surface-700 dark:text-surface-300">{{ data.qty }}</span>
                                </template>
                            </Column>
                            <Column field="cost" header="سعر التكلفة" style="min-width: 120px">
                                <template #body="{ data }">
                                    <span class="text-sm">{{ formatCurrency(data.cost) }}</span>
                                </template>
                            </Column>
                            <Column header="الإجمالي" style="min-width: 130px">
                                <template #body="{ data }">
                                    <span class="font-black text-surface-900 dark:text-surface-100">{{ formatCurrency(data.qty * data.cost) }}</span>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
                <div v-else class="purchase-detail-empty">لا تتوفر تفاصيل أصناف لهذه الفاتورة</div>

                <!-- Totals Summary -->
                <div class="purchase-totals-summary">
                    <div class="totals-row">
                        <span class="totals-label">عدد الأصناف الفريدة:</span>
                        <span class="totals-value font-bold">{{ selectedPurchase.items?.length || 0 }}</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">إجمالي الكميات المشتراة:</span>
                        <span class="totals-value font-bold">{{ selectedPurchase.items?.reduce((s, i) => s + (i.qty || 0), 0) || 0 }}</span>
                    </div>
                    <div class="border-t border-dashed border-surface-200 dark:border-surface-800 my-2"></div>
                    <div class="totals-row totals-row-final">
                        <span class="totals-label font-extrabold text-surface-800 dark:text-surface-200 text-lg">إجمالي الفاتورة:</span>
                        <span class="totals-value font-black text-xl text-primary-600 dark:text-primary-400">{{ formatCurrency(selectedPurchase.total) }}</span>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="إغلاق" outlined severity="secondary" @click="showDetailDialog = false" class="w-full" />
            </template>
        </Dialog>

        <!-- ═══ New Purchase Dialog ═══ -->
        <Dialog
            v-model:visible="showPurchaseDialog"
            header="تسجيل فاتورة مشتريات جديدة"
            :style="{ width: '680px' }"
            modal
            dismissableMask
        >
            <div class="purchase-dialog-form">
                <div class="form-field">
                    <label class="required">اسم المورد</label>
                    <InputText v-model="purchaseForm.supplier" fluid placeholder="أدخل اسم المورد" />
                </div>

                <!-- Item Lines -->
                <div class="form-field mt-2">
                    <label class="required">أصناف الفاتورة</label>
                    <div class="purchase-lines-list">
                        <div
                            v-for="(item, idx) in purchaseForm.items"
                            :key="idx"
                            class="purchase-line-row"
                        >
                            <div class="flex-1 min-w-[200px]">
                                <InputText v-model="item.productName" fluid placeholder="اسم الصنف / المنتج" />
                            </div>
                            <div class="w-24">
                                <InputNumber v-model="item.qty" :min="1" fluid placeholder="الكمية" />
                            </div>
                            <div class="w-28">
                                <InputNumber v-model="item.cost" :minFractionDigits="2" fluid placeholder="سعر الشراء" />
                            </div>
                            <button
                                class="purchase-line-delete-btn"
                                @click="removePurchaseLine(idx)"
                                :disabled="purchaseForm.items.length <= 1"
                                title="حذف السطر"
                            >
                                <Trash2 :size="15" />
                            </button>
                        </div>
                    </div>
                    
                    <Button label="إضافة سطر صنف جديد" outlined severity="primary" size="small" @click="addPurchaseLine" class="self-start mt-2">
                        <template #icon><Plus :size="16" /></template>
                    </Button>
                </div>

                <div class="flex justify-between items-center pt-4 border-t border-dashed border-surface-200 dark:border-surface-800">
                    <span class="text-surface-555 font-bold">إجمالي الفاتورة المتوقع:</span>
                    <span class="font-black text-xl text-primary-600 dark:text-primary-450">{{ formatCurrency(purchaseTotal) }}</span>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showPurchaseDialog = false" />
                    <Button label="حفظ الفاتورة" @click="savePurchase" :loading="purchaseStore.loading" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.purchases-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .purchases-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* Header */
.purchases-header {
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

.purchases-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .purchases-title {
    color: var(--p-surface-0);
}

.purchases-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* Card Wrapper */
.purchases-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .purchases-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.purchases-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .purchases-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

/* Table styles */
.purchase-inv-number {
    font-weight: 700;
    color: var(--p-primary-600);
    font-size: 0.875rem;
}

.dark .purchase-inv-number {
    color: var(--p-primary-400);
}

.purchase-total-cell {
    font-weight: 800;
    font-size: 0.95rem;
}

.purchase-view-btn {
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

.dark .purchase-view-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}

.purchase-view-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}

.dark .purchase-view-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
}

/* Detail dialog contents */
.purchase-detail-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.purchase-detail-header-card {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .purchase-detail-header-card {
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

.purchase-detail-section {
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

.purchase-totals-summary {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .purchase-totals-summary {
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

/* Dialog Form Styling */
.purchase-dialog-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0.5rem 0;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.form-field label {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-700);
}

.dark .form-field label {
    color: var(--p-surface-200);
}

.purchase-lines-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 240px;
    overflow-y: auto;
    padding-inline-end: 0.25rem;
}

.purchase-line-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.purchase-line-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.15s;
}

.dark .purchase-line-delete-btn {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
}

.purchase-line-delete-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.purchase-line-delete-btn:not(:disabled):hover {
    background: #fee2e2;
    border-color: #fca5a5;
}
</style>
