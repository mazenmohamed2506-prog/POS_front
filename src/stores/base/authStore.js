import { defineStore } from "pinia";
import { ref } from "vue";
import { useBaseStore } from "./baseStore";
import { apiGet } from "@/utilities/fetchApi";

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
        try {
            const response = await apiGet("/Pages");
            userPages.value = response.data || [];
        } catch (err) {
            console.error("Failed to fetch user pages:", err);
            userPages.value = [];
        }
    }

    return {
        userName,
        userPages,
        login,
        logout,
        getUserPages,
    };
});

