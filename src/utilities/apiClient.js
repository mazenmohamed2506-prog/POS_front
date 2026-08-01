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
        if (response.config.method && response.config.method !== "get") {
            // Check if success toast should be disabled
            const disableToast = response.config.headers?.disableToast;

            if (!disableToast) {
                const msg = response.data?.returnMessage || response.data?.message;
                if (msg) {
                    toastStore.addSuccessToast(msg);
                } else {
                    const method = response.config.method.toLowerCase();
                    if (method === "post") {
                        toastStore.addSuccessToast("تم حفظ البيانات بنجاح");
                    } else if (method === "put" || method === "patch") {
                        toastStore.addSuccessToast("تم التحديث بنجاح");
                    } else if (method === "delete") {
                        toastStore.addSuccessToast("تم الحذف بنجاح");
                    }
                }
            }
        }
        return response;
    },
    async (error) => {
        const toastStore = useToastStore();
        const status = error?.response?.status ?? error.status ?? null;

        // Treat API's 300 (validation/business error) as handled: don't spam console/toasts
        if (status === 300) {
            const data = error?.response?.data;
            const msg = data?.detail || data?.message || data?.returnMessage;
            if (msg) toastStore.addWarningToast(msg);
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

            [
                "accessToken", "refreshToken", "expiresAt",
                "userCode", "userName", "userDesc",
                "groupCode", "groupName", "role", "user",
            ].forEach((k) => localStorage.removeItem(k));
            console.warn("Unauthorized access – redirecting to login");
            window.location.replace("/login");
        } else if (status === 403) {
            toastStore.addErrorToast("غير مصرح لك بالقيام بهذا الإجراء");
            console.warn("Forbidden access");
        } else if (status === 404) {
            toastStore.addErrorToast("العنصر المطلوب غير موجود");
            console.warn("Not found");
        } else if (status === 400) {
            const data = error?.response?.data;
            if (data) {
                if (data.errors) {
                    const messages = Object.values(data.errors).flat();
                    const msg = messages.join(' | ') || 'خطأ في البيانات المدخلة';
                    toastStore.addErrorToast(msg);
                } else if (data.detail) {
                    toastStore.addErrorToast(data.detail);
                } else if (data.message) {
                    toastStore.addErrorToast(data.message);
                } else if (typeof data === 'string') {
                    toastStore.addErrorToast(data);
                } else {
                    toastStore.addErrorToast('خطأ في البيانات المدخلة');
                }
            } else {
                toastStore.addErrorToast('خطأ في البيانات المدخلة');
            }
            console.warn("Bad request:", data);
        } else {
            const detailMsg = error?.response?.data?.detail || error?.response?.data?.message || "حدث خطأ غير متوقع بالخادم";
            toastStore.addErrorToast(detailMsg);
            console.warn("An error occurred:", error?.response?.data ?? error.message);
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
