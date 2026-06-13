<script setup>
import { ref, computed, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { useShiftStore } from "@/stores/pos/shiftStore";
import { Clock, DoorOpen, Banknote, AlertTriangle, CheckCircle, History, Eye, Search } from "lucide-vue-next";

const posStore = usePosStore();
const shiftStore = useShiftStore();

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
        <div class="shift-header">
            <div class="shift-header-title">
                <Clock :size="28" class="text-primary-500" />
                <h1 class="shift-title">إدارة الورديات</h1>
            </div>
        </div>

        <div class="shift-grid">
            <!-- Sidebar: Active Shift & summary -->
            <div class="shift-sidebar">
                <!-- ═══ Shift OPEN form ═══ -->
                <div v-if="!shiftStore.currentShift" class="shift-card">
                    <div class="shift-card-header shift-card-open">
                        <DoorOpen :size="22" />
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
                            />
                        </div>
                        <Button
                            label="فتح الوردية"
                            class="w-full mt-4"
                            @click="handleOpenShift"
                            :loading="shiftStore.loading"
                        />
                    </div>
                </div>

                <!-- ═══ Shift ACTIVE info ═══ -->
                <div v-if="shiftStore.currentShift" class="shift-card">
                    <div class="shift-card-header shift-card-active">
                        <CheckCircle :size="22" />
                        <span>وردية مفتوحة</span>
                    </div>
                    <div class="shift-card-body">
                        <div class="shift-info-grid">
                            <div class="shift-info-item">
                                <span class="shift-info-label">الكاشير</span>
                                <span class="shift-info-value font-semibold">{{ shiftStore.currentShift?.cashier }}</span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">وقت الفتح</span>
                                <span class="shift-info-value">
                                    {{ new Date(shiftStore.currentShift?.openedAt).toLocaleString("ar-EG") }}
                                </span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">المدة</span>
                                <span class="shift-info-value font-medium">{{ shiftDuration }}</span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">المبلغ الافتتاحي</span>
                                <span class="shift-info-value font-bold text-primary-600 dark:text-primary-400">
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
                                />
                            </div>
                            <Button
                                label="إغلاق الوردية"
                                severity="danger"
                                class="w-full mt-4"
                                @click="handleCloseShift"
                                :loading="shiftStore.loading"
                            />
                        </div>
                    </div>
                </div>

                <!-- ═══ Last closed shift summary ═══ -->
                <div v-if="lastClosedShift" class="shift-card">
                    <div class="shift-card-header shift-card-summary">
                        <Banknote :size="22" />
                        <span>ملخص آخر وردية مغلقة</span>
                    </div>
                    <div class="shift-card-body">
                        <div class="shift-info-grid">
                            <div class="shift-info-item">
                                <span class="shift-info-label">إجمالي المبيعات</span>
                                <span class="shift-info-value font-bold">{{ formatCurrency(lastClosedShift.totalSales) }}</span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">النقد المتوقع</span>
                                <span class="shift-info-value">{{ formatCurrency(lastClosedShift.expectedCash) }}</span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">النقد الفعلي</span>
                                <span class="shift-info-value font-bold text-surface-900 dark:text-surface-50">{{ formatCurrency(lastClosedShift.actualCash) }}</span>
                            </div>
                            <div class="shift-info-item">
                                <span class="shift-info-label">الفرق</span>
                                <span
                                    class="shift-info-value font-bold"
                                    :class="{
                                        'text-green-600 dark:text-green-400': lastClosedShift.variance >= 0,
                                        'text-red-600 dark:text-red-400': lastClosedShift.variance < 0,
                                    }"
                                >
                                    {{ formatCurrency(lastClosedShift.variance) }}
                                    <AlertTriangle v-if="Math.abs(lastClosedShift.variance) > 1" :size="16" class="inline ms-1 align-text-bottom" />
                                </span>
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
                        <div class="stat-card-icon bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
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
                            <History :size="22" class="text-surface-500 dark:text-surface-400" />
                            <span class="font-bold text-lg text-surface-800 dark:text-surface-100">سجل الورديات السابقة</span>
                        </div>
                        
                        <!-- Search Box -->
                        <div class="relative w-full max-w-xs">
                            <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                            <InputText
                                v-model="searchQuery"
                                placeholder="ابحث باسم الكاشير..."
                                class="ps-9 w-full"
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
                            <Column field="status" header="الحالة" sortable style="width: 110px">
                                <template #body="{ data }">
                                    <Tag
                                        :value="data.status === 'Open' ? 'مفتوحة' : 'مغلقة'"
                                        :severity="data.status === 'Open' ? 'success' : 'secondary'"
                                    />
                                </template>
                            </Column>
                            <Column header="عرض" style="width: 80px; text-align: center">
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
                            <span class="item-value">{{ formatDate(selectedShift.openedAt) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="item-label">نهاية الوردية:</span>
                            <span class="item-value">{{ formatDate(selectedShift.closedAt) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="item-label">المدة الإجمالية:</span>
                            <span class="item-value font-semibold text-surface-900 dark:text-surface-100">
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
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

.shift-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.shift-header-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.shift-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .shift-title {
    color: var(--p-surface-0);
}

/* ═══ Layout Grid ═══ */
.shift-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    width: 100%;
}

@media (min-width: 1024px) {
    .shift-grid {
        grid-template-columns: 360px 1fr;
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
}

/* ═══ Stats Cards ═══ */
.shift-stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark .stat-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.stat-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
}

.stat-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat-card-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.stat-card-value {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--p-surface-800);
}

.dark .stat-card-value {
    color: var(--p-surface-100);
}

/* ═══ Card ═══ */
.shift-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.dark .shift-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.shift-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.25rem;
    font-weight: 700;
    font-size: 1rem;
    border-bottom: 1px solid var(--p-surface-200);
}

.dark .shift-card-header {
    border-color: var(--p-surface-800);
}

.shift-card-open {
    background: var(--p-primary-50);
    color: var(--p-primary-700);
}

.dark .shift-card-open {
    background: color-mix(in srgb, var(--p-primary-500), transparent 88%);
    color: var(--p-primary-300);
}

.shift-card-active {
    background: #dcfce7;
    color: #15803d;
}

.dark .shift-card-active {
    background: rgba(34, 197, 94, 0.12);
    color: #4ade80;
}

.shift-card-summary {
    background: #fef3c7;
    color: #92400e;
}

.dark .shift-card-summary {
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
}

.shift-card-body {
    padding: 1.25rem;
}

/* ═══ Shift History Header ═══ */
.shift-history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .shift-history-header {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

/* ═══ Fields ═══ */
.shift-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.shift-field label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--p-surface-700);
}

.dark .shift-field label {
    color: var(--p-surface-200);
}

.shift-close-section {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px dashed var(--p-surface-300);
}

.dark .shift-close-section {
    border-color: var(--p-surface-700);
}

/* ═══ Info grid ═══ */
.shift-info-grid {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}

.shift-info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--p-surface-100);
}

.dark .shift-info-item {
    border-color: var(--p-surface-800);
}

.shift-info-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.shift-info-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.shift-info-value {
    color: var(--p-surface-800);
}

.dark .shift-info-value {
    color: var(--p-surface-100);
}

/* ═══ View Action Button ═══ */
.shift-view-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    color: var(--p-surface-500);
    cursor: pointer;
    transition: all 0.15s;
}

.dark .shift-view-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}

.shift-view-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
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
    gap: 1.25rem;
}

.shift-detail-header-card {
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .shift-detail-header-card {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.detail-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--p-surface-500);
}

.shift-detail-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.section-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--p-surface-600);
    margin: 0;
    padding-bottom: 0.25rem;
    border-bottom: 2px solid var(--p-primary-500);
    width: fit-content;
}

.dark .section-title {
    color: var(--p-surface-400);
}

.details-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .details-list {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

.detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
}

.item-label {
    color: var(--p-surface-500);
}

.item-value {
    color: var(--p-surface-800);
}

.dark .item-value {
    color: var(--p-surface-100);
}
</style>
