<script setup>
import { ref, onMounted } from "vue";
import { usePayrollStore } from "@/stores/pos/payrollStore";
import { useReportStore } from "@/stores/pos/reportStore";
import { Users, Plus, Search, HelpCircle, FileText, List } from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const payrollStore = usePayrollStore();
const reportStore = useReportStore();

const showHelp = ref(false);
const helpSections = [
    {
        title: 'إدارة الرواتب',
        icon: Users,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'تسجيل راتب', desc: 'اضغط "تسجيل راتب جديد" وأدخل اسم الموظف والمبلغ وفترة الراتب (مثل: مايو 2024)' },
        ]
    }
];
const helpTips = [
    'تسجيل الرواتب يساعد في استخراج تقارير أرباح صحيحة'
];

const filters = ref({ global: { value: "", matchMode: "contains" } });
const showSalaryDialog = ref(false);

const salaryForm = ref({
    paymentDate: new Date().toISOString().split('T')[0],
    employeeName: "",
    amount: 0,
    payPeriod: "",
    notes: ""
});

const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

onMounted(() => {
    payrollStore.fetchSalaries();
});

const openNewSalary = () => {
    salaryForm.value = {
        paymentDate: new Date().toISOString().split('T')[0],
        employeeName: "",
        amount: 0,
        payPeriod: "",
        notes: ""
    };
    showSalaryDialog.value = true;
};

const submitSalary = async () => {
    try {
        const payload = {
            ...salaryForm.value,
            paymentDate: new Date(salaryForm.value.paymentDate).toISOString()
        };
        await payrollStore.logSalary(payload);
        showSalaryDialog.value = false;
    } catch {
        // Handled
    }
};

const generateReport = () => {
    reportStore.fetchPayrollReport({
        startDate: new Date(reportForm.value.startDate).toISOString(),
        endDate: new Date(reportForm.value.endDate + 'T23:59:59').toISOString()
    });
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric"
    });
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};
</script>

<template>
    <div class="payroll-page">
        <div class="page-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap bg-blue-50 border-blue-100">
                    <Users :size="28" class="text-blue-500" />
                </div>
                <div>
                    <h1 class="page-title">رواتب الموظفين</h1>
                    <p class="page-subtitle">سجل رواتب ومستحقات الموظفين</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button label="تسجيل راتب جديد" @click="openNewSalary">
                    <template #icon>
                        <Plus :size="18" />
                    </template>
                </Button>
            </div>
        </div>

        <HelpDrawer
            v-model="showHelp"
            page-title="رواتب الموظفين"
            page-subtitle="سجل رواتب الموظفين"
            :page-icon="Users"
            header-gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            :sections="helpSections"
            :tips="helpTips"
        />

        <Tabs value="data">
            <TabList>
                <Tab value="data"><List class="inline-block me-2" :size="16" />سجل الرواتب</Tab>
                <Tab value="report"><FileText class="inline-block me-2" :size="16" />تقرير الرواتب</Tab>
            </TabList>
            
            <TabPanels>
                <TabPanel value="data" class="px-0 py-4">
                    <div class="content-card">
                        <div class="filter-bar">
                            <div class="relative w-full max-w-xs">
                                <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <InputText
                                    v-model="filters.global.value"
                                    placeholder="بحث باسم الموظف أو الفترة..."
                                    class="ps-9 w-full"
                                    size="small"
                                />
                            </div>
                        </div>

                        <DataTable
                            :value="payrollStore.salaries"
                            :loading="payrollStore.loading"
                            paginator
                            :rows="15"
                            v-model:filters="filters"
                            :globalFilterFields="['employeeName', 'payPeriod']"
                            emptyMessage="لا يوجد رواتب مسجلة"
                            stripedRows
                            removableSort
                            class="main-table"
                        >
                            <Column field="paymentDate" header="التاريخ" sortable>
                                <template #body="{ data }">{{ formatDate(data.paymentDate) }}</template>
                            </Column>
                            <Column field="employeeName" header="اسم الموظف" sortable>
                                <template #body="{ data }">
                                    <span class="font-bold">{{ data.employeeName }}</span>
                                </template>
                            </Column>
                            <Column field="payPeriod" header="فترة الراتب" sortable></Column>
                            <Column field="amount" header="المبلغ" sortable>
                                <template #body="{ data }">
                                    <span class="font-bold text-red-500">{{ formatCurrency(data.amount) }}</span>
                                </template>
                            </Column>
                            <Column field="notes" header="ملاحظات"></Column>
                            <Column field="createdBy" header="بواسطة"></Column>
                        </DataTable>
                    </div>
                </TabPanel>

                <TabPanel value="report" class="px-0 py-4">
                    <div class="content-card p-4 mb-4">
                        <div class="flex flex-col md:flex-row items-end gap-4">
                            <div class="flex-1">
                                <label class="font-bold block mb-2">من تاريخ</label>
                                <InputText type="date" v-model="reportForm.startDate" class="w-full" />
                            </div>
                            <div class="flex-1">
                                <label class="font-bold block mb-2">إلى تاريخ</label>
                                <InputText type="date" v-model="reportForm.endDate" class="w-full" />
                            </div>
                            <div>
                                <Button label="توليد التقرير" @click="generateReport" :loading="reportStore.isLoading" icon="pi pi-file-excel" />
                            </div>
                        </div>
                    </div>
                    
                    <div v-if="reportStore.payrollData" class="content-card p-4">
                        <h3 class="text-lg font-bold mb-4">نتيجة تقرير الرواتب</h3>
                        <pre dir="ltr" class="bg-surface-50 dark:bg-surface-900 p-4 rounded-lg overflow-auto text-sm border border-surface-200 dark:border-surface-700">{{ JSON.stringify(reportStore.payrollData, null, 2) }}</pre>
                    </div>
                    <div v-else-if="!reportStore.isLoading" class="content-card p-8 text-center border-dashed">
                        <FileText :size="48" class="text-surface-300 mx-auto mb-4" />
                        <p class="text-surface-500">قم بتحديد الفترة الزمنية واضغط على توليد التقرير لعرض النتائج.</p>
                    </div>
                </TabPanel>
            </TabPanels>
        </Tabs>

        <Dialog
            v-model:visible="showSalaryDialog"
            header="تسجيل راتب موظف"
            :style="{ width: '450px' }"
            modal
        >
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">التاريخ</label>
                    <InputText type="date" v-model="salaryForm.paymentDate" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">اسم الموظف</label>
                    <InputText v-model="salaryForm.employeeName" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">المبلغ</label>
                    <InputNumber
                        v-model="salaryForm.amount"
                        mode="currency"
                        currency="EGP"
                        locale="ar-EG"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">فترة الراتب (مثل: مايو 2024)</label>
                    <InputText v-model="salaryForm.payPeriod" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold">ملاحظات إضافية</label>
                    <Textarea v-model="salaryForm.notes" rows="2" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showSalaryDialog = false" />
                    <Button label="حفظ الراتب" @click="submitSalary" :loading="payrollStore.loading" :disabled="!salaryForm.amount || !salaryForm.employeeName || !salaryForm.payPeriod" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.payroll-page {
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
    margin-bottom: 0.5rem;
}

.header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
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
</style>
