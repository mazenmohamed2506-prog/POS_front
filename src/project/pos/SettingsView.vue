<script setup>
import { ref, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { useToastStore } from "@/stores/base/toastStore";
import { Settings, Save, RefreshCw, AlertTriangle, HelpCircle, Printer, Wifi, WifiOff, Zap } from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";
import QZService from "@/utilities/qzService";

const posStore = usePosStore();
const toastStore = useToastStore();

const form = ref({ ...posStore.settings });
const saved = ref(false);
const resetSuccess = ref(false);

// QZ Tray Status & State
const qzConnected = ref(false);
const qzPrinters = ref([]);
const isQzTestingConnection = ref(false);
const isQzTestingPrint = ref(false);
const isQzTestingPulse = ref(false);

const checkQZConnection = async () => {
    isQzTestingConnection.value = true;
    try {
        const connected = await QZService.connect();
        qzConnected.value = connected;
        if (connected) {
            qzPrinters.value = await QZService.getPrinters();
            // Fallback default printer assignment if none selected
            if (qzPrinters.value.length > 0 && (!posStore.qzPrinterName || !qzPrinters.value.includes(posStore.qzPrinterName))) {
                posStore.qzPrinterName = qzPrinters.value[0];
            }
        } else {
            qzPrinters.value = [];
        }
    } catch (e) {
        console.error("QZ connection check error:", e);
        qzConnected.value = false;
        qzPrinters.value = [];
    } finally {
        isQzTestingConnection.value = false;
    }
};

const handleTestPrint = async () => {
    if (!posStore.qzPrinterName) {
        toastStore.addWarningToast("الرجاء اختيار طابعة أولاً");
        return;
    }
    isQzTestingPrint.value = true;
    try {
        const dummyOrder = {
            orderNumber: "TEST-0001",
            date: new Date().toISOString(),
            items: [
                { name: "صنف تجريبي 1 - قز تراي", qty: 2, price: 15.00, total: 30.00 },
                { name: "صنف تجريبي 2 - اختبار نبضة الدرج", qty: 1, price: 45.00, total: 45.00 }
            ],
            subtotal: 75.00,
            discount: 5.00,
            tax: 9.80,
            total: 79.80,
            paymentMethod: "cash"
        };
        const htmlContent = QZService.generateReceiptHTML(dummyOrder, posStore.settings);
        await QZService.printReceipt(posStore.qzPrinterName, htmlContent, false);
        toastStore.addSuccessToast("تم إرسال أمر الطباعة التجريبي بنجاح");
    } catch (err) {
        console.error(err);
        toastStore.addErrorToast("فشلت طباعة الإيصال التجريبي: " + (err.message || err));
    } finally {
        isQzTestingPrint.value = false;
    }
};

const handleTestPulse = async () => {
    if (!posStore.qzPrinterName) {
        toastStore.addWarningToast("الرجاء اختيار طابعة أولاً");
        return;
    }
    isQzTestingPulse.value = true;
    try {
        await QZService.kickDrawer(posStore.qzPrinterName, 2);
        toastStore.addSuccessToast("تم إرسال نبضة فتح درج النقدية");
    } catch (err) {
        console.error(err);
        toastStore.addErrorToast("فشل إرسال نبضة درج النقدية: " + (err.message || err));
    } finally {
        isQzTestingPulse.value = false;
    }
};

// ── Help Drawer ──
const showHelp = ref(false);
const settingsHelpSections = [
    {
        title: 'تهيأة الإعدادات العامة',
        icon: Settings,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'بيانات المنشأة', desc: 'أدخل اسم المتجر والعنوان والرقم الضريبي ورقم الهاتف لظهورها آلياً في ترويسة الفواتير المطبوعة.' },
            { title: 'نسبة الضريبة', desc: 'حدد نسبة ضريبة القيمة المضافة (VAT) المطبقة لتتم إضافتها وتطبيقها آلياً على فواتير المبيعات والمشتريات.' },
            { title: 'بيان الفاتورة السفلي', desc: 'اكتب الشروط أو ملاحظات الشكر المطبوعة في ترويسة الإيصال السفلى (مثل: البضاعة المباعة لا ترد ولا تستبدل بعد 14 يوم).' },
            { title: 'حفظ الإعدادات', desc: 'انقر على "حفظ الإعدادات" لتطبيق التغييرات فوراً على مستوى النظام بأكمله.' },
        ]
    },
    {
        title: 'إعدادات طباعة QZ Tray',
        icon: Printer,
        color: '#fef3c7',
        iconColor: '#d97706',
        steps: [
            { title: 'تفعيل QZ Tray', desc: 'قم بتشغيل الخيار لتجاوز نافذة معاينة المتصفح المزعجة والطباعة بصمت تام وسرعة عالية.' },
            { title: 'اختيار الطابعة', desc: 'قم بتشغيل تطبيق QZ Tray على جهاز الكمبيوتر الخاص بك، ثم اختر الطابعة الحرارية المعرفة في النظام من القائمة المنسدلة.' },
            { title: 'درج الكاش التلقائي', desc: 'فعل خيار فتح درج النقدية ليرسل النظام نبضة فتح الدرج الكهربائية فور تأكيد إتمام المعاملة بنجاح.' },
            { title: 'اختبار الهاردوير', desc: 'اضغط على زر تجربة الطباعة أو تجربة نبضة الدرج للتأكد من ربط الأجهزة بشكل صحيح.' }
        ]
    }
];

const settingsHelpTips = [
    'تأكد من تشغيل تطبيق QZ Tray على نظام التشغيل لديك (يظهر كأيقونة بجوار الساعة في شريط المهام).',
    'يجب تثبيت برنامج Java JRE للتمكن من تشغيل تطبيق QZ Tray بشكل سليم على جهازك.',
    'عند تشغيل ميزة QZ Tray لأول مرة، قد يظهر تنبيه أمان يسألك السماح للموقع بالاتصال، اختر "تذكر هذا القرار دائماً".'
];

onMounted(async () => {
    posStore.fetchSettings();
    form.value = { ...posStore.settings };
    
    // Check QZ Tray connection on load
    await checkQZConnection();
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
        <div class="settings-header flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <Settings :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="settings-title">الإعدادات العامة</h1>
                    <p class="settings-subtitle">تهيئة بيانات المتجر، نسب الضرائب وتفاصيل الفاتورة</p>
                </div>
            </div>
            <button @click="showHelp = true" class="btn-help flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl transition-all">
                <HelpCircle :size="18" />
                <span>تعليمات والمساعدة</span>
            </button>
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

            <!-- QZ Tray Printer Settings Card -->
            <div class="settings-card mt-6">
                <div class="flex items-center gap-3 mb-4 pb-3 border-b border-surface-200 dark:border-surface-800">
                    <div class="p-2 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-lg">
                        <Printer :size="20" />
                    </div>
                    <div>
                        <h3 class="text-base font-extrabold text-surface-900 dark:text-surface-0 m-0">إعدادات طابعة الفواتير ودرج النقدية</h3>
                        <p class="text-xs text-surface-500 m-0">تفعيل الطباعة التلقائية الصامتة والتحكم في درج النقدية عبر QZ Tray</p>
                    </div>
                </div>

                <div class="settings-form-grid">
                    <!-- Enable QZ Tray -->
                    <div class="flex items-center justify-between py-2">
                        <div class="flex flex-col gap-1">
                            <label class="font-bold text-sm text-surface-700 dark:text-surface-200">تفعيل نظام طباعة QZ Tray</label>
                            <p class="text-xs text-surface-500 m-0">استخدام اتصال WebSocket لطباعة الفواتير وفتح درج الكاش بصمت دون إظهار نافذة المتصفح</p>
                        </div>
                        <ToggleSwitch v-model="posStore.useQZTray" />
                    </div>

                    <!-- Connection Status & Detection (Only shown when QZ Tray is enabled) -->
                    <Transition name="fade">
                        <div v-if="posStore.useQZTray" class="flex flex-col gap-4 p-4 bg-surface-50 dark:bg-surface-950/40 rounded-xl border border-surface-200 dark:border-surface-800">
                            <!-- Connection Status -->
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-bold">حالة الاتصال ببرنامج QZ Tray:</span>
                                    <span v-if="qzConnected" class="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
                                        <Wifi :size="12" /> متصل
                                    </span>
                                    <span v-else class="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
                                        <WifiOff :size="12" /> غير متصل
                                    </span>
                                </div>
                                <Button label="تحديث الاتصال" text size="small" @click="checkQZConnection" :loading="isQzTestingConnection">
                                    <template #icon><RefreshCw :size="14" class="me-1" /></template>
                                </Button>
                            </div>

                            <!-- Printer Select -->
                            <div class="form-field">
                                <label class="required">طابعة الفواتير المحددة</label>
                                <div class="flex gap-2">
                                    <Select 
                                        v-model="posStore.qzPrinterName" 
                                        :options="qzPrinters" 
                                        placeholder="اختر طابعة من القائمة المكتشفة" 
                                        class="flex-1"
                                        :disabled="!qzConnected"
                                        fluid
                                    />
                                    <Button 
                                        v-tooltip.top="'تحديث قائمة الطابعات المكتشفة'"
                                        outlined 
                                        severity="secondary"
                                        @click="checkQZConnection"
                                        :disabled="!qzConnected"
                                    >
                                        <template #icon><RefreshCw :size="16" /></template>
                                    </Button>
                                </div>
                                <p class="text-xs text-surface-500 m-0" v-if="qzPrinters.length === 0 && qzConnected">
                                    لم يتم الكشف عن طابعات. تأكد من تعريف طابعتك في لوحة تحكم ويندوز.
                                </p>
                            </div>

                            <!-- Auto Drawer Kick -->
                            <div class="flex items-center justify-between py-2 border-t border-surface-200 dark:border-surface-800 pt-3">
                                <div class="flex flex-col gap-1">
                                    <label class="font-bold text-sm text-surface-700 dark:text-surface-200">فتح درج الكاش تلقائياً</label>
                                    <p class="text-xs text-surface-500 m-0">إرسال نبضة فتح الدرج (ESC/POS Pin 2) فور إتمام عملية البيع</p>
                                </div>
                                <ToggleSwitch v-model="posStore.autoOpenDrawer" :disabled="!qzConnected" />
                            </div>

                            <!-- Hardware Test Actions -->
                            <div class="flex gap-3 pt-3 border-t border-surface-200 dark:border-surface-800" v-if="qzConnected">
                                <Button label="تجربة فتح الدرج" severity="secondary" outlined class="flex-1" @click="handleTestPulse" :loading="isQzTestingPulse">
                                    <template #icon><Zap :size="15" class="me-1 text-amber-500" /></template>
                                </Button>
                                <Button label="طباعة ورقة تجريبية" severity="secondary" outlined class="flex-1" @click="handleTestPrint" :loading="isQzTestingPrint">
                                    <template #icon><Printer :size="15" class="me-1" /></template>
                                </Button>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
        </div>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="إعدادات النظام والطباعة"
            page-subtitle="تخصيص بيانات المنشأة، الفاتورة، والتفضيلات"
            :page-icon="Settings"
            header-gradient="linear-gradient(135deg, #475569 0%, #1e293b 100%)"
            :sections="settingsHelpSections"
            :tips="settingsHelpTips"
        />
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
