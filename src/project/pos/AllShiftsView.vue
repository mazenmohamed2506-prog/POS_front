<script setup>
import { ref, computed, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { useShiftStore } from "@/stores/pos/shiftStore";
import {
    Clock,
    DoorOpen,
    Banknote,
    AlertTriangle,
    CheckCircle,
    History,
    Eye,
    Search,
    HelpCircle,
    User,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    FileText,
    TrendingUp,
    Lock
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const posStore = usePosStore();
const shiftStore = useShiftStore();

// ── Help Drawer ──
const showHelp = ref(false);
const shiftHelpSections = [
    {
        title: 'كشوفات وأرشيف الورديات',
        icon: History,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'سجل جميع الموظفين', desc: 'متابعة كافة الورديات التاريخية والنشطة لكافة الموظفين والكاشيرات.' },
            { title: 'التصفية والتدقيق الإداري', desc: 'تصفية الكشوفات حسب الموظف أو التاريخ لمراجعة الفروقات والأداء.' },
            { title: 'إعادة طباعة التقرير', desc: 'فتح تقرير ختام أي وردية سابقة وإعادة طباعته للتدقيق المحاسبي.' },
        ]
    }
];
const shiftHelpTips = [
    'تساعد شاشة الورديات الإدارة في اكتشاف أي عجز نقدية متكرر ومقارنة أداء الكاشيرات.',
    'الوردية المفتوحة حالياً تظهر بحالة نشطة ومحدثة باستمرار.'
];

const startingCash = ref(0);
const actualCash = ref(0);
const lastClosedShift = ref(null);
const searchQuery = ref("");
const statusFilter = ref("all"); // 'all' | 'Open' | 'Closed'

const shiftDuration = computed(() => {
    if (!shiftStore.currentShift?.openedAt) return "";
    const start = new Date(shiftStore.currentShift.openedAt);
    const now = new Date();
    const diff = Math.max(0, Math.floor((now - start) / 1000));
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours} س ${minutes} د`;
});

const filteredShifts = computed(() => {
    let result = shiftStore.shifts || [];
    
    // Status Filter
    if (statusFilter.value !== "all") {
        result = result.filter(s => s.status === statusFilter.value);
    }

    // Search Query
    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
        result = result.filter((s) =>
            (s.cashier && s.cashier.toLowerCase().includes(q)) ||
            (s.status && s.status.toLowerCase().includes(q))
        );
    }
    return result;
});

const selectedShift = ref(null);
const showDetailDialog = ref(false);

const viewShiftDetails = (shift) => {
    selectedShift.value = shift;
    showDetailDialog.value = true;
};

const getShiftDuration = (shift) => {
    if (!shift?.openedAt) return "—";
    const start = new Date(shift.openedAt);
    const end = shift.closedAt ? new Date(shift.closedAt) : new Date();
    const diff = Math.max(0, Math.floor((end - start) / 1000));
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours} ساعة ${minutes} دقيقة`;
};

const handleOpenShift = async () => {};
const handleCloseShift = async () => {};

const setQuickCash = (amount, target = 'start') => {
    if (target === 'start') {
        startingCash.value = (startingCash.value || 0) + amount;
    } else {
        actualCash.value = (actualCash.value || 0) + amount;
    }
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: posStore.settings.currency || "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ar-EG", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

const formatTimeOnly = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString("ar-EG", {
        hour: "2-digit", minute: "2-digit"
    });
};

onMounted(() => {
    shiftStore.fetchAllShifts();
});
</script>

<template>
    <div class="shift-page-container">
        <!-- Header -->
        <header class="shift-header">
            <div class="header-main">
                <div class="header-icon-box">
                    <Clock :size="24" class="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 class="shift-title">متابعة الورديات</h1>
                    <p class="shift-subtitle">متابعة سجل الورديات للفرع وتقاريرها المالية</p>
                </div>
            </div>
            <button class="help-btn" @click="showHelp = true" title="دليل الاستخدام">
                <HelpCircle :size="18" />
                <span>دليل الاستخدام</span>
            </button>
        </header>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة كشوفات الورديات"
            page-subtitle="كشوفات كافة ورديات الموظفين والتقرير التفصيلي"
            :page-icon="Clock"
            header-gradient="linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)"
            :sections="shiftHelpSections"
            :tips="shiftHelpTips"
        />

        <!-- Layout Wrapper -->
        <div class="shift-grid">
            <!-- Main Panel: Shift Analytics & Compact Table -->
            <main class="shift-main" style="width: 100%;">
                <!-- Metric Cards -->
                <div class="metrics-grid" v-if="shiftStore.shifts.length > 0">
                    <div class="metric-card">
                        <div class="metric-icon purple">
                            <Clock :size="20" />
                        </div>
                        <div class="metric-content">
                            <span class="metric-label">إجمالي الورديات</span>
                            <span class="metric-val">{{ shiftStore.shifts.length }}</span>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon green">
                            <TrendingUp :size="20" />
                        </div>
                        <div class="metric-content">
                            <span class="metric-label">إجمالي مبيعات الورديات</span>
                            <span class="metric-val text-emerald-600 dark:text-emerald-400">
                                {{ formatCurrency(shiftStore.shifts.reduce((sum, s) => sum + (s.totalSales || 0), 0)) }}
                            </span>
                        </div>
                    </div>

                    <div class="metric-card">
                        <div class="metric-icon amber">
                            <AlertTriangle :size="20" />
                        </div>
                        <div class="metric-content">
                            <span class="metric-label">إجمالي الفروقات</span>
                            <span
                                class="metric-val"
                                :class="shiftStore.shifts.reduce((sum, s) => sum + (s.variance || 0), 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                            >
                                {{ formatCurrency(shiftStore.shifts.reduce((sum, s) => sum + (s.variance || 0), 0)) }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Shift History Table Card -->
                <div class="shift-card history-card">
                    <!-- Table Toolbar -->
                    <div class="table-toolbar">
                        <div class="toolbar-title">
                            <History :size="20" class="text-primary-500" />
                            <span>سجل الورديات</span>
                            <span class="badge-count">{{ filteredShifts.length }}</span>
                        </div>

                        <div class="toolbar-actions">
                            <!-- Status Filter Buttons -->
                            <div class="status-filter-pills">
                                <button
                                    type="button"
                                    class="pill-btn"
                                    :class="{ active: statusFilter === 'all' }"
                                    @click="statusFilter = 'all'"
                                >
                                    الكل
                                </button>
                                <button
                                    type="button"
                                    class="pill-btn green"
                                    :class="{ active: statusFilter === 'Open' }"
                                    @click="statusFilter = 'Open'"
                                >
                                    مفتوحة
                                </button>
                                <button
                                    type="button"
                                    class="pill-btn gray"
                                    :class="{ active: statusFilter === 'Closed' }"
                                    @click="statusFilter = 'Closed'"
                                >
                                    مغلقة
                                </button>
                            </div>

                            <!-- Search Input -->
                            <div class="search-box">
                                <Search :size="16" class="search-box-icon" />
                                <input
                                    v-model="searchQuery"
                                    type="text"
                                    placeholder="بحث بالكاشير..."
                                    class="search-box-input"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Clean Responsive Table without horizontal overflow -->
                    <div class="table-wrapper">
                        <table class="compact-table">
                            <thead>
                                <tr>
                                    <th>الكاشير</th>
                                    <th>التاريخ والبداية</th>
                                    <th>المبيعات النقدية</th>
                                    <th>الفرق</th>
                                    <th>الحالة</th>
                                    <th class="text-center">التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="shiftStore.loading">
                                    <td colspan="6" class="text-center py-8 text-surface-400">
                                        <i class="pi pi-spin pi-spinner text-2xl mb-2 block"></i>
                                        جاري تحميل البيانات...
                                    </td>
                                </tr>
                                <tr v-else-if="filteredShifts.length === 0">
                                    <td colspan="6" class="text-center py-8 text-surface-400">
                                        لا توجد ورديات تطابق البحث
                                    </td>
                                </tr>
                                <tr v-for="shift in filteredShifts" :key="shift.id" class="table-row-hover">
                                    <!-- Cashier -->
                                    <td>
                                        <div class="cashier-cell">
                                            <div class="avatar-mini">
                                                {{ shift.cashier ? shift.cashier.charAt(0).toUpperCase() : 'U' }}
                                            </div>
                                            <span class="cashier-name">{{ shift.cashier }}</span>
                                        </div>
                                    </td>

                                    <!-- Start date / time -->
                                    <td>
                                        <div class="date-cell">
                                            <span class="main-date">{{ formatDate(shift.openedAt) }}</span>
                                            <span class="sub-duration text-xs text-surface-400 flex items-center gap-1">
                                                <Clock :size="12" />
                                                {{ getShiftDuration(shift) }}
                                            </span>
                                        </div>
                                    </td>

                                    <!-- Total Sales -->
                                    <td>
                                        <span class="font-bold text-surface-900 dark:text-surface-100">
                                            {{ formatCurrency(shift.totalSales) }}
                                        </span>
                                    </td>

                                    <!-- Variance -->
                                    <td>
                                        <span
                                            class="variance-tag"
                                            :class="shift.variance >= 0 ? 'pos' : 'neg'"
                                        >
                                            {{ formatCurrency(shift.variance) }}
                                        </span>
                                    </td>

                                    <!-- Status -->
                                    <td>
                                        <span
                                            class="status-chip"
                                            :class="shift.status === 'Open' ? 'status-open' : 'status-closed'"
                                        >
                                            <span class="chip-dot"></span>
                                            {{ shift.status === 'Open' ? 'مفتوحة' : 'مغلقة' }}
                                        </span>
                                    </td>

                                    <!-- Actions -->
                                    <td class="text-center">
                                        <button
                                            class="detail-icon-btn"
                                            @click="viewShiftDetails(shift)"
                                            title="عرض التفاصيل الكاملة"
                                        >
                                            <Eye :size="16" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>

        <!-- ═══ DETAILED SHIFT DIALOG ═══ -->
        <Dialog
            v-model:visible="showDetailDialog"
            header="تقرير تفاصيل الوردية"
            :style="{ width: '560px', maxWidth: '95vw' }"
            modal
            dismissableMask
            class="shift-dialog-custom"
        >
            <div class="shift-detail-modal" v-if="selectedShift">
                <!-- Modal Top Card -->
                <div class="modal-top-card">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="cashier-avatar-large">
                                {{ selectedShift.cashier ? selectedShift.cashier.charAt(0).toUpperCase() : 'U' }}
                            </div>
                            <div>
                                <h3 class="font-black text-lg text-surface-900 dark:text-surface-0">{{ selectedShift.cashier }}</h3>
                                <p class="text-xs text-surface-500">معرف الوردية: #{{ selectedShift.id }}</p>
                            </div>
                        </div>
                        <Tag
                            :value="selectedShift.status === 'Open' ? 'وردية مفتوحة' : 'وردية مغلقة'"
                            :severity="selectedShift.status === 'Open' ? 'success' : 'secondary'"
                        />
                    </div>
                </div>

                <!-- Timings Section -->
                <div class="detail-block">
                    <h4 class="block-title">
                        <Calendar :size="16" />
                        التوقيت والمدة الزمنية
                    </h4>
                    <div class="detail-grid-2">
                        <div class="detail-box">
                            <span class="box-label">وقت الفتح</span>
                            <span class="box-val">{{ formatDate(selectedShift.openedAt) }}</span>
                        </div>
                        <div class="detail-box">
                            <span class="box-label">وقت الإغلاق</span>
                            <span class="box-val">{{ formatDate(selectedShift.closedAt) }}</span>
                        </div>
                        <div class="detail-box col-span-2 highlight font-bold">
                            <span class="box-label">مدة الوردية الإجمالية</span>
                            <span class="box-val text-primary-600 dark:text-primary-400">{{ getShiftDuration(selectedShift) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Detailed Financial Report -->
                <div class="detail-block">
                    <h4 class="block-title">
                        <FileText :size="16" />
                        التقرير المالي للدرج والصندوق
                    </h4>
                    <div class="ledger-list">
                        <div class="ledger-row">
                            <span>المبلغ الافتتاحي (بداية الوردية):</span>
                            <span class="font-semibold">{{ formatCurrency(selectedShift.startingCash) }}</span>
                        </div>
                        <div class="ledger-row text-emerald-600 dark:text-emerald-400 font-medium">
                            <span>+ مبيعات الكاش النقدي:</span>
                            <span class="font-bold">{{ formatCurrency(selectedShift.totalSales) }}</span>
                        </div>
                        <div class="ledger-row text-emerald-600 dark:text-emerald-400 font-medium" v-if="selectedShift.totalCollections > 0">
                            <span>+ تحصيلات ديون عملاء (كاش):</span>
                            <span class="font-bold">{{ formatCurrency(selectedShift.totalCollections) }}</span>
                        </div>
                        <div class="ledger-row text-rose-600 dark:text-rose-400 font-medium" v-if="selectedShift.totalExpenses > 0">
                            <span>- المصروفات النقدية الخارجية:</span>
                            <span class="font-bold">{{ formatCurrency(selectedShift.totalExpenses) }}</span>
                        </div>

                        <div class="ledger-row total-expected">
                            <span>النقد المتوقع تواجده بالدرج:</span>
                            <span class="font-bold text-surface-900 dark:text-surface-100 text-base">
                                {{ formatCurrency(selectedShift.expectedCash) }}
                            </span>
                        </div>

                        <div class="ledger-row">
                            <span>النقد الفعلي الجردي المُستلم:</span>
                            <span class="font-bold text-surface-900 dark:text-surface-100 text-base">
                                {{ formatCurrency(selectedShift.actualCash) }}
                            </span>
                        </div>

                        <div
                            class="ledger-row final-variance"
                            :class="selectedShift.variance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'"
                        >
                            <span class="font-black text-base flex items-center gap-1">
                                <AlertTriangle v-if="selectedShift.variance < 0" :size="18" />
                                الفارق والنتيجة (عجز / زيادة):
                            </span>
                            <span class="font-black text-lg">
                                {{ formatCurrency(selectedShift.variance) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="إغلاق التقرير" outlined severity="secondary" @click="showDetailDialog = false" class="w-full" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* ═══ Container Layout ═══ */
.shift-page-container {
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    overflow-x: hidden; /* Strict no horizontal scroll on main viewport */
}

@media (max-width: 768px) {
    .shift-page-container {
        padding: 1rem;
        gap: 1.25rem;
    }
}

/* ═══ Header ═══ */
.shift-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border-bottom: 1px solid var(--p-surface-200);
    padding-bottom: 1.25rem;
}

.dark .shift-header {
    border-color: var(--p-surface-800);
}

.header-main {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 1rem;
    background: var(--p-primary-50);
    border: 1px solid var(--p-primary-200);
}

.dark .header-icon-box {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
}

.shift-title {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--p-surface-900);
    margin: 0;
    line-height: 1.2;
}

.dark .shift-title {
    color: var(--p-surface-0);
}

.shift-subtitle {
    font-size: 0.85rem;
    color: var(--p-surface-500);
    margin-top: 0.25rem;
}

.help-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    border-radius: 0.75rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    color: var(--p-surface-700);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
}

.dark .help-btn {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    color: var(--p-surface-200);
}

.help-btn:hover {
    background: var(--p-surface-100);
    color: var(--p-primary-600);
}

/* ═══ Main Grid ═══ */
.shift-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.75rem;
    width: 100%;
}

@media (min-width: 1024px) {
    .shift-grid {
        grid-template-columns: 1fr;
        align-items: start;
    }
}

.shift-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.shift-main {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 0; /* Prevents flex/grid children from causing overflow */
}

/* ═══ Cards General ═══ */
.shift-card {
    border-radius: 1.25rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    transition: all 0.2s ease;
}

.dark .shift-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.3);
}

.card-header {
    display: flex;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
}

.dark .card-header {
    border-color: var(--p-surface-800);
}

.card-body {
    padding: 1.25rem;
}

/* ═══ Active Shift Specifics ═══ */
.active-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #dcfce7;
    color: #15803d;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 800;
}

.dark .active-badge {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
}

.pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #22c55e;
    animation: active-pulse 1.8s infinite ease-in-out;
}

@keyframes active-pulse {
    0%, 100% { transform: scale(0.85); opacity: 0.6; }
    50% { transform: scale(1.2); opacity: 1; }
}

.active-shift-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
}

.info-label {
    color: var(--p-surface-500);
    font-weight: 600;
}

.highlight-box {
    background: var(--p-surface-50);
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--p-surface-200);
    margin-top: 0.25rem;
}

.dark .highlight-box {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.shift-close-form {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px dashed var(--p-surface-200);
}

.dark .shift-close-form {
    border-color: var(--p-surface-800);
}

/* Quick Cash Pills */
.quick-cash-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

.quick-chip {
    flex: 1;
    padding: 0.35rem 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--p-surface-700);
    cursor: pointer;
    transition: all 0.15s ease;
}

.dark .quick-chip {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-200);
}

.quick-chip:hover {
    background: var(--p-primary-500);
    color: #ffffff;
    border-color: var(--p-primary-500);
}

.quick-chip.danger:hover {
    background: var(--p-red-500, #ef4444);
    color: #ffffff;
    border-color: var(--p-red-500, #ef4444);
}

/* ═══ Metrics Grid ═══ */
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
}

.metric-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 1.25rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 4px 15px -5px rgba(0, 0, 0, 0.03);
}

.dark .metric-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.metric-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.875rem;
    flex-shrink: 0;
}

.metric-icon.purple {
    background: #f3e8ff;
    color: #9333ea;
}
.dark .metric-icon.purple {
    background: rgba(147, 51, 234, 0.2);
    color: #c084fc;
}

.metric-icon.green {
    background: #dcfce7;
    color: #16a34a;
}
.dark .metric-icon.green {
    background: rgba(22, 163, 74, 0.2);
    color: #4ade80;
}

.metric-icon.amber {
    background: #fef3c7;
    color: #d97706;
}
.dark .metric-icon.amber {
    background: rgba(217, 119, 6, 0.2);
    color: #fbbf24;
}

.metric-content {
    display: flex;
    flex-direction: column;
}

.metric-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--p-surface-500);
}

.metric-val {
    font-size: 1.25rem;
    font-weight: 900;
    color: var(--p-surface-900);
}

.dark .metric-val {
    color: var(--p-surface-0);
}

/* ═══ Table Card & Toolbar ═══ */
.history-card {
    display: flex;
    flex-direction: column;
}

.table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .table-toolbar {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.toolbar-title {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-weight: 800;
    font-size: 1.05rem;
    color: var(--p-surface-800);
}

.dark .toolbar-title {
    color: var(--p-surface-100);
}

.badge-count {
    background: var(--p-primary-100);
    color: var(--p-primary-700);
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 800;
}

.dark .badge-count {
    background: rgba(99, 102, 241, 0.2);
    color: var(--p-primary-300);
}

.toolbar-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

/* Status Filter Pills */
.status-filter-pills {
    display: flex;
    background: var(--p-surface-200);
    padding: 0.2rem;
    border-radius: 0.625rem;
}

.dark .status-filter-pills {
    background: var(--p-surface-800);
}

.pill-btn {
    padding: 0.35rem 0.75rem;
    border: none;
    background: transparent;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--p-surface-600);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.15s ease;
}

.dark .pill-btn {
    color: var(--p-surface-400);
}

.pill-btn.active {
    background: var(--p-surface-0);
    color: var(--p-surface-900);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.dark .pill-btn.active {
    background: var(--p-surface-700);
    color: var(--p-surface-0);
}

.search-box {
    position: relative;
}

.search-box-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--p-surface-400);
    pointer-events: none;
}

.search-box-input {
    padding: 0.4rem 2.25rem 0.4rem 0.75rem;
    border-radius: 0.625rem;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    font-size: 0.85rem;
    color: var(--p-surface-800);
    outline: none;
    transition: all 0.15s ease;
    width: 170px;
}

.dark .search-box-input {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
    color: var(--p-surface-100);
}

.search-box-input:focus {
    border-color: var(--p-primary-500);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

/* ═══ Compact Table Styling (Strict No-Horizontal Scroll) ═══ */
.table-wrapper {
    width: 100%;
    overflow-x: auto; /* Fallback for extreme narrow viewports */
}

.compact-table {
    width: 100%;
    border-collapse: collapse;
    text-align: right;
    font-size: 0.875rem;
}

.compact-table th {
    padding: 0.875rem 1rem;
    background: var(--p-surface-100);
    color: var(--p-surface-600);
    font-weight: 700;
    font-size: 0.8rem;
    border-bottom: 1px solid var(--p-surface-200);
}

.dark .compact-table th {
    background: var(--p-surface-950);
    color: var(--p-surface-400);
    border-color: var(--p-surface-800);
}

.compact-table td {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--p-surface-150);
    vertical-align: middle;
}

.dark .compact-table td {
    border-color: var(--p-surface-850);
}

.table-row-hover:hover {
    background: var(--p-surface-50);
}

.dark .table-row-hover:hover {
    background: var(--p-surface-850);
}

/* Cashier Cell */
.cashier-cell {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

.avatar-mini {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--p-primary-100);
    color: var(--p-primary-700);
    font-weight: 800;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.dark .avatar-mini {
    background: rgba(99, 102, 241, 0.25);
    color: var(--p-primary-300);
}

.cashier-name {
    font-weight: 700;
    color: var(--p-surface-900);
}

.dark .cashier-name {
    color: var(--p-surface-100);
}

.date-cell {
    display: flex;
    flex-direction: column;
}

.main-date {
    font-weight: 600;
    color: var(--p-surface-800);
}

.dark .main-date {
    color: var(--p-surface-200);
}

/* Variance Tag */
.variance-tag {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 0.5rem;
    font-weight: 800;
    font-size: 0.8rem;
}

.variance-tag.pos {
    background: #dcfce7;
    color: #15803d;
}

.dark .variance-tag.pos {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
}

.variance-tag.neg {
    background: #ffe4e6;
    color: #be123c;
}

.dark .variance-tag.neg {
    background: rgba(225, 29, 72, 0.2);
    color: #fb7185;
}

/* Status Chip */
.status-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
}

.status-open {
    background: #dcfce7;
    color: #166534;
}

.dark .status-open {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.status-closed {
    background: var(--p-surface-200);
    color: var(--p-surface-700);
}

.dark .status-closed {
    background: var(--p-surface-800);
    color: var(--p-surface-300);
}

.chip-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: currentColor;
}

/* Detail Button */
.detail-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    color: var(--p-surface-600);
    cursor: pointer;
    transition: all 0.15s ease;
}

.dark .detail-icon-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-300);
}

.detail-icon-btn:hover {
    background: var(--p-primary-500);
    color: #ffffff;
    border-color: var(--p-primary-500);
}

/* ═══ Modal Details Styling ═══ */
.shift-detail-modal {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.modal-top-card {
    padding: 1rem 1.25rem;
    border-radius: 0.875rem;
    background: var(--p-surface-100);
    border: 1px solid var(--p-surface-200);
}

.dark .modal-top-card {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.cashier-avatar-large {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background: var(--p-primary-500);
    color: #ffffff;
    font-size: 1.25rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
}

.detail-block {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.block-title {
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--p-surface-700);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
}

.dark .block-title {
    color: var(--p-surface-300);
}

.detail-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
}

.detail-box {
    padding: 0.75rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.dark .detail-box {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.detail-box.highlight {
    background: var(--p-primary-50);
    border-color: var(--p-primary-200);
}

.dark .detail-box.highlight {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
}

.box-label {
    font-size: 0.75rem;
    color: var(--p-surface-500);
    font-weight: 600;
}

.box-val {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-900);
}

.dark .box-val {
    color: var(--p-surface-100);
}

/* Ledger List */
.ledger-list {
    display: flex;
    flex-direction: column;
    border-radius: 0.875rem;
    border: 1px solid var(--p-surface-200);
    overflow: hidden;
}

.dark .ledger-list {
    border-color: var(--p-surface-800);
}

.ledger-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    border-bottom: 1px solid var(--p-surface-150);
    background: var(--p-surface-0);
}

.dark .ledger-row {
    background: var(--p-surface-900);
    border-color: var(--p-surface-850);
}

.ledger-row:last-child {
    border-bottom: none;
}

.total-expected {
    background: var(--p-surface-100);
}

.dark .total-expected {
    background: var(--p-surface-950);
}
</style>
