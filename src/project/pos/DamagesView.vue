<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import { useDamageStore } from "@/stores/pos/damageStore";
import { useInventoryStore } from "@/stores/pos/inventoryStore";
import { useProductStore } from "@/stores/pos/productStore";
import { usePosStore } from "@/stores/pos/posStore";
import { useReportStore } from "@/stores/pos/reportStore";
import {
    Trash2, Plus, Search, HelpCircle, AlertTriangle, FileText, List,
    Printer, Download, RefreshCw, Layers, DollarSign, Package, Hash
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const damageStore = useDamageStore();
const inventoryStore = useInventoryStore();
const productStore = useProductStore();
const posStore = usePosStore();
const reportStore = useReportStore();

const showHelp = ref(false);
const helpSections = [
    {
        title: 'إدارة التوالف',
        icon: Trash2,
        color: '#fee2e2',
        iconColor: '#ef4444',
        steps: [
            { title: 'تسجيل تالف', desc: 'اضغط "تسجيل تالف جديد" لاختيار المنتج وتحديد الكمية والسبب' },
            { title: 'خصم المخزون', desc: 'يتم خصم الكمية التالفة فوراً من الرف أو المستودع حسب اختيارك' },
        ]
    }
];
const helpTips = [
    'تأكد من اختيار المنتج والتشغيلة الصحيحة قبل تسجيل التالف',
    'لا يمكن التراجع عن تسجيل التالف بعد تأكيده'
];

const filters = ref({ global: { value: "", matchMode: "contains" } });
const showDamageDialog = ref(false);

const damageForm = ref({
    productId: null,
    inventoryId: null, // this will be the specific batch in inventory
    quantity: 1,
    reason: "BROKEN",
    notes: ""
});

const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

onMounted(() => {
    damageStore.fetchDamages();
    if (productStore.products.length === 0) productStore.fetchProducts();
    if (inventoryStore.inventory.length === 0) inventoryStore.fetchInventory();
});

const openNewDamage = () => {
    damageForm.value = {
        productId: null,
        inventoryId: null,
        quantity: 1,
        reason: "BROKEN",
        notes: ""
    };
    showDamageDialog.value = true;
};

// Available products that have some stock
const availableProducts = computed(() => {
    const stockedProductIds = new Set(inventoryStore.inventory.filter(i => (i.shelfStock + i.warehouseStock) > 0).map(i => i.productId));
    return productStore.products.filter(p => stockedProductIds.has(p.id));
});

// Available batches for selected product
const availableBatches = computed(() => {
    if (!damageForm.value.productId) return [];
    return inventoryStore.inventory.filter(i => i.productId === damageForm.value.productId && (i.shelfStock + i.warehouseStock) > 0).map(i => {
        return {
            ...i,
            label: `تشغيلة: ${i.batchNumber || '—'} | الرف: ${i.shelfStock} | المستودع: ${i.warehouseStock}`
        };
    });
});

const maxQuantity = computed(() => {
    if (!damageForm.value.inventoryId) return 0;
    const batch = inventoryStore.inventory.find(i => i.id === damageForm.value.inventoryId);
    if (!batch) return 0;
    return batch.shelfStock + batch.warehouseStock;
});

const submitDamage = async () => {
    try {
        await damageStore.logDamage({ ...damageForm.value });
        showDamageDialog.value = false;
        inventoryStore.fetchInventory(); // refresh inventory to reflect deduction
    } catch {
        // Handled in store
    }
};

const generateReport = () => {
    reportStore.fetchDamagesReport({
        startDate: new Date(reportForm.value.startDate).toISOString(),
        endDate: new Date(reportForm.value.endDate + 'T23:59:59').toISOString()
    });
};

// ── Damages Report Helpers ──
const isPrintingReport = ref(false);
const reportSearchQuery = ref("");

const reportItems = computed(() => {
    const data = reportStore.damagesData;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.items || data.damages || data.records || [];
});

const filteredReportItems = computed(() => {
    const q = reportSearchQuery.value.trim().toLowerCase();
    if (!q) return reportItems.value;
    return reportItems.value.filter(item =>
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(q)) ||
        (item.reason && item.reason.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
    );
});

const reportSummary = computed(() => {
    const data = reportStore.damagesData;
    const items = reportItems.value;

    const totalCost = (data && !Array.isArray(data) && data.totalCost !== undefined)
        ? Number(data.totalCost || 0)
        : items.reduce((s, i) => s + (i.totalCost || ((i.quantity || 0) * (i.costPrice || 0))), 0);

    const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalCount = items.length || (data && data.totalCount) || 0;

    return { totalCost, totalQty, totalCount };
});

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};

const printReport = async () => {
    isPrintingReport.value = true;
    await nextTick();
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            isPrintingReport.value = false;
        }, 500);
    }, 150);
};

const exportReportCsv = () => {
    const items = filteredReportItems.value;
    if (items.length === 0) return;

    let csvContent = "\uFEFFالمنتج,التشغيلة,الكمية,السبب,التكلفة,الملاحظات\n";
    items.forEach(item => {
        const name = `"${(item.productName || '').replace(/"/g, '""')}"`;
        const batch = `"${(item.batchNumber || '').replace(/"/g, '""')}"`;
        const qty = item.quantity || 0;
        const reason = `"${getReasonLabel(item.reason)}"`;
        const cost = item.totalCost || (qty * (item.costPrice || 0));
        const notes = `"${(item.notes || '').replace(/"/g, '""')}"`;
        csvContent += `${name},${batch},${qty},${reason},${cost},${notes}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_التوالف_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric", hour: '2-digit', minute: '2-digit'
    });
};

const reasons = [
    { label: "تالف/مكسور", value: "BROKEN" },
    { label: "منتهي الصلاحية", value: "EXPIRED" },
    { label: "مفقود", value: "LOST" },
    { label: "أخرى", value: "OTHER" }
];

const getReasonLabel = (val) => {
    return reasons.find(r => r.value === val)?.label || val;
};
</script>

<template>
    <div class="damages-page">
        <!-- Header -->
        <div class="page-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap bg-red-50 border-red-100">
                    <AlertTriangle :size="28" class="text-red-500" />
                </div>
                <div>
                    <h1 class="page-title">التوالف والفاقد</h1>
                    <p class="page-subtitle">سجل المنتجات التالفة والمفقودة</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button label="تسجيل تالف جديد" @click="openNewDamage" severity="danger">
                    <template #icon>
                        <Plus :size="18" />
                    </template>
                </Button>
            </div>
        </div>

        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة التوالف"
            page-subtitle="سجل المنتجات التالفة والمفقودة"
            :page-icon="AlertTriangle"
            header-gradient="linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
            :sections="helpSections"
            :tips="helpTips"
        />

        <Tabs value="data">
            <TabList>
                <Tab value="data"><List class="inline-block me-2" :size="16" />سجل التوالف</Tab>
                <Tab value="report"><FileText class="inline-block me-2" :size="16" />تقرير التوالف</Tab>
            </TabList>
            
            <TabPanels>
                <TabPanel value="data" class="px-0 py-4">
                    <div class="content-card">
                        <div class="filter-bar">
                            <div class="relative w-full max-w-xs">
                                <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <InputText
                                    v-model="filters.global.value"
                                    placeholder="بحث في السجل..."
                                    class="ps-9 w-full"
                                    size="small"
                                />
                            </div>
                        </div>

                        <DataTable
                            :value="damageStore.damages"
                            :loading="damageStore.loading"
                            paginator
                            :rows="15"
                            v-model:filters="filters"
                            :globalFilterFields="['productName', 'reason', 'notes']"
                            emptyMessage="لا يوجد توالف مسجلة"
                            stripedRows
                            removableSort
                            class="main-table"
                        >
                            <Column field="damageDate" header="التاريخ" sortable>
                                <template #body="{ data }">{{ formatDate(data.damageDate) }}</template>
                            </Column>
                            <Column field="productName" header="المنتج" sortable>
                                <template #body="{ data }">
                                    <span class="font-bold">{{ data.productName }}</span>
                                </template>
                            </Column>
                            <Column field="batchNumber" header="التشغيلة">
                                <template #body="{ data }">{{ data.batchNumber || '—' }}</template>
                            </Column>
                            <Column field="quantity" header="الكمية" sortable>
                                <template #body="{ data }">
                                    <span class="font-bold text-red-500">{{ data.quantity }}</span>
                                </template>
                            </Column>
                            <Column field="reason" header="السبب" sortable>
                                <template #body="{ data }">
                                    <span class="status-chip status-danger">{{ getReasonLabel(data.reason) }}</span>
                                </template>
                            </Column>
                            <Column field="notes" header="ملاحظات"></Column>
                            <Column field="createdBy" header="بواسطة"></Column>
                        </DataTable>
                    </div>
                </TabPanel>

                <TabPanel value="report" class="px-0 py-4">
                    <!-- Report Controls Card -->
                    <div class="content-card no-print p-4 mb-4">
                        <div class="flex flex-col md:flex-row items-end justify-between gap-4">
                            <div class="flex flex-col md:flex-row items-end gap-4 flex-1">
                                <div class="flex-1 w-full">
                                    <label class="font-bold block mb-2 text-sm text-surface-700 dark:text-surface-300">من تاريخ</label>
                                    <InputText type="date" v-model="reportForm.startDate" class="w-full" size="small" />
                                </div>
                                <div class="flex-1 w-full">
                                    <label class="font-bold block mb-2 text-sm text-surface-700 dark:text-surface-300">إلى تاريخ</label>
                                    <InputText type="date" v-model="reportForm.endDate" class="w-full" size="small" />
                                </div>
                                <Button label="توليد التقرير" @click="generateReport" :loading="reportStore.isLoading" severity="danger">
                                    <template #icon><RefreshCw :size="16" class="me-1" /></template>
                                </Button>
                            </div>

                            <div v-if="reportStore.damagesData" class="flex items-center gap-2">
                                <Button label="طباعة" severity="secondary" outlined size="small" @click="printReport">
                                    <template #icon><Printer :size="16" class="me-1" /></template>
                                </Button>
                                <Button label="تصدير CSV" severity="secondary" outlined size="small" @click="exportReportCsv">
                                    <template #icon><Download :size="16" class="me-1" /></template>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div v-if="reportStore.damagesData">
                        <!-- Printable Official Header -->
                        <div class="print-official-header">
                            <div class="print-header-content">
                                <div class="print-header-brand">
                                    <h2>تقرير التوالف والمنتجات الهالكة</h2>
                                    <p>نظام إدارة المبيعات والمخازن (POS System)</p>
                                </div>
                                <div class="print-header-meta">
                                    <p><span>الفترة:</span> {{ reportForm.startDate }} إلى {{ reportForm.endDate }}</p>
                                    <p><span>تاريخ الطباعة:</span> {{ new Date().toLocaleDateString('ar-EG') }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- KPI Summary Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-rose-600">
                                <div class="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center flex-shrink-0">
                                    <DollarSign :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي قيمة التوالف</span>
                                    <span class="text-lg font-bold text-rose-600">{{ formatCurrency(reportSummary.totalCost) }}</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-amber-500">
                                <div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center flex-shrink-0">
                                    <Layers :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي الوحدات الهالكة</span>
                                    <span class="text-lg font-bold text-surface-900 dark:text-surface-100">{{ reportSummary.totalQty.toLocaleString('ar-EG') }} قطعة</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-blue-500">
                                <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <FileText :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">عدد بلاغات التالف</span>
                                    <span class="text-lg font-bold text-blue-600">{{ reportSummary.totalCount }} بلاغ</span>
                                </div>
                            </div>
                        </div>

                        <!-- Report DataTable Card -->
                        <div class="content-card p-4">
                            <div class="flex justify-between items-center mb-4 no-print">
                                <div class="relative flex-1 max-w-sm">
                                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                    <InputText v-model="reportSearchQuery" placeholder="بحث بالمنتج، التشغيلة، السبب، أو الملاحظات..." class="ps-9 w-full" size="small" />
                                </div>
                                <div class="text-sm font-semibold text-surface-600 dark:text-surface-400">
                                    عدد السجلات: {{ filteredReportItems.length }}
                                </div>
                            </div>

                            <DataTable
                                :value="filteredReportItems"
                                :paginator="!isPrintingReport"
                                :rows="isPrintingReport ? 999999 : 10"
                                stripedRows
                                removableSort
                                responsiveLayout="scroll"
                            >
                                <Column field="productName" header="المنتج" sortable style="min-width: 200px">
                                    <template #body="{ data }">
                                        <div class="flex items-center gap-2">
                                            <Package :size="16" class="text-surface-400" />
                                            <span class="font-semibold text-surface-900 dark:text-surface-100 text-sm">{{ data.productName || 'منتج غير محدد' }}</span>
                                        </div>
                                    </template>
                                </Column>

                                <Column field="batchNumber" header="التشغيلة (Batch)" sortable style="min-width: 140px">
                                    <template #body="{ data }">
                                        <span class="font-mono text-xs text-surface-600 dark:text-surface-400">
                                            {{ data.batchNumber || '—' }}
                                        </span>
                                    </template>
                                </Column>

                                <Column field="quantity" header="الكمية التالفة" sortable style="min-width: 120px">
                                    <template #body="{ data }">
                                        <span class="font-bold text-red-600">{{ data.quantity }}</span>
                                    </template>
                                </Column>

                                <Column field="reason" header="السبب" sortable style="min-width: 140px">
                                    <template #body="{ data }">
                                        <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                            {{ getReasonLabel(data.reason) }}
                                        </span>
                                    </template>
                                </Column>

                                <Column field="totalCost" header="التكلفة الإجمالية" sortable style="min-width: 140px">
                                    <template #body="{ data }">
                                        <span class="font-bold text-rose-600">
                                            {{ formatCurrency(data.totalCost || ((data.quantity || 0) * (data.costPrice || 0))) }}
                                        </span>
                                    </template>
                                </Column>

                                <Column field="notes" header="ملاحظات" style="min-width: 180px">
                                    <template #body="{ data }">
                                        <span class="text-xs text-surface-500">{{ data.notes || '—' }}</span>
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </div>
                    <div v-else-if="!reportStore.isLoading" class="content-card p-8 text-center border-dashed">
                        <FileText :size="48" class="text-surface-300 mx-auto mb-4" />
                        <p class="text-surface-500">قم بتحديد الفترة الزمنية واضغط على توليد التقرير لعرض النتائج.</p>
                    </div>
                </TabPanel>
            </TabPanels>
        </Tabs>

        <!-- Damage Form Dialog -->
        <Dialog
            v-model:visible="showDamageDialog"
            header="تسجيل منتج تالف"
            :style="{ width: '450px' }"
            modal
        >
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">المنتج</label>
                    <Select
                        v-model="damageForm.productId"
                        :options="availableProducts"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="اختر المنتج"
                        filter
                        fluid
                        @change="damageForm.inventoryId = null"
                    />
                </div>
                <div class="flex flex-col gap-2" v-if="damageForm.productId">
                    <label class="font-bold required">التشغيلة (المخزون)</label>
                    <Select
                        v-model="damageForm.inventoryId"
                        :options="availableBatches"
                        optionLabel="label"
                        optionValue="id"
                        placeholder="اختر التشغيلة"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-2" v-if="damageForm.inventoryId">
                    <label class="font-bold required">الكمية التالفة</label>
                    <InputNumber
                        v-model="damageForm.quantity"
                        :min="1"
                        :max="maxQuantity"
                        showButtons
                        fluid
                    />
                    <small class="text-surface-500">أقصى كمية متاحة: {{ maxQuantity }}</small>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">السبب</label>
                    <Select
                        v-model="damageForm.reason"
                        :options="reasons"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold">ملاحظات</label>
                    <Textarea v-model="damageForm.notes" rows="2" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showDamageDialog = false" />
                    <Button label="تسجيل وخصم" severity="danger" @click="submitDamage" :loading="damageStore.loading" :disabled="!damageForm.inventoryId || !damageForm.quantity" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.damages-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

.page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
}

.page-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}
.dark .page-title { color: var(--p-surface-0); }

.page-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

.content-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
}
.dark .content-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.filter-bar {
    display: flex;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}
.dark .filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

.status-chip {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
}
.status-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.dark .status-danger { color: #f87171; }
</style>
