import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useOrderStore = defineStore("order", () => {
    // Required State
    const ordersList = ref([]);
    const currentOrder = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    /**
     * Map API order DTO to frontend model
     */
    function mapApiOrderToFrontend(apiOrder) {
        return {
            id: apiOrder.id,
            orderNumber: apiOrder.invoiceNumber || `ORD-${apiOrder.id}`,
            date: apiOrder.orderDate,
            subtotal: apiOrder.subTotal ?? 0,
            discount: apiOrder.invoiceDiscount ?? 0,
            tax: apiOrder.totalTax ?? 0,
            total: apiOrder.finalAmount ?? 0,
            status: apiOrder.status || "Completed",
            paymentMethod: apiOrder.paymentMethod || "cash",
            cashier: apiOrder.userId || "—",
            type: "sale",
            items: (apiOrder.items || []).map(item => {
                const qty = item.quantity ?? item.qty ?? 0;
                const retQty = item.returnedQuantity ?? 0;
                const remQty = item.remainingReturnableQuantity ?? Math.max(0, qty - retQty);
                return {
                    id: item.id,
                    productUnitId: item.productUnitId || item.id,
                    name: item.productName || `منتج #${item.productUnitId}`,
                    price: item.unitPrice ?? item.price ?? 0,
                    qty,
                    quantity: qty,
                    returnedQuantity: retQty,
                    remainingReturnableQuantity: remQty,
                    discount: item.itemDiscount ?? 0,
                    total: item.total ?? item.totalPrice ?? 0,
                };
            }),
        };
    }

    // 1. fetchOrders (GET /api/orders)
    async function fetchOrders(params = {}) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/orders", { params });
            const rawOrders = response.data || [];
            ordersList.value = rawOrders.map(mapApiOrderToFrontend);
            return ordersList.value;
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            error.value = err.message || "Failed to load orders";
            if (err.response?.status !== 404) {
                toastStore.addErrorToast("حدث خطأ أثناء تحميل الطلبات");
            }
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 2. fetchOrderById (GET /api/orders/{id})
    async function fetchOrderById(id) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/orders/${id}`);
            const mappedOrder = response.data ? mapApiOrderToFrontend(response.data) : null;
            currentOrder.value = mappedOrder;
            return mappedOrder;
        } catch (err) {
            console.error("Failed to fetch order:", err);
            error.value = err.message || "Failed to load order";
            toastStore.addErrorToast("حدث خطأ أثناء تحميل الطلب");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // 3. checkoutOrder (POST /api/orders/checkout)
    async function checkoutOrder(payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost("/orders/checkout", payload, false);
            toastStore.addSuccessToast("تم إتمام عملية البيع بنجاح");
            
            // Refresh orders list
            await fetchOrders();
            
            return response.data ? mapApiOrderToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to checkout order:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء إنشاء الطلب";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء إنشاء الطلب");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Alias wrapper for posStore.js which expects a specific signature
    async function checkout(cartItems, paymentMethod = "cash", invoiceDiscount = 0, customerId = null, paidAmount = null) {
        const payload = {
            invoiceDiscount,
            paymentMethod,
            customerId: customerId || undefined,
            paidAmount: paidAmount !== null && paidAmount !== undefined ? paidAmount : undefined,
            items: cartItems.map(item => ({
                productUnitId: item.productUnitId || item.unitId || item.id,
                quantity: item.qty,
                itemDiscount: item.discount ?? 0,
            })),
        };
        return await checkoutOrder(payload);
    }

    // 4. returnOrder (POST /api/orders/{id}/return)
    async function returnOrder(id, payload) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiPost(`/orders/${id}/return`, payload, false);
            toastStore.addSuccessToast("تم تسجيل الاسترجاع بنجاح");
            
            // Refresh orders list
            await fetchOrders();
            
            return response.data;
        } catch (err) {
            console.error("Failed to return order:", err);
            const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data || "حدث خطأ أثناء الاسترجاع";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء الاسترجاع");
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // Aliases for compatibility
    const orders = ordersList;
    const loading = isLoading;

    return {
        // State
        ordersList,
        orders,
        currentOrder,
        isLoading,
        loading,
        error,

        // Actions
        fetchOrders,
        fetchOrderById,
        checkoutOrder,
        checkout,
        returnOrder
    };
});
