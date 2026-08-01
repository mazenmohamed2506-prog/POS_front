import { defineStore } from "pinia";

export const useToastStore = defineStore("toast", () => {
    let toastService = null;

    function setToastService(service) {
        toastService = service;
    }

    function formatMessage(msg) {
        if (!msg) return "";
        if (typeof msg === "string") return msg;
        if (Array.isArray(msg)) return msg.join(" | ");
        if (typeof msg === "object") {
            if (msg.detail) return String(msg.detail);
            if (msg.message) return String(msg.message);
            return JSON.stringify(msg);
        }
        return String(msg);
    }

    function addSuccessToast(message, summary = "نجاح", life = 3000) {
        const text = formatMessage(message);
        if (!text) return;
        if (toastService) {
            toastService.add({
                severity: "success",
                summary,
                detail: text,
                life,
            });
        }
    }

    function addErrorToast(message, summary = "خطأ", life = 5000) {
        const text = formatMessage(message);
        if (!text) return;
        if (toastService) {
            toastService.add({
                severity: "error",
                summary,
                detail: text,
                life,
            });
        }
    }

    function addWarningToast(message, summary = "تنبيه", life = 4000) {
        const text = formatMessage(message);
        if (!text) return;
        if (toastService) {
            toastService.add({
                severity: "warn",
                summary,
                detail: text,
                life,
            });
        }
    }

    function addInfoToast(message, summary = "معلومة", life = 3500) {
        const text = formatMessage(message);
        if (!text) return;
        if (toastService) {
            toastService.add({
                severity: "info",
                summary,
                detail: text,
                life,
            });
        }
    }

    return {
        setToastService,
        addSuccessToast,
        addErrorToast,
        addWarningToast,
        addInfoToast,
    };
});

