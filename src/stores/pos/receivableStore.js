import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useReceivableStore = defineStore("receivable", () => {
    const receivables = ref([]);
    const clientDetails = ref(null);
    const totalOutstandingAmount = ref(0);
    const totalSalesAmount = ref(0);
    const totalPaidAmount = ref(0);
    const totalCustomersCount = ref(0);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    /**
     * Fetch all customers with their outstanding balances and backend-computed summaries.
     * GET /api/receivables/customers/with-balances → ReceivablesSummaryDto
     */
    async function fetchReceivables() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/receivables/customers/with-balances");
            const rawData = response.data || response || {};
            const customers = Array.isArray(rawData) ? rawData : (rawData.customers || rawData.items || []);

            receivables.value = customers.map(cust => {
                const id = cust.id ?? cust.clientId ?? cust.customerId;
                return {
                    id: id,
                    clientId: id,
                    clientName: cust.name || cust.clientName || cust.customerName || "عميل نقدي",
                    clientPhone: cust.phone || cust.clientPhone || "",
                    clientEmail: cust.email || cust.clientEmail || "",
                    clientAddress: cust.address || cust.clientAddress || "",
                    clientNotes: cust.notes || "",
                    outstandingBalance: Number(cust.outstandingBalance ?? cust.balance ?? 0),
                    totalPaid: Number(cust.totalPaid ?? 0),
                    totalSales: Number(cust.totalSales ?? 0),
                };
            });

            // Extract backend SQL-calculated summary figures directly from ReceivablesSummaryDto
            if (!Array.isArray(rawData) && rawData.totalOutstandingAmount !== undefined) {
                totalOutstandingAmount.value = Number(rawData.totalOutstandingAmount || 0);
                totalSalesAmount.value = Number(rawData.totalSalesAmount || 0);
                totalPaidAmount.value = Number(rawData.totalPaidAmount || 0);
                totalCustomersCount.value = Number(rawData.totalCustomersCount || receivables.value.length);
            } else {
                totalOutstandingAmount.value = receivables.value.reduce((sum, item) => sum + item.outstandingBalance, 0);
                totalSalesAmount.value = receivables.value.reduce((sum, item) => sum + item.totalSales, 0);
                totalPaidAmount.value = receivables.value.reduce((sum, item) => sum + item.totalPaid, 0);
                totalCustomersCount.value = receivables.value.length;
            }
        } catch (err) {
            console.error("Failed to fetch receivables:", err);
            error.value = err.message || "Failed to load receivables";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل سجل الذمم المدينة");
        } finally {
            loading.value = false;
        }
    }

    /**
     * Get full details for a specific customer with optional status filtering.
     * GET /api/receivables/customers/{id}/details → CustomerDetailsDto
     */
    async function getClientReceivables(clientId, status = null) {
        loading.value = true;
        error.value = null;
        try {
            const url = status ? `/receivables/customers/${clientId}/details?status=${status}` : `/receivables/customers/${clientId}/details`;
            const response = await apiGet(url);
            const data = response.data || response;

            const customerObj = data.customer || data.client || {};
            const ordersList = data.orders || data.invoices || data.sales || [];
            const historyList = data.paymentHistory || data.payments || [];

            clientDetails.value = {
                clientId: customerObj.id || clientId,
                clientName: customerObj.name || customerObj.clientName || "عميل",
                clientPhone: customerObj.phone || "",
                clientEmail: customerObj.email || "",
                clientAddress: customerObj.address || "",
                outstandingBalance: Number(data.outstandingBalance ?? customerObj.outstandingBalance ?? 0),
                totalPaid: Number(data.totalPaid ?? customerObj.totalPaid ?? 0),
                totalSales: Number(data.totalSales ?? customerObj.totalSales ?? 0),
                invoices: ordersList.map(o => ({
                    id: o.id || o.orderId || o.invoiceId,
                    invoiceNo: o.invoiceNumber || o.invoiceNo || `INV-${o.id}`,
                    invoiceDate: o.orderDate || o.invoiceDate || o.createdAt,
                    totalAmount: Number(o.finalAmount ?? o.totalAmount ?? 0),
                    paidAmount: Number(o.paidAmount ?? 0),
                    remainingAmount: Number(o.remainingAmount ?? 0),
                    paymentStatus: o.paymentStatus || (o.remainingAmount > 0 ? "UNPAID" : "PAID"),
                    paymentMethod: o.paymentMethod || "—",
                    items: (o.items || o.orderItems || []).map(i => ({
                        id: i.id,
                        productName: i.productName || i.name || "منتج",
                        unitName: i.unitName || "",
                        quantity: Number(i.quantity ?? 1),
                        unitPrice: Number(i.unitPrice ?? 0),
                        totalPrice: Number(i.total ?? i.totalPrice ?? ((i.quantity || 0) * (i.unitPrice || 0)) ?? 0),
                    })),
                })),
                paymentHistory: historyList.map(p => ({
                    id: p.id,
                    amount: Number(p.amount ?? 0),
                    paymentMethod: p.paymentMethod || "نقدي",
                    paymentDate: p.paymentDate || p.createdAt,
                    notes: p.notes || "—",
                    createdBy: p.createdBy || "—",
                })),
            };

            return clientDetails.value;
        } catch (err) {
            console.error("Failed to fetch client receivables:", err);
            error.value = err.message || "Failed to load client details";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل تفاصيل حساب العميل");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Record a payment from a customer.
     * POST /api/receivables/payments
     * Body: { customerId, orderId?, amount, paymentMethod, notes? }
     */
    async function recordPayment(payload) {
        loading.value = true;
        error.value = null;
        try {
            const method = (payload.paymentMethod || "").toString().toLowerCase().trim();
            const invalidMethods = ["credit", "onaccount", "on account", "آجل", "الحساب الآجل", "دفع آجل", "حساب آجل"];
            if (invalidMethods.includes(method)) {
                const msg = "لا يمكن اختيار طريقة الدفع الآجل لتسديد المستحقات";
                toastStore.addErrorToast(msg);
                throw new Error(msg);
            }

            // Map frontend field names to backend DTO
            const apiPayload = {
                customerId: payload.clientId || payload.customerId,
                orderId: payload.saleInvoiceId || payload.orderId || undefined,
                amount: payload.amount,
                paymentMethod: payload.paymentMethod || "Cash",
                notes: payload.notes || undefined,
            };

            const response = await apiPost("/receivables/payments", apiPayload, false);
            toastStore.addSuccessToast("تم تسجيل الدفعة بنجاح");

            // Refresh data
            const custId = apiPayload.customerId;
            await fetchReceivables();
            if (clientDetails.value && clientDetails.value.clientId === custId) {
                await getClientReceivables(custId);
            }
            return response.data;
        } catch (err) {
            console.error("Failed to record payment:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء تسجيل الدفعة";
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء تسجيل الدفعة");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Create a new customer.
     * POST /api/receivables/customers
     */
    async function createCustomer(dto) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/receivables/customers", dto, false);
            toastStore.addSuccessToast("تم إضافة العميل بنجاح");
            await fetchReceivables();
            return response.data;
        } catch (err) {
            console.error("Failed to create customer:", err);
            toastStore.addErrorToast("حدث خطأ أثناء إضافة العميل");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        receivables,
        clientDetails,
        totalOutstandingAmount,
        totalSalesAmount,
        totalPaidAmount,
        totalCustomersCount,
        loading,
        error,
        fetchReceivables,
        getClientReceivables,
        recordPayment,
        createCustomer,
    };
});
