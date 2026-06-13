import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useUserStore = defineStore("user", () => {
    const users = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    function mapApiUserToFrontend(apiUser) {
        return {
            id: apiUser.id,
            username: apiUser.username || apiUser.userName || "",
            role: apiUser.role || "",
            isActive: apiUser.isActive ?? true,
            createdAt: apiUser.createdAt || null,
        };
    }

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
            toastStore.addSuccessToast("تم إنشاء المستخدم بنجاح");
            await fetchUsers();
        } catch (err) {
            console.error("Failed to create user:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إنشاء المستخدم";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء إنشاء المستخدم");
            throw err;
        } finally {
            loading.value = false;
        }
    }

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
            toastStore.addSuccessToast("تم تعديل المستخدم بنجاح");
            await fetchUsers();
        } catch (err) {
            console.error("Failed to update user:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعديل المستخدم";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تعديل المستخدم");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function deleteUser(id) {
        loading.value = true;
        error.value = null;
        try {
            await apiDelete(`/Users/${id}`, {}, false);
            toastStore.addSuccessToast("تم حذف المستخدم بنجاح");
            await fetchUsers();
        } catch (err) {
            console.error("Failed to delete user:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء حذف المستخدم";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء حذف المستخدم");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        users,
        loading,
        error,
        fetchUsers,
        getUserById,
        createUser,
        updateUser,
        deleteUser,
    };
});
