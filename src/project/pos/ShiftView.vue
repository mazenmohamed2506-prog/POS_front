<script setup>
import { ref, computed } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { Clock, DoorOpen, DoorClosed, Banknote, AlertTriangle, CheckCircle } from "lucide-vue-next";

const posStore = usePosStore();

const startingCash = ref(0);
const actualCash = ref(0);
const lastClosedShift = ref(null);
const showCloseConfirm = ref(false);

const shiftDuration = computed(() => {
    if (!posStore.currentShift?.openedAt) return "";
    const start = new Date(posStore.currentShift.openedAt);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours} ساعة ${minutes} دقيقة`;
});

const handleOpenShift = async () => {
    if (startingCash.value < 0) return;
    try {
        await posStore.openShift(startingCash.value);
        startingCash.value = 0;
    } catch (err) {
        console.error("Failed to open shift", err);
    }
};

const handleCloseShift = async () => {
    try {
        const closed = await posStore.closeShift(actualCash.value);
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
</script>

<template>
    <div class="shift-page">
        <div class="shift-content">
            <div class="shift-header">
                <Clock :size="28" class="text-primary-500" />
                <h1 class="shift-title">إدارة الورديات</h1>
            </div>

            <!-- ═══ Shift OPEN form ═══ -->
            <div v-if="!posStore.isShiftOpen" class="shift-card">
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
                        :loading="posStore.loading"
                    />
                </div>
            </div>

            <!-- ═══ Shift ACTIVE info ═══ -->
            <div v-if="posStore.isShiftOpen" class="shift-card">
                <div class="shift-card-header shift-card-active">
                    <CheckCircle :size="22" />
                    <span>وردية مفتوحة</span>
                </div>
                <div class="shift-card-body">
                    <div class="shift-info-grid">
                        <div class="shift-info-item">
                            <span class="shift-info-label">الكاشير</span>
                            <span class="shift-info-value">{{ posStore.currentShift?.cashier }}</span>
                        </div>
                        <div class="shift-info-item">
                            <span class="shift-info-label">وقت الفتح</span>
                            <span class="shift-info-value">
                                {{ new Date(posStore.currentShift?.openedAt).toLocaleString("ar-EG") }}
                            </span>
                        </div>
                        <div class="shift-info-item">
                            <span class="shift-info-label">المدة</span>
                            <span class="shift-info-value">{{ shiftDuration }}</span>
                        </div>
                        <div class="shift-info-item">
                            <span class="shift-info-label">المبلغ الافتتاحي</span>
                            <span class="shift-info-value font-bold">
                                {{ formatCurrency(posStore.currentShift?.startingCash) }}
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
                            :loading="posStore.loading"
                        />
                    </div>
                </div>
            </div>

            <!-- ═══ Last closed shift summary ═══ -->
            <div v-if="lastClosedShift" class="shift-card">
                <div class="shift-card-header shift-card-summary">
                    <Banknote :size="22" />
                    <span>ملخص آخر وردية</span>
                </div>
                <div class="shift-card-body">
                    <div class="shift-info-grid">
                        <div class="shift-info-item">
                            <span class="shift-info-label">عدد المبيعات</span>
                            <span class="shift-info-value font-bold">{{ lastClosedShift.salesCount }}</span>
                        </div>
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
                            <span class="shift-info-value">{{ formatCurrency(lastClosedShift.actualCash) }}</span>
                        </div>
                        <div class="shift-info-item col-span-2">
                            <span class="shift-info-label">الفرق</span>
                            <span
                                class="shift-info-value font-bold text-lg"
                                :class="{
                                    'text-green-600': lastClosedShift.variance >= 0,
                                    'text-red-600': lastClosedShift.variance < 0,
                                }"
                            >
                                {{ formatCurrency(lastClosedShift.variance) }}
                                <AlertTriangle v-if="Math.abs(lastClosedShift.variance) > 1" :size="16" class="inline" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.shift-page {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
}

.shift-content {
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.shift-header {
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

/* Card */
.shift-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
}

.dark .shift-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
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
    border-color: var(--p-surface-700);
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

/* Fields */
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
    border-color: var(--p-surface-600);
}

/* Info grid */
.shift-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.shift-info-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.shift-info-item.col-span-2 {
    grid-column: span 2;
}

.shift-info-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-surface-400);
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.shift-info-value {
    font-size: 0.9375rem;
    color: var(--p-surface-800);
}

.dark .shift-info-value {
    color: var(--p-surface-100);
}
</style>
