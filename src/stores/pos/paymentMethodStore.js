import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const usePaymentMethodStore = defineStore("paymentMethod", () => {
    const methodsByContext = ref({});
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    const fallbackMethods = {
        pos_sale: [
            { code: "Cash", name: "نقدي (كاش)", type: "direct", requiresCustomer: false },
            { code: "Card", name: "بطاقة بنكية", type: "direct", requiresCustomer: false },
            { code: "BankTransfer", name: "تحويل بنكي", type: "direct", requiresCustomer: false },
            { code: "Credit", name: "بيع آجل (على الحساب)", type: "credit", requiresCustomer: true }
        ],
        debt_repayment: [
            { code: "Cash", name: "نقدي (كاش)", type: "direct", requiresCustomer: false },
            { code: "BankTransfer", name: "تحويل بنكي", type: "direct", requiresCustomer: false },
            { code: "Card", name: "بطاقة بنكية", type: "direct", requiresCustomer: false }
        ]
    };

    async function fetchPaymentMethods(context = "pos_sale") {
        loading.value = true;
        error.value = null;
        try {
            let response;
            try {
                response = await apiGet(`/payment-methods?context=${context}`);
            } catch {
                response = await apiGet(`/PaymentMethods?context=${context}`);
            }
            const data = response?.data || response || [];
            if (Array.isArray(data) && data.length > 0) {
                methodsByContext.value[context] = data;
                return data;
            }
            methodsByContext.value[context] = fallbackMethods[context] || fallbackMethods.pos_sale;
            return methodsByContext.value[context];
        } catch (err) {
            console.warn(`Payment methods fetch failed for context '${context}', using fallback:`, err);
            error.value = err.message || "Failed to load payment methods";
            methodsByContext.value[context] = fallbackMethods[context] || fallbackMethods.pos_sale;
            return methodsByContext.value[context];
        } finally {
            loading.value = false;
        }
    }

    function getMethodsForContext(context = "pos_sale") {
        return methodsByContext.value[context] || fallbackMethods[context] || fallbackMethods.pos_sale;
    }

    return {
        methodsByContext,
        loading,
        error,
        fetchPaymentMethods,
        getMethodsForContext
    };
});
