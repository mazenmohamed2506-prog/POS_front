<script setup>
import { ref, onMounted } from "vue";
import { usePageStore } from "@/stores/pos/pageStore";
import { useUserStore } from "@/stores/pos/userStore";
import { FileText, Plus, Shield, Search } from "lucide-vue-next";

const pageStore = usePageStore();
const userStore = useUserStore();

const showPageDialog = ref(false);
const showAssignDialog = ref(false);
const pageForm = ref({
    name: "",
    nameAr: "",
    route: "",
});

const assignForm = ref({
    userId: null,
    pageIds: [],
});

const filters = ref({ global: { value: "", matchMode: "contains" } });

onMounted(async () => {
    await Promise.all([
        pageStore.fetchPages(),
        userStore.fetchUsers(),
    ]);
});

const openNewPage = () => {
    pageForm.value = { name: "", nameAr: "", route: "" };
    showPageDialog.value = true;
};

const savePage = async () => {
    try {
        await pageStore.createPage({ ...pageForm.value });
        showPageDialog.value = false;
    } catch {
        // Error handled by store
    }
};

const openAssignDialog = () => {
    assignForm.value = { userId: null, pageIds: [] };
    showAssignDialog.value = true;
};

const saveAssign = async () => {
    try {
        await pageStore.assignPages({
            userId: assignForm.value.userId,
            pageIds: assignForm.value.pageIds,
        });
        showAssignDialog.value = false;
    } catch {
        // Error handled by store
    }
};
</script>

<template>
    <div class="pages-page">
        <!-- Header -->
        <div class="pages-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <FileText :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="pages-title">إدارة الصفحات والصلاحيات</h1>
                    <p class="pages-subtitle">تعريف صفحات النظام وتعيين صلاحيات الوصول للمستخدمين</p>
                </div>
            </div>
            <div class="flex gap-2">
                <Button label="تعيين صلاحيات" severity="secondary" @click="openAssignDialog">
                    <template #icon>
                        <Shield :size="18" class="me-1" />
                    </template>
                </Button>
                <Button label="إضافة صفحة" @click="openNewPage">
                    <template #icon>
                        <Plus :size="18" />
                    </template>
                </Button>
            </div>
        </div>

        <!-- Table Container Card -->
        <div class="pages-card">
            <!-- Filter Bar -->
            <div class="pages-filter-bar">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="filters.global.value"
                        placeholder="بحث عن صفحة..."
                        class="ps-9 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Pages Table -->
            <DataTable
                :value="pageStore.pages"
                :loading="pageStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                v-model:filters="filters"
                filterDisplay="row"
                :globalFilterFields="['name', 'nameAr', 'route']"
                emptyMessage="لا توجد صفحات مطابقة"
                stripedRows
                removableSort
                scrollable
                class="pages-table"
            >
                <Column field="id" header="#" sortable style="width: 90px">
                    <template #body="{ data }">
                        <span class="font-mono text-surface-400">{{ data.id }}</span>
                    </template>
                </Column>
                <Column field="name" header="اسم الصفحة (EN)" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-850 dark:text-surface-150">{{ data.name }}</span>
                    </template>
                </Column>
                <Column field="nameAr" header="اسم الصفحة (AR)" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.nameAr }}</span>
                    </template>
                </Column>
                <Column field="route" header="المسار" style="min-width: 180px">
                    <template #body="{ data }">
                        <code class="route-code font-mono text-xs bg-surface-100 dark:bg-surface-800 text-primary-600 dark:text-primary-400 px-2 py-1 rounded">
                            {{ data.route || "—" }}
                        </code>
                    </template>
                </Column>
                <Column field="isActive" header="الحالة" style="width: 120px">
                    <template #body="{ data }">
                        <Tag
                            :value="data.isActive ? 'نشط' : 'غير نشط'"
                            :severity="data.isActive ? 'success' : 'danger'"
                            class="font-medium"
                        />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Create Page Dialog -->
        <Dialog
            v-model:visible="showPageDialog"
            header="إضافة صفحة جديدة للنظام"
            :style="{ width: '460px' }"
            modal
            dismissableMask
        >
            <div class="pages-dialog-form">
                <div class="form-field">
                    <label class="required">اسم الصفحة (English)</label>
                    <InputText v-model="pageForm.name" fluid placeholder="مثال: Sales Dashboard" />
                </div>
                <div class="form-field">
                    <label class="required">اسم الصفحة (العربية)</label>
                    <InputText v-model="pageForm.nameAr" fluid placeholder="مثال: لوحة المبيعات" />
                </div>
                <div class="form-field">
                    <label class="required">مسار الصفحة (Route)</label>
                    <InputText v-model="pageForm.route" fluid placeholder="مثال: /sales-dashboard" />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showPageDialog = false" />
                    <Button label="حفظ الصفحة" @click="savePage" :loading="pageStore.loading" />
                </div>
            </template>
        </Dialog>

        <!-- Assign Pages Dialog -->
        <Dialog
            v-model:visible="showAssignDialog"
            header="تعيين صلاحيات الوصول للمستخدم"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div class="pages-dialog-form">
                <div class="form-field">
                    <label class="required">المستخدم</label>
                    <Select
                        v-model="assignForm.userId"
                        :options="userStore.users"
                        optionLabel="username"
                        optionValue="id"
                        fluid
                        placeholder="اختر حساب المستخدم"
                    />
                </div>
                <div class="form-field">
                    <label class="required">الصفحات المسموح بزيارتها</label>
                    <MultiSelect
                        v-model="assignForm.pageIds"
                        :options="pageStore.pages"
                        optionLabel="nameAr"
                        optionValue="id"
                        fluid
                        placeholder="اختر صفحة واحدة أو أكثر"
                        display="chip"
                    />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showAssignDialog = false" />
                    <Button label="حفظ وتطبيق الصلاحيات" @click="saveAssign" :loading="pageStore.loading" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.pages-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .pages-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* Header */
.pages-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    flex-wrap: wrap;
    gap: 1rem;
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

.pages-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .pages-title {
    color: var(--p-surface-0);
}

.pages-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* Card Wrapper */
.pages-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .pages-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.pages-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .pages-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

/* Route code tag */
.route-code {
    border: 1px solid var(--p-surface-200);
}

.dark .route-code {
    border-color: var(--p-surface-700);
}

/* Dialog Form */
.pages-dialog-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0.5rem 0;
}

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
</style>
