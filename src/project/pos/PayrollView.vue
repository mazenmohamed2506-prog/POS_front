<script setup>
import { ref, computed, onMounted } from "vue";
import { usePayrollStore } from "@/stores/pos/payrollStore";
import { useReportStore } from "@/stores/pos/reportStore";
import { useUserStore } from "@/stores/pos/userStore";
import { Users, Plus, Search, HelpCircle, FileText, List, Pencil, UserCheck, UserPlus, DollarSign } from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const payrollStore = usePayrollStore();
const reportStore = useReportStore();
const userStore = useUserStore();

const showHelp = ref(false);
const activeTab = ref("employees");

const helpSections = [
    {
        title: 'إدارة الموظفين والرواتب',
        icon: Users,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'قائمة الموظفين', desc: 'عرض وإدارة الموظفين، ربطهم بحسابات النظام، وتحديد راتب كل موظف ونوعه' },
            { title: 'ربط حساب المستخدم', desc: 'عند إضافة أو تعديل موظف يمكنك ربطه بحساب مستخدم في النظام (كاشير/مدير) أو تركه غير مرتبط' },
            { title: 'تسجيل الدفعات والتقارير', desc: 'سجل دفعات الرواتب واستخرج تقارير الرواتب بالفترات الزمنية' },
        ]
    }
];

const helpTips = [
    'ربط الموظف بحساب المستخدم يتيح تتبع عمليات البيع والشيفتات الخاصة به',
    'يمكن تعديل الراتب ونوعه (شهري / يومي / بالساعة) في أي وقت'
];

const employeeFilters = ref({ global: { value: "", matchMode: "contains" } });
const slipFilters = ref({ global: { value: "", matchMode: "contains" } });

// ── Employee Form & Modal ──
const showEmployeeDialog = ref(false);
const editingEmployee = ref(null);
const employeeForm = ref({
    fullName: "",
    position: "",
    phone: "",
    email: "",
    hireDate: new Date().toISOString().split('T')[0],
    monthlySalary: 0,
    salaryType: "Monthly",
    userId: null,
    isActive: true
});

const salaryTypeOptions = [
    { label: "شهري (Monthly)", value: "Monthly" },
    { label: "يومي (Daily)", value: "Daily" },
    { label: "بالساعة (Hourly)", value: "Hourly" }
];

const userOptions = computed(() => {
    const list = [
        { label: "غير مرتبط / لا يوجد حساب مستخدم", value: null }
    ];
    if (userStore.users && userStore.users.length) {
        userStore.users.forEach(u => {
            const roleLabel = u.role === 'Manager' ? 'مدير' : u.role === 'Cashier' ? 'كاشير' : u.role;
            list.push({
                label: `${u.username}${roleLabel ? ` (${roleLabel})` : ''}`,
                value: u.id
            });
        });
    }
    return list;
});

// ── Salary Log Form & Modal ──
const showSalaryDialog = ref(false);
const salaryForm = ref({
    paymentDate: new Date().toISOString().split('T')[0],
    employeeName: "",
    amount: 0,
    payPeriod: "",
    notes: ""
});

const employeeDropdownOptions = computed(() => {
    if (!payrollStore.employees || !payrollStore.employees.length) return [];
    return payrollStore.employees.map(emp => ({
        label: `${emp.fullName}${emp.position ? ` (${emp.position})` : ''}`,
        value: emp.fullName,
        salary: emp.monthlySalary
    }));
});

const onEmployeeSelect = (event) => {
    const selectedVal = event.value;
    const foundEmp = payrollStore.employees.find(e => e.fullName === selectedVal);
    if (foundEmp && foundEmp.monthlySalary) {
        salaryForm.value.amount = foundEmp.monthlySalary;
    }
};

const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

onMounted(() => {
    payrollStore.fetchEmployees();
    payrollStore.fetchSalaries();
    userStore.fetchUsers();
});

const openNewEmployee = () => {
    editingEmployee.value = null;
    employeeForm.value = {
        fullName: "",
        position: "",
        phone: "",
        email: "",
        hireDate: new Date().toISOString().split('T')[0],
        monthlySalary: 0,
        salaryType: "Monthly",
        userId: null,
        isActive: true
    };
    userStore.fetchUsers();
    showEmployeeDialog.value = true;
};

const openEditEmployee = (emp) => {
    editingEmployee.value = emp;
    let formattedHireDate = new Date().toISOString().split('T')[0];
    if (emp.hireDate) {
        try {
            formattedHireDate = new Date(emp.hireDate).toISOString().split('T')[0];
        } catch {
            // Keep default fallback
        }
    }
    employeeForm.value = {
        fullName: emp.fullName || "",
        position: emp.position || "",
        phone: emp.phone || "",
        email: emp.email || "",
        hireDate: formattedHireDate,
        monthlySalary: emp.monthlySalary ?? 0,
        salaryType: emp.salaryType || "Monthly",
        userId: emp.userId ?? null,
        isActive: emp.isActive ?? true
    };
    userStore.fetchUsers();
    showEmployeeDialog.value = true;
};

const saveEmployee = async () => {
    try {
        const payload = {
            fullName: employeeForm.value.fullName,
            position: employeeForm.value.position || "",
            phone: employeeForm.value.phone || "",
            email: employeeForm.value.email || "",
            hireDate: employeeForm.value.hireDate ? new Date(employeeForm.value.hireDate).toISOString() : new Date().toISOString(),
            monthlySalary: Number(employeeForm.value.monthlySalary || 0),
            salaryType: employeeForm.value.salaryType || "Monthly",
            userId: employeeForm.value.userId ? Number(employeeForm.value.userId) : null
        };

        if (editingEmployee.value) {
            payload.isActive = employeeForm.value.isActive ?? true;
            await payrollStore.updateEmployee(editingEmployee.value.id, payload);
        } else {
            await payrollStore.addEmployee(payload);
        }
        showEmployeeDialog.value = false;
    } catch (err) {
        console.error("Failed to save employee:", err);
    }
};

const openNewSalary = (employeeName = "", amount = 0) => {
    const currentMonth = new Date().toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
    salaryForm.value = {
        paymentDate: new Date().toISOString().split('T')[0],
        employeeName: employeeName || "",
        amount: amount || 0,
        payPeriod: currentMonth,
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
    } catch (err) {
        console.error("Failed to submit salary:", err);
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

const getSalaryTypeLabel = (type) => {
    switch (type) {
        case "Monthly": return "شهري";
        case "Daily": return "يومي";
        case "Hourly": return "بالساعة";
        default: return type || "شهري";
    }
};
</script>

<template>
    <div class="payroll-page">
        <!-- Page Header -->
        <div class="page-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap bg-blue-50 border-blue-100">
                    <Users :size="28" class="text-blue-500" />
                </div>
                <div>
                    <h1 class="page-title">الموظفون والرواتب</h1>
                    <p class="page-subtitle">إدارة ملفات الموظفين، ربط الحسابات، وسجل الرواتب والمستحقات</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button label="إضافة موظف" @click="openNewEmployee">
                    <template #icon>
                        <UserPlus :size="18" />
                    </template>
                </Button>
                <Button label="تسجيل راتب" severity="secondary" outlined @click="() => openNewSalary()">
                    <template #icon>
                        <Plus :size="18" />
                    </template>
                </Button>
            </div>
        </div>

        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة الموظفين والرواتب"
            page-subtitle="سجل الموظفين والرواتب"
            :page-icon="Users"
            header-gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            :sections="helpSections"
            :tips="helpTips"
        />

        <!-- Tabs Container -->
        <Tabs v-model:value="activeTab">
            <TabList>
                <Tab value="employees"><Users class="inline-block me-2" :size="16" />قائمة الموظفين</Tab>
                <Tab value="data"><List class="inline-block me-2" :size="16" />سجل الرواتب</Tab>
                <Tab value="report"><FileText class="inline-block me-2" :size="16" />تقرير الرواتب</Tab>
            </TabList>
            
            <TabPanels>
                <!-- Tab 1: Employees List -->
                <TabPanel value="employees" class="px-0 py-4">
                    <div class="content-card">
                        <div class="filter-bar flex justify-between items-center gap-4 flex-wrap">
                            <div class="relative w-full max-w-xs">
                                <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <InputText
                                    v-model="employeeFilters.global.value"
                                    placeholder="بحث باسم الموظف أو المنصب أو الحساب..."
                                    class="ps-9 w-full"
                                    size="small"
                                />
                            </div>
                            <span class="text-sm text-surface-500 font-medium">
                                إجمالي الموظفين: {{ payrollStore.employees.length }}
                            </span>
                        </div>

                        <DataTable
                            :value="payrollStore.employees"
                            :loading="payrollStore.isLoading"
                            paginator
                            :rows="10"
                            :rowsPerPageOptions="[10, 15, 25]"
                            v-model:filters="employeeFilters"
                            :globalFilterFields="['fullName', 'position', 'phone', 'email', 'username']"
                            emptyMessage="لا يوجد موظفين مسجلين"
                            stripedRows
                            removableSort
                            class="main-table"
                        >
                            <Column field="id" header="#" sortable style="min-width: 70px">
                                <template #body="{ data }">
                                    <span class="font-mono text-surface-400 text-sm">{{ data.id }}</span>
                                </template>
                            </Column>
                            <Column field="fullName" header="اسم الموظف" sortable style="min-width: 200px">
                                <template #body="{ data }">
                                    <div class="flex flex-col">
                                        <span class="font-bold text-surface-900 dark:text-surface-0">{{ data.fullName }}</span>
                                        <span v-if="data.hireDate" class="text-xs text-surface-400">تاريخ التعيين: {{ formatDate(data.hireDate) }}</span>
                                    </div>
                                </template>
                            </Column>
                            <Column field="position" header="المنصب" sortable style="min-width: 140px">
                                <template #body="{ data }">
                                    <span class="text-surface-700 dark:text-surface-200">{{ data.position || '—' }}</span>
                                </template>
                            </Column>
                            <Column field="username" header="الحساب المرتبط" sortable style="min-width: 190px">
                                <template #body="{ data }">
                                    <div v-if="data.username" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        <UserCheck :size="13" />
                                        <span>حساب مرتبط: {{ data.username }}</span>
                                    </div>
                                    <Tag v-else value="غير مرتبط" severity="secondary" class="font-normal text-xs" />
                                </template>
                            </Column>
                            <Column field="monthlySalary" header="الراتب ونوعه" sortable style="min-width: 170px">
                                <template #body="{ data }">
                                    <div class="flex items-center gap-2">
                                        <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(data.monthlySalary) }}</span>
                                        <Tag :value="getSalaryTypeLabel(data.salaryType)" severity="info" class="text-xs" />
                                    </div>
                                </template>
                            </Column>
                            <Column field="phone" header="التواصل" style="min-width: 160px">
                                <template #body="{ data }">
                                    <div class="flex flex-col text-xs gap-0.5">
                                        <span dir="ltr" class="text-surface-700 dark:text-surface-300 font-mono text-start">{{ data.phone || '—' }}</span>
                                        <span v-if="data.email" class="text-surface-400 truncate max-w-[150px]">{{ data.email }}</span>
                                    </div>
                                </template>
                            </Column>
                            <Column field="isActive" header="الحالة" style="min-width: 100px">
                                <template #body="{ data }">
                                    <Tag
                                        :value="data.isActive ? 'نشط' : 'غير نشط'"
                                        :severity="data.isActive ? 'success' : 'danger'"
                                    />
                                </template>
                            </Column>
                            <Column header="إجراءات" style="min-width: 120px; text-align: center">
                                <template #body="{ data }">
                                    <div class="flex gap-1.5 justify-center">
                                        <button class="action-edit-btn" @click="openEditEmployee(data)" title="تعديل الموظف">
                                            <Pencil :size="15" />
                                        </button>
                                        <button class="action-pay-btn" @click="openNewSalary(data.fullName, data.monthlySalary)" title="تسجيل راتب">
                                            <DollarSign :size="15" />
                                        </button>
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </TabPanel>

                <!-- Tab 2: Salary Payments Log -->
                <TabPanel value="data" class="px-0 py-4">
                    <div class="content-card">
                        <div class="filter-bar">
                            <div class="relative w-full max-w-xs">
                                <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                <InputText
                                    v-model="slipFilters.global.value"
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
                            v-model:filters="slipFilters"
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

                <!-- Tab 3: Payroll Report -->
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

        <!-- Employee Add / Edit Dialog -->
        <Dialog
            v-model:visible="showEmployeeDialog"
            :header="editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'"
            :style="{ width: '520px' }"
            modal
            dismissableMask
        >
            <div class="flex flex-col gap-4 py-2">
                <div class="flex flex-col gap-1.5">
                    <label class="font-bold text-sm required">اسم الموظف الكامل</label>
                    <InputText v-model="employeeForm.fullName" fluid placeholder="مثال: مازن محمد" />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-bold text-sm">المسمى الوظيفي (المنصب)</label>
                        <InputText v-model="employeeForm.position" fluid placeholder="مثال: كاشير / مدير فرع" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-bold text-sm">تاريخ التعيين</label>
                        <InputText type="date" v-model="employeeForm.hireDate" fluid />
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-bold text-sm">رقم الهاتف</label>
                        <InputText v-model="employeeForm.phone" fluid placeholder="01000000000" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-bold text-sm">البريد الإلكتروني</label>
                        <InputText v-model="employeeForm.email" fluid placeholder="employee@example.com" />
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-bold text-sm required">مقدار الراتب</label>
                        <div class="relative w-full">
                            <InputNumber
                                v-model="employeeForm.monthlySalary"
                                :min="0"
                                :minFractionDigits="2"
                                placeholder="0.00"
                                :inputStyle="{ paddingInlineEnd: '2.5rem' }"
                                fluid
                            />
                            <span class="absolute end-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none font-semibold select-none">ج.م</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-bold text-sm required">نظام الراتب</label>
                        <Select
                            v-model="employeeForm.salaryType"
                            :options="salaryTypeOptions"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="font-bold text-sm">ربط بحساب مستخدم للنظام</label>
                    <Select
                        v-model="employeeForm.userId"
                        :options="userOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                        placeholder="اختر حساب المستخدم..."
                    />
                    <small class="text-surface-500">يتيح ربط الموظف بالحساب ربط سجل المبيعات والشيفتات به في النظام.</small>
                </div>

                <div v-if="editingEmployee" class="flex items-center gap-3 pt-2">
                    <ToggleSwitch v-model="employeeForm.isActive" id="employee-active-switch" />
                    <label htmlFor="employee-active-switch" class="font-bold text-sm cursor-pointer select-none">
                        حالة الموظف ({{ employeeForm.isActive ? 'نشط' : 'غير نشط' }})
                    </label>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2 pt-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showEmployeeDialog = false" />
                    <Button
                        :label="editingEmployee ? 'تحديث البيانات' : 'حفظ الموظف'"
                        @click="saveEmployee"
                        :loading="payrollStore.isLoading"
                        :disabled="!employeeForm.fullName"
                    />
                </div>
            </template>
        </Dialog>

        <!-- Salary Log Dialog -->
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
                    <Select
                        v-model="salaryForm.employeeName"
                        :options="employeeDropdownOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="اختر اسم الموظف..."
                        @change="onEmployeeSelect"
                        editable
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">المبلغ</label>
                    <div class="relative w-full">
                        <InputNumber
                            v-model="salaryForm.amount"
                            :min="0"
                            :minFractionDigits="2"
                            placeholder="0.00"
                            :inputStyle="{ paddingInlineEnd: '2.5rem' }"
                            fluid
                        />
                        <span class="absolute end-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none font-semibold select-none">ج.م</span>
                    </div>
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

/* Action Buttons */
.action-edit-btn,
.action-pay-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s;
}

.action-edit-btn {
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    color: var(--p-surface-650);
}

.dark .action-edit-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-300);
}

.action-edit-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}

.dark .action-edit-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
}

.action-pay-btn {
    border: 1px solid #bbf7d0;
    background: #f0fdf4;
    color: #16a34a;
}

.dark .action-pay-btn {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
    color: #4ade80;
}

.action-pay-btn:hover {
    background: #dcfce7;
    border-color: #86efac;
}

.dark .action-pay-btn:hover {
    background: rgba(34, 197, 94, 0.2);
    border-color: #4ade80;
}
</style>
