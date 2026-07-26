<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import { useSupplierStore } from "@/stores/pos/supplierStore";
import { usePosStore } from "@/stores/pos/posStore";
import { useReportStore } from "@/stores/pos/reportStore";
import { useToastStore } from "@/stores/base/toastStore";
import { isValidEmail, isValidEgyptianPhone } from "@/utilities/validations";
import {
    Truck, Plus, Pencil, Trash2, Search, HelpCircle, Eye, DollarSign,
    Wallet, CreditCard, Receipt, FileText, List, Printer, Download, RefreshCw, Phone, Users
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const supplierStore = useSupplierStore();
const posStore = usePosStore();
const reportStore = useReportStore();
const toastStore = useToastStore();

const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

const generateReport = () => {
    reportStore.fetchAccountsPayableReport({
        startDate: new Date(reportForm.value.startDate).toISOString(),
        endDate: new Date(reportForm.value.endDate + 'T23:59:59').toISOString()
    });
};

// ── Accounts Payable Report Helpers ──
const isPrintingReport = ref(false);
const reportSearchQuery = ref("");

const reportItems = computed(() => {
    const data = reportStore.accountsPayableData;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.items || data.payables || data.suppliers || data.records || [];
});

const filteredReportItems = computed(() => {
    const q = reportSearchQuery.value.trim().toLowerCase();
    if (!q) return reportItems.value;
    return reportItems.value.filter(item =>
        (item.supplierName && item.supplierName.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.phone && item.phone.toLowerCase().includes(q))
    );
});

const reportSummary = computed(() => {
    const data = reportStore.accountsPayableData;
    const items = reportItems.value;

    const totalBalance = (data && !Array.isArray(data) && data.totalBalance !== undefined)
        ? Number(data.totalBalance || 0)
        : items.reduce((s, i) => s + (i.balance || i.totalDue || i.amount || 0), 0);

    const totalSuppliers = items.length || (data && data.totalSuppliers) || 0;

    return { totalBalance, totalSuppliers };
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

    let csvContent = "\uFEFFالمورد,الهاتف,المبلغ المستحق للمورد\n";
    items.forEach(item => {
        const name = `"${(item.supplierName || item.name || '').replace(/"/g, '""')}"`;
        const phone = `"${(item.phone || '').replace(/"/g, '""')}"`;
        const bal = item.balance ?? item.totalDue ?? item.amount ?? 0;
        csvContent += `${name},${phone},${bal}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_مستحقات_الموردين_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// ── Help Drawer ──
const showHelp = ref(false);
const suppliersHelpSections = [
    {
        title: 'إدارة الموردين',
        icon: Truck,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'قائمة الموردين', desc: 'تعرض جميع الموردين مع بيانات التواصل والرقم الضريبي' },
            { title: 'بحث سريع', desc: 'اكتب اسم المورد للبحث السريع في الجدول' },
        ]
    },
    {
        title: 'إضافة وتعديل مورد',
        icon: Plus,
        color: '#d1fae5',
        iconColor: '#059669',
        steps: [
            { title: 'إضافة مورد جديد', desc: 'اضغط "إضافة مورد" واملأ بيانات المورد' },
            { title: 'تعديل بيانات', desc: 'اضغط أيقونة التعديل لتحديث بيانات المورد' },
            { title: 'حذف مورد', desc: 'اضغط أيقونة الحذف وقم بتأكيد الحذف' },
        ]
    },
];
const suppliersHelpTips = [
    'احتفظ بتحديث بيانات الموردين دورياً',
    'الرقم الضريبي مهم لاحتساب ضريبة الشراء',
    'لا يمكن حذف مورد مرتبط بفواتير شراء',
];

const showSupplierDialog = ref(false);
const editingSupplier = ref(null);
const supplierForm = ref({
    name: "",
    phone: "",
    email: "",
    address: "",
    taxNumber: "",
    notes: "",
});
const filters = ref({ global: { value: "", matchMode: "contains" } });

// Details
const showDetailsDialog = ref(false);
const selectedSupplierDetails = ref(null);
const detailsLoading = ref(false);

const openDetails = async (supplierId) => {
    detailsLoading.value = true;
    showDetailsDialog.value = true;
    try {
        selectedSupplierDetails.value = await supplierStore.getSupplierById(supplierId);
    } catch {
        selectedSupplierDetails.value = null;
    } finally {
        detailsLoading.value = false;
    }
};

// Payment
const showPaymentDialog = ref(false);
const paymentForm = ref({
    supplierId: null,
    purchaseInvoiceId: null,
    amount: 0,
    paymentMethod: "Cash",
    notes: ""
});

const openPaymentDialog = (supplierId) => {
    paymentForm.value = {
        supplierId: supplierId,
        purchaseInvoiceId: null,
        amount: selectedSupplierDetails.value?.outstandingBalance || 0,
        paymentMethod: "Cash",
        notes: ""
    };
    showPaymentDialog.value = true;
};

const savePayment = async () => {
    try {
        await supplierStore.recordPayment({ ...paymentForm.value });
        showPaymentDialog.value = false;
        // Refresh details
        if (selectedSupplierDetails.value?.supplier?.id) {
            selectedSupplierDetails.value = await supplierStore.getSupplierById(selectedSupplierDetails.value.supplier.id);
        }
        await supplierStore.fetchSuppliers();
    } catch {
        // Error handled in store
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
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

const getPaymentStatusConfig = (status) => {
    if (status === 'PAID') return { label: 'مدفوع', class: 'status-success' };
    if (status === 'PARTIALLY_PAID') return { label: 'مدفوع جزئياً', class: 'status-warning' };
    if (status === 'UNPAID') return { label: 'غير مدفوع', class: 'status-danger' };
    return { label: status || '—', class: 'status-info' };
};

onMounted(() => {
    supplierStore.fetchSuppliers();
});

const openNewSupplier = () => {
    editingSupplier.value = null;
    supplierForm.value = {
        name: "",
        phone: "",
        email: "",
        address: "",
        taxNumber: "",
        notes: "",
    };
    showSupplierDialog.value = true;
};

const openEditSupplier = (supplier) => {
    editingSupplier.value = supplier;
    supplierForm.value = { ...supplier };
    showSupplierDialog.value = true;
};

const saveSupplier = async () => {
    if (supplierForm.value.email && !isValidEmail(supplierForm.value.email)) {
        toastStore.addErrorToast("البريد الإلكتروني غير صحيح (مثال: mail@example.com)");
        return;
    }
    if (supplierForm.value.phone && !isValidEgyptianPhone(supplierForm.value.phone)) {
        toastStore.addErrorToast("رقم الهاتف غير صحيح (يجب إدخال رقم هاتف مصري صحيح)");
        return;
    }
    try {
        if (editingSupplier.value) {
            await supplierStore.updateSupplier(editingSupplier.value.id, { ...supplierForm.value });
        } else {
            await supplierStore.createSupplier({ ...supplierForm.value });
        }
        showSupplierDialog.value = false;
    } catch {
        // Error handled by store
    }
};

const confirmDelete = async (supplier) => {
    if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
        try {
            await supplierStore.deleteSupplier(supplier.id);
        } catch {
            // Error handled by store
        }
    }
};
</script>

<template>
    <div class="suppliers-page">
        <!-- Header -->
        <div class="suppliers-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <Truck :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="suppliers-title">إدارة الموردين</h1>
                    <p class="suppliers-subtitle">إضافة وتعديل بيانات الموردين</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button label="إضافة مورد" @click="openNewSupplier">
                    <template #icon>
                        <Plus :size="18" />
                    </template>
                </Button>
            </div>
        </div>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة الموردين"
            page-subtitle="إضافة وتعديل بيانات الموردين"
            :page-icon="Truck"
            header-gradient="linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)"
            :sections="suppliersHelpSections"
            :tips="suppliersHelpTips"
        />

        <Tabs value="data">
            <TabList>
                <Tab value="data"><List class="inline-block me-2" :size="16" />سجل الموردين</Tab>
                <Tab value="report"><FileText class="inline-block me-2" :size="16" />تقرير الموردين (مدفوعات مستحقة)</Tab>
            </TabList>
            
            <TabPanels>
                <TabPanel value="data" class="px-0 py-4">
        <!-- Table Container Card -->
        <div class="suppliers-card">
            <!-- Filter Bar -->
            <div class="suppliers-filter-bar">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="filters.global.value"
                        placeholder="بحث عن مورد..."
                        class="ps-9 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Suppliers Table -->
            <DataTable
                :value="supplierStore.suppliers"
                :loading="supplierStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                v-model:filters="filters"
                filterDisplay="row"
                :globalFilterFields="['name', 'phone', 'email', 'taxNumber']"
                emptyMessage="لا يوجد موردين مطابِقين"
                stripedRows
                removableSort
                scrollable
                class="suppliers-table"
            >
                <Column field="id" header="#" sortable style="min-width: 90px">
                    <template #body="{ data }">
                        <span class="font-mono text-surface-400">{{ data.id }}</span>
                    </template>
                </Column>
                <Column field="name" header="الاسم" sortable style="min-width: 200px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.name }}</span>
                    </template>
                </Column>
                <Column field="phone" header="الهاتف" style="min-width: 140px">
                    <template #body="{ data }">
                        <span class="text-surface-600 dark:text-surface-400">{{ data.phone || '—' }}</span>
                    </template>
                </Column>
                <Column field="email" header="البريد الإلكتروني" style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="text-surface-600 dark:text-surface-400">{{ data.email || '—' }}</span>
                    </template>
                </Column>
                <Column field="taxNumber" header="الرقم الضريبي" style="min-width: 140px">
                    <template #body="{ data }">
                        <span class="text-surface-600 dark:text-surface-400">{{ data.taxNumber || '—' }}</span>
                    </template>
                </Column>
                <Column field="address" header="العنوان" style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="text-sm text-surface-600 dark:text-surface-400 truncate max-w-[150px] inline-block" :title="data.address">{{ data.address || '—' }}</span>
                    </template>
                </Column>
                <Column header="إجراءات" style="min-width: 150px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex gap-1 justify-center">
                            <button class="act-btn act-view" @click="openDetails(data.id)" title="عرض التفاصيل">
                                <Eye :size="15" />
                            </button>
                            <button class="action-edit-btn" @click="openEditSupplier(data)" title="تعديل">
                                <Pencil :size="15" />
                            </button>
                            <button v-if="posStore.role === 'Manager' || posStore.role === 'SuperAdmin'" class="action-delete-btn" @click="confirmDelete(data)" title="حذف">
                                <Trash2 :size="15" />
                            </button>
                        </div>
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

                            <div v-if="reportStore.accountsPayableData" class="flex items-center gap-2">
                                <Button label="طباعة" severity="secondary" outlined size="small" @click="printReport">
                                    <template #icon><Printer :size="16" class="me-1" /></template>
                                </Button>
                                <Button label="تصدير CSV" severity="secondary" outlined size="small" @click="exportReportCsv">
                                    <template #icon><Download :size="16" class="me-1" /></template>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div v-if="reportStore.accountsPayableData">
                        <!-- Printable Official Header -->
                        <div class="print-official-header">
                            <div class="print-header-content">
                                <div class="print-header-brand">
                                    <h2>تقرير مستحقات ودفعات الموردين (الذمم الدائنة)</h2>
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
                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-indigo-500">
                                <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <CreditCard :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي المستحقات للموردين</span>
                                    <span class="text-lg font-bold text-indigo-600">{{ formatCurrency(reportSummary.totalBalance) }}</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-blue-500">
                                <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <Truck :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">عدد الموردين المستحق لهم مبالغ</span>
                                    <span class="text-lg font-bold text-surface-900 dark:text-surface-100">{{ reportSummary.totalSuppliers }} مورد</span>
                                </div>
                            </div>
                        </div>

                        <!-- Report DataTable Card -->
                        <div class="content-card p-4">
                            <div class="flex justify-between items-center mb-4 no-print">
                                <div class="relative flex-1 max-w-sm">
                                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                    <InputText v-model="reportSearchQuery" placeholder="بحث باسم المورد أو رقم الهاتف..." class="ps-9 w-full" size="small" />
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
                                <Column field="supplierName" header="اسم المورد" sortable style="min-width: 200px">
                                    <template #body="{ data }">
                                        <div class="flex items-center gap-2">
                                            <Truck :size="16" class="text-surface-400" />
                                            <span class="font-semibold text-surface-900 dark:text-surface-100 text-sm">
                                                {{ data.supplierName || data.name || 'مورد غير مسمى' }}
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

                                <Column field="balance" header="المبلغ المستحق للمورد" sortable style="min-width: 170px">
                                    <template #body="{ data }">
                                        <span class="font-bold text-indigo-600 text-base">
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

        <!-- Supplier Dialog -->
        <Dialog
            v-model:visible="showSupplierDialog"
            :header="editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div class="supplier-dialog-form">
                <div class="form-field">
                    <label class="required">اسم المورد</label>
                    <InputText v-model="supplierForm.name" fluid placeholder="أدخل اسم المورد" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-field">
                        <label>الهاتف</label>
                        <InputText v-model="supplierForm.phone" fluid placeholder="مثال: 01012345678" />
                    </div>
                    <div class="form-field">
                        <label>الرقم الضريبي</label>
                        <InputText v-model="supplierForm.taxNumber" fluid placeholder="الرقم الضريبي" />
                    </div>
                </div>
                <div class="form-field">
                    <label>البريد الإلكتروني</label>
                    <InputText v-model="supplierForm.email" fluid placeholder="مثال: mail@example.com" />
                </div>
                <div class="form-field">
                    <label>العنوان</label>
                    <InputText v-model="supplierForm.address" fluid placeholder="العنوان" />
                </div>
                <div class="form-field">
                    <label>ملاحظات</label>
                    <Textarea v-model="supplierForm.notes" rows="3" fluid placeholder="ملاحظات إضافية..." />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showSupplierDialog = false" />
                    <Button label="حفظ المورد" @click="saveSupplier" :loading="supplierStore.loading" :disabled="!supplierForm.name" />
                </div>
            </template>
        </Dialog>
        <!-- Supplier Details Dialog -->
        <Dialog
            v-model:visible="showDetailsDialog"
            header="تفاصيل الحساب المالي للمورد"
            :style="{ width: '800px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body" v-if="selectedSupplierDetails">
                <!-- Financial Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon-circle Blue"><DollarSign :size="20"/></div>
                        <div class="stat-info">
                            <span class="stat-label">إجمالي المشتريات</span>
                            <span class="stat-value text-blue-600">{{ formatCurrency(selectedSupplierDetails.financialSummary?.totalPurchases || 0) }}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-circle Green"><Wallet :size="20"/></div>
                        <div class="stat-info">
                            <span class="stat-label">إجمالي المدفوعات</span>
                            <span class="stat-value text-green-600">{{ formatCurrency(selectedSupplierDetails.financialSummary?.totalPaid || 0) }}</span>
                        </div>
                    </div>
                    <div class="stat-card" :class="{'bg-red-50 dark:bg-red-900/20': selectedSupplierDetails.outstandingBalance > 0}">
                        <div class="stat-icon-circle" :class="selectedSupplierDetails.outstandingBalance > 0 ? 'text-red-500' : 'text-surface-500'"><CreditCard :size="20"/></div>
                        <div class="stat-info">
                            <span class="stat-label">الرصيد المستحق (لنا)</span>
                            <span class="stat-value font-bold" :class="selectedSupplierDetails.outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : ''">
                                {{ formatCurrency(selectedSupplierDetails.outstandingBalance || 0) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end mb-4">
                    <Button label="تسجيل دفعة للمورد" icon="pi pi-money-bill" severity="success" @click="openPaymentDialog(selectedSupplierDetails.supplier.id)" />
                </div>

                <Tabs value="purchases">
                    <TabList>
                        <Tab value="purchases"><Receipt class="inline-block me-2" :size="16"/>فواتير المشتريات</Tab>
                        <Tab value="payments"><FileText class="inline-block me-2" :size="16"/>سجل المدفوعات</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel value="purchases">
                            <DataTable :value="selectedSupplierDetails.purchases" paginator :rows="5" responsiveLayout="scroll">
                                <Column field="purchaseNo" header="رقم الفاتورة"></Column>
                                <Column field="invoiceDate" header="التاريخ">
                                    <template #body="{data}">{{ formatDate(data.invoiceDate) }}</template>
                                </Column>
                                <Column field="totalAmount" header="الإجمالي">
                                    <template #body="{data}">{{ formatCurrency(data.totalAmount) }}</template>
                                </Column>
                                <Column field="paidAmount" header="المدفوع">
                                    <template #body="{data}">{{ formatCurrency(data.paidAmount) }}</template>
                                </Column>
                                <Column field="remainingAmount" header="المتبقي">
                                    <template #body="{data}">{{ formatCurrency(data.remainingAmount) }}</template>
                                </Column>
                                <Column field="paymentStatus" header="الحالة">
                                    <template #body="{data}">
                                        <span class="status-chip" :class="getPaymentStatusConfig(data.paymentStatus).class">
                                            {{ getPaymentStatusConfig(data.paymentStatus).label }}
                                        </span>
                                    </template>
                                </Column>
                            </DataTable>
                        </TabPanel>
                        <TabPanel value="payments">
                            <DataTable :value="selectedSupplierDetails.paymentHistory" paginator :rows="5" responsiveLayout="scroll">
                                <Column field="paymentDate" header="التاريخ">
                                    <template #body="{data}">{{ formatDate(data.paymentDate) }}</template>
                                </Column>
                                <Column field="amount" header="المبلغ">
                                    <template #body="{data}">{{ formatCurrency(data.amount) }}</template>
                                </Column>
                                <Column field="paymentMethod" header="طريقة الدفع"></Column>
                                <Column field="notes" header="ملاحظات"></Column>
                                <Column field="createdBy" header="بواسطة"></Column>
                            </DataTable>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>
            <div v-else-if="detailsLoading" class="p-8 text-center">
                <i class="pi pi-spin pi-spinner text-3xl text-primary-500 mb-4"></i>
                <p>جاري تحميل التفاصيل...</p>
            </div>
            <template #footer>
                <Button label="إغلاق" outlined severity="secondary" @click="showDetailsDialog = false" />
            </template>
        </Dialog>

        <!-- Record Payment Dialog -->
        <Dialog
            v-model:visible="showPaymentDialog"
            header="تسجيل دفعة لمورد"
            :style="{ width: '450px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body flex flex-col gap-4">
                <div class="form-field">
                    <label>تخصيص لفاتورة معينة (اختياري)</label>
                    <Select
                        v-model="paymentForm.purchaseInvoiceId"
                        :options="selectedSupplierDetails?.purchases?.filter(p => p.remainingAmount > 0) || []"
                        optionLabel="purchaseNo"
                        optionValue="id"
                        placeholder="تسديد عام (أقدم فواتير أولاً)"
                        showClear
                        fluid
                    />
                </div>
                <div class="form-field">
                    <label class="required">المبلغ المراد دفعه</label>
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
                <div class="form-field">
                    <label class="required">طريقة الدفع</label>
                    <Select
                        v-model="paymentForm.paymentMethod"
                        :options="[{label: 'نقدي (كاش)', value: 'Cash'}, {label: 'تحويل بنكي', value: 'BankTransfer'}, {label: 'بطاقة بنكية', value: 'Card'}]"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
                <div class="form-field">
                    <label>ملاحظات</label>
                    <Textarea v-model="paymentForm.notes" rows="3" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showPaymentDialog = false" />
                    <Button label="تأكيد الدفع" @click="savePayment" :loading="supplierStore.loading" severity="success" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.suppliers-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .suppliers-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* Header */
.suppliers-header {
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

.suppliers-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .suppliers-title {
    color: var(--p-surface-0);
}

.suppliers-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* Card Wrapper */
.suppliers-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .suppliers-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.suppliers-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .suppliers-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

/* Action Buttons */
.action-edit-btn,
.action-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    cursor: pointer;
    transition: all 0.15s;
}

.action-edit-btn {
    color: var(--p-surface-650);
}

.dark .action-edit-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-300);
}

.action-edit-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}

.dark .action-edit-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
}

.action-delete-btn {
    color: #ef4444;
    border-color: #fecaca;
    background: #fef2f2;
}

.dark .action-delete-btn {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
}

.action-delete-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
}

.dark .action-delete-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #f87171;
}

/* Dialog Form */
.supplier-dialog-form {
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
</style>
