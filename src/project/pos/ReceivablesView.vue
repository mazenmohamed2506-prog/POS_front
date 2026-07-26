<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import { useReceivableStore } from "@/stores/pos/receivableStore";
import { useReportStore } from "@/stores/pos/reportStore";
import {
    CreditCard, Search, HelpCircle, Eye, DollarSign, ArrowRight, Wallet,
    User as UserIcon, FileText, List, Printer, Download, RefreshCw, Phone, Users
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const receivableStore = useReceivableStore();
const reportStore = useReportStore();

const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

const generateReport = () => {
    reportStore.fetchAccountsReceivableReport({
        startDate: new Date(reportForm.value.startDate).toISOString(),
        endDate: new Date(reportForm.value.endDate + 'T23:59:59').toISOString()
    });
};

// ── Receivables Report Helpers ──
const isPrintingReport = ref(false);
const reportSearchQuery = ref("");

const reportItems = computed(() => {
    const data = reportStore.accountsReceivableData;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.items || data.receivables || data.clients || data.records || [];
});

const filteredReportItems = computed(() => {
    const q = reportSearchQuery.value.trim().toLowerCase();
    if (!q) return reportItems.value;
    return reportItems.value.filter(item =>
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.clientName && item.clientName.toLowerCase().includes(q)) ||
        (item.phone && item.phone.toLowerCase().includes(q))
    );
});

const reportSummary = computed(() => {
    const data = reportStore.accountsReceivableData;
    const items = reportItems.value;

    const totalBalance = (data && !Array.isArray(data) && data.totalBalance !== undefined)
        ? Number(data.totalBalance || 0)
        : items.reduce((s, i) => s + (i.balance || i.totalDue || i.amount || 0), 0);

    const totalClients = items.length || (data && data.totalClients) || 0;

    return { totalBalance, totalClients };
});

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

    let csvContent = "\uFEFFالعميل,الهاتف,المبلغ المستحق / الرصيد\n";
    items.forEach(item => {
        const name = `"${(item.customerName || item.clientName || '').replace(/"/g, '""')}"`;
        const phone = `"${(item.phone || '').replace(/"/g, '""')}"`;
        const bal = item.balance ?? item.totalDue ?? item.amount ?? 0;
        csvContent += `${name},${phone},${bal}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_الذمم_المدينة_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

const showHelp = ref(false);
const helpSections = [
    {
        title: 'الذمم المدينة',
        icon: CreditCard,
        color: '#fce7f3',
        iconColor: '#db2777',
        steps: [
            { title: 'قائمة العملاء', desc: 'عرض العملاء الذين عليهم مبالغ مستحقة للنشاط (مبيعات آجلة)' },
            { title: 'تفاصيل الحساب', desc: 'اضغط على أيقونة العين لعرض الفواتير غير المسددة للعميل' },
            { title: 'تسجيل دفعة', desc: 'يمكنك تسجيل دفعة من شاشة تفاصيل العميل لتسوية الفواتير' }
        ]
    }
];
const helpTips = [
    'تسجيل الدفعات يخفض الرصيد المستحق تلقائياً'
];

const filters = ref({ global: { value: "", matchMode: "contains" } });

const totalOutstanding = computed(() => {
    return receivableStore.receivables.reduce((sum, item) => sum + (item.outstandingBalance || 0), 0);
});

// Main View State
const currentView = ref('list'); // 'list' | 'detail'

// Details
const showPaymentDialog = ref(false);
const paymentForm = ref({
    clientId: null,
    saleInvoiceId: null,
    amount: 0,
    paymentMethod: "Cash",
    notes: ""
});

onMounted(() => {
    receivableStore.fetchReceivables();
});

const openClientDetails = async (clientId) => {
    try {
        await receivableStore.getClientReceivables(clientId);
        currentView.value = 'detail';
    } catch {
        // Error handled in store
    }
};

const backToList = () => {
    currentView.value = 'list';
    receivableStore.clientDetails = null;
    receivableStore.fetchReceivables();
};

const openPaymentDialog = () => {
    if (!receivableStore.clientDetails) return;
    paymentForm.value = {
        clientId: receivableStore.clientDetails.clientId,
        saleInvoiceId: null,
        amount: receivableStore.clientDetails.outstandingBalance || 0,
        paymentMethod: "Cash",
        notes: ""
    };
    showPaymentDialog.value = true;
};

const savePayment = async () => {
    try {
        await receivableStore.recordPayment({ ...paymentForm.value });
        showPaymentDialog.value = false;
    } catch {
        // Handled in store
    }
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
};

const getPaymentStatusConfig = (status) => {
    if (status === 'PAID') return { label: 'مدفوع', class: 'status-success' };
    if (status === 'PARTIALLY_PAID') return { label: 'مدفوع جزئياً', class: 'status-warning' };
    if (status === 'UNPAID') return { label: 'غير مدفوع', class: 'status-danger' };
    return { label: status || '—', class: 'status-info' };
};
</script>

<template>
    <div class="receivables-page">
        <!-- List View -->
        <div v-if="currentView === 'list'">
            <div class="page-header">
                <div class="flex items-center gap-3">
                    <div class="header-icon-wrap bg-pink-50 border-pink-100">
                        <CreditCard :size="28" class="text-pink-500" />
                    </div>
                    <div>
                        <h1 class="page-title">الذمم المدينة (العملاء)</h1>
                        <p class="page-subtitle">إدارة الحسابات الآجلة للعملاء والمبالغ المستحقة للنشاط</p>
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
                page-title="الذمم المدينة"
                page-subtitle="المبالغ المستحقة للنشاط"
                :page-icon="CreditCard"
                header-gradient="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                :sections="helpSections"
                :tips="helpTips"
            />

            <Tabs value="data">
                <TabList>
                    <Tab value="data"><List class="inline-block me-2" :size="16" />سجل العملاء</Tab>
                    <Tab value="report"><FileText class="inline-block me-2" :size="16" />تقرير العملاء (الذمم المدينة)</Tab>
                </TabList>
                
                <TabPanels>
                    <TabPanel value="data" class="px-0 py-4">
            <!-- Summary Card -->
            <div class="kpi-grid mb-6">
                <div class="kpi-card bg-pink-50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/30">
                    <div class="kpi-icon-wrap bg-white dark:bg-pink-800 text-pink-600 dark:text-pink-100 shadow-sm">
                        <DollarSign :size="22" />
                    </div>
                    <div class="kpi-info">
                        <span class="kpi-label text-pink-700 dark:text-pink-300">إجمالي المبالغ المستحقة لنا</span>
                        <span class="kpi-value text-pink-600 dark:text-pink-400">{{ formatCurrency(totalOutstanding) }}</span>
                    </div>
                </div>
            </div>

            <!-- Table Container Card -->
            <div class="content-card">
                <div class="filter-bar">
                    <div class="relative w-full max-w-xs">
                        <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <InputText
                            v-model="filters.global.value"
                            placeholder="بحث باسم العميل..."
                            class="ps-9 w-full"
                            size="small"
                        />
                    </div>
                </div>

                <DataTable
                    :value="receivableStore.receivables"
                    :loading="receivableStore.loading"
                    paginator
                    :rows="15"
                    v-model:filters="filters"
                    :globalFilterFields="['clientName', 'clientPhone']"
                    emptyMessage="لا يوجد عملاء لديهم مبالغ مستحقة"
                    stripedRows
                    removableSort
                    class="main-table"
                >
                    <Column field="clientName" header="العميل" sortable>
                        <template #body="{ data }">
                            <span class="font-bold">{{ data.clientName || 'عميل نقدي' }}</span>
                        </template>
                    </Column>
                    <Column field="clientPhone" header="رقم الهاتف">
                        <template #body="{ data }">{{ data.clientPhone || '—' }}</template>
                    </Column>
                    <Column field="outstandingBalance" header="الرصيد المستحق (لنا)" sortable>
                        <template #body="{ data }">
                            <span class="font-bold text-red-500">{{ formatCurrency(data.outstandingBalance) }}</span>
                        </template>
                    </Column>
                    <Column header="إجراءات" style="width: 100px; text-align: center">
                        <template #body="{ data }">
                            <Button icon="pi pi-eye" outlined rounded severity="secondary" @click="openClientDetails(data.clientId)" title="عرض التفاصيل وتسجيل دفعة" />
                        </template>
                    </Column>
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

                                <div v-if="reportStore.accountsReceivableData" class="flex items-center gap-2">
                                    <Button label="طباعة" severity="secondary" outlined size="small" @click="printReport">
                                        <template #icon><Printer :size="16" class="me-1" /></template>
                                    </Button>
                                    <Button label="تصدير CSV" severity="secondary" outlined size="small" @click="exportReportCsv">
                                        <template #icon><Download :size="16" class="me-1" /></template>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div v-if="reportStore.accountsReceivableData">
                            <!-- Printable Official Header -->
                            <div class="print-official-header">
                                <div class="print-header-content">
                                    <div class="print-header-brand">
                                        <h2>تقرير حسابات وتراكمات العملاء (الذمم المدينة)</h2>
                                        <p>نظام إدارة المبيعات والمخازن (POS System)</p>
                                    </div>
                                    <div class="print-header-meta">
                                        <p><span>الفترة:</span> {{ reportForm.startDate }} إلى {{ reportForm.endDate }}</p>
                                        <p><span>تاريخ الطباعة:</span> {{ new Date().toLocaleDateString('ar-EG') }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- KPI Summary Cards -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-pink-500">
                                    <div class="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center flex-shrink-0">
                                        <Wallet :size="20" />
                                    </div>
                                    <div>
                                        <span class="text-xs font-medium text-surface-500 block">إجمالي الديون والذمم المستحقة</span>
                                        <span class="text-lg font-bold text-pink-600">{{ formatCurrency(reportSummary.totalBalance) }}</span>
                                    </div>
                                </div>

                                <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-purple-500">
                                    <div class="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center flex-shrink-0">
                                        <Users :size="20" />
                                    </div>
                                    <div>
                                        <span class="text-xs font-medium text-surface-500 block">عدد العملاء المترتب عليهم مبالغ</span>
                                        <span class="text-lg font-bold text-surface-900 dark:text-surface-100">{{ reportSummary.totalClients }} عميل</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Report DataTable Card -->
                            <div class="content-card p-4">
                                <div class="flex justify-between items-center mb-4 no-print">
                                    <div class="relative flex-1 max-w-sm">
                                        <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                        <InputText v-model="reportSearchQuery" placeholder="بحث باسم العميل أو رقم الهاتف..." class="ps-9 w-full" size="small" />
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
                                    <Column field="customerName" header="اسم العميل" sortable style="min-width: 200px">
                                        <template #body="{ data }">
                                            <div class="flex items-center gap-2">
                                                <UserIcon :size="16" class="text-surface-400" />
                                                <span class="font-semibold text-surface-900 dark:text-surface-100 text-sm">
                                                    {{ data.customerName || data.clientName || 'عميل غير مسمى' }}
                                                </span>
                                            </div>
                                        </template>
                                    </Column>

                                    <Column field="phone" header="رقم الهاتف" style="min-width: 140px">
                                        <template #body="{ data }">
                                            <span class="font-mono text-xs text-surface-600 dark:text-surface-400" v-if="data.phone">
                                                <Phone :size="12" class="inline me-1" />{{ data.phone }}
                                            </span>
                                            <span v-else class="text-xs text-surface-400">—</span>
                                        </template>
                                    </Column>

                                    <Column field="balance" header="المبلغ المستحق / الرصيد" sortable style="min-width: 160px">
                                        <template #body="{ data }">
                                            <span class="font-bold text-pink-600 text-base">
                                                {{ formatCurrency(data.balance ?? data.totalDue ?? data.amount ?? 0) }}
                                            </span>
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
        </div>

        <!-- Detail View -->
        <div v-else-if="currentView === 'detail' && receivableStore.clientDetails">
            <div class="page-header">
                <div class="flex items-center gap-3">
                    <Button icon="pi pi-arrow-right" rounded text severity="secondary" @click="backToList" title="العودة للقائمة" />
                    <div>
                        <h1 class="page-title">{{ receivableStore.clientDetails.clientName || 'عميل' }}</h1>
                        <p class="page-subtitle">تفاصيل الحساب المالي للعميل</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <Button label="تسجيل دفعة مستلمة" icon="pi pi-money-bill" severity="success" @click="openPaymentDialog" />
                </div>
            </div>

            <!-- Financial Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="kpi-card bg-surface-50 dark:bg-surface-800">
                    <div class="kpi-icon-wrap text-blue-500 bg-blue-100 dark:bg-blue-900/30">
                        <Wallet :size="22"/>
                    </div>
                    <div class="kpi-info">
                        <span class="kpi-label">إجمالي المدفوعات المستلمة</span>
                        <span class="kpi-value text-blue-600 dark:text-blue-400">{{ formatCurrency(receivableStore.clientDetails.totalPaid || 0) }}</span>
                    </div>
                </div>
                <div class="kpi-card bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30">
                    <div class="kpi-icon-wrap text-red-500 bg-red-100 dark:bg-red-900/30">
                        <CreditCard :size="22"/>
                    </div>
                    <div class="kpi-info">
                        <span class="kpi-label text-red-700 dark:text-red-300">الرصيد المستحق (غير مدفوع)</span>
                        <span class="kpi-value text-red-600 dark:text-red-400">{{ formatCurrency(receivableStore.clientDetails.outstandingBalance || 0) }}</span>
                    </div>
                </div>
            </div>

            <div class="content-card">
                <h2 class="font-bold text-lg p-4 border-b border-surface-200 dark:border-surface-700">سجل فواتير المبيعات (الآجلة)</h2>
                <DataTable
                    :value="receivableStore.clientDetails.invoices"
                    :loading="receivableStore.loading"
                    paginator
                    :rows="10"
                    emptyMessage="لا يوجد فواتير"
                    stripedRows
                    class="main-table"
                >
                    <Column field="invoiceNo" header="رقم الفاتورة"></Column>
                    <Column field="invoiceDate" header="التاريخ">
                        <template #body="{ data }">{{ formatDate(data.invoiceDate) }}</template>
                    </Column>
                    <Column field="totalAmount" header="الإجمالي">
                        <template #body="{ data }">{{ formatCurrency(data.totalAmount) }}</template>
                    </Column>
                    <Column field="paidAmount" header="المدفوع">
                        <template #body="{ data }">{{ formatCurrency(data.paidAmount) }}</template>
                    </Column>
                    <Column field="remainingAmount" header="المتبقي">
                        <template #body="{ data }">
                            <span class="font-bold" :class="data.remainingAmount > 0 ? 'text-red-500' : 'text-green-500'">
                                {{ formatCurrency(data.remainingAmount) }}
                            </span>
                        </template>
                    </Column>
                    <Column field="paymentStatus" header="الحالة">
                        <template #body="{ data }">
                            <span class="status-chip" :class="getPaymentStatusConfig(data.paymentStatus).class">
                                {{ getPaymentStatusConfig(data.paymentStatus).label }}
                            </span>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>

        <!-- Record Payment Dialog -->
        <Dialog
            v-model:visible="showPaymentDialog"
            header="تسجيل دفعة مستلمة من عميل"
            :style="{ width: '450px' }"
            modal
        >
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <label>تخصيص لفاتورة مبيعات معينة (اختياري)</label>
                    <Select
                        v-model="paymentForm.saleInvoiceId"
                        :options="receivableStore.clientDetails?.invoices?.filter(i => i.remainingAmount > 0) || []"
                        optionLabel="invoiceNo"
                        optionValue="id"
                        placeholder="تسديد عام (أقدم فواتير أولاً)"
                        showClear
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">المبلغ المستلم</label>
                    <div class="relative w-full">
                        <InputNumber
                            v-model="paymentForm.amount"
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
                    <label class="font-bold required">طريقة الدفع</label>
                    <Select
                        v-model="paymentForm.paymentMethod"
                        :options="[{label: 'نقدي (كاش)', value: 'Cash'}, {label: 'تحويل بنكي', value: 'BankTransfer'}, {label: 'بطاقة بنكية', value: 'Card'}]"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold">ملاحظات</label>
                    <Textarea v-model="paymentForm.notes" rows="3" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showPaymentDialog = false" />
                    <Button label="تأكيد الاستلام" severity="success" @click="savePayment" :loading="receivableStore.loading" :disabled="!paymentForm.amount" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.receivables-page {
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
    margin-bottom: 1.5rem;
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

.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.25rem;
}

.kpi-card {
    border-radius: 1rem;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s;
    border: 1px solid var(--p-surface-200);
}
.dark .kpi-card {
    border-color: var(--p-surface-800);
}

.kpi-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 1rem;
}

.kpi-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.kpi-label {
    font-size: 0.875rem;
    font-weight: 700;
}

.kpi-value {
    font-size: 1.5rem;
    font-weight: 900;
}

.status-chip {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
}
.status-success { background: rgba(16, 185, 129, 0.15); color: #059669; }
.status-warning { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.status-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.status-info { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
.dark .status-success { color: #6ee7b7; }
.dark .status-warning { color: #fcd34d; }
.dark .status-danger { color: #fca5a5; }
.dark .status-info { color: #93c5fd; }
</style>
