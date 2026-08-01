<script setup>
import { ref, computed, nextTick } from "vue";
import { useReportStore } from "@/stores/pos/reportStore";
import {
    FileBarChart, Printer, Download, HelpCircle, Calendar, DollarSign,
    TrendingUp, TrendingDown, RefreshCw, Search, Layers, ShoppingBag
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const reportStore = useReportStore();

const showHelp = ref(false);
const helpSections = [
    {
        title: 'التقارير المالية',
        icon: FileBarChart,
        color: '#e0e7ff',
        iconColor: '#4f46e5',
        steps: [
            { title: 'تقرير الأرباح والخسائر', desc: 'حدد فترة التقرير لمعرفة صافي الربح بعد خصم التكاليف والمصروفات' },
            { title: 'الطباعة والتصدير', desc: 'استخدم الأزرار العلوية للطباعة أو الحفظ كملف' },
        ]
    }
];
const helpTips = [
    'تكلفة البضاعة المباعة (COGS) تعتمد على متوسط التكلفة لكل منتج مباع',
    'يتم خصم الرواتب والمصروفات والتوالف ضمن الفترة المحددة'
];

const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

const monthlyReportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

const generatePnlReport = () => {
    reportStore.fetchProfitLossReport({
        startDate: reportForm.value.startDate,
        endDate: reportForm.value.endDate
    });
};

const generateMonthlyReport = () => {
    reportStore.fetchMonthlyFinancialReport({
        startDate: monthlyReportForm.value.startDate,
        endDate: monthlyReportForm.value.endDate
    });
};

// ── Monthly Report Helpers ──
const isPrintingMonthly = ref(false);
const monthlySearchQuery = ref("");

const monthlyReportItems = computed(() => {
    const data = reportStore.monthlyFinancialData;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;

    const totalExpenses = (data.generalExpenses || 0) + (data.salaryExpenses || 0) + (data.damagedInventoryLoss || 0);

    return [
        { category: 'المبيعات والإيرادات', item: 'إجمالي إيرادات المبيعات (Sales Revenue)', value: data.salesRevenue || 0, type: 'income', notes: `عدد عمليات البيع: ${data.salesCount || 0}` },
        { category: 'المشتريات والموردين', item: 'إجمالي فواتير المشتريات (Purchases)', value: data.purchaseTotal || 0, type: 'expense', notes: 'إجمالي قيمة الفواتير الواردة' },
        { category: 'المشتريات والموردين', item: 'إجمالي المدفوعات للموردين', value: data.supplierPaymentsTotal || 0, type: 'info', notes: 'سدادات خزانة للموردين' },
        { category: 'المصروفات والرواتب', item: 'المصروفات التشغيلية والعمومية', value: data.generalExpenses || 0, type: 'expense', notes: 'إيجار، كهرباء، صيانة...' },
        { category: 'المصروفات والرواتب', item: 'إجمالي رواتب الموظفين (Payroll)', value: data.salaryExpenses || 0, type: 'expense', notes: 'أجور مستحقة ومدفوعة' },
        { category: 'المصروفات والرواتب', item: 'خسائر التوالف والفاقد (Damages)', value: data.damagedInventoryLoss || 0, type: 'expense', notes: 'تكلفة الأصناف التالفة' },
        { category: 'المصروفات والرواتب', item: 'إجمالي التكاليف والمصروفات الكلية', value: totalExpenses, type: 'summary_expense', notes: 'مجموع المصروفات والرواتب والتوالف' },
        { category: 'تقييم المخزون', item: 'قيمة مخزون بداية الفترة (Opening Stock)', value: data.openingInventoryValue || 0, type: 'info', notes: 'تقدير تاريخ بداية التقرير' },
        { category: 'تقييم المخزون', item: 'قيمة مخزون نهاية الفترة (Closing Stock)', value: data.closingInventoryValue || 0, type: 'info', notes: 'تقدير تاريخ نهاية التقرير' },
        { category: 'الحسابات الآجلة', item: 'مستحقات المبيعات الآجلة (Receivables)', value: data.customerOutstandingReceivables || 0, type: 'info', notes: 'ديون متبقية على العملاء' },
        { category: 'الحسابات الآجلة', item: 'التزامات المشتريات الآجلة (Payables)', value: data.supplierOutstandingPayables || 0, type: 'info', notes: 'ديون متبقية للموردين' },
        { category: 'صافي الربح', item: 'صافي الدخل / الربح النهائي (Net Profit)', value: data.netProfit || 0, type: (data.netProfit || 0) >= 0 ? 'profit' : 'loss', notes: 'النتيجة المالية النهائية للفترة' }
    ];
});

const filteredMonthlyReportItems = computed(() => {
    const q = monthlySearchQuery.value.trim().toLowerCase();
    if (!q) return monthlyReportItems.value;
    return monthlyReportItems.value.filter(item =>
        (item.item && item.item.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.monthName && item.monthName.toLowerCase().includes(q))
    );
});

const monthlyReportSummary = computed(() => {
    const data = reportStore.monthlyFinancialData;
    if (!data) return { totalSales: 0, totalPurchases: 0, totalExpenses: 0, netIncome: 0 };

    if (!Array.isArray(data)) {
        const totalSales = Number(data.salesRevenue ?? data.totalSales ?? 0);
        const totalPurchases = Number(data.purchaseTotal ?? data.totalPurchases ?? 0);
        const totalExpenses = data.generalExpenses !== undefined
            ? (Number(data.generalExpenses || 0) + Number(data.salaryExpenses || 0) + Number(data.damagedInventoryLoss || 0))
            : Number(data.totalExpenses || 0);
        const netIncome = Number(data.netProfit ?? data.netIncome ?? 0);

        return { totalSales, totalPurchases, totalExpenses, netIncome };
    }

    const items = data.items || data.months || data.records || [];
    const totalSales = items.reduce((s, i) => s + (i.salesRevenue || i.totalSales || i.sales || 0), 0);
    const totalPurchases = items.reduce((s, i) => s + (i.purchaseTotal || i.totalPurchases || i.purchases || 0), 0);
    const totalExpenses = items.reduce((s, i) => s + (i.totalExpenses || ((i.generalExpenses || 0) + (i.salaryExpenses || 0) + (i.damagedInventoryLoss || 0))), 0);
    const netIncome = items.reduce((s, i) => s + (i.netProfit ?? i.netIncome ?? ((i.salesRevenue || i.totalSales || 0) - (i.totalExpenses || 0))), 0);

    return { totalSales, totalPurchases, totalExpenses, netIncome };
});

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};

const printReport = () => {
    window.print();
};

const printMonthlyReport = async () => {
    isPrintingMonthly.value = true;
    await nextTick();
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            isPrintingMonthly.value = false;
        }, 500);
    }, 150);
};

const exportMonthlyReportCsv = () => {
    const items = filteredMonthlyReportItems.value;
    if (items.length === 0) return;

    let csvContent = "\uFEFFالفئة,البيان / البند,القيمة المالية,ملاحظات\n";
    items.forEach(item => {
        if (item.item) {
            const cat = `"${item.category || ''}"`;
            const label = `"${item.item || ''}"`;
            const val = item.value || 0;
            const notes = `"${item.notes || ''}"`;
            csvContent += `${cat},${label},${val},${notes}\n`;
        } else {
            const month = `"${item.monthName || item.month || ''}"`;
            const sales = item.totalSales || item.sales || 0;
            const purchases = item.totalPurchases || item.purchases || 0;
            const expenses = item.totalExpenses || item.expenses || 0;
            const net = item.netIncome ?? item.netProfit ?? (sales - expenses);
            csvContent += `${month},${sales},${purchases},${expenses},${net}\n`;
        }
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `التقرير_المالي_الشهري_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};
</script>

<template>
    <div class="reports-page">
        <div class="page-header no-print">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap bg-indigo-50 border-indigo-100">
                    <FileBarChart :size="28" class="text-indigo-500" />
                </div>
                <div>
                    <h1 class="page-title">التقارير المالية</h1>
                    <p class="page-subtitle">تقارير الأرباح والخسائر وحالة المتجر</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
            </div>
        </div>

        <HelpDrawer
            v-model="showHelp"
            page-title="التقارير المالية"
            page-subtitle="تقارير الأرباح والخسائر"
            :page-icon="FileBarChart"
            header-gradient="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)"
            :sections="helpSections"
            :tips="helpTips"
        />

        <Tabs value="pnl">
            <TabList>
                <Tab value="pnl"><FileBarChart class="inline-block me-2" :size="16" />تقرير الأرباح والخسائر</Tab>
                <Tab value="monthly"><Calendar class="inline-block me-2" :size="16" />التقرير المالي الشهري</Tab>
            </TabList>
            
            <TabPanels>
                <TabPanel value="pnl" class="px-0 py-4">
                    <div class="content-card no-print p-4 mb-6">
                        <div class="flex flex-col md:flex-row items-end gap-4">
                            <div class="flex-1">
                                <label class="font-bold block mb-2">من تاريخ</label>
                                <InputText type="date" v-model="reportForm.startDate" class="w-full" />
                            </div>
                            <div class="flex-1">
                                <label class="font-bold block mb-2">إلى تاريخ</label>
                                <InputText type="date" v-model="reportForm.endDate" class="w-full" />
                            </div>
                            <div>
                                <Button label="إنشاء التقرير" @click="generatePnlReport" :loading="reportStore.isLoading" icon="pi pi-file-excel" />
                            </div>
                        </div>
                    </div>

                    <!-- Report View -->
                    <div v-if="reportStore.profitLossData" class="pnl-report-container" id="pnl-report">
                        <!-- Report Header for Print -->
                        <div class="print-header">
                            <h2>تقرير الأرباح والخسائر (P&L)</h2>
                            <p>الفترة: {{ reportForm.startDate }} إلى {{ reportForm.endDate }}</p>
                        </div>

                        <!-- Report Actions -->
                        <div class="flex justify-end gap-2 mb-4 no-print">
                            <Button label="طباعة" icon="pi pi-print" outlined severity="secondary" @click="printReport" />
                        </div>

                        <div class="report-paper">
                            <!-- Section 1: Income -->
                            <div class="report-section">
                                <h3 class="section-title">الإيرادات المباشرة</h3>
                                <div class="report-row">
                                    <span>إجمالي المبيعات (Net Sales)</span>
                                    <span class="font-bold text-green-600">{{ formatCurrency(reportStore.profitLossData.totalSales) }}</span>
                                </div>
                            </div>

                            <!-- Section 2: COGS -->
                            <div class="report-section">
                                <h3 class="section-title">تكلفة البضاعة المباعة (COGS)</h3>
                                <div class="report-row">
                                    <span>إجمالي تكلفة المبيعات</span>
                                    <span class="font-bold text-red-500">- {{ formatCurrency(reportStore.profitLossData.totalCogs ?? reportStore.profitLossData.totalCostOfGoodsSold ?? 0) }}</span>
                                </div>
                            </div>

                            <!-- Gross Profit -->
                            <div class="report-section total-section">
                                <div class="report-row">
                                    <span class="font-black text-lg">مجمل الربح (Gross Profit)</span>
                                    <span class="font-black text-lg" :class="reportStore.profitLossData.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'">
                                        {{ formatCurrency(reportStore.profitLossData.grossProfit) }}
                                    </span>
                                </div>
                            </div>

                            <!-- Section 3: Operating Expenses -->
                            <div class="report-section">
                                <h3 class="section-title">المصروفات التشغيلية والتوالف</h3>
                                <div class="report-row indent">
                                    <span>المصروفات (إيجار، كهرباء، الخ)</span>
                                    <span class="text-red-500">{{ formatCurrency(reportStore.profitLossData.totalExpenses) }}</span>
                                </div>
                                <div class="report-row indent">
                                    <span>رواتب الموظفين (Payroll)</span>
                                    <span class="text-red-500">{{ formatCurrency(reportStore.profitLossData.totalSalaries ?? reportStore.profitLossData.totalPayroll ?? 0) }}</span>
                                </div>
                                <div class="report-row indent">
                                    <span>قيمة التوالف والفاقد (Damages)</span>
                                    <span class="text-red-500">{{ formatCurrency(reportStore.profitLossData.totalDamagedLoss ?? reportStore.profitLossData.totalDamagesCost ?? 0) }}</span>
                                </div>
                            </div>

                            <!-- Net Profit -->
                            <div class="report-section final-total-section">
                                <div class="report-row">
                                    <span class="font-black text-xl">صافي الربح (Net Profit)</span>
                                    <span class="font-black text-2xl" :class="reportStore.profitLossData.netProfit >= 0 ? 'text-green-600' : 'text-red-500'">
                                        {{ formatCurrency(reportStore.profitLossData.netProfit) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div v-else-if="!reportStore.isLoading" class="empty-state">
                        <FileBarChart :size="48" class="text-surface-300 mx-auto mb-4" />
                        <p class="text-surface-500">قم بتحديد الفترة الزمنية واضغط على إنشاء التقرير لعرض النتائج.</p>
                    </div>
                </TabPanel>

                <TabPanel value="monthly" class="px-0 py-4">
                    <!-- Report Controls Card -->
                    <div class="content-card no-print p-4 mb-6">
                        <div class="flex flex-col md:flex-row items-end justify-between gap-4">
                            <div class="flex flex-col md:flex-row items-end gap-4 flex-1">
                                <div class="flex-1 w-full">
                                    <label class="font-bold block mb-2 text-sm text-surface-700 dark:text-surface-300">من تاريخ</label>
                                    <InputText type="date" v-model="monthlyReportForm.startDate" class="w-full" size="small" />
                                </div>
                                <div class="flex-1 w-full">
                                    <label class="font-bold block mb-2 text-sm text-surface-700 dark:text-surface-300">إلى تاريخ</label>
                                    <InputText type="date" v-model="monthlyReportForm.endDate" class="w-full" size="small" />
                                </div>
                                <Button label="إنشاء التقرير" @click="generateMonthlyReport" :loading="reportStore.isLoading">
                                    <template #icon><RefreshCw :size="16" class="me-1" /></template>
                                </Button>
                            </div>
                            
                            <div v-if="reportStore.monthlyFinancialData" class="flex items-center gap-2">
                                <Button label="طباعة" severity="secondary" outlined size="small" @click="printMonthlyReport">
                                    <template #icon><Printer :size="16" class="me-1" /></template>
                                </Button>
                                <Button label="تصدير CSV" severity="secondary" outlined size="small" @click="exportMonthlyReportCsv">
                                    <template #icon><Download :size="16" class="me-1" /></template>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div v-if="reportStore.monthlyFinancialData">
                        <!-- Printable Official Header -->
                        <div class="print-official-header">
                            <div class="print-header-content">
                                <div class="print-header-brand">
                                    <h2>التقرير المالي الشهري</h2>
                                    <p>نظام إدارة المبيعات والمخازن (POS System)</p>
                                </div>
                                <div class="print-header-meta">
                                    <p><span>الفترة:</span> {{ monthlyReportForm.startDate }} إلى {{ monthlyReportForm.endDate }}</p>
                                    <p><span>تاريخ الطباعة:</span> {{ new Date().toLocaleDateString('ar-EG') }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- KPI Summary Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-green-500">
                                <div class="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي المبيعات</span>
                                    <span class="text-lg font-bold text-green-600">{{ formatCurrency(monthlyReportSummary.totalSales) }}</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-blue-500">
                                <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <ShoppingBag :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي المشتريات</span>
                                    <span class="text-lg font-bold text-blue-600">{{ formatCurrency(monthlyReportSummary.totalPurchases) }}</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-red-500">
                                <div class="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center flex-shrink-0">
                                    <TrendingDown :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي المصروفات</span>
                                    <span class="text-lg font-bold text-red-500">{{ formatCurrency(monthlyReportSummary.totalExpenses) }}</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4" :class="monthlyReportSummary.netIncome >= 0 ? 'border-s-emerald-600' : 'border-s-rose-600'">
                                <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" :class="monthlyReportSummary.netIncome >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'">
                                    <DollarSign :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">صافي الدخل</span>
                                    <span class="text-lg font-bold" :class="monthlyReportSummary.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                                        {{ formatCurrency(monthlyReportSummary.netIncome) }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Report DataTable Card -->
                        <div class="content-card p-4">
                            <div class="flex justify-between items-center mb-4 no-print">
                                <div class="relative flex-1 max-w-sm">
                                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                    <InputText v-model="monthlySearchQuery" placeholder="بحث بالشهر أو السنة..." class="ps-9 w-full" size="small" />
                                </div>
                            </div>

                            <DataTable
                                :value="filteredMonthlyReportItems"
                                :paginator="!isPrintingMonthly"
                                :rows="isPrintingMonthly ? 999999 : 15"
                                stripedRows
                                removableSort
                                responsiveLayout="scroll"
                            >
                                <Column field="category" header="الفئة المالية" sortable style="min-width: 160px">
                                    <template #body="{ data }">
                                        <span v-if="data.category" class="font-bold text-surface-700 dark:text-surface-300 text-sm">
                                            {{ data.category }}
                                        </span>
                                        <span v-else class="font-bold text-surface-900 dark:text-surface-100">
                                            {{ data.monthName || data.month || 'الشهر الحالي' }} {{ data.year ? `(${data.year})` : '' }}
                                        </span>
                                    </template>
                                </Column>

                                <Column field="item" header="البيان / البند" sortable style="min-width: 220px">
                                    <template #body="{ data }">
                                        <span v-if="data.item" class="font-semibold text-surface-900 dark:text-surface-100">
                                            {{ data.item }}
                                        </span>
                                        <span v-else class="text-surface-500">
                                            -
                                        </span>
                                    </template>
                                </Column>

                                <Column field="value" header="القيمة المالية" sortable style="min-width: 160px">
                                    <template #body="{ data }">
                                        <template v-if="data.item">
                                            <span v-if="data.type === 'income'" class="font-bold text-green-600">
                                                {{ formatCurrency(data.value) }}
                                            </span>
                                            <span v-else-if="data.type === 'expense' || data.type === 'summary_expense'" class="font-bold text-red-500">
                                                - {{ formatCurrency(data.value) }}
                                            </span>
                                            <span v-else-if="data.type === 'profit'" class="font-black text-emerald-600 text-base">
                                                {{ formatCurrency(data.value) }}
                                            </span>
                                            <span v-else-if="data.type === 'loss'" class="font-black text-rose-600 text-base">
                                                {{ formatCurrency(data.value) }}
                                            </span>
                                            <span v-else class="font-semibold text-surface-800 dark:text-surface-200">
                                                {{ formatCurrency(data.value) }}
                                            </span>
                                        </template>
                                        <template v-else>
                                            <span class="font-semibold text-green-600">
                                                {{ formatCurrency(data.totalSales || data.sales || 0) }}
                                            </span>
                                        </template>
                                    </template>
                                </Column>

                                <Column field="notes" header="التفاصيل والملاحظات" style="min-width: 180px">
                                    <template #body="{ data }">
                                        <span v-if="data.notes" class="text-sm text-surface-500 dark:text-surface-400">
                                            {{ data.notes }}
                                        </span>
                                        <span v-else-if="data.netIncome !== undefined" class="font-bold" :class="(data.netIncome ?? data.netProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'">
                                            صافي الدخل: {{ formatCurrency(data.netIncome ?? data.netProfit ?? 0) }}
                                        </span>
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </div>
                    <div v-else-if="!reportStore.isLoading" class="empty-state">
                        <Calendar :size="48" class="text-surface-300 mx-auto mb-4" />
                        <p class="text-surface-500">قم بتحديد الفترة الزمنية واضغط على إنشاء التقرير لعرض النتائج.</p>
                    </div>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>

<style scoped>
.reports-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1000px; /* Narrower for reports */
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
}
.dark .content-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    border: 2px dashed var(--p-surface-200);
    border-radius: 1rem;
}
.dark .empty-state { border-color: var(--p-surface-700); }

/* Report Styles */
.report-paper {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 0.5rem;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.dark .report-paper {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
}

.report-section {
    margin-bottom: 1.5rem;
}

.section-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--p-surface-500);
    border-bottom: 1px solid var(--p-surface-200);
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
}
.dark .section-title {
    color: var(--p-surface-400);
    border-color: var(--p-surface-700);
}

.report-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    font-size: 1.05rem;
}

.report-row.indent {
    padding-inline-start: 1.5rem;
    font-size: 0.95rem;
    color: var(--p-surface-600);
}
.dark .report-row.indent { color: var(--p-surface-300); }

.total-section {
    background: var(--p-surface-50);
    padding: 1rem;
    border-radius: 0.5rem;
}
.dark .total-section { background: var(--p-surface-800); }

.final-total-section {
    background: var(--p-surface-100);
    padding: 1.5rem;
    border-radius: 0.5rem;
    border-top: 2px solid var(--p-surface-300);
}
.dark .final-total-section { 
    background: var(--p-surface-800);
    border-color: var(--p-surface-600);
}

.print-header {
    display: none;
    text-align: center;
    margin-bottom: 2rem;
}

/* Print Styles */
@media print {
    .no-print {
        display: none !important;
    }
    .reports-page {
        padding: 0;
    }
    .report-paper {
        border: none;
        box-shadow: none;
        padding: 0;
        background: transparent !important;
        color: #000 !important;
    }
    .print-header {
        display: block;
    }
    .total-section, .final-total-section {
        background: transparent !important;
        border: 1px solid #000;
    }
}
</style>
