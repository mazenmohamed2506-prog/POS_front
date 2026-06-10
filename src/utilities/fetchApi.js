import axios from "./apiClient";

export function apiGet(request, options = {}) {
    return axios.get(request, options);
}
export function apiPost(request, options = {}, toast = true) {
    const headers = {
        ...options.headers,
        disableToast: !toast,
    };

    return axios.post(request, options, { headers: headers });
}
export function apiPut(request, options = {}, toast = true) {
    const headers = {
        ...options.headers,
        disableToast: !toast,
    };
    return axios.put(request, options, { headers: headers });
}
export function apiDelete(request, options = {}, toast = true) {
    const headers = {
        ...options.headers,
        disableToast: !toast,
    };
    return axios.delete(request, options, { headers: headers });
}
export function apiPatch(request, options = {}, toast = true) {
    const headers = {
        ...options.headers,
        disableToast: !toast,
    };
    return axios.patch(request, options, { headers: headers });
}
