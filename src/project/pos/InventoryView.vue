<script setup>
import { ref, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { Warehouse, ArrowRightLeft } from "lucide-vue-next";

const posStore = usePosStore();

const showTransferDialog = ref(false);
const transferItem = ref(null);
const transferQty = ref(1);
const transferDirection = ref("toShelf"); // "toShelf" | "toWarehouse"

onMounted(() => {
    posStore.fetchInventory();
});

const openTransfer = (item, direction = "toShelf") => {
    transferItem.value = item;
    transferDirection.value = direction;
    transferQty.value = 1;
    showTransferDialog.value = true;
};

const handleTransfer = async () => {
    if (!transferItem.value || transferQty.value <= 0) return;

    const from = transferDirection.value === "toShelf" ? "BackWarehouse" : "StoreShelf";
    const to = transferDirection.value === "toShelf" ? "StoreShelf" : "BackWarehouse";

    await posStore.transferStock(transferItem.value.productId, transferQty.value, from, to);
    showTransferDialog.value = false;
};

const maxTransferQty = () => {
    if (!transferItem.value) return 0;
    return transferDirection.value === "toShelf"
        ? transferItem.value.warehouseStock
        : transferItem.value.shelfStock;
};
</script>

<template>
    <div class="p-4">
        <!-- Header -->
        <div class="flex items-center gap-2 mb-4">
            <Warehouse :size="24" class="text-primary-500" />
            <h1 class="text-xl font-bold text-surface-800 dark:text-surface-100">إدارة المخزون</h1>
        </div>

        <!-- Inventory Table -->
        <DataTable
            :value="posStore.inventory"
            :loading="posStore.loading"
            paginator
            :rows="10"
            emptyMessage="لا توجد بيانات مخزون"
        >
            <Column field="productName" header="المنتج" sortable style="min-width: 200px" />
            <Column field="sku" header="رمز المنتج" sortable style="width: 140px" />
            <Column field="unit" header="الوحدة" style="width: 100px" />
            <Column field="shelfStock" header="مخزون الرف" sortable style="width: 130px">
                <template #body="{ data }">
                    <span
                        class="font-bold"
                        :class="data.shelfStock <= 5 ? 'text-red-500' : 'text-green-600'"
                    >
                        {{ data.shelfStock }}
                    </span>
                </template>
            </Column>
            <Column field="warehouseStock" header="مخزون المستودع" sortable style="width: 150px">
                <template #body="{ data }">
                    <span class="font-semibold">{{ data.warehouseStock }}</span>
                </template>
            </Column>
            <Column header="الإجمالي" style="width: 110px">
                <template #body="{ data }">
                    <span class="font-bold text-primary-600 dark:text-primary-400">
                        {{ data.shelfStock + data.warehouseStock }}
                    </span>
                </template>
            </Column>
            <Column header="نقل" style="width: 200px">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button
                            size="small"
                            label="إلى الرف"
                            outlined
                            :disabled="data.warehouseStock === 0"
                            @click="openTransfer(data, 'toShelf')"
                        >
                            <template #icon><ArrowRightLeft :size="14" /></template>
                        </Button>
                        <Button
                            size="small"
                            label="إلى المستودع"
                            outlined
                            severity="secondary"
                            :disabled="data.shelfStock === 0"
                            @click="openTransfer(data, 'toWarehouse')"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Transfer Dialog -->
        <Dialog
            v-model:visible="showTransferDialog"
            :title="transferDirection === 'toShelf' ? 'نقل إلى الرف' : 'نقل إلى المستودع'"
            :style="{ width: '400px' }"
        >
            <div class="flex flex-col gap-4" v-if="transferItem">
                <p class="text-surface-600 dark:text-surface-300">
                    نقل <strong>{{ transferItem.productName }}</strong>
                    {{ transferDirection === 'toShelf' ? 'من المستودع إلى الرف' : 'من الرف إلى المستودع' }}
                </p>
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">الكمية (الحد الأقصى: {{ maxTransferQty() }})</label>
                    <InputNumber v-model="transferQty" :min="1" :max="maxTransferQty()" fluid />
                </div>
            </div>
            <template #footer>
                <Button label="إلغاء" text @click="showTransferDialog = false" />
                <Button label="نقل" @click="handleTransfer" :loading="posStore.loading" />
            </template>
        </Dialog>
    </div>
</template>
