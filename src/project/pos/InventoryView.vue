<script setup>
import { ref, onMounted, computed } from "vue";
import { useInventoryStore } from "@/stores/pos/inventoryStore";
import { Warehouse, ArrowRightLeft, Search } from "lucide-vue-next";

const inventoryStore = useInventoryStore();

const showTransferDialog = ref(false);
const transferItem = ref(null);
const transferQty = ref(1);
const transferDirection = ref("toShelf"); // "toShelf" | "toWarehouse"
const searchQuery = ref("");

onMounted(() => {
    inventoryStore.fetchInventory();
});

const filteredInventory = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return inventoryStore.inventory;
    return inventoryStore.inventory.filter((item) =>
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q))
    );
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

    await inventoryStore.transferStock(transferItem.value.productId, transferQty.value, from, to);
    showTransferDialog.value = false;
};

const maxTransferQty = () => {
    if (!transferItem.value) return 0;
    return transferDirection.value === "toShelf"
        ? transferItem.value.warehouseStock
        : transferItem.value.shelfStock;
};

const getStockSeverity = (stock) => {
    if (stock <= 0) return "danger";
    if (stock <= 5) return "warn";
    return "success";
};

const getStockLabel = (stock) => {
    if (stock <= 0) return "نفذ المخزون";
    if (stock <= 5) return `منخفض (${stock})`;
    return `متوفر (${stock})`;
};
</script>

<template>
    <div class="inventory-page">
        <!-- Header -->
        <div class="inventory-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <Warehouse :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="inventory-title">إدارة المخزون</h1>
                    <p class="inventory-subtitle">متابعة ونقل البضائع بين المستودع ورفوف البيع</p>
                </div>
            </div>
        </div>

        <!-- Table Container Card -->
        <div class="inventory-card">
            <!-- Filter Bar -->
            <div class="inventory-filter-bar">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="searchQuery"
                        placeholder="ابحث باسم المنتج أو الرمز..."
                        class="ps-9 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Inventory Table -->
            <DataTable
                :value="filteredInventory"
                :loading="inventoryStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                emptyMessage="لا توجد بيانات مخزون مطابقة"
                stripedRows
                removableSort
                class="inventory-table"
            >
                <Column field="productName" header="المنتج" sortable style="min-width: 220px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.productName }}</span>
                    </template>
                </Column>
                <Column field="sku" header="رمز المنتج" sortable style="width: 140px">
                    <template #body="{ data }">
                        <span class="text-sm font-semibold font-mono text-surface-650 dark:text-surface-350">{{ data.sku }}</span>
                    </template>
                </Column>
                <Column field="unit" header="الوحدة" style="width: 110px">
                    <template #body="{ data }">
                        <span class="text-sm text-surface-500">{{ data.unit || '—' }}</span>
                    </template>
                </Column>
                <Column field="shelfStock" header="مخزون الرف" sortable style="width: 150px">
                    <template #body="{ data }">
                        <Tag
                            :value="getStockLabel(data.shelfStock)"
                            :severity="getStockSeverity(data.shelfStock)"
                            class="font-bold"
                        />
                    </template>
                </Column>
                <Column field="warehouseStock" header="مخزون المستودع" sortable style="width: 160px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.warehouseStock }} وحدة</span>
                    </template>
                </Column>
                <Column header="إجمالي المخزون" style="width: 140px">
                    <template #body="{ data }">
                        <span class="font-black text-primary-600 dark:text-primary-450">
                            {{ data.shelfStock + data.warehouseStock }} وحدة
                        </span>
                    </template>
                </Column>
                <Column header="عمليات النقل" style="width: 220px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex gap-2 justify-center">
                            <Button
                                size="small"
                                label="إلى الرف"
                                outlined
                                :disabled="data.warehouseStock === 0"
                                @click="openTransfer(data, 'toShelf')"
                            >
                                <template #icon><ArrowRightLeft :size="14" class="me-1" /></template>
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
        </div>

        <!-- Transfer Dialog -->
        <Dialog
            v-model:visible="showTransferDialog"
            :header="transferDirection === 'toShelf' ? 'نقل المخزون إلى الرف' : 'نقل المخزون إلى المستودع'"
            :style="{ width: '420px' }"
            modal
            dismissableMask
        >
            <div class="inventory-dialog-form" v-if="transferItem">
                <div class="transfer-info-card">
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                        المنتج: <strong class="text-surface-900 dark:text-surface-100">{{ transferItem.productName }}</strong>
                    </p>
                    <p class="text-xs text-surface-500 mt-1">
                        إتجاه النقل: 
                        <span class="font-bold text-primary-600 dark:text-primary-400">
                            {{ transferDirection === 'toShelf' ? 'من المستودع إلى الرف' : 'من الرف إلى المستودع' }}
                        </span>
                    </p>
                </div>

                <div class="form-field mt-3">
                    <label class="required">
                        الكمية المراد نقلها 
                        <span class="text-xs font-normal text-surface-450">(الحد الأقصى المتاح: {{ maxTransferQty() }})</span>
                    </label>
                    <InputNumber v-model="transferQty" :min="1" :max="maxTransferQty()" fluid placeholder="أدخل الكمية" />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showTransferDialog = false" />
                    <Button label="نقل الكمية" @click="handleTransfer" :loading="inventoryStore.loading" :disabled="maxTransferQty() === 0" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.inventory-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

/* Header */
.inventory-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.dark .header-icon-wrap {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.inventory-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .inventory-title {
    color: var(--p-surface-0);
}

.inventory-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* Card Wrapper */
.inventory-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .inventory-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.inventory-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .inventory-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

/* Dialog Form */
.inventory-dialog-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem 0;
}

.transfer-info-card {
    padding: 0.875rem 1rem;
    border-radius: 0.5rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
}

.dark .transfer-info-card {
    background: var(--p-surface-950);
    border-color: var(--p-surface-850);
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.form-field label {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-700);
}

.dark .form-field label {
    color: var(--p-surface-200);
}
</style>
