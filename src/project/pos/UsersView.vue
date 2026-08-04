<script setup>
import { ref, onMounted, computed } from "vue";
import { useUserStore } from "@/stores/pos/userStore";
import {
    Users, Plus, Pencil, Trash2, Search, HelpCircle, Shield,
    ShieldCheck, ShieldAlert, ToggleLeft, ToggleRight, Check
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";
import { useToastStore } from "@/stores/base/toastStore";

const userStore = useUserStore();

// ── Help Drawer ──
const showHelp = ref(false);
const usersHelpSections = [
    {
        title: "إدارة حسابات المستخدمين",
        icon: Users,
        color: "#dbeafe",
        iconColor: "#2563eb",
        steps: [
            { title: "إضافة حساب جديد", desc: "إدخال اسم المستخدم، كلمة السر، وتحديد الدور الوظيفي (مدير / كاشير)." },
            { title: "تفعيل وإيقاف الحسابات", desc: "تغيير حالة الحساب (نشط / معطل) لمنع الدخول دون حذف الحساب." },
        ],
    },
    {
        title: "تخصيص صلاحيات الأدوار",
        icon: Shield,
        color: "#fef3c7",
        iconColor: "#d97706",
        steps: [
            { title: "تعيين صلاحيات الشاشات", desc: "تحديد الصفحات المسموح لكل دور الوصول إليها من جدول الصلاحيات." },
            { title: "تطبيق التغيرات التلقائي", desc: "أي تعديل في صلاحيات الدور ينعكس فوراً على كل الموظفين المرتبطين به." },
        ],
    }
];
const usersHelpTips = [
    "صلاحيات حساب المدير كاملة ويجب حمايتها بكلمة مرور قوية.",
    "تغيير صلاحيات أي دور يؤثر آلياً على كافة مستخدمي هذا الدور بالنظام.",
];
// ── Tab State ──
const activeTab = ref(0);

// ── Users Tab State ──
const showUserDialog = ref(false);
const editingUser = ref(null);
const userForm = ref({
    username: "",
    password: "",
    role: "Cashier",
});

const roleOptions = computed(() => {
    return userStore.roles.map(r => ({
        label: roleNameAr(r.name),
        value: r.name
    }));
});

const filters = ref({ global: { value: "", matchMode: "contains" } });

// ── Permissions Tab State ──
const selectedRoleId = ref(null);
const editingPageIds = ref([]);
const savingPermissions = ref(false);

// ── Add Role State ──
const showRoleDialog = ref(false);
const newRoleName = ref("");
const newRolePageIds = ref([]);

const selectedRole = computed(() => {
    return userStore.roles.find(r => r.id === selectedRoleId.value) || null;
});

const roleNameAr = (name) => {
    const map = { admin: 'مدير', manager: 'مدير �داري', cashier: 'كاشير' };
    return name ? (map[name.toLowerCase()] || name) : name;
};

const roleSeverity = (name) => {
    const map = { admin: 'warn', manager: 'info', cashier: 'success' };
    return name ? (map[name.toLowerCase()] || 'secondary') : 'secondary';
};

const roleIcon = (name) => {
    if (!name) return Shield;
    const lowerName = name.toLowerCase();
    if (lowerName === 'admin') return ShieldAlert;
    if (lowerName === 'manager') return ShieldCheck;
    return Shield;
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
};

// ── Load Data ──
onMounted(async () => {
    await Promise.all([
        userStore.fetchUsers(),
        userStore.fetchRoles(),
        userStore.fetchAllPages(),
    ]);
    // Auto-select first role
    if (userStore.roles.length > 0) {
        selectRole(userStore.roles[0].id);
    }
});

// ── User CRUD ──
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
    // Basic frontend validation
    if (!userForm.value.username || userForm.value.username.trim() === '') {
        useToastStore().addWarningToast("يرجى �دخال اسم المستخدم");
        return;
    }
    
    if (!editingUser.value && (!userForm.value.password || userForm.value.password.length < 4)) {
        useToastStore().addWarningToast("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
        return;
    }

    try {
        if (editingUser.value) {
            await userStore.updateUser(editingUser.value.id, { ...userForm.value });
        } else {
            await userStore.createUser({ ...userForm.value });
        }
        showUserDialog.value = false;
    } catch (e) {
        // Error handled by store, keeping dialog open so user can fix issues
        console.error("Save user failed:", e);
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

const openNewRole = () => {
    newRoleName.value = "";
    newRolePageIds.value = [];
    showRoleDialog.value = true;
};

const saveNewRole = async () => {
    if (!newRoleName.value || newRoleName.value.trim() === "") {
        useToastStore().addWarningToast("يرجى �دخال اسم الدور");
        return;
    }
    try {
        await userStore.createRole(newRoleName.value.trim(), newRolePageIds.value);
        showRoleDialog.value = false;
        // Select the newly created role
        const newRole = userStore.roles.find(r => r.name.toLowerCase() === newRoleName.value.trim().toLowerCase());
        if (newRole) selectRole(newRole.id);
    } catch (e) {
        // Handled in store
    }
};

const deleteCustomRole = async (role) => {
    if (confirm(`هل أنت متأكد من حذف الدور "${role.name}"؟\nلا يمكن التراجع عن هذا ال�جراء.`)) {
        try {
            await userStore.deleteRole(role.id);
            if (selectedRoleId.value === role.id) {
                if (userStore.roles.length > 0) {
                    selectRole(userStore.roles[0].id);
                } else {
                    selectedRoleId.value = null;
                }
            }
        } catch (e) {
            // Handled in store
        }
    }
};

const toggleActive = async (user) => {
    try {
        await userStore.toggleUserActive(user.id);
    } catch {
        // Error handled by store
    }
};

// ── Permissions ──
const selectRole = (roleId) => {
    selectedRoleId.value = roleId;
    const role = userStore.roles.find(r => r.id === roleId);
    editingPageIds.value = role ? role.pages.map(p => p.id) : [];
};

const togglePage = (pageId) => {
    const idx = editingPageIds.value.indexOf(pageId);
    if (idx >= 0) {
        editingPageIds.value.splice(idx, 1);
    } else {
        editingPageIds.value.push(pageId);
    }
};

const isPageSelected = (pageId) => {
    return editingPageIds.value.includes(pageId);
};

const hasPermissionsChanged = computed(() => {
    if (!selectedRole.value) return false;
    const original = selectedRole.value.pages.map(p => p.id).sort();
    const current = [...editingPageIds.value].sort();
    if (original.length !== current.length) return true;
    return original.some((id, i) => id !== current[i]);
});

const savePermissions = async () => {
    if (!selectedRoleId.value) return;
    savingPermissions.value = true;
    try {
        await userStore.assignPagesToRole(selectedRoleId.value, editingPageIds.value);
        // Re-select to refresh
        selectRole(selectedRoleId.value);
    } catch {
        // Error handled by store
    } finally {
        savingPermissions.value = false;
    }
};

const selectAllPages = () => {
    editingPageIds.value = userStore.allPages.map(p => p.id);
};

const deselectAllPages = () => {
    editingPageIds.value = [];
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
                    <h1 class="users-title">�دارة المستخدمين والصلاحيات</h1>
                    <p class="users-subtitle">�دارة حسابات المستخدمين وتعيين صلاحيات الأدوار</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button v-if="activeTab === 0" label="�ضافة مستخدم" @click="openNewUser">
                    <template #icon>
                        <Plus :size="18" />
                    </template>
                </Button>
            </div>
        </div>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة المستخدمين والصلاحيات"
            page-subtitle="إنشاء حسابات المستخدمين وتعيين صلاحيات الأدوار"
            :page-icon="Users"
            header-gradient="linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)"
            :sections="usersHelpSections"
            :tips="usersHelpTips"
        />

        <!-- Tabs Container -->
        <div class="users-card">
            <TabView v-model:activeIndex="activeTab" class="users-tabs">
                <!-- ═══ Tab 1: Users ═══ -->
                <TabPanel>
                    <template #header>
                        <div class="tab-header-custom">
                            <Users :size="16" />
                            <span>المستخدمون</span>
                        </div>
                    </template>

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
                        <div class="users-count-badge">
                            <Users :size="14" />
                            <span>{{ userStore.users.length }} مستخدم</span>
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
                        <Column field="id" header="#" sortable style="min-width: 80px">
                            <template #body="{ data }">
                                <span class="font-mono text-surface-400">{{ data.id }}</span>
                            </template>
                        </Column>
                        <Column field="username" header="اسم المستخدم" sortable style="min-width: 200px">
                            <template #body="{ data }">
                                <div class="flex items-center gap-2">
                                    <div class="user-avatar" :class="{ 'user-avatar-inactive': !data.isActive }">
                                        {{ data.username?.charAt(0)?.toUpperCase() || '?' }}
                                    </div>
                                    <span class="font-bold text-surface-800 dark:text-surface-100" :class="{ 'text-surface-400 dark:text-surface-600': !data.isActive }">
                                        {{ data.username }}
                                    </span>
                                </div>
                            </template>
                        </Column>
                        <Column field="role" header="الدور" sortable style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag
                                    :value="roleNameAr(data.role)"
                                    :severity="roleSeverity(data.role)"
                                    class="font-medium"
                                />
                            </template>
                        </Column>
                        <Column field="isActive" header="الحالة" style="min-width: 130px">
                            <template #body="{ data }">
                                <button
                                    class="status-toggle-btn"
                                    :class="{ 'status-active': data.isActive, 'status-inactive': !data.isActive }"
                                    @click="toggleActive(data)"
                                    :title="data.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'"
                                >
                                    <component :is="data.isActive ? ToggleRight : ToggleLeft" :size="18" />
                                    <span>{{ data.isActive ? 'نشط' : 'معطّل' }}</span>
                                </button>
                            </template>
                        </Column>
                        <Column field="createdAt" header="تاريخ ال�نشاء" sortable style="min-width: 140px">
                            <template #body="{ data }">
                                <span class="text-surface-500 text-sm">{{ formatDate(data.createdAt) }}</span>
                            </template>
                        </Column>
                        <Column header="�جراءات" style="min-width: 120px; text-align: center">
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
                </TabPanel>

                <!-- ═══ Tab 2: Permissions ═══ -->
                <TabPanel>
                    <template #header>
                        <div class="tab-header-custom">
                            <Shield :size="16" />
                            <span>الصلاحيات</span>
                        </div>
                    </template>

                    <div class="permissions-container">
                        <!-- Role Selector -->
                        <div class="permissions-sidebar">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="permissions-sidebar-title !mb-0">الأدوار</h3>
                                <Button size="small" icon="pi pi-plus" label="�ضافة دور" outlined @click="openNewRole" />
                            </div>
                            <div class="role-list">
                                <button
                                    v-for="role in userStore.roles"
                                    :key="role.id"
                                    class="role-card"
                                    :class="{ 'role-card-selected': selectedRoleId === role.id }"
                                    @click="selectRole(role.id)"
                                >
                                    <div class="role-card-icon" :class="`role-icon-${role.name.toLowerCase()}`">
                                        <component :is="roleIcon(role.name)" :size="20" />
                                    </div>
                                    <div class="role-card-info flex-grow">
                                        <span class="role-card-name">{{ roleNameAr(role.name) }}</span>
                                        <span class="role-card-count">{{ role.pages.length }} صفحة</span>
                                    </div>
                                    <!-- Show specific pages only for custom roles -->
                                    <div v-if="!role.name || !['admin', 'manager', 'cashier'].includes(role.name.toLowerCase())" class="ms-auto" @click.stop>
                                        <button class="action-delete-btn" @click.stop="deleteCustomRole(role)" title="حذف الدور">
                                            <Trash2 :size="15" />
                                        </button>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <!-- Pages Assignment -->
                        <div class="permissions-main">
                            <div v-if="selectedRole" class="permissions-content">
                                <div class="permissions-header-bar">
                                    <div>
                                        <h3 class="permissions-role-title">
                                            صلاحيات دور: <Tag :value="roleNameAr(selectedRole.name)" :severity="roleSeverity(selectedRole.name)" />
                                        </h3>
                                        <p class="permissions-role-desc">حدد الصفحات التي يمكن لمستخدمي هذا الدور الوصول لها</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <Button label="تحديد الكل" size="small" outlined severity="secondary" @click="selectAllPages" />
                                        <Button label="�لغاء الكل" size="small" outlined severity="secondary" @click="deselectAllPages" />
                                    </div>
                                </div>

                                <div class="pages-grid">
                                    <button
                                        v-for="page in userStore.allPages"
                                        :key="page.id"
                                        class="page-check-card"
                                        :class="{ 'page-check-selected': isPageSelected(page.id) }"
                                        @click="togglePage(page.id)"
                                    >
                                        <div class="page-check-indicator">
                                            <Check v-if="isPageSelected(page.id)" :size="14" />
                                        </div>
                                        <div class="page-check-info">
                                            <span class="page-check-name">{{ page.name }}</span>
                                            <code class="page-check-path">{{ page.path }}</code>
                                        </div>
                                    </button>
                                </div>

                                <!-- Save Bar -->
                                <div v-if="hasPermissionsChanged" class="permissions-save-bar">
                                    <span class="permissions-save-text">لديك تغييرات غير محفوظة في الصلاحيات</span>
                                    <Button
                                        label="حفظ الصلاحيات"
                                        @click="savePermissions"
                                        :loading="savingPermissions"
                                        size="small"
                                    >
                                        <template #icon>
                                            <ShieldCheck :size="16" />
                                        </template>
                                    </Button>
                                </div>
                            </div>
                            <div v-else class="permissions-empty">
                                <Shield :size="48" class="text-surface-300 dark:text-surface-600" />
                                <p>اختر دورًا من القائمة لعرض وتعديل صلاحياته</p>
                            </div>
                        </div>
                    </div>
                </TabPanel>
            </TabView>
        </div>

        <!-- User Dialog -->
        <Dialog
            v-model:visible="showUserDialog"
            :header="editingUser ? 'تعديل بيانات المستخدم' : '�ضافة مستخدم جديد'"
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
                    <label class="required">الدور</label>
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
                    <Button label="�لغاء" outlined severity="secondary" @click="showUserDialog = false" />
                    <Button label="حفظ المستخدم" @click="saveUser" :loading="userStore.loading" />
                </div>
            </template>
        </Dialog>

        <!-- Add Role Dialog -->
        <Dialog
            v-model:visible="showRoleDialog"
            header="�ضافة دور جديد"
            :style="{ width: '460px' }"
            modal
            dismissableMask
        >
            <div class="user-dialog-form">
                <div class="form-field">
                    <label class="required">اسم الدور</label>
                    <InputText v-model="newRoleName" fluid placeholder="مثال: محاسب، مشرف مستودع" />
                </div>
                <div class="form-field">
                    <label>صلاحيات مبدئية</label>
                    <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--p-surface-200); border-radius: 0.375rem; padding: 0.5rem;" class="dark:border-surface-700">
                        <div v-for="page in userStore.allPages" :key="page.id" class="flex items-center gap-2 mb-2 last:mb-0">
                            <Checkbox v-model="newRolePageIds" :inputId="'page-' + page.id" name="pages" :value="page.id" />
                            <label :for="'page-' + page.id" class="text-sm cursor-pointer">{{ page.name }}</label>
                        </div>
                        <div v-if="userStore.allPages.length === 0" class="text-surface-500 text-sm text-center">لا توجد صفحات متاحة</div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="�لغاء" outlined severity="secondary" @click="showRoleDialog = false" />
                    <Button label="حفظ الدور" @click="saveNewRole" :loading="userStore.loading" />
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

/* Tab Header Custom */
.tab-header-custom {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
}

/* Filter Bar */
.users-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
    gap: 1rem;
}

.dark .users-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

.users-count-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--p-surface-500);
    background: var(--p-surface-100);
    padding: 0.375rem 0.75rem;
    border-radius: 2rem;
    white-space: nowrap;
}

.dark .users-count-badge {
    background: var(--p-surface-800);
    color: var(--p-surface-400);
}

/* User Avatar */
.user-avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
    background: linear-gradient(135deg, var(--p-primary-400), var(--p-primary-600));
    color: white;
    flex-shrink: 0;
}

.user-avatar-inactive {
    background: var(--p-surface-300);
    color: var(--p-surface-500);
}

.dark .user-avatar-inactive {
    background: var(--p-surface-700);
    color: var(--p-surface-500);
}

/* Status Toggle Button */
.status-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 2rem;
    border: 1px solid transparent;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.status-active {
    background: #dcfce7;
    color: #15803d;
    border-color: #bbf7d0;
}

.dark .status-active {
    background: rgba(34, 197, 94, 0.1);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.25);
}

.status-inactive {
    background: #fee2e2;
    color: #dc2626;
    border-color: #fecaca;
}

.dark .status-inactive {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.25);
}

.status-toggle-btn:hover {
    filter: brightness(0.95);
    transform: scale(1.02);
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

/* ═══ Permissions Tab ═══ */
.permissions-container {
    display: flex;
    min-height: 500px;
    border-top: 1px solid var(--p-surface-200);
}

.dark .permissions-container {
    border-color: var(--p-surface-800);
}

@media (max-width: 768px) {
    .permissions-container {
        flex-direction: column;
        min-height: auto;
    }
}

/* Sidebar */
.permissions-sidebar {
    width: 240px;
    flex-shrink: 0;
    border-inline-end: 1px solid var(--p-surface-200);
    padding: 1rem;
    background: var(--p-surface-50);
}

.dark .permissions-sidebar {
    background: var(--p-surface-950);
    border-color: var(--p-surface-800);
}

@media (max-width: 768px) {
    .permissions-sidebar {
        width: 100%;
        border-inline-end: none;
        border-bottom: 1px solid var(--p-surface-200);
    }

    .dark .permissions-sidebar {
        border-bottom-color: var(--p-surface-800);
    }
}

.permissions-sidebar-title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.75rem;
}

.role-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

@media (max-width: 768px) {
    .role-list {
        flex-direction: row;
    }
}

.role-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    border: 1.5px solid var(--p-surface-200);
    background: var(--p-surface-0);
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    text-align: start;
}

.dark .role-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.role-card:hover {
    border-color: var(--p-primary-300);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.dark .role-card:hover {
    border-color: var(--p-primary-700);
}

.role-card-selected {
    border-color: var(--p-primary-500);
    background: var(--p-primary-50);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.dark .role-card-selected {
    border-color: var(--p-primary-500);
    background: rgba(99, 102, 241, 0.08);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.role-card-icon {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.role-icon-admin {
    background: #fef3c7;
    color: #d97706;
}

.dark .role-icon-admin {
    background: rgba(217, 119, 6, 0.15);
    color: #fbbf24;
}

.role-icon-manager {
    background: #dbeafe;
    color: #2563eb;
}

.dark .role-icon-manager {
    background: rgba(37, 99, 235, 0.15);
    color: #60a5fa;
}

.role-icon-cashier {
    background: #dcfce7;
    color: #16a34a;
}

.dark .role-icon-cashier {
    background: rgba(22, 163, 74, 0.15);
    color: #4ade80;
}

.role-card-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.role-card-name {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--p-surface-800);
}

.dark .role-card-name {
    color: var(--p-surface-100);
}

.role-card-count {
    font-size: 0.75rem;
    color: var(--p-surface-500);
}

/* Main Content */
.permissions-main {
    flex: 1;
    padding: 1.25rem;
    min-width: 0;
}

.permissions-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.permissions-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
}

.permissions-role-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--p-surface-800);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.dark .permissions-role-title {
    color: var(--p-surface-100);
}

.permissions-role-desc {
    font-size: 0.8125rem;
    color: var(--p-surface-500);
    margin: 0.25rem 0 0;
}

/* Pages Grid */
.pages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.625rem;
}

@media (max-width: 640px) {
    .pages-grid {
        grid-template-columns: 1fr;
    }
}

.page-check-card {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem;
    border-radius: 0.625rem;
    border: 1.5px solid var(--p-surface-200);
    background: var(--p-surface-0);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: start;
}

.dark .page-check-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.page-check-card:hover {
    border-color: var(--p-primary-300);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.dark .page-check-card:hover {
    border-color: var(--p-primary-600);
}

.page-check-selected {
    border-color: var(--p-primary-500);
    background: var(--p-primary-50);
}

.dark .page-check-selected {
    border-color: var(--p-primary-500);
    background: rgba(99, 102, 241, 0.08);
}

.page-check-indicator {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.375rem;
    border: 2px solid var(--p-surface-300);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s ease;
}

.dark .page-check-indicator {
    border-color: var(--p-surface-600);
}

.page-check-selected .page-check-indicator {
    background: var(--p-primary-500);
    border-color: var(--p-primary-500);
    color: white;
}

.page-check-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.page-check-name {
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--p-surface-800);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dark .page-check-name {
    color: var(--p-surface-100);
}

.page-check-path {
    font-size: 0.6875rem;
    color: var(--p-surface-400);
    font-family: monospace;
}

/* Save Bar */
.permissions-save-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: var(--p-primary-50);
    border: 1px solid var(--p-primary-200);
    animation: slideUp 0.3s ease;
}

.dark .permissions-save-bar {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.25);
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

.permissions-save-text {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--p-primary-700);
}

.dark .permissions-save-text {
    color: var(--p-primary-300);
}

/* Empty State */
.permissions-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    height: 100%;
    min-height: 300px;
    color: var(--p-surface-400);
    font-size: 0.875rem;
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
