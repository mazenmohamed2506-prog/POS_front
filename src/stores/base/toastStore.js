import { defineStore } from "pinia";

export const useToastStore = defineStore("toast", () => {
    // We store a reference to PrimeVue's toast service
    // This is set from a component context where useToast() is available
    let toastService = null;

    function setToastService(service) {
        toastService = service;
    }

    function addSuccessToast(message) {
        if (!message) return;
        if (toastService) {
            toastService.add({
                severity: "success",
                summary: "نجاح",
                detail: message,
                life: 3000,
            });
        }
    }

    function addErrorToast(message) {
        if (!message) return;
        if (toastService) {
            toastService.add({
                severity: "error",
                summary: "خطأ",
                detail: message,
                life: 5000,
            });
        }
    }

    function addWarningToast(message) {
        if (!message) return;
        if (toastService) {
            toastService.add({
                severity: "warn",
                summary: "تنبيه",
                detail: message,
                life: 4000,
            });
        }
    }

    function addInfoToast(message) {
        if (!message) return;
        if (toastService) {
            toastService.add({
                severity: "info",
                summary: "معلومة",
                detail: message,
                life: 3000,
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
