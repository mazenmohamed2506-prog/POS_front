<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import { useSupplierStore } from "@/stores/pos/supplierStore";
import { usePosStore } from "@/stores/pos/posStore";
import { useReportStore } from "@/stores/pos/reportStore";
import { useToastStore } from "@/stores/base/toastStore";
import { isValidEmail, isValidEgyptianPhone } from "@/utilities/validations";
import {
    Truck, Plus, Pencil, Trash2, Search, HelpCircle, Eye, DollarSign,
    Wallet, CreditCard, Receipt, FileText, List, Printer, Download, RefreshCw, Phone, Users,
    Mail, MapPin, Hash, Building2, StickyNote
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

    const totalBalance = (data && !Array.isArray(data) && (data.totalRemainingAmount !== undefined || data.totalBalance !== undefined))
        ? Number(data.totalRemainingAmount ?? data.totalBalance ?? 0)
        : items.reduce((s, i) => s + (i.remaining ?? i.balance ?? i.totalDue ?? i.amount ?? 0), 0);

    const totalSuppliers = items.length || (data && (data.totalSuppliers ?? data.items?.length)) || 0;

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
        const bal = item.remaining ?? item.balance ?? item.totalDue ?? item.amount ?? 0;
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
const searchQuery = ref("");

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

// ── Filtered Suppliers ──
const filteredSuppliers = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return supplierStore.suppliers;
    return supplierStore.suppliers.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.taxNumber && s.taxNumber.toLowerCase().includes(q))
    );
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
            <div class="header-start">
                <div class="header-icon-wrap">
                    <Truck :size="26" />
                </div>
                <div class="header-text">
                    <h1 class="suppliers-title">إدارة الموردين</h1>
                    <p class="suppliers-subtitle">إضافة وتعديل بيانات الموردين ومتابعة حساباتهم</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button label="إضافة مورد" @click="openNewSupplier">
                    <template #icon><Plus :size="18" /></template>
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

        <!-- Stats Cards -->
        <div class="suppliers-stats-grid">
            <div class="stat-card">
                <div class="stat-icon-circle blue">
                    <Users :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ supplierStore.suppliers.length }}</span>
                    <span class="stat-label">إجمالي الموردين</span>
                </div>
                <div class="stat-accent blue"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-circle green">
                    <Phone :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ supplierStore.suppliers.filter(s => s.phone).length }}</span>
                    <span class="stat-label">موردين بهاتف</span>
                </div>
                <div class="stat-accent green"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-circle purple">
                    <Hash :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ supplierStore.suppliers.filter(s => s.taxNumber).length }}</span>
                    <span class="stat-label">موردين برقم ضريبي</span>
                </div>
                <div class="stat-accent purple"></div>
            </div>
        </div>

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
                <div class="search-input-wrap">
                    <Search :size="16" class="search-icon" />
                    <InputText
                        v-model="searchQuery"
                        placeholder="بحث عن مورد بالاسم، الهاتف، أو الرقم الضريبي..."
                        class="pr-10 pl-4 w-full search-input"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Suppliers Table (compact: name, phone, tax, actions) -->
            <DataTable
                :value="filteredSuppliers"
                :loading="supplierStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                emptyMessage="لا يوجد موردين مطابِقين"
                stripedRows
                removableSort
                scrollable
                class="suppliers-table"
            >
                <Column field="name" header="المورد" sortable style="min-width: 220px">
                    <template #body="{ data }">
                        <div class="supplier-name-cell">
                            <div class="supplier-avatar">
                                <Truck :size="14" />
                            </div>
                            <div class="supplier-name-info">
                                <span class="supplier-name-text">{{ data.name }}</span>
                                <span class="supplier-address-text" v-if="data.address">
                                    <MapPin :size="10" />
                                    {{ data.address }}
                                </span>
                            </div>
                        </div>
                    </template>
                </Column>
                <Column field="phone" header="الهاتف" sortable style="min-width: 150px">
                    <template #body="{ data }">
                        <div class="phone-cell" v-if="data.phone">
                            <Phone :size="13" class="phone-icon" />
                            <span class="phone-text">{{ data.phone }}</span>
                        </div>
                        <span v-else class="empty-cell">—</span>
                    </template>
                </Column>
                <Column field="taxNumber" header="الرقم الضريبي" sortable style="min-width: 150px">
                    <template #body="{ data }">
                        <span class="tax-chip" v-if="data.taxNumber">
                            <Hash :size="11" />
                            {{ data.taxNumber }}
                        </span>
                        <span v-else class="empty-cell">—</span>
                    </template>
                </Column>
                <Column header="إجراءات" style="min-width: 130px; text-align: center">
                    <template #body="{ data }">
                        <div class="actions-cell">
                            <button class="act-btn act-view" @click="openDetails(data.id)" title="عرض التفاصيل">
                                <Eye :size="15" />
                            </button>
                            <button class="act-btn act-edit" @click="openEditSupplier(data)" title="تعديل">
                                <Pencil :size="15" />
                            </button>
                            <button v-if="posStore.role === 'Manager' || posStore.role === 'SuperAdmin'" class="act-btn act-delete" @click="confirmDelete(data)" title="حذف">
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

                                <Column field="remaining" header="المبلغ المستحق للمورد" sortable style="min-width: 170px">
                                    <template #body="{ data }">
                                        <span class="font-bold text-indigo-600 text-base">
                                            {{ formatCurrency(data.remaining ?? data.balance ?? data.totalDue ?? data.amount ?? 0) }}
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
                <div class="dialog-footer">
                    <Button label="إلغاء" outlined severity="secondary" @click="showSupplierDialog = false" />
                    <Button label="حفظ المورد" @click="saveSupplier" :loading="supplierStore.loading" :disabled="!supplierForm.name" />
                </div>
            </template>
        </Dialog>

        <!-- Supplier Details Dialog -->
        <Dialog
            v-model:visible="showDetailsDialog"
            header="تفاصيل المورد"
            :style="{ width: '750px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body" v-if="selectedSupplierDetails">
                <!-- Supplier Info Header Card -->
                <div class="detail-header-card">
                    <div class="detail-header-top">
                        <div class="detail-supplier-icon">
                            <Truck :size="22" />
                        </div>
                        <div class="detail-supplier-info">
                            <span class="detail-supplier-name">{{ selectedSupplierDetails.supplier?.name || '—' }}</span>
                            <div class="detail-supplier-contacts">
                                <span class="detail-contact-item" v-if="selectedSupplierDetails.supplier?.phone">
                                    <Phone :size="12" /> {{ selectedSupplierDetails.supplier.phone }}
                                </span>
                                <span class="detail-contact-item" v-if="selectedSupplierDetails.supplier?.email">
                                    <Mail :size="12" /> {{ selectedSupplierDetails.supplier.email }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="detail-meta-strip" v-if="selectedSupplierDetails.supplier?.address || selectedSupplierDetails.supplier?.taxNumber">
                        <div class="detail-meta-item" v-if="selectedSupplierDetails.supplier?.address">
                            <MapPin :size="13" />
                            <span>{{ selectedSupplierDetails.supplier.address }}</span>
                        </div>
                        <div class="detail-meta-item" v-if="selectedSupplierDetails.supplier?.taxNumber">
                            <Hash :size="13" />
                            <span>ضريبي: {{ selectedSupplierDetails.supplier.taxNumber }}</span>
                        </div>
                    </div>
                </div>

                <!-- Financial Summary Cards -->
                <div class="financial-cards-grid">
                    <div class="financial-card financial-card-blue">
                        <DollarSign :size="18" />
                        <div class="financial-card-body">
                            <span class="financial-card-label">إجمالي المشتريات</span>
                            <span class="financial-card-value">{{ formatCurrency(selectedSupplierDetails.financialSummary?.totalPurchases || 0) }}</span>
                        </div>
                    </div>
                    <div class="financial-card financial-card-green">
                        <Wallet :size="18" />
                        <div class="financial-card-body">
                            <span class="financial-card-label">إجمالي المدفوعات</span>
                            <span class="financial-card-value">{{ formatCurrency(selectedSupplierDetails.financialSummary?.totalPaid || 0) }}</span>
                        </div>
                    </div>
                    <div class="financial-card" :class="selectedSupplierDetails.outstandingBalance > 0 ? 'financial-card-red' : 'financial-card-neutral'">
                        <CreditCard :size="18" />
                        <div class="financial-card-body">
                            <span class="financial-card-label">الرصيد المستحق</span>
                            <span class="financial-card-value">{{ formatCurrency(selectedSupplierDetails.outstandingBalance || 0) }}</span>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end">
                    <Button label="تسجيل دفعة للمورد" severity="success" size="small" @click="openPaymentDialog(selectedSupplierDetails.supplier.id)">
                        <template #icon><Wallet :size="16" /></template>
                    </Button>
                </div>

                <Tabs value="purchases">
                    <TabList>
                        <Tab value="purchases"><Receipt class="inline-block me-2" :size="16"/>فواتير المشتريات</Tab>
                        <Tab value="payments"><FileText class="inline-block me-2" :size="16"/>سجل المدفوعات</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel value="purchases">
                            <DataTable :value="selectedSupplierDetails.purchases" paginator :rows="5" responsiveLayout="scroll">
                                <Column field="purchaseNo" header="رقم الفاتورة">
                                    <template #body="{data}">
                                        <span class="inv-number-text">{{ data.purchaseNo }}</span>
                                    </template>
                                </Column>
                                <Column field="invoiceDate" header="التاريخ">
                                    <template #body="{data}">{{ formatDate(data.invoiceDate) }}</template>
                                </Column>
                                <Column field="totalAmount" header="الإجمالي">
                                    <template #body="{data}">
                                        <span class="total-cell">{{ formatCurrency(data.totalAmount) }}</span>
                                    </template>
                                </Column>
                                <Column field="paidAmount" header="المدفوع">
                                    <template #body="{data}">
                                        <span class="paid-cell">{{ formatCurrency(data.paidAmount) }}</span>
                                    </template>
                                </Column>
                                <Column field="remainingAmount" header="المتبقي">
                                    <template #body="{data}">
                                        <span class="remaining-cell">{{ formatCurrency(data.remainingAmount) }}</span>
                                    </template>
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
                                    <template #body="{data}">
                                        <span class="total-cell">{{ formatCurrency(data.amount) }}</span>
                                    </template>
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
                <div class="dialog-footer">
                    <Button label="إغلاق" outlined severity="secondary" @click="showDetailsDialog = false" />
                </div>
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
                <div class="dialog-footer">
                    <Button label="إلغاء" outlined severity="secondary" @click="showPaymentDialog = false" />
                    <Button label="تأكيد الدفع" @click="savePayment" :loading="supplierStore.loading" severity="success" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* ─── Page Layout ───────────────────────────────────────── */
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

/* ─── Header ────────────────────────────────────────────── */
.suppliers-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    flex-wrap: wrap;
    gap: 1rem;
}

.header-start {
    display: flex;
    align-items: center;
    gap: 0.875rem;
}

.header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.suppliers-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}
.dark .suppliers-title { color: var(--p-surface-0); }

.suppliers-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* ─── Stats Cards Grid ──────────────────────────────────── */
.suppliers-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
}

@media (max-width: 768px) {
    .suppliers-stats-grid {
        grid-template-columns: 1fr;
    }
}

.stat-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    transition: all 0.2s ease;
}
.stat-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
}
.dark .stat-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.stat-icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
}

.stat-icon-circle.blue { background: #dbeafe; color: #2563eb; }
.dark .stat-icon-circle.blue { background: rgba(37, 99, 235, 0.15); color: #60a5fa; }
.stat-icon-circle.green { background: #d1fae5; color: #059669; }
.dark .stat-icon-circle.green { background: rgba(5, 150, 105, 0.15); color: #34d399; }
.stat-icon-circle.purple { background: #f3e8ff; color: #7c3aed; }
.dark .stat-icon-circle.purple { background: rgba(124, 58, 237, 0.15); color: #a78bfa; }

.stat-body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.stat-value {
    font-size: 1.25rem;
    font-weight: 850;
    color: var(--p-surface-900);
    line-height: 1.2;
}
.dark .stat-value { color: var(--p-surface-50); }

.stat-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.stat-accent {
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    width: 4px;
    height: 100%;
    border-radius: 0 4px 4px 0;
}
.stat-accent.blue { background: linear-gradient(to bottom, #3b82f6, #2563eb); }
.stat-accent.green { background: linear-gradient(to bottom, #10b981, #059669); }
.stat-accent.purple { background: linear-gradient(to bottom, #8b5cf6, #7c3aed); }

/* ─── Table Card ────────────────────────────────────────── */
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

.search-input-wrap {
    position: relative;
    flex: 1;
    max-width: 400px;
}

.search-icon {
    position: absolute;
    inset-inline-start: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--p-surface-400);
    pointer-events: none;
}
.dark .search-icon { color: var(--p-surface-500); }

.search-input {
    padding-inline-start: 2.25rem !important;
}

/* ─── Table Cell Styles ─────────────────────────────────── */
.supplier-name-cell {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

.supplier-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background: #d1fae5;
    color: #059669;
    flex-shrink: 0;
}
.dark .supplier-avatar {
    background: rgba(5, 150, 105, 0.15);
    color: #34d399;
}

.supplier-name-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.supplier-name-text {
    font-size: 0.875rem;
    font-weight: 750;
    color: var(--p-surface-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .supplier-name-text { color: var(--p-surface-100); }

.supplier-address-text {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--p-surface-400);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
}

.phone-cell {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}
.phone-icon { color: var(--p-surface-400); flex-shrink: 0; }
.phone-text {
    font-size: 0.85rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: var(--p-surface-700);
}
.dark .phone-text { color: var(--p-surface-250); }

.tax-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    background: #f5f3ff;
    color: #7c3aed;
    border: 1px solid #ddd6fe;
}
.dark .tax-chip {
    background: rgba(124, 58, 237, 0.1);
    color: #a78bfa;
    border-color: rgba(124, 58, 237, 0.25);
}

.empty-cell {
    font-size: 0.85rem;
    color: var(--p-surface-400);
}

/* ─── Action Buttons ────────────────────────────────────── */
.actions-cell {
    display: flex;
    gap: 0.375rem;
    justify-content: center;
}

.act-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    border: 1px solid;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
}

.act-btn.act-view {
    color: #7c3aed;
    border-color: #ddd6fe;
    background: #f5f3ff;
}
.dark .act-btn.act-view {
    background: rgba(124, 58, 237, 0.1);
    border-color: rgba(124, 58, 237, 0.25);
    color: #a78bfa;
}
.act-btn.act-view:hover {
    background: #ede9fe;
    border-color: #c4b5fd;
}
.dark .act-btn.act-view:hover { background: rgba(124, 58, 237, 0.2); }

.act-btn.act-edit {
    color: var(--p-surface-600);
    border-color: var(--p-surface-300);
    background: var(--p-surface-0);
}
.dark .act-btn.act-edit {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-300);
}
.act-btn.act-edit:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}
.dark .act-btn.act-edit:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
}

.act-btn.act-delete {
    color: #ef4444;
    border-color: #fecaca;
    background: #fef2f2;
}
.dark .act-btn.act-delete {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
}
.act-btn.act-delete:hover {
    background: #fee2e2;
    border-color: #fca5a5;
}
.dark .act-btn.act-delete:hover {
    background: rgba(239, 68, 68, 0.2);
}

/* ─── Status Chips ──────────────────────────────────────── */
.status-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    border: 1px solid;
}

.status-success {
    background: #ecfdf5; color: #059669; border-color: #a7f3d0;
}
.dark .status-success {
    background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.25);
}

.status-warning {
    background: #fef3c7; color: #d97706; border-color: #fde68a;
}
.dark .status-warning {
    background: rgba(245, 158, 11, 0.1); color: #fbbf24; border-color: rgba(245, 158, 11, 0.25);
}

.status-danger {
    background: #fef2f2; color: #dc2626; border-color: #fecaca;
}
.dark .status-danger {
    background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.25);
}

.status-info {
    background: #eff6ff; color: #2563eb; border-color: #bfdbfe;
}
.dark .status-info {
    background: rgba(37, 99, 235, 0.1); color: #60a5fa; border-color: rgba(37, 99, 235, 0.25);
}

/* ─── Dialog ────────────────────────────────────────────── */
.dialog-body {
    display: flex;
    flex-direction: column;
    gap: 1.125rem;
    padding: 0.25rem 0;
}

.dialog-footer {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
    width: 100%;
}

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
.dark .form-field label { color: var(--p-surface-200); }

/* ─── Detail Dialog ─────────────────────────────────────── */
.detail-header-card {
    padding: 1.125rem;
    border-radius: 0.875rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}
.dark .detail-header-card {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.detail-header-top {
    display: flex;
    align-items: center;
    gap: 0.875rem;
}

.detail-supplier-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    flex-shrink: 0;
}

.detail-supplier-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.detail-supplier-name {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--p-surface-900);
}
.dark .detail-supplier-name { color: var(--p-surface-50); }

.detail-supplier-contacts {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.detail-contact-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.775rem;
    font-weight: 500;
    color: var(--p-surface-500);
}

.detail-meta-strip {
    display: flex;
    gap: 1.25rem;
    padding-top: 0.625rem;
    border-top: 1px solid var(--p-surface-150);
    flex-wrap: wrap;
}
.dark .detail-meta-strip { border-color: var(--p-surface-750); }

.detail-meta-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.775rem;
    font-weight: 500;
    color: var(--p-surface-450);
}

/* ─── Financial Cards ───────────────────────────────────── */
.financial-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
}

@media (max-width: 600px) {
    .financial-cards-grid { grid-template-columns: 1fr; }
}

.financial-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid;
}

.financial-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.financial-card-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--p-surface-500);
    text-transform: uppercase;
}

.financial-card-value {
    font-size: 0.95rem;
    font-weight: 850;
}

.financial-card-blue {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #2563eb;
}
.financial-card-blue .financial-card-value { color: #2563eb; }
.dark .financial-card-blue {
    background: rgba(37, 99, 235, 0.08);
    border-color: rgba(37, 99, 235, 0.2);
    color: #60a5fa;
}
.dark .financial-card-blue .financial-card-value { color: #60a5fa; }

.financial-card-green {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #059669;
}
.financial-card-green .financial-card-value { color: #059669; }
.dark .financial-card-green {
    background: rgba(5, 150, 105, 0.08);
    border-color: rgba(5, 150, 105, 0.2);
    color: #34d399;
}
.dark .financial-card-green .financial-card-value { color: #34d399; }

.financial-card-red {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
}
.financial-card-red .financial-card-value { color: #dc2626; }
.dark .financial-card-red {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
    color: #f87171;
}
.dark .financial-card-red .financial-card-value { color: #f87171; }

.financial-card-neutral {
    background: var(--p-surface-50);
    border-color: var(--p-surface-200);
    color: var(--p-surface-500);
}
.financial-card-neutral .financial-card-value { color: var(--p-surface-700); }
.dark .financial-card-neutral {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
    color: var(--p-surface-400);
}
.dark .financial-card-neutral .financial-card-value { color: var(--p-surface-200); }

/* ─── Detail Table Cells ────────────────────────────────── */
.inv-number-text {
    font-size: 0.85rem;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    color: var(--p-primary-600);
}
.dark .inv-number-text { color: var(--p-primary-400); }

.total-cell {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--p-surface-900);
}
.dark .total-cell { color: var(--p-surface-50); }

.paid-cell {
    font-size: 0.85rem;
    font-weight: 700;
    color: #059669;
}
.dark .paid-cell { color: #34d399; }

.remaining-cell {
    font-size: 0.85rem;
    font-weight: 700;
    color: #dc2626;
}
.dark .remaining-cell { color: #f87171; }

/* ─── Deep Overrides ────────────────────────────────────── */
:deep(.p-datatable-tbody > tr > td) {
    border-bottom: none !important;
}
</style>
