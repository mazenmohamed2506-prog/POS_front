import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const usePageStore = defineStore("page", () => {
    const pages = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    function mapApiPageToFrontend(apiPage) {
        return {
            id: apiPage.id,
            name: apiPage.name || apiPage.pageName || "",
            nameAr: apiPage.nameAr || apiPage.arabicName || apiPage.name || "",
            route: apiPage.route || apiPage.url || "",
            icon: apiPage.icon || "",
            isActive: apiPage.isActive ?? true,
        };
    }

    async function fetchPages() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Pages");
            const rawPages = response.data || [];
            pages.value = rawPages.map(mapApiPageToFrontend);
        } catch (err) {
            console.error("Failed to fetch pages:", err);
            error.value = err.message || "Failed to load pages";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل الصفحات");
        } finally {
            loading.value = false;
        }
    }

    async function createPage(pageData) {
        loading.value = true;
        error.value = null;
        try {
            const payload = {
                name: pageData.name,
                nameAr: pageData.nameAr || pageData.name,
                route: pageData.route || "",
                icon: pageData.icon || "",
            };

            await apiPost("/Pages", payload, false);
            toastStore.addSuccessToast("تم إنشاء الصفحة بنجاح");
            await fetchPages();
        } catch (err) {
            console.error("Failed to create page:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء إنشاء الصفحة";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء إنشاء الصفحة");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function assignPages(assignData) {
        loading.value = true;
        error.value = null;
        try {
            await apiPost("/Pages/assign", assignData, false);
            toastStore.addSuccessToast("تم تعيين الصلاحيات بنجاح");
        } catch (err) {
            console.error("Failed to assign pages:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || "حدث خطأ أثناء تعيين الصلاحيات";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تعيين الصلاحيات");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        pages,
        loading,
        error,
        fetchPages,
        createPage,
        assignPages,
    };
});
