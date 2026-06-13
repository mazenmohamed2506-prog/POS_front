<script setup>
import { ref, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { Settings, Save, RefreshCw, AlertTriangle } from "lucide-vue-next";

const posStore = usePosStore();

const form = ref({ ...posStore.settings });
const saved = ref(false);
const resetSuccess = ref(false);

onMounted(() => {
    posStore.fetchSettings();
    form.value = { ...posStore.settings };
});

const handleSave = async () => {
    await posStore.updateSettings(form.value);
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
};

const handleReset = () => {
    if (confirm("هل أنت متأكد من إعادة تعيين جميع البيانات إلى حالتها الأصلية؟ (سيتم مسح المبيعات والمخزون الحالي)")) {
        posStore.resetDemo();
        form.value = { ...posStore.settings };
        resetSuccess.value = true;
        setTimeout(() => (resetSuccess.value = false), 2000);
    }
};
</script>

<template>
    <div class="settings-page">
        <!-- Header -->
        <div class="settings-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <Settings :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="settings-title">الإعدادات العامة</h1>
                    <p class="settings-subtitle">تهيئة بيانات المتجر، نسب الضرائب وتفاصيل الفاتورة</p>
                </div>
            </div>
        </div>

        <div class="settings-content-wrap">
            <!-- Settings Card -->
            <div class="settings-card">
                <div class="settings-form-grid">
                    <div class="form-field">
                        <label class="required">اسم المتجر</label>
                        <InputText v-model="form.storeName" fluid placeholder="مثال: متجر الأغذية المميز" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-field">
                            <label class="required">نسبة الضريبة (%)</label>
                            <InputNumber v-model="form.taxRate" :min="0" :max="100" suffix="%" fluid placeholder="0%" />
                        </div>
                        <div class="form-field">
                            <label class="required">عملة المتجر</label>
                            <InputText v-model="form.currency" fluid placeholder="EGP" />
                        </div>
                    </div>

                    <div class="form-field">
                        <label>ترويسة الإيصال (رأس الفاتورة)</label>
                        <Textarea v-model="form.receiptHeader" rows="3" fluid placeholder="نص يظهر في الجزء العلوي من الفاتورة المطبوعة..." />
                    </div>

                    <div class="form-field">
                        <label>تذييل الإيصال (أسفل الفاتورة)</label>
                        <Textarea v-model="form.receiptFooter" rows="3" fluid placeholder="نص يظهر في نهاية الفاتورة المطبوعة..." />
                    </div>

                    <div class="flex items-center gap-3 pt-3 border-t border-surface-200 dark:border-surface-800">
                        <Button label="حفظ الإعدادات" @click="handleSave" :loading="posStore.loading">
                            <template #icon><Save :size="18" class="me-1" /></template>
                        </Button>
                        <Transition name="fade">
                            <span v-if="saved" class="text-green-600 dark:text-green-400 text-sm font-bold flex items-center gap-1">
                                ✓ تم حفظ الإعدادات بنجاح
                            </span>
                        </Transition>
                    </div>

                    <!-- Reset Demo Section -->
                    <div class="reset-section">
                        <div class="flex items-start gap-3">
                            <div class="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg">
                                <AlertTriangle :size="20" />
                            </div>
                            <div>
                                <h3 class="reset-section-title">إجراءات النظام والعرض التوضيحي</h3>
                                <p class="reset-section-desc">إعادة تعيين كافة المعاملات والمخازن إلى الحالة التوضيحية الافتراضية. هذا الإجراء سوف يمسح كافة فواتير البيع والشراء الحالية!</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <Button label="إعادة تعيين بيانات العرض" severity="danger" outlined @click="handleReset">
                                <template #icon><RefreshCw :size="15" class="me-1" /></template>
                            </Button>
                            <Transition name="fade">
                                <span v-if="resetSuccess" class="text-green-600 dark:text-green-400 text-sm font-bold">
                                    ✓ تم إعادة تعيين البيانات بنجاح
                                </span>
                            </Transition>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

/* Header */
.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
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

.settings-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .settings-title {
    color: var(--p-surface-0);
}

.settings-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

.settings-content-wrap {
    max-width: 680px;
    width: 100%;
}

/* Settings Card */
.settings-card {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 1rem;
    padding: 1.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .settings-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.settings-form-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* Fields */
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

/* Reset Section */
.reset-section {
    border-top: 1px solid var(--p-surface-200);
    padding-top: 1.5rem;
    margin-top: 0.5rem;
}

.dark .reset-section {
    border-color: var(--p-surface-800);
}

.reset-section-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: #ef4444;
    margin: 0 0 0.25rem 0;
}

.reset-section-desc {
    font-size: 0.8125rem;
    color: var(--p-surface-500);
    margin: 0;
    line-height: 1.4;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
