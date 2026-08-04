import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useUserStore = defineStore("user", () => {
    const users = ref([]);
    const roles = ref([]);
    const allPages = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    function mapApiUserToFrontend(apiUser) {
        return {
            id: apiUser.id,
            username: apiUser.username || apiUser.userName || "",
            role: apiUser.role || "",
            roleId: apiUser.roleId || null,
            isActive: apiUser.isActive ?? true,
            createdAt: apiUser.createdAt || null,
            pages: (apiUser.pages || []).map(p => ({
                id: p.id,
                name: p.name,
                path: p.path,
            })),
        };
    }

    // ── Fetch Users ──
    async function fetchUsers() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Users");
            const rawUsers = response.data || [];
            users.value = rawUsers.map(mapApiUserToFrontend);
        } catch (err) {
            console.error("Failed to fetch users:", err);
            error.value = err.message || "Failed to load users";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل المستخدمين");
        } finally {
            loading.value = false;
        }
    }

    // ── Fetch Single User ──
    async function getUserById(id) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Users/${id}`);
            return response.data ? mapApiUserToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to fetch user:", err);
            error.value = err.message || "Failed to load user";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ── Fetch Roles with Pages ──
    async function fetchRoles() {
        try {
            const response = await apiGet("/Users/roles");
            roles.value = (response.data || []).map(r => ({
                id: r.id,
                name: r.name,
                pages: (r.pages || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    path: p.path,
                })),
            }));
        } catch (err) {
            console.error("Failed to fetch roles:", err);
            toastStore.addErrorToast("حدث خطأ أثناء تحميل الأدوار");
        }
    }

    // ── Fetch All System Pages ──
    async function fetchAllPages() {
        try {
            const response = await apiGet("/Pages/all");
            allPages.value = (response.data || []).map(p => ({
                id: p.id,
                name: p.name,
                path: p.path,
            }));
        } catch (err) {
            console.error("Failed to fetch all pages:", err);
            toastStore.addErrorToast("حدث خطأ أثناء تحميل الصفحات");
        }
    }

    // ── Create User ──
    async function createUser(userData) {
        loading.value = true;
        error.value = null;
        try {
            const payload = {
                username: userData.username,
                password: userData.password,
                role: userData.role || "Cashier",
            };

            await apiPost("/Users", payload, false);
            toastStore.addSuccessToast(`تم إنشاء حساب المستخدم "${userData.username}" بنجاح`, "إنشاء مستخدم جديد");
            await fetchUsers();
        } catch (err) {
            console.error("Failed to create user:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إنشاء المستخدم";
            toastStore.addErrorToast(`السبب: ${typeof detail === "string" ? detail : "اسم المستخدم مستخدم بالفعل أو البيانات غير صالحة"}`, "فشل إنشاء المستخدم");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ── Update User ──
    async function updateUser(id, userData) {
        loading.value = true;
        error.value = null;
        try {
            const payload = {
                username: userData.username,
                role: userData.role,
            };
            if (userData.password) {
                payload.password = userData.password;
            }

            await apiPut(`/Users/${id}`, payload, false);
            toastStore.addSuccessToast(`تم تحديث بيانات المستخدم "${userData.username}" بنجاح`, "تحديث حساب مستخدم");
            await fetchUsers();
        } catch (err) {
            console.error("Failed to update user:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعديل المستخدم";
            toastStore.addErrorToast(`السبب: ${typeof detail === "string" ? detail : "خطأ أثناء حفظ تعديلات المستخدم"}`, "فشل تعديل المستخدم");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ── Toggle User Active/Inactive ──
    async function toggleUserActive(id) {
        try {
            const u = users.value.find(user => user.id === id);
            const uName = u ? u.username : `رقم ${id}`;
            await apiPatch(`/Users/${id}/toggle-active`, {}, false);
            toastStore.addSuccessToast(`تم تغيير حالة حساب المستخدم "${uName}" بنجاح`, "تحديث حالة الحساب");
            await fetchUsers();
        } catch (err) {
            console.error("Failed to toggle user active:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تحديث حالة المستخدم";
            toastStore.addErrorToast(`السبب: ${typeof detail === "string" ? detail : "تعذر تغيير حالة الحساب"}`, "فشل تحديث الحالة");
            throw err;
        }
    }

    // ── Delete User ──
    async function deleteUser(id) {
        loading.value = true;
        error.value = null;
        try {
            const u = users.value.find(user => user.id === id);
            const uName = u ? u.username : `رقم ${id}`;
            await apiDelete(`/Users/${id}`, {}, false);
            toastStore.addSuccessToast(`تم حذف حساب المستخدم "${uName}" بنجاح`, "حذف مستخدم");
            await fetchUsers();
        } catch (err) {
            console.error("Failed to delete user:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف المستخدم";
            toastStore.addErrorToast(`السبب: ${typeof detail === "string" ? detail : "المستخدم مرتبطة به عمليات بالنظام ولا يمكن حذفه"}`, "فشل حذف المستخدم");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ── Assign Pages to Role ──
    async function assignPagesToRole(roleId, pageIds) {
        loading.value = true;
        error.value = null;
        try {
            await apiPost("/Pages/assign", { roleId, pageIds }, false);
            toastStore.addSuccessToast("تم تحديث وحفظ صلاحيات الدور بنجاح", "تعديل الصلاحيات");
            await fetchRoles();
        } catch (err) {
            console.error("Failed to assign pages:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعيين الصلاحيات";
            toastStore.addErrorToast(`السبب: ${typeof detail === "string" ? detail : "خطأ أثناء حفظ تعيين الصلاحيات"}`, "فشل تعديل الصلاحيات");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ── Create Role ──
    async function createRole(roleName, pageIds) {
        loading.value = true;
        error.value = null;
        try {
            await apiPost("/Roles", { name: roleName, pageIds: pageIds || [] }, false);
            toastStore.addSuccessToast(`تم إنشاء الدور "${roleName}" بنجاح`, "إنشاء دور");
            await fetchRoles();
        } catch (err) {
            console.error("Failed to create role:", err);
            const detail = err.response?.data?.message || "حدث خطأ أثناء إنشاء الدور";
            toastStore.addErrorToast(`السبب: ${detail}`, "فشل إنشاء الدور");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ── Delete Role ──
    async function deleteRole(id) {
        loading.value = true;
        error.value = null;
        try {
            await apiDelete(`/Roles/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف الدور بنجاح", "حذف دور");
            await fetchRoles();
        } catch (err) {
            console.error("Failed to delete role:", err);
            const detail = err.response?.data?.message || "حدث خطأ أثناء حذف الدور";
            toastStore.addErrorToast(`السبب: ${detail}`, "فشل حذف الدور");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        users,
        roles,
        allPages,
        loading,
        error,
        fetchUsers,
        getUserById,
        fetchRoles,
        fetchAllPages,
        createUser,
        updateUser,
        toggleUserActive,
        deleteUser,
        assignPagesToRole,
        createRole,
        deleteRole,
    };
});
