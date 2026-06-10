import { defineStore } from "pinia";
import { ref } from "vue";
import { useBaseStore } from "./baseStore";

export const useAuthStore = defineStore("auth", () => {
    // ── State ──
    const userName = ref(localStorage.getItem("userName") || "");
    const userPages = ref([]);

    // ── Actions ──
    function login(tokenData) {
        const { token, refreshToken, userName: name } = tokenData;
        localStorage.setItem("accessToken", token);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        if (name) {
            userName.value = name;
            localStorage.setItem("userName", name);
        }
    }

    function logout() {
        // Clear all auth-related data
        [
            "accessToken",
            "refreshToken",
            "expiresAt",
            "userCode",
            "userName",
            "userDesc",
            "groupCode",
            "groupName",
            "role",
            "user",
            "posUser",
            "posRole",
            "currentShift",
        ].forEach((k) => localStorage.removeItem(k));

        userName.value = "";
        userPages.value = [];

        const baseStore = useBaseStore();
        baseStore.setUser(null);

        window.location.replace("/login");
    }

    async function getUserPages() {
        // TODO: Fetch user's allowed pages from your API
        // Example:
        // const response = await apiGet("/api/user/pages");
        // userPages.value = response.data;
        userPages.value = [];
    }

    return {
        userName,
        userPages,
        login,
        logout,
        getUserPages,
    };
});
