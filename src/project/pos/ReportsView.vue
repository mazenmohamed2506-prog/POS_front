<script setup>
import { ref } from "vue";
import { useReportStore } from "@/stores/pos/reportStore";
import { FileBarChart, Printer, Download, HelpCircle, Calendar } from "lucide-vue-next";
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
        startDate: new Date(reportForm.value.startDate).toISOString(),
        endDate: new Date(reportForm.value.endDate + 'T23:59:59').toISOString()
    });
};

const generateMonthlyReport = () => {
    reportStore.fetchMonthlyFinancialReport({
        startDate: new Date(monthlyReportForm.value.startDate).toISOString(),
        endDate: new Date(monthlyReportForm.value.endDate + 'T23:59:59').toISOString()
    });
};

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
                                    <span class="font-bold text-red-500">- {{ formatCurrency(reportStore.profitLossData.totalCostOfGoodsSold) }}</span>
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
                                    <span class="text-red-500">{{ formatCurrency(reportStore.profitLossData.totalPayroll) }}</span>
                                </div>
                                <div class="report-row indent">
                                    <span>قيمة التوالف والفاقد (Damages)</span>
                                    <span class="text-red-500">{{ formatCurrency(reportStore.profitLossData.totalDamagesCost) }}</span>
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
                    <div class="content-card no-print p-4 mb-6">
                        <div class="flex flex-col md:flex-row items-end gap-4">
                            <div class="flex-1">
                                <label class="font-bold block mb-2">من تاريخ</label>
                                <InputText type="date" v-model="monthlyReportForm.startDate" class="w-full" />
                            </div>
                            <div class="flex-1">
                                <label class="font-bold block mb-2">إلى تاريخ</label>
                                <InputText type="date" v-model="monthlyReportForm.endDate" class="w-full" />
                            </div>
                            <div>
                                <Button label="إنشاء التقرير" @click="generateMonthlyReport" :loading="reportStore.isLoading" icon="pi pi-file-excel" />
                            </div>
                        </div>
                    </div>

                    <div v-if="reportStore.monthlyFinancialData" class="content-card p-4">
                        <h3 class="text-lg font-bold mb-4">التقرير المالي الشهري</h3>
                        <pre dir="ltr" class="bg-surface-50 dark:bg-surface-900 p-4 rounded-lg overflow-auto text-sm border border-surface-200 dark:border-surface-700">{{ JSON.stringify(reportStore.monthlyFinancialData, null, 2) }}</pre>
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
