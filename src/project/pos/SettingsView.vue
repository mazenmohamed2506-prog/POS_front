<script setup>
import { ref, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { Settings, Save, RefreshCw } from "lucide-vue-next";

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
    <div class="p-4">
        <div class="max-w-xl mx-auto">
            <!-- Header -->
            <div class="flex items-center gap-2 mb-6">
                <Settings :size="24" class="text-primary-500" />
                <h1 class="text-xl font-bold text-surface-800 dark:text-surface-100">الإعدادات</h1>
            </div>

            <!-- Settings Form -->
            <div class="settings-card">
                <div class="flex flex-col gap-5">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold text-surface-700 dark:text-surface-200">اسم المتجر</label>
                        <InputText v-model="form.storeName" fluid placeholder="اسم المتجر" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1">
                            <label class="text-sm font-semibold text-surface-700 dark:text-surface-200">نسبة الضريبة (%)</label>
                            <InputNumber v-model="form.taxRate" :min="0" :max="100" suffix="%" fluid />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-sm font-semibold text-surface-700 dark:text-surface-200">العملة</label>
                            <InputText v-model="form.currency" fluid placeholder="EGP" />
                        </div>
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold text-surface-700 dark:text-surface-200">ترويسة الإيصال</label>
                        <Textarea v-model="form.receiptHeader" rows="2" fluid placeholder="نص يظهر أعلى الإيصال" />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold text-surface-700 dark:text-surface-200">تذييل الإيصال</label>
                        <Textarea v-model="form.receiptFooter" rows="2" fluid placeholder="نص يظهر أسفل الإيصال" />
                    </div>

                    <div class="flex items-center gap-3 pt-2">
                        <Button label="حفظ الإعدادات" @click="handleSave" :loading="posStore.loading">
                            <template #icon><Save :size="18" /></template>
                        </Button>
                        <span v-if="saved" class="text-green-600 text-sm font-semibold">✓ تم الحفظ</span>
                    </div>

                    <!-- Reset Demo Section -->
                    <div class="border-t border-surface-200 dark:border-surface-700 pt-4 mt-2">
                        <h3 class="text-md font-bold text-red-500 mb-2">إجراءات العرض التوضيحي</h3>
                        <div class="flex items-center gap-3">
                            <Button label="إعادة تعيين بيانات العرض" severity="danger" outlined @click="handleReset">
                                <template #icon><RefreshCw :size="16" /></template>
                            </Button>
                            <span v-if="resetSuccess" class="text-green-600 text-sm font-semibold">✓ تم إعادة تعيين البيانات بنجاح</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-card {
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 1rem;
    padding: 1.5rem;
}

.dark .settings-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
}
</style>
