import { defineStore } from "pinia";
import { ref } from "vue";
import { apiGet, apiPost } from "@/utilities/fetchApi";
import { useToastStore } from "@/stores/base/toastStore";

export const useOrderStore = defineStore("order", () => {
    const orders = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const toastStore = useToastStore();

    /**
     * Map API order DTO to frontend model
     * API response fields:
     *   id, invoiceNumber, userId, orderDate, subTotal,
     *   invoiceDiscount, totalTax, finalAmount, status, paymentMethod
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
            items: (apiOrder.items || []).map(item => ({
                id: item.productUnitId || item.id,
                name: item.productName || `منتج #${item.productUnitId}`,
                price: item.unitPrice ?? item.price ?? 0,
                qty: item.quantity ?? 0,
                discount: item.itemDiscount ?? 0,
                total: item.totalPrice ?? 0,
            })),
        };
    }

    /**
     * Fetch all orders from the API
     */
    async function fetchOrders() {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet("/Order");
            const rawOrders = response.data || [];
            orders.value = rawOrders.map(mapApiOrderToFrontend);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            error.value = err.message || "Failed to load orders";
            // Don't show toast for 404 (no orders yet)
            if (err.response?.status !== 404) {
                toastStore.addErrorToast("حدث خطأ أثناء تحميل الطلبات");
            }
        } finally {
            loading.value = false;
        }
    }

    /**
     * Create an order via the API
     * @param {Object} orderData - { invoiceDiscount, paymentMethod, items: [{ productUnitId, quantity, itemDiscount }] }
     * @returns {Object} The created order mapped to frontend model
     */
    async function createOrder(orderData) {
        loading.value = true;
        error.value = null;
        try {
            const payload = {
                invoiceDiscount: orderData.invoiceDiscount ?? 0,
                paymentMethod: orderData.paymentMethod || "cash",
                items: orderData.items.map(item => ({
                    productUnitId: item.productUnitId,
                    quantity: item.quantity,
                    itemDiscount: item.itemDiscount ?? 0,
                })),
            };

            const response = await apiPost("/Order/checkout", payload, false);
            toastStore.addSuccessToast("تم إتمام عملية البيع بنجاح");

            // Refresh orders list
            await fetchOrders();

            return response.data ? mapApiOrderToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to create order:", err);
            const detail = err.response?.data?.detail ||
                err.response?.data?.message ||
                err.response?.data ||
                "حدث خطأ أثناء إنشاء الطلب";
            error.value = typeof detail === "string" ? detail : JSON.stringify(detail);
            toastStore.addErrorToast(typeof detail === "string" ? detail : "حدث خطأ أثناء إنشاء الطلب");
            throw err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Checkout: convenience wrapper around createOrder
     * Maps cart items to the API format
     * @param {Array} cartItems - Cart items with { id, productUnitId, qty, price, discount? }
     * @param {string} paymentMethod - "cash" or "card"
     * @param {number} invoiceDiscount - Overall invoice discount
     */
    async function checkout(cartItems, paymentMethod = "cash", invoiceDiscount = 0) {
        const orderData = {
            invoiceDiscount,
            paymentMethod,
            items: cartItems.map(item => ({
                productUnitId: item.productUnitId || item.unitId || item.id,
                quantity: item.qty,
                itemDiscount: item.discount ?? 0,
            })),
        };

        return await createOrder(orderData);
    }

    /**
     * Get a single order by ID
     */
    async function getOrderById(id) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiGet(`/Order/${id}`);
            return response.data ? mapApiOrderToFrontend(response.data) : null;
        } catch (err) {
            console.error("Failed to fetch order:", err);
            error.value = err.message || "Failed to load order";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        orders,
        loading,
        error,
        fetchOrders,
        createOrder,
        checkout,
        getOrderById,
    };
});
