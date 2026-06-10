import axios from "axios";
import { useToastStore } from "@/stores/base/toastStore";

let refreshPromise = null;

const AUTH_BASE_URL = import.meta.env.VITE_API_URL || "";

const decodeJwt = (token) => {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch (err) {
        console.warn("Failed to decode token", err);
        return null;
    }
};

const isExpiringSoon = (token, skewSeconds = 45) => {
    const payload = decodeJwt(token);
    if (!payload?.exp) return false;
    const now = Date.now() / 1000;
    return payload.exp - now < skewSeconds;
};

const refreshAccessToken = async () => {
    // De-duplicate concurrent refresh calls
    if (refreshPromise) return refreshPromise;

    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) throw new Error("No refresh token available");

    refreshPromise = axios
        .post(
            `${AUTH_BASE_URL}/TUser/refreshToken`,
            { refreshToken: storedRefreshToken },
            { headers: { Accept: "application/json" } }
        )
        .then((res) => {
            const data = res.data?.singleObject ?? res.data;
            const newAccess = data.token;
            const newRefresh = data.refreshToken;
            localStorage.setItem("accessToken", newAccess);
            if (newRefresh) localStorage.setItem("refreshToken", newRefresh);
            return newAccess;
        })
        .catch((err) => {
            console.error("Token refresh failed", err);
            // Clear tokens so the user is forced to login again
            ["accessToken", "refreshToken", "expiresAt", "userCode",
             "userName", "userDesc", "groupCode", "groupName", "role", "user"]
                .forEach((k) => localStorage.removeItem(k));
            throw err;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

const ensureFreshToken = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    if (isExpiringSoon(token)) {
        try {
            return await refreshAccessToken();
        } catch {
            return null;
        }
    }
    return token;
};

//const router = useRouter();
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "",
    headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        const token = await ensureFreshToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers["Accept-Language"] = localStorage.getItem("selectedLocale") || "ar";
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => {
        const toastStore = useToastStore();
        if (response.config.method !== "get") {
            // Check if success toast should be disabled
            const disableToast = response.config.headers?.disableToast;

            if (!disableToast) {
                toastStore.addSuccessToast(response.data.returnMessage);
            }
        }
        return response;
    },
    async (error) => {
        const toastStore = useToastStore();
        const status = error?.response?.status ?? error.status ?? null;

        // Treat API's 300 (validation/business error) as handled: don't spam console/toasts
        if (status === 300) {
            return Promise.reject(error);
        }

        if (status === 401) {
            const originalRequest = error.config || {};
            if (!originalRequest._retry) {
                originalRequest._retry = true;
                try {
                    const newToken = await refreshAccessToken();
                    if (newToken) {
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return apiClient(originalRequest);
                    }
                } catch (refreshErr) {
                    // Refresh failed – clear auth data and redirect to login
                    console.warn("Silent refresh failed", refreshErr);
                    [
                        "accessToken", "refreshToken", "expiresAt",
                        "userCode", "userName", "userDesc",
                        "groupCode", "groupName", "role", "user",
                    ].forEach((k) => localStorage.removeItem(k));
                    window.location.replace("/login");
                    return Promise.reject(refreshErr);
                }
            }

            // Token was invalid and no refresh available – clear and redirect
            [
                "accessToken", "refreshToken", "expiresAt",
                "userCode", "userName", "userDesc",
                "groupCode", "groupName", "role", "user",
            ].forEach((k) => localStorage.removeItem(k));
            console.warn("Unauthorized access – redirecting to login");
            window.location.replace("/login");
        } else if (status === 403) {
            toastStore.addErrorToast("You are not authorized to perform this action");
            console.warn("Forbidden access");
        } else if (status === 404) {
            toastStore.addErrorToast("The request you are looking for could not be found");
            console.warn("Not found");
        } else {
            console.warn("An error occurred:", error?.response?.data ?? error.message);
            if (error?.response?.data?.detail) {
                toastStore.addErrorToast(error.response.data.detail);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;

// async function refreshAuthToken() {
//     try {
//         const response = await axios.post(`${import.meta.env.VITE_API}/auth/refresh`, {
//             token: getFromLocalStorage('refreshToken'),
//         });

//         const { token } = response.data;
//         if (token) {
//             localStorage.setItem('token', token);
//             return token;
//         }
//         return null;
//     } catch (error) {
//         console.error('Failed to refresh token:', error);
//         return null;
//     }
// }
