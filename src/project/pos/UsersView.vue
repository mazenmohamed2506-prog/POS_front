<script setup>
import { ref, onMounted } from "vue";
import { useUserStore } from "@/stores/pos/userStore";
import { Users, Plus, Pencil, Trash2, Search } from "lucide-vue-next";

const userStore = useUserStore();

const showUserDialog = ref(false);
const editingUser = ref(null);
const userForm = ref({
    username: "",
    password: "",
    role: "Cashier",
});

const roleOptions = [
    { label: "مدير", value: "Manager" },
    { label: "كاشير", value: "Cashier" },
];

const filters = ref({ global: { value: "", matchMode: "contains" } });

onMounted(() => {
    userStore.fetchUsers();
});

const openNewUser = () => {
    editingUser.value = null;
    userForm.value = { username: "", password: "", role: "Cashier" };
    showUserDialog.value = true;
};

const openEditUser = (user) => {
    editingUser.value = user;
    userForm.value = { username: user.username, password: "", role: user.role };
    showUserDialog.value = true;
};

const saveUser = async () => {
    try {
        if (editingUser.value) {
            await userStore.updateUser(editingUser.value.id, { ...userForm.value });
        } else {
            await userStore.createUser({ ...userForm.value });
        }
        showUserDialog.value = false;
    } catch {
        // Error handled by store
    }
};

const confirmDelete = async (user) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم "${user.username}"؟`)) {
        try {
            await userStore.deleteUser(user.id);
        } catch {
            // Error handled by store
        }
    }
};
</script>

<template>
    <div class="users-page">
        <!-- Header -->
        <div class="users-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <Users :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="users-title">إدارة المستخدمين</h1>
                    <p class="users-subtitle">إدارة حسابات الكاشير والمدراء وتعيين الصلاحيات</p>
                </div>
            </div>
            <Button label="إضافة مستخدم" @click="openNewUser">
                <template #icon>
                    <Plus :size="18" />
                </template>
            </Button>
        </div>

        <!-- Table Container Card -->
        <div class="users-card">
            <!-- Filter Bar -->
            <div class="users-filter-bar">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="filters.global.value"
                        placeholder="بحث عن مستخدم..."
                        class="ps-9 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Users Table -->
            <DataTable
                :value="userStore.users"
                :loading="userStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                v-model:filters="filters"
                filterDisplay="row"
                :globalFilterFields="['username', 'role']"
                emptyMessage="لا يوجد مستخدمين مطابِقين"
                stripedRows
                removableSort
                scrollable
                class="users-table"
            >
                <Column field="id" header="#" sortable style="min-width: 90px">
                    <template #body="{ data }">
                        <span class="font-mono text-surface-400">{{ data.id }}</span>
                    </template>
                </Column>
                <Column field="username" header="اسم المستخدم" sortable style="min-width: 220px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.username }}</span>
                    </template>
                </Column>
                <Column field="role" header="الصلاحية" sortable style="min-width: 160px">
                    <template #body="{ data }">
                        <Tag
                            :value="data.role === 'Manager' ? 'مدير' : 'كاشير'"
                            :severity="data.role === 'Manager' ? 'info' : 'success'"
                            class="font-medium"
                        />
                    </template>
                </Column>
                <Column field="isActive" header="الحالة" style="min-width: 140px">
                    <template #body="{ data }">
                        <Tag
                            :value="data.isActive ? 'نشط' : 'غير نشط'"
                            :severity="data.isActive ? 'success' : 'danger'"
                            class="font-medium"
                        />
                    </template>
                </Column>
                <Column header="إجراءات" style="min-width: 120px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex gap-1 justify-center">
                            <button class="action-edit-btn" @click="openEditUser(data)" title="تعديل">
                                <Pencil :size="15" />
                            </button>
                            <button class="action-delete-btn" @click="confirmDelete(data)" title="حذف">
                                <Trash2 :size="15" />
                            </button>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- User Dialog -->
        <Dialog
            v-model:visible="showUserDialog"
            :header="editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'"
            :style="{ width: '460px' }"
            modal
            dismissableMask
        >
            <div class="user-dialog-form">
                <div class="form-field">
                    <label class="required">اسم المستخدم</label>
                    <InputText v-model="userForm.username" fluid placeholder="مثال: ahmad_pos" />
                </div>
                <div class="form-field">
                    <label :class="{ 'required': !editingUser }">
                        {{ editingUser ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور' }}
                    </label>
                    <InputText v-model="userForm.password" type="password" fluid placeholder="أدخل كلمة المرور" />
                </div>
                <div class="form-field">
                    <label class="required">الصلاحية (الدور)</label>
                    <Select
                        v-model="userForm.role"
                        :options="roleOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                        placeholder="اختر دور المستخدم"
                    />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showUserDialog = false" />
                    <Button label="حفظ المستخدم" @click="saveUser" :loading="userStore.loading" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.users-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .users-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* Header */
.users-header {
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

.users-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .users-title {
    color: var(--p-surface-0);
}

.users-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* Card Wrapper */
.users-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .users-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.users-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .users-filter-bar {
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
.user-dialog-form {
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
