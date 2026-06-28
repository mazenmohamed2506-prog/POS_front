<script setup>
import { ref, onMounted } from "vue";
import { useSupplierStore } from "@/stores/pos/supplierStore";
import { usePosStore } from "@/stores/pos/posStore";
import { Truck, Plus, Pencil, Trash2, Search } from "lucide-vue-next";

const supplierStore = useSupplierStore();
const posStore = usePosStore();

const showSupplierDialog = ref(false);
const editingSupplier = ref(null);
const supplierForm = ref({
    name: "",
    phone: "",
    email: "",
    address: "",
    taxNumber: "",
    notes: "",
});

const filters = ref({ global: { value: "", matchMode: "contains" } });

onMounted(() => {
    supplierStore.fetchSuppliers();
});

const openNewSupplier = () => {
    editingSupplier.value = null;
    supplierForm.value = {
        name: "",
        phone: "",
        email: "",
        address: "",
        taxNumber: "",
        notes: "",
    };
    showSupplierDialog.value = true;
};

const openEditSupplier = (supplier) => {
    editingSupplier.value = supplier;
    supplierForm.value = { ...supplier };
    showSupplierDialog.value = true;
};

const saveSupplier = async () => {
    try {
        if (editingSupplier.value) {
            await supplierStore.updateSupplier(editingSupplier.value.id, { ...supplierForm.value });
        } else {
            await supplierStore.createSupplier({ ...supplierForm.value });
        }
        showSupplierDialog.value = false;
    } catch {
        // Error handled by store
    }
};

const confirmDelete = async (supplier) => {
    if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
        try {
            await supplierStore.deleteSupplier(supplier.id);
        } catch {
            // Error handled by store
        }
    }
};
</script>

<template>
    <div class="suppliers-page">
        <!-- Header -->
        <div class="suppliers-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <Truck :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="suppliers-title">إدارة الموردين</h1>
                    <p class="suppliers-subtitle">إضافة وتعديل بيانات الموردين</p>
                </div>
            </div>
            <Button label="إضافة مورد" @click="openNewSupplier">
                <template #icon>
                    <Plus :size="18" />
                </template>
            </Button>
        </div>

        <!-- Table Container Card -->
        <div class="suppliers-card">
            <!-- Filter Bar -->
            <div class="suppliers-filter-bar">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="filters.global.value"
                        placeholder="بحث عن مورد..."
                        class="ps-9 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Suppliers Table -->
            <DataTable
                :value="supplierStore.suppliers"
                :loading="supplierStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                v-model:filters="filters"
                filterDisplay="row"
                :globalFilterFields="['name', 'phone', 'email', 'taxNumber']"
                emptyMessage="لا يوجد موردين مطابِقين"
                stripedRows
                removableSort
                scrollable
                class="suppliers-table"
            >
                <Column field="id" header="#" sortable style="min-width: 90px">
                    <template #body="{ data }">
                        <span class="font-mono text-surface-400">{{ data.id }}</span>
                    </template>
                </Column>
                <Column field="name" header="الاسم" sortable style="min-width: 200px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.name }}</span>
                    </template>
                </Column>
                <Column field="phone" header="الهاتف" style="min-width: 140px">
                    <template #body="{ data }">
                        <span class="text-surface-600 dark:text-surface-400">{{ data.phone || '—' }}</span>
                    </template>
                </Column>
                <Column field="email" header="البريد الإلكتروني" style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="text-surface-600 dark:text-surface-400">{{ data.email || '—' }}</span>
                    </template>
                </Column>
                <Column field="taxNumber" header="الرقم الضريبي" style="min-width: 140px">
                    <template #body="{ data }">
                        <span class="text-surface-600 dark:text-surface-400">{{ data.taxNumber || '—' }}</span>
                    </template>
                </Column>
                <Column field="address" header="العنوان" style="min-width: 180px">
                    <template #body="{ data }">
                        <span class="text-sm text-surface-600 dark:text-surface-400 truncate max-w-[150px] inline-block" :title="data.address">{{ data.address || '—' }}</span>
                    </template>
                </Column>
                <Column header="إجراءات" style="min-width: 120px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex gap-1 justify-center">
                            <button class="action-edit-btn" @click="openEditSupplier(data)" title="تعديل">
                                <Pencil :size="15" />
                            </button>
                            <button v-if="posStore.role === 'Manager' || posStore.role === 'SuperAdmin'" class="action-delete-btn" @click="confirmDelete(data)" title="حذف">
                                <Trash2 :size="15" />
                            </button>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Supplier Dialog -->
        <Dialog
            v-model:visible="showSupplierDialog"
            :header="editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div class="supplier-dialog-form">
                <div class="form-field">
                    <label class="required">اسم المورد</label>
                    <InputText v-model="supplierForm.name" fluid placeholder="أدخل اسم المورد" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-field">
                        <label>الهاتف</label>
                        <InputText v-model="supplierForm.phone" fluid placeholder="مثال: 01012345678" />
                    </div>
                    <div class="form-field">
                        <label>الرقم الضريبي</label>
                        <InputText v-model="supplierForm.taxNumber" fluid placeholder="الرقم الضريبي" />
                    </div>
                </div>
                <div class="form-field">
                    <label>البريد الإلكتروني</label>
                    <InputText v-model="supplierForm.email" fluid placeholder="مثال: mail@example.com" />
                </div>
                <div class="form-field">
                    <label>العنوان</label>
                    <InputText v-model="supplierForm.address" fluid placeholder="العنوان" />
                </div>
                <div class="form-field">
                    <label>ملاحظات</label>
                    <Textarea v-model="supplierForm.notes" rows="3" fluid placeholder="ملاحظات إضافية..." />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showSupplierDialog = false" />
                    <Button label="حفظ المورد" @click="saveSupplier" :loading="supplierStore.loading" :disabled="!supplierForm.name" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.suppliers-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .suppliers-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* Header */
.suppliers-header {
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

.suppliers-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .suppliers-title {
    color: var(--p-surface-0);
}

.suppliers-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* Card Wrapper */
.suppliers-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .suppliers-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.suppliers-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .suppliers-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

/* Action Buttons */
.action-edit-btn,
.action-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    cursor: pointer;
    transition: all 0.15s;
}

.action-edit-btn {
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

.action-delete-btn {
    color: #ef4444;
    border-color: #fecaca;
    background: #fef2f2;
}

.dark .action-delete-btn {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
}

.action-delete-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
}

.dark .action-delete-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #f87171;
}

/* Dialog Form */
.supplier-dialog-form {
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
