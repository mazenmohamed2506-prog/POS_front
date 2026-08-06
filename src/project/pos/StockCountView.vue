<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import { useStockCountStore } from "@/stores/pos/stockCountStore";
import { usePosStore } from "@/stores/pos/posStore";
import { useReportStore } from "@/stores/pos/reportStore";
import {
    ClipboardList, Plus, Search, Eye, CheckCircle, Save, X, ArrowLeft,
    ArrowRight, HelpCircle, FileText, List, Printer, Download, RefreshCw, Clock,
    Trash2, Copy, Filter, CheckCircle2, AlertTriangle, AlertCircle, Package
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";
import { useToastStore } from "@/stores/base/toastStore";

const stockCountStore = useStockCountStore();
const posStore = usePosStore();
const toastStore = useToastStore();
const reportStore = useReportStore();

const canManageStock = computed(() => {
    const hasWritePermission = posStore.pages?.includes("/stock-count/write");
    const r = (
        posStore.role || 
        posStore.user?.role || 
        localStorage.getItem("posRole") || 
        localStorage.getItem("role") || 
        ""
    ).toString().toLowerCase();

    return ["manager", "superadmin", "admin", "المدير", "مدير النظام"].includes(r) || hasWritePermission;
});

const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

const generateReport = () => {
    reportStore.fetchStockCountsReport({
        startDate: new Date(reportForm.value.startDate).toISOString(),
        endDate: new Date(reportForm.value.endDate + 'T23:59:59').toISOString()
    });
};

// ── Stock Count Report Helpers ──
const isPrintingReport = ref(false);
const reportSearchQuery = ref("");

const reportItems = computed(() => {
    const data = reportStore.stockCountsData;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.items || data.stockCounts || data.sessions || data.records || [];
});

const filteredReportItems = computed(() => {
    const q = reportSearchQuery.value.trim().toLowerCase();
    if (!q) return reportItems.value;
    return reportItems.value.filter(item =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.status && item.status.toLowerCase().includes(q))
    );
});

const reportSummary = computed(() => {
    const data = reportStore.stockCountsData;
    const items = reportItems.value;

    const totalSessions = items.length || (data && data.totalSessions) || 0;
    const completedSessions = items.filter(i => (i.status === 'COMPLETED' || i.status === 'مكتمل')).length;
    const inProgressSessions = totalSessions - completedSessions;

    return { totalSessions, completedSessions, inProgressSessions };
});

const getStockCountStatusLabel = (status) => {
    switch (status) {
        case "COMPLETED": return "مكتمل ومطبق";
        case "IN_PROGRESS": return "قيد الإجراء";
        default: return status || "معلق";
    }
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

    let csvContent = "\uFEFFاسم جلسة الجرد,تاريخ الجلسة,الحالة,ملاحظات\n";
    items.forEach(item => {
        const name = `"${(item.name || '').replace(/"/g, '""')}"`;
        const date = item.countDate ? new Date(item.countDate).toLocaleDateString('ar-EG') : '';
        const status = `"${getStockCountStatusLabel(item.status)}"`;
        const notes = `"${(item.notes || '').replace(/"/g, '""')}"`;
        csvContent += `${name},${date},${status},${notes}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_جرد_المخزون_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

const showHelp = ref(false);
const helpSections = [
    {
        title: 'إنشاء وبدء جلسة الجرد',
        icon: ClipboardList,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'تحديد نوع الجرد', desc: 'إنشاء جلسة جرد شامل لكل المنتجات أو جرد جزئي لفئة أو مستودع محدد.' },
            { title: 'تعيين فريق الجرد', desc: 'تحديد تاريخ الجرد والمسؤولين عن القراءة الفكرية بالمخزن.' },
        ]
    },
    {
        title: 'إدخال القراءات وتسوية الفروقات',
        icon: CheckCircle,
        color: '#d1fae5',
        iconColor: '#059669',
        steps: [
            { title: 'إدخال الكمية الفعليّة', desc: 'تسجيل العدد الحقيقي الموجود بالمخزن لكل صنف.' },
            { title: 'احتساب الفوارق', desc: 'يحسب النظام الفارق (عجز أو زيادة) تلقائياً بين الرصيد الفعلي ورصيد النظام.' },
            { title: 'اعتماد الجرد', desc: 'اعتماد نتائج الجرد لتحديث كميات المخزون وتعديل الأرصدة آلياً.' },
        ]
    }
];
const helpTips = [
    'يفضل تعليق عمليات البيع أو إجراء الجرد بعد إغلاق الوردية لضمان تطابق الأرصدة.',
    'يمكن طباعة نموذج الجرد الورقي لتسهيل عملية العد الميداني قبل الإدخال للنظام.',
    'الجلسة المعتمة نهائياً لا يمكن التراجع عنها وتصبح مرجعاً محاسبياً.'
];

const filters = ref({ global: { value: "", matchMode: "contains" } });

// Main View State
const currentView = ref('list'); // 'list' | 'detail'

// Dialogs
const showNewSessionDialog = ref(false);
const sessionForm = ref({
    title: "",
    countDate: new Date().toISOString().split('T')[0],
    notes: ""
});

onMounted(() => {
    stockCountStore.fetchSessions();
});

const openNewSession = () => {
    sessionForm.value = {
        title: `جرد دوري ${new Date().toLocaleDateString('ar-EG')}`,
        countDate: new Date().toISOString().split('T')[0],
        notes: ""
    };
    showNewSessionDialog.value = true;
};

const createSession = async () => {
    try {
        const payload = {
            ...sessionForm.value,
            countDate: new Date(sessionForm.value.countDate).toISOString()
        };
        const newSession = await stockCountStore.createSession(payload);
        showNewSessionDialog.value = false;
        openSessionDetails(newSession.id);
    } catch {
        // Handled in store
    }
};

const openSessionDetails = async (id) => {
    try {
        await stockCountStore.fetchSessionById(id);
        currentView.value = 'detail';
        // Initialize counted quantities if they exist
        countedItemsMap.value = {};
        if (stockCountStore.currentSession?.items) {
            stockCountStore.currentSession.items.forEach(item => {
                countedItemsMap.value[item.productId] = item.countedQuantity !== null ? item.countedQuantity : item.expectedQuantity;
            });
        }
    } catch {
        // Handled in store
    }
};

const backToList = () => {
    currentView.value = 'list';
    stockCountStore.currentSession = null;
    stockCountStore.fetchSessions();
};

// Details view state
const countedItemsMap = ref({});
const detailFilters = ref({ global: { value: "", matchMode: "contains" } });
const sessionVarianceFilter = ref("all"); // "all" | "missing" | "extra" | "matched"
const isPrintingWorksheet = ref(false);
const isPrintingSessionDetail = ref(false);

const filteredSessionItems = computed(() => {
    const session = stockCountStore.currentSession;
    if (!session || !session.items) return [];

    const q = (detailFilters.value.global.value || "").trim().toLowerCase();
    const isOngoing = session.status === 'ONGOING';

    return session.items.filter(item => {
        const matchesQuery = !q ||
            (item.productName && item.productName.toLowerCase().includes(q)) ||
            (item.productSku && item.productSku.toLowerCase().includes(q));

        if (!matchesQuery) return false;

        const counted = isOngoing ? (countedItemsMap.value[item.productId] ?? item.expectedQuantity) : item.countedQuantity;
        const diff = isOngoing ? (counted - item.expectedQuantity) : item.variance;

        if (sessionVarianceFilter.value === 'missing') return diff < 0;
        if (sessionVarianceFilter.value === 'extra') return diff > 0;
        if (sessionVarianceFilter.value === 'matched') return diff === 0;
        return true;
    });
});

const currentSessionSummary = computed(() => {
    const session = stockCountStore.currentSession;
    if (!session || !session.items) {
        return { totalItems: 0, matched: 0, missing: 0, extra: 0, totalMissingQty: 0, totalExtraQty: 0 };
    }

    const isOngoing = session.status === 'ONGOING';
    let matched = 0, missing = 0, extra = 0, totalMissingQty = 0, totalExtraQty = 0;

    session.items.forEach(item => {
        const counted = isOngoing ? (countedItemsMap.value[item.productId] ?? item.expectedQuantity) : item.countedQuantity;
        const diff = isOngoing ? (counted - item.expectedQuantity) : item.variance;

        if (diff === 0) matched++;
        else if (diff < 0) {
            missing++;
            totalMissingQty += Math.abs(diff);
        } else {
            extra++;
            totalExtraQty += diff;
        }
    });

    return {
        totalItems: session.items.length,
        matched,
        missing,
        extra,
        totalMissingQty,
        totalExtraQty
    };
});

const copyExpectedToCounted = () => {
    if (!stockCountStore.currentSession?.items) return;
    stockCountStore.currentSession.items.forEach(item => {
        countedItemsMap.value[item.productId] = item.expectedQuantity;
    });
    toastStore.addSuccessToast("تم نسخ الكميات الدفترية إلى الجرد الفعلي بنجاح");
};

const deleteSession = async (id) => {
    if (confirm("هل أنت متأكد من حذف جلسة الجرد هذه؟ لا يمكن التراجع عن هذه الخطوة.")) {
        try {
            await stockCountStore.deleteSession(id);
            if (currentView.value === 'detail') {
                backToList();
            }
        } catch {
            // Handled
        }
    }
};

const printSession = async (isWorksheet = false) => {
    isPrintingWorksheet.value = isWorksheet;
    isPrintingSessionDetail.value = !isWorksheet;
    await nextTick();
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            isPrintingWorksheet.value = false;
            isPrintingSessionDetail.value = false;
        }, 500);
    }, 150);
};

const exportSessionCsv = () => {
    const session = stockCountStore.currentSession;
    if (!session || !session.items) return;

    let csvContent = "\uFEFFاسم المنتج,رمز SKU,الكمية الدفترية,الجرد الفعلي,الفرق,الحالة\n";
    const isOngoing = session.status === 'ONGOING';

    session.items.forEach(item => {
        const pName = `"${(item.productName || '').replace(/"/g, '""')}"`;
        const sku = `"${(item.productSku || '').replace(/"/g, '""')}"`;
        const exp = item.expectedQuantity;
        const counted = isOngoing ? (countedItemsMap.value[item.productId] ?? item.expectedQuantity) : item.countedQuantity;
        const diff = isOngoing ? (counted - exp) : item.variance;
        const status = diff === 0 ? "مطابق" : diff < 0 ? "عجز" : "زيادة";
        csvContent += `${pName},${sku},${exp},${counted},${diff},"${status}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `جلسة_جرد_${session.sessionNumber || session.id}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

const saveProgress = async () => {
    if (!stockCountStore.currentSession) return;
    try {
        const items = Object.keys(countedItemsMap.value).map(productId => ({
            productId: parseInt(productId),
            countedQuantity: countedItemsMap.value[productId]
        }));
        await stockCountStore.updateSessionItems(stockCountStore.currentSession.id, items);
    } catch {
        // Handled
    }
};

const completeSession = async () => {
    if (!stockCountStore.currentSession) return;
    if (confirm("هل أنت متأكد من إنهاء جلسة الجرد وتطبيق الفروقات على المخزون؟ لا يمكن التراجع عن هذه الخطوة.")) {
        try {
            await saveProgress(); // save current values first
            await stockCountStore.completeSession(stockCountStore.currentSession.id);
            toastStore.addSuccessToast("تم إنهاء الجرد وتحديث المخزون بنجاح");
        } catch {
            // Handled
        }
    }
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric"
    });
};

const getStatusConfig = (status) => {
    if (status === 'ONGOING') return { label: 'جاري العمل', class: 'status-warning' };
    if (status === 'COMPLETED') return { label: 'مكتمل ومطبق', class: 'status-success' };
    return { label: status, class: 'status-info' };
};
</script>

<template>
    <div class="stockcount-page">
        <!-- List View -->
        <div v-if="currentView === 'list'">
            <div class="page-header no-print">
                <div class="flex items-center gap-3">
                    <div class="header-icon-wrap">
                        <ClipboardList :size="28" class="text-primary-500" />
                    </div>
                    <div>
                        <h1 class="page-title">جرد المخزون</h1>
                        <p class="page-subtitle">إدارة جلسات تسوية وجرد المخزون</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <Tag
                        :value="canManageStock ? 'صلاحية كاملة (إدارة الجرد)' : 'عرض فقط (بدون تعديل)'"
                        :severity="canManageStock ? 'success' : 'info'"
                        class="me-1 font-semibold"
                    />
                    <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                        <HelpCircle :size="18" />
                    </button>
                    <Button label="بدء جرد جديد" @click="openNewSession" v-if="canManageStock">
                        <template #icon>
                            <Plus :size="18" />
                        </template>
                    </Button>
                </div>
            </div>

            <!-- Help Drawer -->
            <HelpDrawer
                v-model="showHelp"
                page-title="جرد وتسوية المخزون"
                page-subtitle="جلسات الجرد الفعلي ومطابقتها مع رصيد النظام"
                :page-icon="ClipboardList"
                header-gradient="linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)"
                :sections="helpSections"
                :tips="helpTips"
            />

            <Tabs value="data">
                <TabList class="no-print">
                    <Tab value="data"><List class="inline-block me-2" :size="16" />جلسات الجرد</Tab>
                    <Tab value="report"><FileText class="inline-block me-2" :size="16" />تقرير الجرد</Tab>
                </TabList>
                
                <TabPanels>
                    <TabPanel value="data" class="px-0 py-4">
                        <!-- Table Container Card -->
                        <div class="content-card">
                            <div class="filter-bar">
                                <div class="relative w-full max-w-xs">
                                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                    <InputText
                                        v-model="filters.global.value"
                                        placeholder="بحث في الجلسات..."
                                        class="ps-9 w-full"
                                        size="small"
                                    />
                                </div>
                            </div>

                            <DataTable
                                :value="stockCountStore.sessions"
                                :loading="stockCountStore.isLoading"
                                paginator
                                :rows="10"
                                v-model:filters="filters"
                                :globalFilterFields="['title', 'status', 'sessionNumber']"
                                emptyMessage="لا يوجد جلسات جرد"
                                stripedRows
                                removableSort
                                class="main-table"
                            >
                                <Column field="id" header="#" sortable style="width: 80px">
                                    <template #body="{ data }"><span class="font-mono text-surface-400">{{ data.sessionNumber || data.id }}</span></template>
                                </Column>
                                <Column field="title" header="العنوان" sortable></Column>
                                <Column field="countDate" header="تاريخ الجرد" sortable>
                                    <template #body="{ data }">{{ formatDate(data.countDate) }}</template>
                                </Column>
                                <Column field="status" header="الحالة" sortable>
                                    <template #body="{ data }">
                                        <span class="status-chip" :class="getStatusConfig(data.status).class">
                                            {{ getStatusConfig(data.status).label }}
                                        </span>
                                    </template>
                                </Column>
                                <Column field="notes" header="ملاحظات"></Column>
                                <Column header="إجراءات" style="width: 170px; text-align: center">
                                    <template #body="{ data }">
                                        <div class="flex items-center justify-center gap-1.5">
                                            <Button label="عرض" outlined severity="info" size="small" @click="openSessionDetails(data.id)" title="عرض التفاصيل">
                                                <template #icon>
                                                    <Eye :size="14" class="me-1" />
                                                </template>
                                            </Button>
                                            <Button v-if="data.status !== 'COMPLETED' && canManageStock" label="حذف" outlined severity="danger" size="small" @click="deleteSession(data.id)" title="حذف الجلسة">
                                                <template #icon>
                                                    <Trash2 :size="14" class="me-1" />
                                                </template>
                                            </Button>
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

                                <div v-if="reportStore.stockCountsData" class="flex items-center gap-2">
                                    <Button label="طباعة" severity="secondary" outlined size="small" @click="printReport">
                                        <template #icon><Printer :size="16" class="me-1" /></template>
                                    </Button>
                                    <Button label="تصدير CSV" severity="secondary" outlined size="small" @click="exportReportCsv">
                                        <template #icon><Download :size="16" class="me-1" /></template>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div v-if="reportStore.stockCountsData">
                            <!-- Printable Official Header -->
                            <div class="print-official-header">
                                <div class="print-header-content">
                                    <div class="print-header-brand">
                                        <h2>تقرير جلسات وجرد المخزون</h2>
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
                                <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-blue-500">
                                    <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                                        <ClipboardList :size="20" />
                                    </div>
                                    <div>
                                        <span class="text-xs font-medium text-surface-500 block">إجمالي جلسات الجرد</span>
                                        <span class="text-lg font-bold text-blue-600">{{ reportSummary.totalSessions }} جلسة</span>
                                    </div>
                                </div>

                                <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-emerald-500">
                                    <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle :size="20" />
                                    </div>
                                    <div>
                                        <span class="text-xs font-medium text-surface-500 block">جلسات مكتملة ومطبقة</span>
                                        <span class="text-lg font-bold text-emerald-600">{{ reportSummary.completedSessions }} جلسة</span>
                                    </div>
                                </div>

                                <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-amber-500">
                                    <div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center flex-shrink-0">
                                        <Clock :size="20" />
                                    </div>
                                    <div>
                                        <span class="text-xs font-medium text-surface-500 block">جلسات قيد الإجراء / معلقة</span>
                                        <span class="text-lg font-bold text-amber-600">{{ reportSummary.inProgressSessions }} جلسة</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Report DataTable Card -->
                            <div class="content-card p-4">
                                <div class="flex justify-between items-center mb-4 no-print">
                                    <div class="relative flex-1 max-w-sm">
                                        <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                        <InputText v-model="reportSearchQuery" placeholder="بحث باسم الجلسة أو الملاحظات..." class="ps-9 w-full" size="small" />
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
                                    <Column field="name" header="عنوان الجلسة" sortable style="min-width: 200px">
                                        <template #body="{ data }">
                                            <div class="flex items-center gap-2">
                                                <ClipboardList :size="16" class="text-surface-400" />
                                                <span class="font-semibold text-surface-900 dark:text-surface-100 text-sm">
                                                    {{ data.name || 'جلسة جرد' }}
                                                </span>
                                            </div>
                                        </template>
                                    </Column>

                                    <Column field="countDate" header="تاريخ الجلسة" sortable style="min-width: 140px">
                                        <template #body="{ data }">
                                            <span>{{ data.countDate ? new Date(data.countDate).toLocaleDateString('ar-EG') : '—' }}</span>
                                        </template>
                                    </Column>

                                    <Column field="status" header="الحالة" sortable style="min-width: 140px">
                                        <template #body="{ data }">
                                            <span
                                                class="px-2.5 py-1 rounded-full text-xs font-bold border"
                                                :class="(data.status === 'COMPLETED' || data.status === 'مكتمل')
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200'"
                                            >
                                                {{ getStockCountStatusLabel(data.status) }}
                                            </span>
                                        </template>
                                    </Column>

                                    <Column field="notes" header="ملاحظات" style="min-width: 220px">
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
        </div>

        <!-- Detail View -->
        <div v-else-if="currentView === 'detail' && stockCountStore.currentSession">
            <!-- Header -->
            <div class="page-header no-print">
                <div class="flex items-center gap-3">
                    <Button label="عودة" outlined severity="secondary" size="small" @click="backToList" title="العودة للقائمة">
                        <template #icon><ArrowRight :size="16" class="me-1" /></template>
                    </Button>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="page-title">{{ stockCountStore.currentSession.title }}</h1>
                            <span class="font-mono text-xs text-surface-400">({{ stockCountStore.currentSession.sessionNumber || stockCountStore.currentSession.id }})</span>
                        </div>
                        <p class="page-subtitle">
                            تاريخ: {{ formatDate(stockCountStore.currentSession.countDate) }} |
                            الحالة: 
                            <span class="status-chip ms-2" :class="getStatusConfig(stockCountStore.currentSession.status).class">
                                {{ getStatusConfig(stockCountStore.currentSession.status).label }}
                            </span>
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                    <Button label="ورقة جرد ورقية" outlined severity="secondary" size="small" @click="printSession(true)" title="طباعة ورقة جرد للمستودع">
                        <template #icon><FileText :size="16" class="me-1" /></template>
                    </Button>
                    <Button label="طباعة التقرير" outlined severity="secondary" size="small" @click="printSession(false)">
                        <template #icon><Printer :size="16" class="me-1" /></template>
                    </Button>
                    <Button label="تصدير CSV" outlined severity="secondary" size="small" @click="exportSessionCsv">
                        <template #icon><Download :size="16" class="me-1" /></template>
                    </Button>

                    <template v-if="stockCountStore.currentSession.status === 'ONGOING' && canManageStock">
                        <Button label="نسخ الدفتري للفعلي" outlined severity="info" size="small" @click="copyExpectedToCounted" title="ملء الكميات الفعالية بالدفتري لتسريع الإدخال">
                            <template #icon><Copy :size="16" class="me-1" /></template>
                        </Button>
                        <Button label="حفظ التقدم" outlined severity="secondary" size="small" @click="saveProgress">
                            <template #icon><Save :size="16" class="me-1" /></template>
                        </Button>
                        <Button label="إنهاء الجرد وتطبيق" severity="success" size="small" @click="completeSession">
                            <template #icon><CheckCircle :size="16" class="me-1" /></template>
                        </Button>
                    </template>
                </div>
            </div>

            <!-- Printable Header for Session Print -->
            <div class="print-official-header">
                <div class="print-header-content">
                    <div class="print-header-brand">
                        <h2>{{ isPrintingWorksheet ? 'ورقة جرد ميدانية للمستودع' : 'تقرير جلسة جرد وتصفية رصيد المخزون' }}</h2>
                        <p>نظام إدارة المبيعات والمخازن (POS System) — رقم الجلسة: {{ stockCountStore.currentSession.sessionNumber || stockCountStore.currentSession.id }}</p>
                    </div>
                    <div class="print-header-meta">
                        <p><span>العنوان:</span> {{ stockCountStore.currentSession.title }}</p>
                        <p><span>تاريخ الجرد:</span> {{ formatDate(stockCountStore.currentSession.countDate) }}</p>
                        <p><span>الحالة:</span> {{ getStatusConfig(stockCountStore.currentSession.status).label }}</p>
                    </div>
                </div>
            </div>

            <!-- Detail KPI Stats Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="content-card p-3 flex items-center gap-3 border-s-4 border-s-blue-500 cursor-pointer" :class="{ 'ring-2 ring-blue-500': sessionVarianceFilter === 'all' }" @click="sessionVarianceFilter = 'all'">
                    <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Package :size="18" />
                    </div>
                    <div>
                        <span class="text-xs font-medium text-surface-500 block">إجمالي أصناف الجلسة</span>
                        <span class="text-lg font-bold text-surface-900 dark:text-surface-100">{{ currentSessionSummary.totalItems }} صنف</span>
                    </div>
                </div>

                <div class="content-card p-3 flex items-center gap-3 border-s-4 border-s-emerald-500 cursor-pointer" :class="{ 'ring-2 ring-emerald-500': sessionVarianceFilter === 'matched' }" @click="sessionVarianceFilter = 'matched'">
                    <div class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 :size="18" />
                    </div>
                    <div>
                        <span class="text-xs font-medium text-surface-500 block">أصناف مطابقة (بدون فرق)</span>
                        <span class="text-lg font-bold text-emerald-600">{{ currentSessionSummary.matched }} صنف</span>
                    </div>
                </div>

                <div class="content-card p-3 flex items-center gap-3 border-s-4 border-s-red-500 cursor-pointer" :class="{ 'ring-2 ring-red-500': sessionVarianceFilter === 'missing' }" @click="sessionVarianceFilter = 'missing'">
                    <div class="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center flex-shrink-0">
                        <AlertCircle :size="18" />
                    </div>
                    <div>
                        <span class="text-xs font-medium text-surface-500 block">أصناف بها عجز ({{ currentSessionSummary.totalMissingQty }} وحدة)</span>
                        <span class="text-lg font-bold text-red-600">{{ currentSessionSummary.missing }} صنف</span>
                    </div>
                </div>

                <div class="content-card p-3 flex items-center gap-3 border-s-4 border-s-amber-500 cursor-pointer" :class="{ 'ring-2 ring-amber-500': sessionVarianceFilter === 'extra' }" @click="sessionVarianceFilter = 'extra'">
                    <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle :size="18" />
                    </div>
                    <div>
                        <span class="text-xs font-medium text-surface-500 block">أصناف بها زيادة ({{ currentSessionSummary.totalExtraQty }} وحدة)</span>
                        <span class="text-lg font-bold text-amber-600">{{ currentSessionSummary.extra }} صنف</span>
                    </div>
                </div>
            </div>

            <!-- Content Card & Table -->
            <div class="content-card">
                <!-- Filter Bar -->
                <div class="filter-bar no-print flex flex-col md:flex-row justify-between items-center gap-3">
                    <div class="relative w-full max-w-xs">
                        <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <InputText
                            v-model="detailFilters.global.value"
                            placeholder="بحث باسم المنتج أو SKU..."
                            class="ps-9 w-full"
                            size="small"
                        />
                    </div>

                    <!-- Quick Filter Buttons -->
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <button
                            class="filter-chip"
                            :class="{ active: sessionVarianceFilter === 'all' }"
                            @click="sessionVarianceFilter = 'all'"
                        >
                            الكل ({{ currentSessionSummary.totalItems }})
                        </button>
                        <button
                            class="filter-chip chip-success"
                            :class="{ active: sessionVarianceFilter === 'matched' }"
                            @click="sessionVarianceFilter = 'matched'"
                        >
                            مطابق ({{ currentSessionSummary.matched }})
                        </button>
                        <button
                            class="filter-chip chip-danger"
                            :class="{ active: sessionVarianceFilter === 'missing' }"
                            @click="sessionVarianceFilter = 'missing'"
                        >
                            عجز ({{ currentSessionSummary.missing }})
                        </button>
                        <button
                            class="filter-chip chip-warning"
                            :class="{ active: sessionVarianceFilter === 'extra' }"
                            @click="sessionVarianceFilter = 'extra'"
                        >
                            زيادة ({{ currentSessionSummary.extra }})
                        </button>
                    </div>
                </div>

                <!-- Session Detail DataTable -->
                <DataTable
                    :value="filteredSessionItems"
                    :loading="stockCountStore.isLoading"
                    :paginator="!isPrintingSessionDetail && !isPrintingWorksheet"
                    :rows="isPrintingSessionDetail || isPrintingWorksheet ? 999999 : 20"
                    emptyMessage="لا توجد أصناف تطابق تصفية الجرد"
                    stripedRows
                    class="main-table"
                >
                    <Column field="productName" header="المنتج" sortable style="min-width: 220px">
                        <template #body="{ data }">
                            <span class="font-semibold text-surface-900 dark:text-surface-100 text-sm">{{ data.productName }}</span>
                        </template>
                    </Column>
                    <Column field="productSku" header="SKU" sortable style="min-width: 120px">
                        <template #body="{ data }">
                            <span class="text-xs font-mono text-surface-500">{{ data.productSku || '—' }}</span>
                        </template>
                    </Column>
                    <Column field="expectedQuantity" header="الكمية الدفترية" style="width: 150px">
                        <template #body="{ data }">
                            <span class="font-bold text-surface-800 dark:text-surface-200">{{ data.expectedQuantity }}</span>
                        </template>
                    </Column>
                    <Column field="countedQuantity" header="الجرد الفعلي" style="width: 200px">
                        <template #body="{ data }">
                            <div v-if="isPrintingWorksheet" class="worksheet-blank-box">___</div>
                            <InputNumber 
                                v-else-if="stockCountStore.currentSession.status === 'ONGOING'"
                                v-model="countedItemsMap[data.productId]"
                                :disabled="!canManageStock"
                                showButtons
                                :min="0"
                                class="w-full"
                            />
                            <span v-else class="font-bold text-surface-900 dark:text-surface-100">{{ data.countedQuantity }}</span>
                        </template>
                    </Column>
                    <Column header="الفرق" style="width: 150px">
                        <template #body="{ data }">
                            <template v-if="isPrintingWorksheet">
                                <span class="text-surface-400">—</span>
                            </template>
                            <template v-else-if="stockCountStore.currentSession.status === 'ONGOING'">
                                <span class="font-bold text-sm" :class="(countedItemsMap[data.productId] - data.expectedQuantity) < 0 ? 'text-red-600' : (countedItemsMap[data.productId] - data.expectedQuantity) > 0 ? 'text-emerald-600' : 'text-surface-500'">
                                    {{ countedItemsMap[data.productId] !== undefined ? (countedItemsMap[data.productId] - data.expectedQuantity) : 0 }}
                                </span>
                            </template>
                            <template v-else>
                                <span class="font-bold text-sm" :class="data.variance < 0 ? 'text-red-600' : data.variance > 0 ? 'text-emerald-600' : 'text-surface-500'">
                                    {{ data.variance }}
                                </span>
                            </template>
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>

        <!-- New Session Dialog -->
        <Dialog
            v-model:visible="showNewSessionDialog"
            header="بدء جلسة جرد جديدة"
            :style="{ width: '450px' }"
            modal
        >
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <label class="font-bold">عنوان الجلسة</label>
                    <InputText v-model="sessionForm.title" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold">تاريخ الجرد</label>
                    <InputText type="date" v-model="sessionForm.countDate" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold">ملاحظات</label>
                    <Textarea v-model="sessionForm.notes" rows="3" />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showNewSessionDialog = false" />
                    <Button label="إنشاء الجلسة" @click="createSession" :loading="stockCountStore.isLoading" severity="primary" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.stockcount-page {
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
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
}
.dark .header-icon-wrap {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
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

.filter-chip {
    padding: 0.35rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.775rem;
    font-weight: 700;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    color: var(--p-surface-600);
    cursor: pointer;
    transition: all 0.15s ease;
}
.dark .filter-chip {
    border-color: var(--p-surface-750);
    background: var(--p-surface-800);
    color: var(--p-surface-300);
}

.filter-chip.active {
    background: var(--p-primary-500);
    color: #fff;
    border-color: var(--p-primary-500);
}

.filter-chip.chip-success.active {
    background: #10b981;
    border-color: #10b981;
}

.filter-chip.chip-danger.active {
    background: #ef4444;
    border-color: #ef4444;
}

.filter-chip.chip-warning.active {
    background: #f59e0b;
    border-color: #f59e0b;
}

.status-chip {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
}
.status-warning { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.status-success { background: rgba(16, 185, 129, 0.15); color: #059669; }
.status-info { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
.dark .status-warning { color: #fcd34d; }
.dark .status-success { color: #6ee7b7; }
.dark .status-info { color: #93c5fd; }

.worksheet-blank-box {
    display: inline-block;
    width: 80px;
    height: 30px;
    border: 1px dashed #94a3b8;
    text-align: center;
    line-height: 28px;
    color: #94a3b8;
}
</style>
