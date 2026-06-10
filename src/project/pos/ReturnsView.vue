<script setup>
import { ref, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { RotateCcw } from "lucide-vue-next";

const posStore = usePosStore();

const showReturnDialog = ref(false);
const selectedOrder = ref(null);
const returnItems = ref([]);

onMounted(() => {
    posStore.fetchOrders();
});

const openReturnDialog = (order) => {
    if (order.type === "return") return;
    selectedOrder.value = order;
    returnItems.value = order.items.map((item) => ({
        ...item,
        returnQty: 0,
    }));
    showReturnDialog.value = true;
};

const handleReturn = async () => {
    const itemsToReturn = returnItems.value
        .filter((i) => i.returnQty > 0)
        .map((i) => ({ name: i.name, price: i.price, qty: i.returnQty }));

    if (itemsToReturn.length === 0) return;

    await posStore.processReturn(selectedOrder.value.id, itemsToReturn);
    showReturnDialog.value = false;
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
};

const salesOrders = ref([]);
// Computed is tricky with ref in setup, use a getter style
const getFilteredOrders = () => posStore.orders;
</script>

<template>
    <div class="p-4">
        <!-- Header -->
        <div class="flex items-center gap-2 mb-4">
            <RotateCcw :size="24" class="text-primary-500" />
            <h1 class="text-xl font-bold text-surface-800 dark:text-surface-100">المرتجعات</h1>
        </div>

        <!-- Orders Table -->
        <DataTable
            :value="getFilteredOrders()"
            :loading="posStore.loading"
            paginator
            :rows="10"
            emptyMessage="لا توجد طلبات"
        >
            <Column field="orderNumber" header="رقم الطلب" sortable style="width: 160px" />
            <Column field="type" header="النوع" style="width: 100px">
                <template #body="{ data }">
                    <Tag
                        :value="data.type === 'sale' ? 'بيع' : 'مرتجع'"
                        :severity="data.type === 'sale' ? 'info' : 'warn'"
                    />
                </template>
            </Column>
            <Column field="date" header="التاريخ" sortable style="width: 180px">
                <template #body="{ data }">
                    {{ formatDate(data.date) }}
                </template>
            </Column>
            <Column header="الأصناف" style="width: 100px">
                <template #body="{ data }">
                    {{ data.items?.length || 0 }}
                </template>
            </Column>
            <Column field="total" header="الإجمالي" sortable style="width: 130px">
                <template #body="{ data }">
                    <span class="font-bold">{{ data.total?.toFixed(2) }}</span>
                </template>
            </Column>
            <Column field="paymentMethod" header="طريقة الدفع" style="width: 120px">
                <template #body="{ data }">
                    {{ data.paymentMethod === "cash" ? "نقدي" : data.paymentMethod === "card" ? "بطاقة" : data.paymentMethod || "—" }}
                </template>
            </Column>
            <Column header="إجراء" style="width: 120px">
                <template #body="{ data }">
                    <Button
                        v-if="data.type === 'sale'"
                        size="small"
                        label="مرتجع"
                        outlined
                        severity="warn"
                        @click="openReturnDialog(data)"
                    >
                        <template #icon><RotateCcw :size="14" /></template>
                    </Button>
                    <span v-else class="text-sm text-surface-400">—</span>
                </template>
            </Column>
        </DataTable>

        <!-- Return Dialog -->
        <Dialog
            v-model:visible="showReturnDialog"
            title="معالجة مرتجع"
            :style="{ width: '550px' }"
        >
            <div class="flex flex-col gap-4" v-if="selectedOrder">
                <p class="text-sm text-surface-500">
                    طلب رقم: <strong>{{ selectedOrder.orderNumber }}</strong>
                </p>
                <div
                    v-for="(item, idx) in returnItems"
                    :key="idx"
                    class="flex items-center gap-3 py-2 border-b border-surface-200 dark:border-surface-700"
                >
                    <div class="flex-1">
                        <div class="font-semibold">{{ item.name }}</div>
                        <div class="text-sm text-surface-400">الكمية الأصلية: {{ item.qty }}</div>
                    </div>
                    <div class="w-28">
                        <InputNumber
                            v-model="item.returnQty"
                            :min="0"
                            :max="item.qty"
                            fluid
                            placeholder="كمية المرتجع"
                        />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="إلغاء" text @click="showReturnDialog = false" />
                <Button label="تنفيذ المرتجع" severity="warn" @click="handleReturn" :loading="posStore.loading" />
            </template>
        </Dialog>
    </div>
</template>
