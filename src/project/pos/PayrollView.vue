<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { usePayrollStore } from "@/stores/pos/payrollStore";
import { useReportStore } from "@/stores/pos/reportStore";
import { useUserStore } from "@/stores/pos/userStore";
import { useToastStore } from "@/stores/base/toastStore";
import { isValidEmail, isValidEgyptianPhone } from "@/utilities/validations";
import {
    Users, Plus, Search, HelpCircle, FileText, List, Pencil, UserCheck,
    UserPlus, DollarSign, Printer, Download, RefreshCw, Layers, TrendingUp,
    CalendarDays, CreditCard, Wallet, AlertTriangle, CheckCircle, Clock, CircleDot,
    Coins, Gift, MinusCircle, Trash2, Scale
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const payrollStore = usePayrollStore();
const reportStore = useReportStore();
const userStore = useUserStore();
const toastStore = useToastStore();

const showHelp = ref(false);
const activeTab = ref("employees");

const helpSections = [
    {
        title: 'إدارة الموظفين والرواتب',
        icon: Users,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'ملفات وتعيين الموظفين', desc: 'إضافة الموظف، المسمى الوظيفي، الراتب الأساسي، والبيانات الشخصية.' },
            { title: 'مسير الرواتب والسلف', desc: 'احتساب الرواتب الشهرية شاملاً البدلات والمكافآت وخصم السلف المستقطعة.' },
            { title: 'اعتماد وتصرف الرواتب', desc: 'اعتماد مسير الرواتب وترحيل المبالغ كمصروف تشغيلي في النظام.' },
        ]
    }
];

const helpTips = [
    'سجل السلف فور منحها للموظف ليتم خصمها آلياً من مسير راتب الشهر.',
    'الرواتب المعتمة تدرج تلقائياً ضمن قائمة النفقات في تقرير الأرباح والخسائر.'
];

const employeeFilters = ref({ global: { value: "", matchMode: "contains" } });
const slipFilters = ref({ global: { value: "", matchMode: "contains" } });
const paymentLogFilters = ref({ global: { value: "", matchMode: "contains" } });

// ── Payment Method Options ──
const paymentMethodOptions = [
    { label: "كاش (Cash)", value: "Cash" },
    { label: "بطاقة (Card)", value: "Card" },
    { label: "تحويل بنكي (Transfer)", value: "Transfer" }
];

// ── Employee Form & Modal ──
const showEmployeeDialog = ref(false);
const editingEmployee = ref(null);
const showDeactivateConfirm = ref(false);
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

// ── Salary Slips (Monthly Obligations) ──
const slipsMonth = ref(new Date().getMonth() + 1);
const slipsYear = ref(new Date().getFullYear());

const monthOptions = [
    { label: "يناير", value: 1 }, { label: "فبراير", value: 2 },
    { label: "مارس", value: 3 }, { label: "أبريل", value: 4 },
    { label: "مايو", value: 5 }, { label: "يونيو", value: 6 },
    { label: "يوليو", value: 7 }, { label: "أغسطس", value: 8 },
    { label: "سبتمبر", value: 9 }, { label: "أكتوبر", value: 10 },
    { label: "نوفمبر", value: 11 }, { label: "ديسمبر", value: 12 }
];

const yearOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
        years.push({ label: String(y), value: y });
    }
    return years;
});

const loadSlips = () => {
    payrollStore.fetchSlips(slipsMonth.value, slipsYear.value);
    payrollStore.fetchAdjustments({ month: slipsMonth.value, year: slipsYear.value });
};

const generateMonthObligations = async () => {
    try {
        await payrollStore.generateObligations(slipsMonth.value, slipsYear.value);
    } catch {
        // Error handled in store
    }
};

const getSlipStatusLabel = (status) => {
    switch (status) {
        case "Paid": return "مدفوع بالكامل";
        case "PartiallyPaid": return "مدفوع جزئياً";
        case "Pending": return "معلّق";
        default: return status || "معلّق";
    }
};

const getSlipStatusSeverity = (status) => {
    switch (status) {
        case "Paid": return "success";
        case "PartiallyPaid": return "warn";
        case "Pending": return "danger";
        default: return "secondary";
    }
};

const getSlipStatusIcon = (status) => {
    switch (status) {
        case "Paid": return CheckCircle;
        case "PartiallyPaid": return CircleDot;
        case "Pending": return Clock;
        default: return Clock;
    }
};

// ── Slip Payment Dialog ──
const showSlipPaymentDialog = ref(false);
const selectedSlip = ref(null);
const slipPaymentForm = ref({
    amount: 0,
    paymentMethod: "Cash",
    notes: ""
});

const openSlipPayment = (slip) => {
    selectedSlip.value = slip;
    const calcNet = Math.max(0, (slip.baseSalary || 0) + (slip.bonusAmount || 0) - (slip.deductionsAmount || 0) - (slip.advanceAmount || 0));
    const net = (slip.bonusAmount || slip.deductionsAmount || slip.advanceAmount || calcNet) ? calcNet : (slip.baseSalary || 0);
    const rem = Math.max(0, slip.remainingAmount !== undefined && slip.remainingAmount !== null ? slip.remainingAmount : (net - (slip.paidAmount || 0)));

    slipPaymentForm.value = {
        amount: rem > 0 ? rem : (slip.baseSalary || 0),
        paymentMethod: "Cash",
        notes: ""
    };
    showSlipPaymentDialog.value = true;
};

const submitSlipPayment = async () => {
    if (!selectedSlip.value) return;
    const amountVal = Number(slipPaymentForm.value.amount || 0);
    if (amountVal <= 0) {
        toastStore.addWarningToast("يرجى إدخال مبلغ صحيح أكبر من الصفر");
        return;
    }

    try {
        const payload = {
            salarySlipId: Number(selectedSlip.value.id),
            amount: amountVal,
            paymentMethod: slipPaymentForm.value.paymentMethod || "Cash",
            notes: slipPaymentForm.value.notes || null
        };
        await payrollStore.recordSlipPayment(payload);
        showSlipPaymentDialog.value = false;
        loadSlips();
    } catch (err) {
        console.error("Failed to submit slip payment:", err);
        const errMsg = err?.response?.data?.detail || err?.response?.data?.message || (typeof err?.response?.data === "string" ? err.response.data : "") || err?.message || "حدث خطأ أثناء تسجيل الدفعة";
        toastStore.addErrorToast(errMsg);
    }
};




// ── Direct Salary Payment Dialog ──
const showSalaryDialog = ref(false);
const salaryForm = ref({
    paymentDate: new Date().toISOString().split('T')[0],
    employeeId: null,
    amount: 0,
    paymentMethod: "Cash",
    payPeriod: "",
    notes: ""
});

const employeeDropdownOptions = computed(() => {
    if (!payrollStore.employees || !payrollStore.employees.length) return [];
    return payrollStore.employees
        .filter(emp => emp.isActive !== false)
        .map(emp => ({
            label: `${emp.fullName}${emp.position ? ` (${emp.position})` : ''}`,
            value: emp.id,
            salary: emp.monthlySalary
        }));
});

const onEmployeeSelect = (event) => {
    const selectedId = event.value;
    const foundEmp = payrollStore.employees.find(e => e.id === selectedId);
    if (foundEmp && foundEmp.monthlySalary) {
        salaryForm.value.amount = foundEmp.monthlySalary;
    }
};

const openNewSalary = (employeeName = "", amount = 0, employeeId = null) => {
    const currentMonth = new Date().toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
    salaryForm.value = {
        paymentDate: new Date().toISOString().split('T')[0],
        employeeId: employeeId,
        amount: amount || 0,
        paymentMethod: "Cash",
        payPeriod: currentMonth,
        notes: ""
    };
    showSalaryDialog.value = true;
};

const submitSalary = async () => {
    if (!salaryForm.value.employeeId) {
        toastStore.addWarningToast("يرجى اختيار الموظف");
        return;
    }
    if (!salaryForm.value.amount || salaryForm.value.amount <= 0) {
        toastStore.addWarningToast("يرجى إدخال مبلغ صحيح");
        return;
    }
    try {
        const payload = {
            employeeId: Number(salaryForm.value.employeeId),
            amount: Number(salaryForm.value.amount),
            paymentMethod: salaryForm.value.paymentMethod || "Cash",
            notes: salaryForm.value.notes || null
        };
        await payrollStore.processPayment(payload);
        showSalaryDialog.value = false;
        // Refresh payments log if filter is active
        loadPaymentsLog();
    } catch {
        // Error handled in store
    }
};

// ── Payments Log (Tab 2) with date filter ──
const paymentLogStartDate = ref(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
);
const paymentLogEndDate = ref(new Date().toISOString().split('T')[0]);

const loadPaymentsLog = () => {
    const params = {};
    if (paymentLogStartDate.value) {
        params.startDate = new Date(paymentLogStartDate.value).toISOString();
    }
    if (paymentLogEndDate.value) {
        params.endDate = new Date(paymentLogEndDate.value + 'T23:59:59').toISOString();
    }
    payrollStore.fetchPayments(params);
};

// ── Report Tab ──
const reportForm = ref({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

const isPrintingReport = ref(false);
const reportSearchQuery = ref("");

const reportItems = computed(() => {
    const data = reportStore.payrollData;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.items || data.payrolls || data.salaryPayments || data.records || [];
});

const filteredReportItems = computed(() => {
    const q = reportSearchQuery.value.trim().toLowerCase();
    if (!q) return reportItems.value;
    return reportItems.value.filter(item =>
        (item.employeeName && item.employeeName.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
    );
});

const reportSummary = computed(() => {
    const data = reportStore.payrollData;
    const items = reportItems.value;

    const totalAmount = (data && !Array.isArray(data) && data.totalAmount !== undefined)
        ? Number(data.totalAmount || 0)
        : items.reduce((s, i) => s + (i.amountPaid || i.amount || 0), 0);

    const totalEmployees = new Set(items.map(i => i.employeeId || i.employeeName)).size || items.length;
    const totalPayments = items.length;

    return { totalAmount, totalEmployees, totalPayments };
});

const generateReport = () => {
    reportStore.fetchPayrollReport({
        startDate: new Date(reportForm.value.startDate).toISOString(),
        endDate: new Date(reportForm.value.endDate + 'T23:59:59').toISOString()
    });
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

    let csvContent = "\uFEFFالموظف,تاريخ الدفع,المبلغ المدفوع,طريقة الدفع,ملاحظات\n";
    items.forEach(item => {
        const emp = `"${(item.employeeName || '').replace(/"/g, '""')}"`;
        const date = item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('ar-EG') : '';
        const amt = item.amountPaid || item.amount || 0;
        const method = getPaymentMethodLabel(item.paymentMethod);
        const notes = `"${(item.notes || '').replace(/"/g, '""')}"`;
        csvContent += `${emp},${date},${amt},${method},${notes}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_الرواتب_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// ── Employee Actions ──
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

// Track the original isActive to detect changes
const originalIsActive = ref(true);
watch(showEmployeeDialog, (newVal) => {
    if (newVal && editingEmployee.value) {
        originalIsActive.value = editingEmployee.value.isActive ?? true;
    }
});

const onIsActiveToggle = (newVal) => {
    if (editingEmployee.value && originalIsActive.value === true && newVal === false) {
        // Confirm deactivation
        showDeactivateConfirm.value = true;
    }
};

const confirmDeactivate = () => {
    showDeactivateConfirm.value = false;
    employeeForm.value.isActive = false;
};

const cancelDeactivate = () => {
    showDeactivateConfirm.value = false;
    employeeForm.value.isActive = true;
};

const saveEmployee = async () => {
    if (!employeeForm.value.fullName || employeeForm.value.fullName.trim() === '') {
        toastStore.addWarningToast("يرجى إدخال اسم الموظف");
        return;
    }
    if (!employeeForm.value.position || employeeForm.value.position.trim() === '') {
        toastStore.addWarningToast("يرجى إدخال المسمى الوظيفي");
        return;
    }
    if (employeeForm.value.email && !isValidEmail(employeeForm.value.email)) {
        toastStore.addErrorToast("البريد الإلكتروني غير صحيح (مثال: mail@example.com)");
        return;
    }
    if (employeeForm.value.phone && !isValidEgyptianPhone(employeeForm.value.phone)) {
        toastStore.addErrorToast("رقم الهاتف غير صحيح (يجب إدخال رقم هاتف مصري صحيح)");
        return;
    }
    try {
        let parsedHireDate;
        if (employeeForm.value.hireDate) {
            const d = new Date(employeeForm.value.hireDate);
            parsedHireDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        } else {
            parsedHireDate = new Date().toISOString();
        }

        const payload = {
            fullName: employeeForm.value.fullName.trim(),
            position: employeeForm.value.position.trim(),
            phone: employeeForm.value.phone?.trim() || null,
            email: employeeForm.value.email?.trim() || null,
            hireDate: parsedHireDate,
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
        // If it's a synchronous error or an error not handled by the store, show it
        if (!(err?.response)) {
            toastStore.addErrorToast("حدث خطأ غير متوقع: " + (err.message || ""));
        }
    }
};

// ── Salary Adjustments (Advances, Deductions, Bonuses) ──
const adjustmentFilters = ref({ global: { value: "", matchMode: "contains" } });
const showAdjustmentDialog = ref(false);
const adjustmentForm = ref({
    employeeId: null,
    type: "Advance",
    amount: 0,
    month: slipsMonth.value,
    year: slipsYear.value,
    isInstallment: false,
    installmentMonths: 6,
    reason: ""
});

const adjustmentTypeOptions = [
    { label: "سُلفة (Advance)", value: "Advance" },
    { label: "خصم (Deduction)", value: "Deduction" },
    { label: "مكافأة / بونص (Bonus)", value: "Bonus" }
];

const openNewAdjustment = (type = "Advance", employeeId = null) => {
    adjustmentForm.value = {
        employeeId: employeeId,
        type: type,
        amount: 0,
        month: slipsMonth.value || (new Date().getMonth() + 1),
        year: slipsYear.value || new Date().getFullYear(),
        isInstallment: false,
        installmentMonths: 6,
        reason: ""
    };
    showAdjustmentDialog.value = true;
};

const submitAdjustment = async () => {
    if (!adjustmentForm.value.employeeId) {
        toastStore.addWarningToast("يرجى اختيار الموظف");
        return;
    }
    if (!adjustmentForm.value.amount || adjustmentForm.value.amount <= 0) {
        toastStore.addWarningToast("يرجى إدخال مبلغ صحيح");
        return;
    }
    if (adjustmentForm.value.isInstallment && (!adjustmentForm.value.installmentMonths || adjustmentForm.value.installmentMonths < 2)) {
        toastStore.addWarningToast("يرجى إدخال عدد أشهر التقسيط (شهرين على الأقل)");
        return;
    }
    try {
        const payload = {
            employeeId: Number(adjustmentForm.value.employeeId),
            type: adjustmentForm.value.type,
            amount: Number(adjustmentForm.value.amount),
            month: Number(adjustmentForm.value.month),
            year: Number(adjustmentForm.value.year),
            isInstallment: adjustmentForm.value.isInstallment && adjustmentForm.value.type === "Advance",
            installmentMonths: Number(adjustmentForm.value.installmentMonths || 1),
            reason: adjustmentForm.value.reason || null
        };
        await payrollStore.addAdjustment(payload);
        showAdjustmentDialog.value = false;
        loadSlips();
        loadAdjustments();
    } catch {
        // Error handled in store
    }
};

const removeAdjustment = async (id) => {
    try {
        await payrollStore.deleteAdjustment(id);
        loadSlips();
        loadAdjustments();
    } catch {
        // Error handled in store
    }
};

const loadAdjustments = () => {
    payrollStore.fetchAdjustments({
        month: slipsMonth.value,
        year: slipsYear.value
    });
};

const getAdjustmentTypeLabel = (type) => {
    switch (type) {
        case "Bonus": return "مكافأة / بونص";
        case "Deduction": return "خصم";
        case "Advance": return "سُلفة";
        default: return type || "سُلفة";
    }
};

const getAdjustmentTypeSeverity = (type) => {
    switch (type) {
        case "Bonus": return "success";
        case "Deduction": return "danger";
        case "Advance": return "warn";
        default: return "info";
    }
};

// ── Lifecycle & Watchers ──
watch(activeTab, (newTab) => {
    if (newTab === "slips") loadSlips();
    if (newTab === "adjustments") loadAdjustments();
    if (newTab === "payments") loadPaymentsLog();
});

onMounted(() => {
    payrollStore.fetchEmployees();
    loadSlips();
    loadPaymentsLog();
    loadAdjustments();
    userStore.fetchUsers();
});

// ── Formatting Helpers ──
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

const getPaymentMethodLabel = (method) => {
    switch (method) {
        case "Cash": return "كاش";
        case "Card": return "بطاقة";
        case "Transfer": return "تحويل بنكي";
        default: return method || "كاش";
    }
};

const getPaymentMethodSeverity = (method) => {
    switch (method) {
        case "Cash": return "success";
        case "Card": return "info";
        case "Transfer": return "warn";
        default: return "secondary";
    }
};

const getMonthLabel = (m) => {
    const found = monthOptions.find(opt => opt.value === m);
    return found ? found.label : String(m);
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
                    <p class="page-subtitle">إدارة ملفات الموظفين، ربط الحسابات، القسائم الشهرية، وسجل الرواتب والمستحقات</p>
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
                <Button label="سُلفة / خصم / مكافأة" severity="warn" outlined @click="() => openNewAdjustment('Advance')">
                    <template #icon>
                        <Coins :size="18" />
                    </template>
                </Button>
            </div>
        </div>

        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة الموظفين والرواتب"
            page-subtitle="سجل الموظفين، الرواتب الشهرية، والسلف المستقطعة"
            :page-icon="Users"
            header-gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            :sections="helpSections"
            :tips="helpTips"
        />

        <!-- Tabs Container -->
        <Tabs v-model:value="activeTab">
            <TabList>
                <Tab value="employees"><Users class="inline-block me-2" :size="16" />قائمة الموظفين</Tab>
                <Tab value="slips"><Layers class="inline-block me-2" :size="16" />القسائم الشهرية</Tab>
                <Tab value="adjustments"><Coins class="inline-block me-2" :size="16" />السُلف والخصومات والمكافآت</Tab>
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
                                        <button class="action-pay-btn" @click="openNewSalary(data.fullName, data.monthlySalary, data.id)" title="تسجيل راتب">
                                            <DollarSign :size="15" />
                                        </button>
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </TabPanel>

                <!-- Tab 2: Salary Slips (Monthly Obligations) -->
                <TabPanel value="slips" class="px-0 py-4">
                    <div class="content-card">
                        <div class="filter-bar flex justify-between items-center gap-4 flex-wrap">
                            <div class="flex items-center gap-3 flex-wrap">
                                <div class="flex items-center gap-2">
                                    <label class="text-sm font-bold text-surface-700 dark:text-surface-300 whitespace-nowrap">الشهر:</label>
                                    <Select
                                        v-model="slipsMonth"
                                        :options="monthOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        size="small"
                                        class="w-32"
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <label class="text-sm font-bold text-surface-700 dark:text-surface-300 whitespace-nowrap">السنة:</label>
                                    <Select
                                        v-model="slipsYear"
                                        :options="yearOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        size="small"
                                        class="w-28"
                                    />
                                </div>
                                <Button label="تحميل القسائم" size="small" outlined @click="loadSlips">
                                    <template #icon><RefreshCw :size="14" class="me-1" /></template>
                                </Button>
                            </div>
                            <Button label="توليد التزامات الشهر" size="small" severity="warn" @click="generateMonthObligations" :loading="payrollStore.isLoading">
                                <template #icon><Layers :size="14" class="me-1" /></template>
                            </Button>
                        </div>

                        <DataTable
                            :value="payrollStore.slips"
                            :loading="payrollStore.isLoading"
                            paginator
                            :rows="15"
                            v-model:filters="slipFilters"
                            :globalFilterFields="['employeeName']"
                            emptyMessage="لا توجد قسائم لهذا الشهر — اضغط 'توليد التزامات الشهر' لإنشائها"
                            stripedRows
                            removableSort
                            class="main-table"
                        >
                            <Column field="employeeName" header="اسم الموظف" sortable style="min-width: 200px">
                                <template #body="{ data }">
                                    <span class="font-bold text-surface-900 dark:text-surface-0">{{ data.employeeName }}</span>
                                </template>
                            </Column>
                            <Column header="الفترة" sortable style="min-width: 130px">
                                <template #body="{ data }">
                                    <span class="text-sm">{{ getMonthLabel(data.month) }} {{ data.year }}</span>
                                </template>
                            </Column>
                            <Column field="baseSalary" header="الأساسي" sortable style="min-width: 120px">
                                <template #body="{ data }">
                                    <span class="text-surface-700 dark:text-surface-200">{{ formatCurrency(data.baseSalary) }}</span>
                                </template>
                            </Column>
                            <Column field="bonusAmount" header="مكافآت (+)" sortable style="min-width: 110px">
                                <template #body="{ data }">
                                    <span :class="['font-bold', data.bonusAmount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-400']">
                                        +{{ formatCurrency(data.bonusAmount || 0) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="deductionsAmount" header="خصومات (-)" sortable style="min-width: 110px">
                                <template #body="{ data }">
                                    <span :class="['font-bold', data.deductionsAmount > 0 ? 'text-red-500' : 'text-surface-400']">
                                        -{{ formatCurrency(data.deductionsAmount || 0) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="advanceAmount" header="سُلف (-)" sortable style="min-width: 110px">
                                <template #body="{ data }">
                                    <span :class="['font-bold', data.advanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-surface-400']">
                                        -{{ formatCurrency(data.advanceAmount || 0) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="netSalary" header="الصافي المستحق" sortable style="min-width: 140px">
                                <template #body="{ data }">
                                    <span class="font-bold text-blue-600 dark:text-blue-400 text-base">
                                        {{ formatCurrency(data.netSalary || (data.baseSalary + (data.bonusAmount || 0) - (data.deductionsAmount || 0) - (data.advanceAmount || 0))) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="paidAmount" header="المدفوع" sortable style="min-width: 130px">
                                <template #body="{ data }">
                                    <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(data.paidAmount) }}</span>
                                </template>
                            </Column>
                            <Column field="remainingAmount" header="المتبقي" sortable style="min-width: 130px">
                                <template #body="{ data }">
                                    <span :class="['font-bold', data.remainingAmount > 0 ? 'text-red-500' : 'text-surface-400']">
                                        {{ formatCurrency(data.remainingAmount) }}
                                    </span>
                                </template>
                            </Column>
                            <Column field="status" header="الحالة" sortable style="min-width: 150px">
                                <template #body="{ data }">
                                    <div class="flex items-center gap-1.5">
                                        <component :is="getSlipStatusIcon(data.status)" :size="14" />
                                        <Tag
                                            :value="getSlipStatusLabel(data.status)"
                                            :severity="getSlipStatusSeverity(data.status)"
                                            class="text-xs"
                                        />
                                    </div>
                                </template>
                            </Column>
                            <Column header="إجراء" style="min-width: 120px; text-align: center">
                                <template #body="{ data }">
                                    <Button
                                        v-if="data.status !== 'Paid'"
                                        label="تسجيل دفعة"
                                        size="small"
                                        severity="success"
                                        outlined
                                        @click="openSlipPayment(data)"
                                    >
                                        <template #icon><DollarSign :size="14" class="me-1" /></template>
                                    </Button>
                                    <Tag v-else value="✓ مكتمل" severity="success" class="text-xs" />
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </TabPanel>

                <!-- Tab: Salary Adjustments (Advances, Deductions, Bonuses) -->
                <TabPanel value="adjustments" class="px-0 py-4">
                    <div class="content-card">
                        <div class="filter-bar flex justify-between items-center gap-4 flex-wrap">
                            <div class="flex items-center gap-3 flex-wrap flex-1">
                                <div class="relative w-full max-w-xs">
                                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                    <InputText
                                        v-model="adjustmentFilters.global.value"
                                        placeholder="بحث باسم الموظف أو السبب..."
                                        class="ps-9 w-full"
                                        size="small"
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <label class="text-sm font-bold text-surface-700 dark:text-surface-300 whitespace-nowrap">الشهر:</label>
                                    <Select
                                        v-model="slipsMonth"
                                        :options="monthOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        size="small"
                                        class="w-32"
                                        @change="loadAdjustments"
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <label class="text-sm font-bold text-surface-700 dark:text-surface-300 whitespace-nowrap">السنة:</label>
                                    <Select
                                        v-model="slipsYear"
                                        :options="yearOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        size="small"
                                        class="w-28"
                                        @change="loadAdjustments"
                                    />
                                </div>
                                <Button label="تحديث" size="small" outlined @click="loadAdjustments">
                                    <template #icon><RefreshCw :size="14" class="me-1" /></template>
                                </Button>
                            </div>
                            <Button label="تسجيل سُلفة / خصم / مكافأة" size="small" severity="warn" @click="() => openNewAdjustment()">
                                <template #icon><Coins :size="14" class="me-1" /></template>
                            </Button>
                        </div>

                        <DataTable
                            :value="payrollStore.adjustments"
                            :loading="payrollStore.isLoading"
                            paginator
                            :rows="15"
                            v-model:filters="adjustmentFilters"
                            :globalFilterFields="['employeeName', 'reason', 'type']"
                            emptyMessage="لا توجد سُلف أو خصومات أو مكافآت مسجلة لهذا الشهر"
                            stripedRows
                            removableSort
                            class="main-table"
                        >
                            <Column field="id" header="#" sortable style="min-width: 70px">
                                <template #body="{ data }">
                                    <span class="font-mono text-surface-400 text-sm">{{ data.id }}</span>
                                </template>
                            </Column>
                            <Column field="employeeName" header="اسم الموظف" sortable style="min-width: 180px">
                                <template #body="{ data }">
                                    <span class="font-bold text-surface-900 dark:text-surface-0">{{ data.employeeName }}</span>
                                </template>
                            </Column>
                            <Column field="type" header="نوع التعديل" sortable style="min-width: 140px">
                                <template #body="{ data }">
                                    <Tag
                                        :value="getAdjustmentTypeLabel(data.type)"
                                        :severity="getAdjustmentTypeSeverity(data.type)"
                                        class="text-xs font-bold"
                                    />
                                </template>
                            </Column>
                            <Column field="amount" header="المبلغ" sortable style="min-width: 130px">
                                <template #body="{ data }">
                                    <span :class="[
                                        'font-bold text-base',
                                        data.type === 'Bonus' ? 'text-emerald-600 dark:text-emerald-400' :
                                        data.type === 'Deduction' ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'
                                    ]">
                                        {{ data.type === 'Bonus' ? '+' : '-' }}{{ formatCurrency(data.amount) }}
                                    </span>
                                </template>
                            </Column>
                            <Column header="الشهر المستهدف" sortable style="min-width: 130px">
                                <template #body="{ data }">
                                    <span class="text-sm font-semibold">{{ getMonthLabel(data.month) }} {{ data.year }}</span>
                                </template>
                            </Column>
                            <Column field="reason" header="السبب / التفاصيل" style="min-width: 200px">
                                <template #body="{ data }">
                                    <span class="text-sm text-surface-700 dark:text-surface-300">{{ data.reason || '—' }}</span>
                                </template>
                            </Column>
                            <Column field="date" header="تاريخ التسجيل" sortable style="min-width: 130px">
                                <template #body="{ data }">
                                    <span class="text-xs text-surface-500">{{ formatDate(data.date) }}</span>
                                </template>
                            </Column>
                            <Column header="حذف" style="min-width: 90px; text-align: center">
                                <template #body="{ data }">
                                    <button class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="إلغاء وحذف التعديل" @click="removeAdjustment(data.id)">
                                        <Trash2 :size="16" />
                                    </button>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </TabPanel>

                <!-- Tab 3: Salary Payments Log -->
                <TabPanel value="data" class="px-0 py-4">
                    <div class="content-card">
                        <div class="filter-bar flex justify-between items-center gap-4 flex-wrap">
                            <div class="flex items-center gap-3 flex-wrap flex-1">
                                <div class="relative w-full max-w-xs">
                                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                    <InputText
                                        v-model="paymentLogFilters.global.value"
                                        placeholder="بحث باسم الموظف..."
                                        class="ps-9 w-full"
                                        size="small"
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <label class="text-sm font-bold text-surface-700 dark:text-surface-300 whitespace-nowrap">من:</label>
                                    <InputText type="date" v-model="paymentLogStartDate" size="small" class="w-36" />
                                </div>
                                <div class="flex items-center gap-2">
                                    <label class="text-sm font-bold text-surface-700 dark:text-surface-300 whitespace-nowrap">إلى:</label>
                                    <InputText type="date" v-model="paymentLogEndDate" size="small" class="w-36" />
                                </div>
                                <Button label="تحميل" size="small" outlined @click="loadPaymentsLog">
                                    <template #icon><RefreshCw :size="14" class="me-1" /></template>
                                </Button>
                            </div>
                        </div>

                        <DataTable
                            :value="payrollStore.payments"
                            :loading="payrollStore.isLoading"
                            paginator
                            :rows="15"
                            v-model:filters="paymentLogFilters"
                            :globalFilterFields="['employeeName', 'payPeriod']"
                            emptyMessage="لا يوجد رواتب مسجلة في هذه الفترة"
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
                            <Column field="paymentMethod" header="طريقة الدفع" sortable style="min-width: 120px">
                                <template #body="{ data }">
                                    <Tag
                                        :value="getPaymentMethodLabel(data.paymentMethod)"
                                        :severity="getPaymentMethodSeverity(data.paymentMethod)"
                                        class="text-xs"
                                    />
                                </template>
                            </Column>
                            <Column field="notes" header="ملاحظات"></Column>
                            <Column field="createdBy" header="بواسطة"></Column>
                        </DataTable>
                    </div>
                </TabPanel>

                <!-- Tab 4: Payroll Report -->
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

                            <div v-if="reportStore.payrollData" class="flex items-center gap-2">
                                <Button label="طباعة" severity="secondary" outlined size="small" @click="printReport">
                                    <template #icon><Printer :size="16" class="me-1" /></template>
                                </Button>
                                <Button label="تصدير CSV" severity="secondary" outlined size="small" @click="exportReportCsv">
                                    <template #icon><Download :size="16" class="me-1" /></template>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div v-if="reportStore.payrollData">
                        <!-- Printable Official Header -->
                        <div class="print-official-header">
                            <div class="print-header-content">
                                <div class="print-header-brand">
                                    <h2>تقرير الرواتب والأجور المترتبة والمصروفة</h2>
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
                                    <DollarSign :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي الرواتب المدفوعة</span>
                                    <span class="text-lg font-bold text-blue-600">{{ formatCurrency(reportSummary.totalAmount) }}</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-emerald-500">
                                <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                    <Users :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">عدد الموظفين المستلمين</span>
                                    <span class="text-lg font-bold text-surface-900 dark:text-surface-100">{{ reportSummary.totalEmployees }} موظف</span>
                                </div>
                            </div>

                            <div class="content-card p-4 flex items-center gap-3 border-s-4 border-s-indigo-500">
                                <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <FileText :size="20" />
                                </div>
                                <div>
                                    <span class="text-xs font-medium text-surface-500 block">إجمالي عدد الدفعات</span>
                                    <span class="text-lg font-bold text-indigo-600">{{ reportSummary.totalPayments }} دفعة</span>
                                </div>
                            </div>
                        </div>

                        <!-- Report DataTable Card -->
                        <div class="content-card p-4">
                            <div class="flex justify-between items-center mb-4 no-print">
                                <div class="relative flex-1 max-w-sm">
                                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400" />
                                    <InputText v-model="reportSearchQuery" placeholder="بحث باسم الموظف أو الملاحظات..." class="ps-9 w-full" size="small" />
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
                                <Column field="employeeName" header="الموظف" sortable style="min-width: 200px">
                                    <template #body="{ data }">
                                        <div class="flex items-center gap-2">
                                            <div class="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {{ (data.employeeName || 'م').charAt(0) }}
                                            </div>
                                            <span class="font-semibold text-surface-900 dark:text-surface-100 text-sm">{{ data.employeeName || 'موظف غير محدد' }}</span>
                                        </div>
                                    </template>
                                </Column>

                                <Column field="paymentDate" header="تاريخ الدفع" sortable style="min-width: 140px">
                                    <template #body="{ data }">
                                        <span>{{ formatDate(data.paymentDate || data.date) }}</span>
                                    </template>
                                </Column>

                                <Column field="amountPaid" header="المبلغ المدفوع" sortable style="min-width: 150px">
                                    <template #body="{ data }">
                                        <span class="font-bold text-blue-600 text-base">
                                            {{ formatCurrency(data.amountPaid ?? data.amount ?? 0) }}
                                        </span>
                                    </template>
                                </Column>

                                <Column field="paymentMethod" header="طريقة الدفع" sortable style="min-width: 120px">
                                    <template #body="{ data }">
                                        <Tag
                                            :value="getPaymentMethodLabel(data.paymentMethod)"
                                            :severity="getPaymentMethodSeverity(data.paymentMethod)"
                                            class="text-xs"
                                        />
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
                        <label class="font-bold text-sm required">المسمى الوظيفي (المنصب)</label>
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
                    <ToggleSwitch v-model="employeeForm.isActive" id="employee-active-switch" @update:modelValue="onIsActiveToggle" />
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

        <!-- Deactivate Employee Confirmation Dialog -->
        <Dialog
            v-model:visible="showDeactivateConfirm"
            header="تأكيد تعطيل الموظف"
            :style="{ width: '400px' }"
            modal
            :closable="false"
        >
            <div class="flex items-start gap-3 py-2">
                <AlertTriangle :size="24" class="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p class="font-bold text-surface-900 dark:text-surface-100 mb-1">هل أنت متأكد من تعطيل هذا الموظف؟</p>
                    <p class="text-sm text-surface-500">تعطيل الموظف سيمنع توليد التزامات رواتب جديدة له. يمكنك إعادة تنشيطه لاحقاً.</p>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="cancelDeactivate" />
                    <Button label="نعم، تعطيل" severity="danger" @click="confirmDeactivate" />
                </div>
            </template>
        </Dialog>

        <!-- Direct Salary Payment Dialog -->
        <Dialog
            v-model:visible="showSalaryDialog"
            header="تسجيل راتب موظف (دفع مباشر)"
            :style="{ width: '480px' }"
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
                        v-model="salaryForm.employeeId"
                        :options="employeeDropdownOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="اختر الموظف..."
                        @change="onEmployeeSelect"
                        filter
                        fluid
                    />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        <label class="font-bold required">طريقة الدفع</label>
                        <Select
                            v-model="salaryForm.paymentMethod"
                            :options="paymentMethodOptions"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold">ملاحظات إضافية</label>
                    <Textarea v-model="salaryForm.notes" rows="2" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showSalaryDialog = false" />
                    <Button label="حفظ الراتب" @click="submitSalary" :loading="payrollStore.isLoading" :disabled="!salaryForm.amount || !salaryForm.employeeId" />
                </div>
            </template>
        </Dialog>

        <!-- Slip Payment Dialog -->
        <Dialog
            v-model:visible="showSlipPaymentDialog"
            header="تسجيل دفعة على القسيمة"
            :style="{ width: '450px' }"
            modal
        >
            <div v-if="selectedSlip" class="flex flex-col gap-4 py-4">
                <!-- Slip summary info -->
                <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-3 border border-surface-200 dark:border-surface-700">
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div><span class="text-surface-500">الموظف:</span> <strong>{{ selectedSlip.employeeName }}</strong></div>
                        <div><span class="text-surface-500">الفترة:</span> <strong>{{ getMonthLabel(selectedSlip.month) }} {{ selectedSlip.year }}</strong></div>
                        <div><span class="text-surface-500">الراتب الأساسي:</span> <strong>{{ formatCurrency(selectedSlip.baseSalary) }}</strong></div>
                        <div><span class="text-surface-500">الصافي المستحق:</span> <strong class="text-blue-600 dark:text-blue-400">{{ formatCurrency(Math.max(0, selectedSlip.netSalary || 0)) }}</strong></div>
                        <div><span class="text-surface-500">إجمالي المدفوع:</span> <strong class="text-emerald-600">{{ formatCurrency(selectedSlip.paidAmount || 0) }}</strong></div>
                        <div><span class="text-surface-500">المتبقي المستحق:</span> <strong class="text-red-500">{{ formatCurrency(Math.max(0, selectedSlip.remainingAmount || 0)) }}</strong></div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-2">
                        <label class="font-bold required">المبلغ المدفوع</label>
                        <div class="relative w-full">
                            <InputNumber
                                v-model="slipPaymentForm.amount"
                                :min="0.01"
                                :max="Math.max(0, selectedSlip.remainingAmount || 0)"
                                :minFractionDigits="2"
                                placeholder="0.00"
                                :inputStyle="{ paddingInlineEnd: '2.5rem' }"
                                fluid
                            />
                            <span class="absolute end-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none font-semibold select-none">ج.م</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-bold required">طريقة الدفع</label>
                        <Select
                            v-model="slipPaymentForm.paymentMethod"
                            :options="paymentMethodOptions"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="font-bold">ملاحظات</label>
                    <Textarea v-model="slipPaymentForm.notes" rows="2" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showSlipPaymentDialog = false" />
                    <Button label="تسجيل الدفعة" severity="success" @click="submitSlipPayment" :loading="payrollStore.isLoading" :disabled="!slipPaymentForm.amount || slipPaymentForm.amount <= 0 || Math.max(0, selectedSlip.remainingAmount || 0) <= 0" />
                </div>
            </template>
        </Dialog>

        <!-- New Salary Adjustment (Advance / Deduction / Bonus) Dialog -->
        <Dialog
            v-model:visible="showAdjustmentDialog"
            header="تسجيل سُلفة / خصم / مكافأة (بونص)"
            :style="{ width: '520px' }"
            modal
        >
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <label class="font-bold required">الموظف</label>
                    <Select
                        v-model="adjustmentForm.employeeId"
                        :options="employeeDropdownOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="اختر الموظف..."
                        filter
                        fluid
                    />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-2">
                        <label class="font-bold required">نوع التعديل</label>
                        <Select
                            v-model="adjustmentForm.type"
                            :options="adjustmentTypeOptions"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-bold required">المبلغ</label>
                        <div class="relative w-full">
                            <InputNumber
                                v-model="adjustmentForm.amount"
                                :min="0.01"
                                :minFractionDigits="2"
                                placeholder="0.00"
                                :inputStyle="{ paddingInlineEnd: '2.5rem' }"
                                fluid
                            />
                            <span class="absolute end-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none font-semibold select-none">ج.م</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-2">
                        <label class="font-bold required">بداية الشهر المستهدف</label>
                        <Select
                            v-model="adjustmentForm.month"
                            :options="monthOptions"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-bold required">السنة المستهدفة</label>
                        <Select
                            v-model="adjustmentForm.year"
                            :options="yearOptions"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                </div>

                <!-- Multi-Month Installment Advances Block -->
                <div v-if="adjustmentForm.type === 'Advance'" class="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-lg border border-amber-200 dark:border-amber-800 flex flex-col gap-3">
                    <div class="flex items-center gap-2.5">
                        <Checkbox v-model="adjustmentForm.isInstallment" :binary="true" inputId="isInstallment" />
                        <label for="isInstallment" class="font-bold text-amber-900 dark:text-amber-200 text-sm cursor-pointer select-none">
                            تقسيط السُلفة على عدة أشهر (سُلفة مقسطة)
                        </label>
                    </div>

                    <div v-if="adjustmentForm.isInstallment" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-bold text-xs text-amber-800 dark:text-amber-300 required">عدد أشهر التقسيط</label>
                            <InputNumber
                                v-model="adjustmentForm.installmentMonths"
                                :min="2"
                                :max="120"
                                placeholder="عدد الأشهر"
                                fluid
                            />
                        </div>
                        <div class="flex flex-col justify-center gap-1 bg-white dark:bg-surface-900 p-2.5 rounded-md border border-amber-200 dark:border-amber-800 text-xs">
                            <span class="text-surface-500">القسط الشهري المحسوم:</span>
                            <strong class="text-amber-600 dark:text-amber-400 text-sm font-bold">
                                {{ formatCurrency((adjustmentForm.amount || 0) / (adjustmentForm.installmentMonths || 1)) }} / شهر
                            </strong>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-bold">السبب / الملاحظات</label>
                    <Textarea v-model="adjustmentForm.reason" rows="2" placeholder="مثال: خصم بسبب الخطأ في الشيفت / سلفة مقسطة لشراء مستلزمات / بونص مبيعات" fluid />
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="إلغاء" outlined severity="secondary" @click="showAdjustmentDialog = false" />
                    <Button label="حفظ التعديل" severity="warn" @click="submitAdjustment" :loading="payrollStore.isLoading" :disabled="!adjustmentForm.employeeId || !adjustmentForm.amount" />
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
