<script setup>
import { ref, computed, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { useShiftStore } from "@/stores/pos/shiftStore";
import { Clock, DoorOpen, Banknote, AlertTriangle, CheckCircle, History, Eye, Search, HelpCircle } from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const posStore = usePosStore();
const shiftStore = useShiftStore();

// ── Help Drawer ──
const showHelp = ref(false);
const shiftHelpSections = [
    {
        title: 'فتح الوردية',
        icon: DoorOpen,
        color: '#d1fae5',
        iconColor: '#059669',
        steps: [
            { title: 'أدخل المبلغ الافتتاحي', desc: 'أدخل مبلغ النقد الموجود في الدرج عند بداية الوردية' },
            { title: 'اضغط "فتح الوردية"', desc: 'سيظهر مؤشر الوردية المفتوحة في الشريط الجانبي' },
            { title: 'ابدأ البيع', desc: 'عد فتح الوردية يمكنك إجراء عمليات البيع من شاشة نقطة البيع' },
        ]
    },
    {
        title: 'إغلاق الوردية',
        icon: Banknote,
        color: '#fef3c7',
        iconColor: '#d97706',
        steps: [
            { title: 'عد النقد الفعلي', desc: 'قبل الإغلاق أحصِ النقد في الدرج وأدخله في خانة "النقد الفعلي"' },
            { title: 'مراجعة التقرير', desc: 'سيظهر تقرير يتضمن مجموع المبيعات والفرق بين المتوقع والفعلي' },
            { title: 'تأكيد الإغلاق', desc: 'اضغط "إغلاق الوردية" وقم بتأكيد الإغلاق' },
        ]
    },
    {
        title: 'سجل الورديات',
        icon: History,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'عرض سجل الورديات', desc: 'تجد جدولاً بجميع الورديات السابقة مع تفاصيلها' },
            { title: 'تفاصيل الوردية', desc: 'اضغط أيقونة العين لرؤية تقرير وردية كامل' },
        ]
    },
];
const shiftHelpTips = [
    'لا يمكن إجراء عمليات بيع بدون فتح وردية أولاً',
    'تأكد من عد النقد بدقة قبل إغلاق الوردية',
    'الفرق بين المتوقع والفعلي في التقرير يشير إلى عجز أو زيادة',
];

const startingCash = ref(0);
const actualCash = ref(0);
const lastClosedShift = ref(null);
const showCloseConfirm = ref(false);
const searchQuery = ref("");

const shiftDuration = computed(() => {
    if (!shiftStore.currentShift?.openedAt) return "";
    const start = new Date(shiftStore.currentShift.openedAt);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours} ساعة ${minutes} دقيقة`;
});

const filteredShifts = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return shiftStore.shifts;
    return shiftStore.shifts.filter((s) =>
        (s.cashier && s.cashier.toLowerCase().includes(q)) ||
        (s.status && s.status.toLowerCase().includes(q))
    );
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
    const diff = Math.floor((end - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours} ساعة ${minutes} دقيقة`;
};

const handleOpenShift = async () => {
    if (startingCash.value < 0) return;
    try {
        await shiftStore.openShift(startingCash.value);
        startingCash.value = 0;
    } catch (err) {
        console.error("Failed to open shift", err);
    }
};

const handleCloseShift = async () => {
    try {
        const closed = await shiftStore.closeShift(actualCash.value);
        if (closed) {
            lastClosedShift.value = closed;
            showCloseConfirm.value = false;
            actualCash.value = 0;
        }
    } catch (err) {
        console.error("Failed to close shift", err);
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

onMounted(() => {
    shiftStore.fetchAllShifts();
});
</script>

<template>
    <div class="shift-page">
        <!-- Header -->
        <div class="shift-header">
            <div class="shift-header-title">
                <Clock :size="28" class="text-primary-500" />
                <h1 class="shift-title">إدارة الورديات</h1>
            </div>
            <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                <HelpCircle :size="18" />
            </button>
        </div>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة الورديات"
            page-subtitle="فتح وإغلاق الوردية وتتبع المبيعات"
            :page-icon="Clock"
            header-gradient="linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)"
            :sections="shiftHelpSections"
            :tips="shiftHelpTips"
        />

        <div class="shift-grid">
            <!-- Sidebar: Active Shift & summary -->
            <div class="shift-sidebar">
                <!-- ═══ Shift OPEN form ═══ -->
                <div v-if="!shiftStore.currentShift" class="shift-card open-card">
                    <div class="shift-card-header shift-card-open">
                        <DoorOpen :size="20" />
                        <span>فتح وردية جديدة</span>
                    </div>
                    <div class="shift-card-body">
                        <div class="shift-field">
                            <label>المبلغ الافتتاحي (النقد في الدرج)</label>
                            <InputNumber
                                v-model="startingCash"
                                :min="0"
                                :minFractionDigits="2"
                                :maxFractionDigits="2"
                                fluid
                                placeholder="0.00"
                                class="modern-input"
                            />
                        </div>
                        <Button
                            label="فتح الوردية"
                            class="w-full mt-5 open-shift-btn"
                            @click="handleOpenShift"
                            :loading="shiftStore.loading"
                        />
                    </div>
                </div>

                <!-- ═══ Shift ACTIVE info ═══ -->
                <div v-if="shiftStore.currentShift" class="shift-card active-card">
                    <div class="shift-card-header shift-card-active">
                        <div class="active-badge">
                            <span class="pulse-dot"></span>
                            <span>وردية مفتوحة</span>
                        </div>
                    </div>
                    <div class="shift-card-body">
                        <div class="shift-info-grid">
                            <div class="shift-info-item">
                                <span class="shift-info-label">الكاشير</span>
                                <span class="shift-info-value font-bold">{{ shiftStore.currentShift?.cashier }}</span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">وقت الفتح</span>
                                <span class="shift-info-value">
                                    {{ new Date(shiftStore.currentShift?.openedAt).toLocaleString("ar-EG") }}
                                </span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">المدة</span>
                                <span class="shift-info-value font-semibold text-primary-500">{{ shiftDuration }}</span>
                            </div>
                            <div class="shift-info-item total-start-cash">
                                <span class="shift-info-label">المبلغ الافتتاحي</span>
                                <span class="shift-info-value font-black text-primary-600 dark:text-primary-400">
                                    {{ formatCurrency(shiftStore.currentShift?.startingCash) }}
                                </span>
                            </div>
                        </div>

                        <div class="shift-close-section">
                            <div class="shift-field">
                                <label>النقد الفعلي في الدرج</label>
                                <InputNumber
                                    v-model="actualCash"
                                    :min="0"
                                    :minFractionDigits="2"
                                    :maxFractionDigits="2"
                                    fluid
                                    placeholder="0.00"
                                    class="modern-input"
                                />
                            </div>
                            <Button
                                label="إغلاق الوردية"
                                severity="danger"
                                class="w-full mt-5 close-shift-btn"
                                @click="handleCloseShift"
                                :loading="shiftStore.loading"
                            />
                        </div>
                    </div>
                </div>

                <!-- ═══ Last closed shift summary ═══ -->
                <div v-if="lastClosedShift" class="shift-card summary-card">
                    <div class="shift-card-header shift-card-summary">
                        <Banknote :size="20" />
                        <span>ملخص آخر وردية مغلقة</span>
                    </div>
                    <div class="shift-card-body">
                        <div class="shift-info-grid">
                            <div class="shift-info-item">
                                <span class="shift-info-label">إجمالي المبيعات</span>
                                <span class="shift-info-value font-bold text-surface-900 dark:text-surface-150">{{ formatCurrency(lastClosedShift.totalSales) }}</span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">النقد المتوقع</span>
                                <span class="shift-info-value font-medium">{{ formatCurrency(lastClosedShift.expectedCash) }}</span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">النقد الفعلي</span>
                                <span class="shift-info-value font-bold text-surface-900 dark:text-surface-50">{{ formatCurrency(lastClosedShift.actualCash) }}</span>
                            </div>
                            <div class="shift-info-item variance-item">
                                <span class="shift-info-label">الفرق</span>
                                <div
                                    class="shift-info-value font-bold flex items-center gap-1"
                                    :class="{
                                        'text-green-600 dark:text-green-400': lastClosedShift.variance >= 0,
                                        'text-red-600 dark:text-red-400': lastClosedShift.variance < 0,
                                    }"
                                >
                                    <span>{{ formatCurrency(lastClosedShift.variance) }}</span>
                                    <AlertTriangle v-if="Math.abs(lastClosedShift.variance) > 1" :size="15" class="align-middle" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Panel: Shift History Table -->
            <div class="shift-main">
                <!-- Metrics Stats Row -->
                <div class="shift-stats-cards" v-if="shiftStore.shifts.length > 0">
                    <div class="stat-card">
                        <div class="stat-card-icon bg-Purple-50 dark:bg-Purple-950/30 text-Purple-600 dark:text-Purple-400">
                            <Clock :size="20" />
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-card-label">إجمالي الورديات</span>
                            <span class="stat-card-value">{{ shiftStore.shifts.length }}</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                            <Banknote :size="20" />
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-card-label">إجمالي المبيعات النقدية</span>
                            <span class="stat-card-value text-green-600 dark:text-green-400">
                                {{ formatCurrency(shiftStore.shifts.reduce((sum, s) => sum + (s.totalSales || 0), 0)) }}
                            </span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                            <AlertTriangle :size="20" />
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-card-label">صافي الفروقات</span>
                            <span
                                class="stat-card-value font-bold"
                                :class="{
                                    'text-green-600 dark:text-green-400': shiftStore.shifts.reduce((sum, s) => sum + (s.variance || 0), 0) >= 0,
                                    'text-red-600 dark:text-red-400': shiftStore.shifts.reduce((sum, s) => sum + (s.variance || 0), 0) < 0,
                                }"
                            >
                                {{ formatCurrency(shiftStore.shifts.reduce((sum, s) => sum + (s.variance || 0), 0)) }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Shift History Table Card -->
                <div class="shift-card shift-history-card">
                    <div class="shift-history-header">
                        <div class="flex items-center gap-2">
                            <History :size="20" class="text-surface-500 dark:text-surface-400" />
                            <span class="font-bold text-lg text-surface-800 dark:text-surface-100">سجل الورديات السابقة</span>
                        </div>
                        
                        <!-- Search Box with proper RTL styling -->
                        <div class="search-input-wrap">
                            <Search :size="16" class="search-icon" />
                            <InputText
                                v-model="searchQuery"
                                placeholder="ابحث باسم الكاشير..."
                                class="pr-10 pl-4 w-full search-input"
                                autocomplete="off"
                                size="small"
                            />
                        </div>
                    </div>
                    
                    <div class="shift-card-body p-0">
                        <DataTable
                            :value="filteredShifts"
                            :loading="shiftStore.loading"
                            paginator
                            :rows="10"
                            :rowsPerPageOptions="[5, 10, 20, 50]"
                            emptyMessage="لا توجد ورديات سابقة"
                            stripedRows
                            removableSort
                            scrollable
                            class="shifts-table"
                        >
                            <Column field="cashier" header="الكاشير" sortable style="min-width: 130px" />
                            <Column field="openedAt" header="بداية الوردية" sortable style="min-width: 170px">
                                <template #body="{ data }">
                                    <span class="text-sm font-medium">{{ formatDate(data.openedAt) }}</span>
                                </template>
                            </Column>
                            <Column field="closedAt" header="نهاية الوردية" sortable style="min-width: 170px">
                                <template #body="{ data }">
                                    <span class="text-sm text-surface-600 dark:text-surface-400">{{ formatDate(data.closedAt) }}</span>
                                </template>
                            </Column>
                            <Column field="totalSales" header="المبيعات النقدية" sortable style="min-width: 130px">
                                <template #body="{ data }">
                                    <span class="font-bold text-surface-800 dark:text-surface-100">{{ formatCurrency(data.totalSales) }}</span>
                                </template>
                            </Column>
                            <Column field="variance" header="الفرق" sortable style="min-width: 120px">
                                <template #body="{ data }">
                                    <span
                                        class="font-bold text-sm"
                                        :class="{
                                            'text-green-600 dark:text-green-400': data.variance >= 0,
                                            'text-red-600 dark:text-red-400': data.variance < 0,
                                        }"
                                    >
                                        {{ formatCurrency(data.variance) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="status" header="الحالة" sortable style="min-width: 110px">
                                <template #body="{ data }">
                                    <Tag
                                        :value="data.status === 'Open' ? 'مفتوحة' : 'مغلقة'"
                                        :severity="data.status === 'Open' ? 'success' : 'secondary'"
                                    />
                                </template>
                            </Column>
                            <Column header="عرض" style="min-width: 80px; text-align: center">
                                <template #body="{ data }">
                                    <button
                                        class="shift-view-btn"
                                        @click="viewShiftDetails(data)"
                                        title="عرض التفاصيل"
                                    >
                                        <Eye :size="16" />
                                    </button>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
            </div>
        </div>

        <!-- Shift Detail Dialog -->
        <Dialog
            v-model:visible="showDetailDialog"
            header="تفاصيل الوردية"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div class="shift-detail-content" v-if="selectedShift">
                <!-- Header Stats -->
                <div class="shift-detail-header-card">
                    <div class="detail-row">
                        <span class="detail-label">الكاشير:</span>
                        <span class="detail-value font-bold text-lg text-primary-600 dark:text-primary-400">{{ selectedShift.cashier }}</span>
                    </div>
                    <div class="detail-row mt-2">
                        <span class="detail-label">حالة الوردية:</span>
                        <Tag
                            :value="selectedShift.status === 'Open' ? 'مفتوحة' : 'مغلقة'"
                            :severity="selectedShift.status === 'Open' ? 'success' : 'secondary'"
                        />
                    </div>
                </div>

                <!-- Timing Section -->
                <div class="shift-detail-section">
                    <h3 class="section-title">التوقيت والمدة</h3>
                    <div class="details-list">
                        <div class="detail-item">
                            <span class="item-label">بداية الوردية:</span>
                            <span class="item-value font-medium">{{ formatDate(selectedShift.openedAt) }}</span>
                        </div>
                        <div class="detail-item animate-row">
                            <span class="item-label">نهاية الوردية:</span>
                            <span class="item-value font-medium">{{ formatDate(selectedShift.closedAt) }}</span>
                        </div>
                        <div class="detail-item border-t border-dashed border-surface-200 dark:border-surface-700 pt-2 mt-1">
                            <span class="item-label font-bold text-surface-700 dark:text-surface-300">المدة الإجمالية:</span>
                            <span class="item-value font-bold text-primary-500">
                                {{ getShiftDuration(selectedShift) }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Financial Section -->
                <div class="shift-detail-section">
                    <h3 class="section-title">التقرير المالي</h3>
                    <div class="details-list">
                        <div class="detail-item">
                            <span class="item-label">المبلغ الافتتاحي:</span>
                            <span class="item-value font-semibold">{{ formatCurrency(selectedShift.startingCash) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="item-label">مبيعات النقد:</span>
                            <span class="item-value font-bold text-green-600 dark:text-green-400">+{{ formatCurrency(selectedShift.totalSales) }}</span>
                        </div>
                        <div class="detail-item border-t border-dashed border-surface-200 dark:border-surface-700 pt-2 mt-2">
                            <span class="item-label font-bold text-surface-700 dark:text-surface-300">المبلغ المتوقع في الدرج:</span>
                            <span class="item-value font-bold text-surface-900 dark:text-surface-100">{{ formatCurrency(selectedShift.expectedCash) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="item-label font-bold text-surface-700 dark:text-surface-300">النقد الفعلي المُستلم:</span>
                            <span class="item-value font-bold text-surface-900 dark:text-surface-100">{{ formatCurrency(selectedShift.actualCash) }}</span>
                        </div>
                        <div class="detail-item border-t border-surface-200 dark:border-surface-700 pt-2 mt-2">
                            <span class="item-label font-bold">الفرق (عجز / زيادة):</span>
                            <span
                                class="item-value font-black text-lg"
                                :class="{
                                    'text-green-600 dark:text-green-400': selectedShift.variance >= 0,
                                    'text-red-600 dark:text-red-400': selectedShift.variance < 0,
                                }"
                            >
                                {{ formatCurrency(selectedShift.variance) }}
                                <AlertTriangle v-if="Math.abs(selectedShift.variance) > 1" :size="16" class="inline ms-1 align-text-bottom" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="إغلاق" outlined severity="secondary" @click="showDetailDialog = false" class="w-full" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.shift-page {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .shift-page {
        padding: 1rem;
        gap: 1.5rem;
    }
}

.shift-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border-bottom: 1px solid var(--p-surface-200);
    padding-bottom: 1rem;
}

.dark .shift-header {
    border-color: var(--p-surface-800);
}

.shift-header-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.shift-title {
    font-size: 1.75rem;
    font-weight: 900;
    color: var(--p-surface-900);
    margin: 0;
    letter-spacing: -0.02em;
}

.dark .shift-title {
    color: var(--p-surface-0);
}

/* ═══ Layout Grid ═══ */
.shift-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    width: 100%;
}

@media (min-width: 1024px) {
    .shift-grid {
        grid-template-columns: 380px 1fr;
        align-items: start;
    }
}

.shift-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

.shift-main {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
}

/* ═══ Stats Cards ═══ */
.shift-stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem;
    border-radius: 1.25rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 10px 25px -15px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 35px -15px rgba(0, 0, 0, 0.08);
    border-color: var(--p-primary-300);
}

.dark .stat-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: 0 10px 30px -20px rgba(0, 0, 0, 0.3);
}

.dark .stat-card:hover {
    border-color: var(--p-primary-800);
}

.stat-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 1rem;
    flex-shrink: 0;
    box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.02);
}

.stat-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.stat-card-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.stat-card-value {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--p-surface-900);
    letter-spacing: -0.01em;
}

.dark .stat-card-value {
    color: var(--p-surface-50);
}

/* ═══ Card ═══ */
.shift-card {
    border-radius: 1.25rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 10px 30px -15px rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.25s ease;
}

.dark .shift-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: 0 10px 30px -20px rgba(0, 0, 0, 0.3);
}

.shift-card-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 1.125rem 1.5rem;
    font-weight: 800;
    font-size: 1.05rem;
    border-bottom: 1px solid var(--p-surface-200);
}

.dark .shift-card-header {
    border-color: var(--p-surface-800);
}

.shift-card-open {
    background: linear-gradient(135deg, var(--p-primary-50), rgba(255, 255, 255, 0));
    color: var(--p-primary-700);
}

.dark .shift-card-open {
    background: linear-gradient(135deg, color-mix(in srgb, var(--p-primary-500), transparent 90%), transparent);
    color: var(--p-primary-300);
}

.shift-card-active {
    background: linear-gradient(135deg, #f0fdf4, rgba(255, 255, 255, 0));
    color: #166534;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.dark .shift-card-active {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), transparent);
    color: #4ade80;
}

.shift-card-summary {
    background: linear-gradient(135deg, #fffbeb, rgba(255, 255, 255, 0));
    color: #92400e;
}

.dark .shift-card-summary {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), transparent);
    color: #fbbf24;
}

.shift-card-body {
    padding: 1.5rem;
}

/* Pulse Dot Animation */
.active-badge {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: #dcfce7;
    color: #15803d;
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 800;
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.15);
}

.dark .active-badge {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    box-shadow: none;
}

.pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: #22c55e;
    display: inline-block;
    animation: active-pulse 1.8s infinite ease-in-out;
}

@keyframes active-pulse {
    0%, 100% {
        transform: scale(0.85);
        opacity: 0.6;
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
    }
    50% {
        transform: scale(1.2);
        opacity: 1;
        box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
    }
}

/* ──═ Shift History Header ═── */
.shift-history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1.25rem;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .shift-history-header {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

/* Search Box Container */
.search-input-wrap {
    position: relative;
    width: 100%;
    max-width: 18rem;
}

.search-icon {
    position: absolute;
    right: 0.875rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--p-surface-450);
    pointer-events: none;
    z-index: 1;
}

.search-input {
    padding-right: 2.75rem !important;
    border-radius: 0.75rem !important;
}

/* ═══ Fields ═══ */
.shift-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.shift-field label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--p-surface-600);
}

.dark .shift-field label {
    color: var(--p-surface-300);
}

.modern-input :deep(.p-inputtext) {
    border-radius: 0.75rem !important;
    padding: 0.625rem 0.875rem;
}

.open-shift-btn {
    border-radius: 0.75rem !important;
    padding: 0.625rem 1.25rem !important;
    font-weight: 800 !important;
}

.close-shift-btn {
    border-radius: 0.75rem !important;
    padding: 0.625rem 1.25rem !important;
    font-weight: 800 !important;
}

.shift-close-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px dashed var(--p-surface-200);
}

.dark .shift-close-section {
    border-color: var(--p-surface-800);
}

/* ═══ Info Grid ═══ */
.shift-info-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.shift-info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.925rem;
    padding-bottom: 0.625rem;
    border-bottom: 1px solid var(--p-surface-100);
}

.dark .shift-info-item {
    border-color: var(--p-surface-850);
}

.shift-info-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.total-start-cash {
    background: var(--p-surface-50);
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--p-surface-150);
    margin-top: 0.25rem;
}

.dark .total-start-cash {
    background: var(--p-surface-950);
    border-color: var(--p-surface-850);
}

.variance-item {
    background: var(--p-surface-50);
    padding: 0.625rem 0.875rem;
    border-radius: 0.75rem;
}

.dark .variance-item {
    background: var(--p-surface-950);
}

.shift-info-label {
    font-size: 0.825rem;
    font-weight: 700;
    color: var(--p-surface-500);
}

.shift-info-value {
    color: var(--p-surface-800);
}

.dark .shift-info-value {
    color: var(--p-surface-200);
}

/* ═══ View Action Button ═══ */
.shift-view-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.625rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    color: var(--p-surface-600);
    cursor: pointer;
    transition: all 0.2s ease;
}

.dark .shift-view-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-300);
}

.shift-view-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
    transform: scale(1.05);
}

.dark .shift-view-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
}

/* ═══ Detail Dialog ═══ */
.shift-detail-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-top: 0.5rem;
}

.shift-detail-header-card {
    padding: 1.25rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, var(--p-surface-50), var(--p-surface-100));
    border: 1px solid var(--p-surface-200);
}

.dark .shift-detail-header-card {
    background: linear-gradient(135deg, var(--p-surface-950), var(--p-surface-900));
    border-color: var(--p-surface-800);
}

.detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.detail-label {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--p-surface-500);
}

.shift-detail-section {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}

.section-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--p-surface-700);
    margin: 0;
    padding-bottom: 0.35rem;
    border-bottom: 2.5px solid var(--p-primary-500);
    width: fit-content;
}

.dark .section-title {
    color: var(--p-surface-300);
}

.details-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.125rem 1.25rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-150);
}

.dark .details-list {
    background: var(--p-surface-950);
    border-color: var(--p-surface-850);
}

.detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
}

.item-label {
    color: var(--p-surface-500);
    font-weight: 600;
}

.item-value {
    color: var(--p-surface-800);
}

.dark .item-value {
    color: var(--p-surface-150);
}
</style>
