<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import { useExpenseStore } from "@/stores/pos/expenseStore";
import { useReportStore } from "@/stores/pos/reportStore";
import {
    DollarSign, Plus, Search, HelpCircle, FileText, List, Printer,
    Download, RefreshCw, TrendingDown, Tag as TagIcon, Hash, FileBarChart
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const expenseStore = useExpenseStore();
const reportStore = useReportStore();

const showHelp = ref(false);
const helpSections = [
    {
        title: 'تسجيل ونفقات المصروفات',
        icon: DollarSign,
        color: '#fef3c7',
        iconColor: '#d97706',
        steps: [
            { title: 'إضافة مصروف جديد', desc: 'إدخال بيان المصروف (إيجار، صيانة، كهرباء) وتحديد المبلغ والتاريخ.' },
            { title: 'تصنيف المصروف ومصدر الدفع', desc: 'تحديد فئة المصروف وما إذا كان مدفوعاً من صندوق الوردية الكاش أو البنك.' },
        ]
    }
];
const helpTips = [
    'تسجيل المصروفات أولاً بأول يضمن صحة صافي الربح في التقارير المالية.',
    'المصروفات المدفوعة كاش من الدرج تظهر آلياً في تقرير إغلاق الوردية.'
];

const filters = ref({ global: { value: "", matchMode: "contains" } });
const showExpenseDialog = ref(false);

const expenseForm = ref({
    expenseDate: new Date().toISOString().split('T')[0],
    category: "UTILITIES",
    amount: 0,
    description: ""
});

const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

onMounted(() => {
    expenseStore.fetchExpenses();
});

const openNewExpense = () => {
    expenseForm.value = {
        expenseDate: new Date().toISOString().split('T')[0],
        category: "UTILITIES",
        amount: 0,
        description: ""
    };
    showExpenseDialog.value = true;
};

const submitExpense = async () => {
    try {
        const payload = {
            ...expenseForm.value,
            expenseDate: new Date(expenseForm.value.expenseDate).toISOString()
        };
        await expenseStore.logExpense(payload);
        showExpenseDialog.value = false;
    } catch {
        // Handled
    }
};

const generateReport = () => {
    reportStore.fetchExpensesReport({
        startDate: new Date(reportForm.value.startDate).toISOString(),
        endDate: new Date(reportForm.value.endDate + 'T23:59:59').toISOString()
    });
};

// ── Expenses Report Helpers ──
const isPrintingReport = ref(false);
const reportSearchQuery = ref("");

const reportItems = computed(() => {
    const data = reportStore.expensesData;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.items || data.expenses || data.records || [];
});

const filteredReportItems = computed(() => {
    const q = reportSearchQuery.value.trim().toLowerCase();
    if (!q) return reportItems.value;
    return reportItems.value.filter(item =>
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(q))
    );
});

const reportSummary = computed(() => {
    const data = reportStore.expensesData;
    const items = reportItems.value;

    const totalAmount = (data && !Array.isArray(data) && data.totalAmount !== undefined)
        ? Number(data.totalAmount || 0)
        : items.reduce((s, i) => s + (i.amount || 0), 0);

    const totalCount = items.length || (data && data.totalCount) || 0;
    const avgExpense = totalCount > 0 ? (totalAmount / totalCount) : 0;

    return { totalAmount, totalCount, avgExpense };
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

    let csvContent = "\uFEFFالتاريخ,الفئة,البيان / الوصف,المبلغ\n";
    items.forEach(item => {
        const date = item.expenseDate ? new Date(item.expenseDate).toLocaleDateString('ar-EG') : '';
        const cat = `"${getCategoryLabel(item.category || item.categoryName)}"`;
        const desc = `"${(item.description || '').replace(/"/g, '""')}"`;
        const amt = item.amount || 0;
        csvContent += `${date},${cat},${desc},${amt}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_المصروفات_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric"
    });
};

const categories = [
    { label: "فواتير/خدمات (كهرباء، ماء...)", value: "UTILITIES" },
    { label: "إيجار", value: "RENT" },
    { label: "صيانة", value: "MAINTENANCE" },
    { label: "أدوات/لوازم", value: "SUPPLIES" },
    { label: "أخرى", value: "OTHER" }
];

const getCategoryLabel = (val) => {
    return categories.find(c => c.value === val)?.label || val;
};
</script>

<template>
    <div class="expenses-page">
        <div class="page-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap bg-amber-50 border-amber-100">
                    <DollarSign :size="28" class="text-amber-500" />
                </div>
                <div>
                    <h1 class="page-title">المصروفات</h1>
                    <p class="page-subtitle">سجل المصروفات والنفقات الإدارية التشغيلية</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button label="إضافة مصروف جديد" @click="openNewExpense">
                    <template #icon>
                        <Plus :size="18" />
                    </template>
                </Button>
            </div>
        </div>

        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة المصروفات التشغيلية"
            page-subtitle="تسجيل ونفقات المتجر التشغيلية والبحث"
            :page-icon="DollarSign"
            header-gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            :sections="helpSections"
            :tips="helpTips"
        />

        <Tabs value="data">
            <TabList>
                <Tab value="data"><List class="inline-block me-2" :size="16" />سجل المصروفات</Tab>
                <Tab value="report"><FileText class="inline-block me-2" :size="16" />تقرير المصروفات</Tab>
            </TabList>
            
            <TabPanels>
                <TabPanel value="data" class="px-0 py-4">
                    <div class="content-card">
                        <div class="filter-bar">
                            <div class="relative w-full max-w-xs">
                                <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <InputText
                                    v-model="filters.global.value"
                                    placeholder="بحث في المصروفات..."
                                    class="ps-9 w-full"
                                    size="small"
                                />
                            </div>
                        </div>

                        <DataTable
                            :value="expenseStore.expenses"
                            :loading="expenseStore.loading"
                            paginator
                            :rows="15"
                            v-model:filters="filters"
                            :globalFilterFields="['category', 'description']"
                            emptyMessage="لا يوجد مصروفات مسجلة"
                            stripedRows
                            removableSort
                            class="main-table"
                        >
                            <Column field="expenseDate" header="التاريخ" sortable>
                                <template #body="{ data }">{{ formatDate(data.expenseDate) }}</template>
                            </Column>
                            <Column field="category" header="الفئة" sortable>
                                <template #body="{ data }">
                                    <span class="status-chip bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                        {{ getCategoryLabel(data.category) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="amount" header="المبلغ" sortable>
                                <template #body="{ data }">
                                    <span class="font-bold text-red-500">{{ formatCurrency(data.amount) }}</span>
                                </template>
                            </Column>
                            <Column field="description" header="الوصف"></Column>
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
                                <Button label="توليد التقرير" @click="generateReport" :loading="reportStore.isLoading">
                                    <template #icon><RefreshCw :size="16" class="me-1" /></template>
                                </Button>
                            </div>

                            <div v-if="reportStore.expensesData" class="flex items-center gap-2">
                                <Button label="طباعة" severity="secondary" outlined size="small" @click="printReport">
                                    <template #icon><Printer :size="16" class="me-1" /></template>
                                </Button>
                                <Button label="تصدير CSV" severity="secondary" outlined size="small" @click="exportReportCsv">
                                    <template #icon><Download :size="16" class="me-1" /></template>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div v-if="reportStore.expensesData">
                        <!-- Printable Official Header -->
                        <div class="print-official-header">
                            <div class="print-header-content">
                                <div class="print-header-brand">
                                    <h2>تقرير المصروفات والنفقات التشغيلية</h2>
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
                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-red-500">
                                <div class="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center flex-shrink-0">
                                    <TrendingDown :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي المصروفات</span>
                                    <span class="text-lg font-bold text-red-600">{{ formatCurrency(reportSummary.totalAmount) }}</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-amber-500">
                                <div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center flex-shrink-0">
                                    <FileText :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">عدد العمليات</span>
                                    <span class="text-lg font-bold text-surface-900 dark:text-surface-100">{{ reportSummary.totalCount }} عملية</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-blue-500">
                                <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <DollarSign :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">متوسط العملية</span>
                                    <span class="text-lg font-bold text-blue-600">{{ formatCurrency(reportSummary.avgExpense) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Report DataTable Card -->
                        <div class="content-card p-4">
                            <div class="flex justify-between items-center mb-4 no-print">
                                <div class="relative flex-1 max-w-sm">
                                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                    <InputText v-model="reportSearchQuery" placeholder="بحث بالبيان أو الفئة..." class="ps-9 w-full" size="small" />
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
                                <Column field="expenseDate" header="التاريخ" sortable style="min-width: 140px">
                                    <template #body="{ data }">
                                        <span>{{ formatDate(data.expenseDate || data.date) }}</span>
                                    </template>
                                </Column>

                                <Column field="category" header="الفئة" sortable style="min-width: 140px">
                                    <template #body="{ data }">
                                        <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                            {{ getCategoryLabel(data.category || data.categoryName) }}
                                        </span>
                                    </template>
                                </Column>

                                <Column field="description" header="البيان / الوصف" style="min-width: 220px">
                                    <template #body="{ data }">
                                        <span class="font-medium text-surface-900 dark:text-surface-100">{{ data.description || 'بدون بيان' }}</span>
                                    </template>
                                </Column>

                                <Column field="amount" header="المبلغ" sortable style="min-width: 140px">
                                    <template #body="{ data }">
                                        <span class="font-bold text-red-600 text-base">{{ formatCurrency(data.amount) }}</span>
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

        <Dialog
            v-model:visible="showExpenseDialog"
            header="تسجيل مصروف جديد"
            :style="{ width: '450px' }"
            modal
        >
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">التاريخ</label>
                    <InputText type="date" v-model="expenseForm.expenseDate" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">المبلغ</label>
                    <div class="relative w-full">
                        <InputNumber
                            v-model="expenseForm.amount"
                            :min="0"
                            :minFractionDigits="2"
                            placeholder="0.00"
                            :inputStyle="{ paddingInlineEnd: '2.5rem' }"
                            fluid
                        />
                        <span class="absolute end-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none font-semibold select-none">ج.م</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">الفئة</label>
                    <Select
                        v-model="expenseForm.category"
                        :options="categories"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">الوصف / التفاصيل</label>
                    <Textarea v-model="expenseForm.description" rows="3" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showExpenseDialog = false" />
                    <Button label="حفظ المصروف" @click="submitExpense" :loading="expenseStore.loading" :disabled="!expenseForm.amount || !expenseForm.description" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.expenses-page {
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
</style>
