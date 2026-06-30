<script setup>
import { ref, onMounted, computed } from "vue";
import { useInventoryStore } from "@/stores/pos/inventoryStore";
import { useProductStore } from "@/stores/pos/productStore";
import { Warehouse, ArrowRightLeft, Search, Plus, Info, HelpCircle, Package, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-vue-next";

const inventoryStore = useInventoryStore();
const productStore = useProductStore();

const showTransferDialog = ref(false);
const showAddStockDialog = ref(false);
const showHelpDialog = ref(false);
const helpText = ref(null);
const transferItem = ref(null);
const transferQty = ref(1);
const transferDirection = ref("toShelf"); // "toShelf" | "toWarehouse"
const searchQuery = ref("");
const expandedRows = ref({});

const addStockForm = ref({
    productId: null,
    productUnitId: null, // this maps to originalProductUnitId
    quantity: 1, // originalReceivedQuantity
    batchNumber: "",
    expirationDate: null,
    costPrice: 0,
    location: "StoreShelf"
});

onMounted(() => {
    inventoryStore.fetchInventory();
    productStore.fetchProducts();
});

const filteredInventory = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return inventoryStore.inventory;
    return inventoryStore.inventory.filter((item) =>
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
        (item.batchNumber && item.batchNumber.toLowerCase().includes(q))
    );
});

const groupedInventory = computed(() => {
    const groups = {};
    filteredInventory.value.forEach(item => {
        const key = `${item.productId}_${item.batchNumber}`;
        if (!groups[key]) {
            groups[key] = {
                id: key,
                productId: item.productId,
                productName: item.productName,
                serialNumber: item.serialNumber,
                batchNumber: item.batchNumber,
                expirationDate: item.expirationDate,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                totalQuantity: 0,
                locations: []
            };
        }
        groups[key].totalQuantity += item.quantity;
        groups[key].locations.push(item);
    });
    return Object.values(groups);
});

// ─── Inventory Summary Metrics ───────────────────────────────────────────────

const totalStock = computed(() => {
    return inventoryStore.inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
});

const stockByProduct = computed(() => {
    const map = new Map();
    inventoryStore.inventory.forEach(item => {
        const current = map.get(item.productId) || 0;
        map.set(item.productId, current + (item.quantity || 0));
    });
    return map;
});

const healthyStockCount = computed(() => {
    let count = 0;
    stockByProduct.value.forEach(stock => {
        if (stock > 5) count++;
    });
    return count;
});

const lowStockCount = computed(() => {
    let count = 0;
    stockByProduct.value.forEach(stock => {
        if (stock > 0 && stock <= 5) count++;
    });
    return count;
});

const outOfStockCount = computed(() => {
    let count = 0;
    productStore.products.forEach(p => {
        if (p.isActive) {
            const stock = stockByProduct.value.get(p.id) || 0;
            if (stock === 0) count++;
        }
    });
    return count;
});

const expiringBatches = computed(() => {
    let expiringSoon = 0;
    let expired = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    inventoryStore.inventory.forEach(item => {
        if (item.expirationDate && item.quantity > 0) {
            const expDate = new Date(item.expirationDate);
            const timeDiff = expDate.getTime() - today.getTime();
            const daysToExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            if (daysToExpiration < 0) {
                expired++;
            } else if (daysToExpiration <= 30) {
                expiringSoon++;
            }
        }
    });
    
    return { expiringSoon, expired };
});

const openTransfer = (item, direction = "toShelf") => {
    transferItem.value = item;
    transferDirection.value = direction;
    transferQty.value = 1;
    showTransferDialog.value = true;
};

const handleTransfer = async () => {
    if (!transferItem.value || transferQty.value <= 0) return;

    const from = transferItem.value.location;
    const to = from === "BackWarehouse" ? "StoreShelf" : "BackWarehouse";
    const stockId = transferItem.value.id;

    await inventoryStore.transferStock(transferItem.value.productId, transferQty.value, from, to, stockId);
    showTransferDialog.value = false;
};

const maxTransferQty = () => {
    if (!transferItem.value) return 0;
    return transferItem.value.quantity || 0;
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

const openAddStock = () => {
    addStockForm.value = {
        productId: null,
        productUnitId: null,
        quantity: 1,
        batchNumber: "",
        expirationDate: null,
        costPrice: 0,
        location: "StoreShelf"
    };
    showAddStockDialog.value = true;
};

const selectedProductUnits = computed(() => {
    if (!addStockForm.value.productId) return [];
    const p = productStore.products.find(x => x.id === addStockForm.value.productId);
    return p ? p.units || [] : [];
});

const calculateBaseQuantity = computed(() => {
    if (!addStockForm.value.productId || !addStockForm.value.productUnitId || !addStockForm.value.quantity) return 0;
    const unit = selectedProductUnits.value.find(u => u.id === addStockForm.value.productUnitId) || selectedProductUnits.value.find(u => u.name === addStockForm.value.productUnitId);
    if (!unit) return addStockForm.value.quantity;
    return addStockForm.value.quantity * (unit.factor || 1);
});

const submitAddStock = async () => {
    if (!addStockForm.value.productId || !addStockForm.value.batchNumber) return;
    
    // Format expiration date if exists
    let expDate = null;
    if (addStockForm.value.expirationDate) {
        const d = new Date(addStockForm.value.expirationDate);
        expDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const unit = selectedProductUnits.value.find(u => u.id === addStockForm.value.productUnitId) || selectedProductUnits.value.find(u => u.name === addStockForm.value.productUnitId);
    
    // Assuming backend endpoint /api/inventory (from addInventoryStock) accepts:
    // productId, quantity (which is the original unit qty if we send unitId too? Wait. 
    // Wait, the prompt says "Let them enter quantity in that unit. Display system-calculated base quantity. Send originalProductUnitId and originalReceivedQuantity". 
    // And CreateInventoryStockDto has "quantity" which is the base quantity, and we should also send "originalReceivedQuantity" and "originalProductUnitId"?
    // The prompt says: "Send originalProductUnitId and originalReceivedQuantity so the backend can log the original receipt."
    
    await inventoryStore.addInventoryStock({
        productId: addStockForm.value.productId,
        quantity: calculateBaseQuantity.value, // Send base quantity as main quantity
        originalReceivedQuantity: addStockForm.value.quantity,
        originalProductUnitId: unit?.id || null,
        batchNumber: addStockForm.value.batchNumber,
        expirationDate: expDate,
        costPrice: addStockForm.value.costPrice,
        location: addStockForm.value.location
    });
    
    showAddStockDialog.value = false;
};

const openHelp = async () => {
    showHelpDialog.value = true;
    if (!helpText.value) {
        helpText.value = await inventoryStore.fetchInventoryExplanation();
    }
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG");
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
                <Button icon="pi pi-question-circle" text rounded aria-label="Help" @click="openHelp">
                    <template #icon><HelpCircle :size="20" class="text-surface-500 hover:text-primary-500 transition-colors" /></template>
                </Button>
            </div>
            <Button label="إستلام مخزون" @click="openAddStock">
                <template #icon><Plus :size="18" /></template>
            </Button>
        </div>

        <!-- Inventory Summary Stats Cards -->
        <div class="inventory-stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue">
                    <Package :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">إجمالي الوحدات</span>
                    <span class="stat-value">{{ totalStock }}</span>
                    <span class="stat-sub">في جميع المستودعات والرفوف</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">
                    <CheckCircle2 :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">مخزون سليم</span>
                    <span class="stat-value">{{ healthyStockCount }}</span>
                    <span class="stat-sub">منتجات متوفرة (أكثر من 5)</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange">
                    <AlertTriangle :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">مخزون منخفض</span>
                    <span class="stat-value">{{ lowStockCount }}</span>
                    <span class="stat-sub">منتجات (1-5 وحدات)</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red">
                    <AlertCircle :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">نفذ المخزون</span>
                    <span class="stat-value">{{ outOfStockCount }}</span>
                    <span class="stat-sub">منتجات بدون رصيد</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon amber">
                    <AlertTriangle :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">تنتهي قريباً / منتهية</span>
                    <span class="stat-value">{{ expiringBatches.expiringSoon + expiringBatches.expired }}</span>
                    <span class="stat-sub">{{ expiringBatches.expiringSoon }} قريباً، {{ expiringBatches.expired }} منتهية</span>
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
                        class="ps-10 pr-4 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Inventory Table -->
            <DataTable
                v-model:expandedRows="expandedRows"
                :value="groupedInventory"
                dataKey="id"
                :loading="inventoryStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                emptyMessage="لا توجد بيانات مخزون مطابقة"
                stripedRows
                removableSort
                scrollable
                class="inventory-table"
            >
                <Column expander style="width: 4rem" />
                <Column field="productName" header="المنتج" sortable style="min-width: 220px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.productName }}</span>
                    </template>
                </Column>
                <Column field="batchNumber" sortable style="min-width: 130px">
                    <template #header>
                        <div class="flex items-center gap-2">
                            <span>رقم الدفعة</span>
                            <i class="pi pi-info-circle text-surface-400 cursor-help" v-tooltip.top="'رقم الدفعة (Batch) هو المعرف الفريد لشحنة أو عملية إنتاج محددة'"></i>
                        </div>
                    </template>
                    <template #body="{ data }">
                        <span class="text-sm font-semibold font-mono text-surface-650 dark:text-surface-350">{{ data.batchNumber || '—' }}</span>
                    </template>
                </Column>
                <Column field="expirationDate" header="تاريخ الصلاحية" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="text-sm font-medium" :class="{'text-red-500': data.expirationDate && new Date(data.expirationDate) < new Date()}">
                            {{ formatDate(data.expirationDate) }}
                        </span>
                    </template>
                </Column>
                <Column field="costPrice" header="سعر التكلفة" sortable style="min-width: 120px">
                    <template #body="{ data }">
                        <span class="text-sm font-bold text-surface-700 dark:text-surface-300">{{ data.costPrice?.toFixed(2) || '—' }} EGP</span>
                    </template>
                </Column>
                <Column field="sellingPrice" header="سعر البيع" sortable style="min-width: 120px">
                    <template #body="{ data }">
                        <span class="text-sm font-bold text-surface-700 dark:text-surface-300">{{ data.sellingPrice?.toFixed(2) || '—' }} EGP</span>
                    </template>
                </Column>
                <Column field="totalQuantity" header="إجمالي الكمية" sortable style="min-width: 150px">
                    <template #body="{ data }">
                        <span class="font-black text-primary-600 dark:text-primary-450">{{ data.totalQuantity }} وحدة</span>
                        <div class="mt-1">
                            <Tag
                                :value="getStockLabel(data.totalQuantity)"
                                :severity="getStockSeverity(data.totalQuantity)"
                                class="font-bold text-xs"
                            />
                        </div>
                    </template>
                </Column>

                <template #expansion="{ data }">
                    <div class="p-4 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg mx-6 my-2">
                        <h5 class="mb-3 font-bold text-surface-700 dark:text-surface-200">تفاصيل المخزون حسب الموقع</h5>
                        <DataTable :value="data.locations" dataKey="id" class="p-datatable-sm">
                            <Column field="location" header="الموقع" style="min-width: 140px">
                                <template #body="{ data: locData }">
                                    <Tag
                                        :value="locData.location === 'BackWarehouse' ? 'المستودع' : (locData.location === 'StoreShelf' ? 'الرف' : locData.location)"
                                        :severity="locData.location === 'StoreShelf' ? 'success' : 'info'"
                                        class="font-bold"
                                    />
                                </template>
                            </Column>
                            <Column field="quantity" header="الكمية" style="min-width: 100px">
                                <template #body="{ data: locData }">
                                    <span class="font-bold">{{ locData.quantity }} وحدة</span>
                                </template>
                            </Column>
                            <Column header="عمليات النقل" style="min-width: 220px; text-align: start">
                                <template #body="{ data: locData }">
                                    <div class="flex gap-2">
                                        <Button
                                            size="small"
                                            label="إلى الرف"
                                            outlined
                                            :disabled="locData.location === 'StoreShelf' || locData.quantity <= 0"
                                            @click="openTransfer(locData, 'toShelf')"
                                        >
                                            <template #icon><ArrowRightLeft :size="14" class="me-1" /></template>
                                        </Button>
                                        <Button
                                            size="small"
                                            label="إلى المستودع"
                                            outlined
                                            severity="secondary"
                                            :disabled="locData.location === 'BackWarehouse' || locData.quantity <= 0"
                                            @click="openTransfer(locData, 'toWarehouse')"
                                        />
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </template>
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

        <!-- Add Stock Dialog -->
        <Dialog
            v-model:visible="showAddStockDialog"
            header="إستلام مخزون (دفعة جديدة)"
            :style="{ width: '550px' }"
            modal
            dismissableMask
        >
            <div class="inventory-dialog-form">
                <div class="form-field">
                    <label class="required">المنتج</label>
                    <Select
                        v-model="addStockForm.productId"
                        :options="productStore.products"
                        optionLabel="name"
                        optionValue="id"
                        filter
                        fluid
                        placeholder="اختر المنتج"
                    />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-field">
                        <label class="required">وحدة الإستلام</label>
                        <Select
                            v-model="addStockForm.productUnitId"
                            :options="selectedProductUnits"
                            optionLabel="name"
                            optionValue="id"
                            fluid
                            :disabled="!addStockForm.productId"
                            placeholder="اختر الوحدة"
                        />
                    </div>
                    <div class="form-field">
                        <label class="required">الكمية المستلمة (بالوحدة)</label>
                        <InputNumber v-model="addStockForm.quantity" :min="1" fluid placeholder="الكمية" />
                    </div>
                </div>
                
                <div v-if="addStockForm.productUnitId" class="p-2 mb-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-md">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-surface-600 dark:text-surface-400">الكمية الإجمالية بالوحدة الأساسية:</span>
                        <span class="font-bold text-primary-600 dark:text-primary-400">{{ calculateBaseQuantity }} قطعة</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="form-field">
                        <label class="required">رقم الدفعة (Batch)</label>
                        <InputText v-model="addStockForm.batchNumber" fluid placeholder="مثال: LOT-001" />
                    </div>
                    <div class="form-field">
                        <label>تاريخ الصلاحية (إن وجد)</label>
                        <DatePicker v-model="addStockForm.expirationDate" dateFormat="yy-mm-dd" fluid placeholder="اختر التاريخ" />
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-field">
                        <label>التكلفة للوحدة المستلمة</label>
                        <InputNumber v-model="addStockForm.costPrice" :minFractionDigits="2" fluid placeholder="0.00" />
                    </div>
                    <div class="form-field">
                        <label class="required">موقع التخزين المبدئي</label>
                        <Select
                            v-model="addStockForm.location"
                            :options="[{label: 'رف المعرض', value: 'StoreShelf'}, {label: 'المستودع الداخلي', value: 'BackWarehouse'}]"
                            optionLabel="label"
                            optionValue="value"
                            fluid
                        />
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 justify-end w-full">
                    <Button label="إلغاء" outlined severity="secondary" @click="showAddStockDialog = false" />
                    <Button label="حفظ الإستلام" @click="submitAddStock" :loading="inventoryStore.loading" :disabled="!addStockForm.productId || !addStockForm.batchNumber || !addStockForm.productUnitId" />
                </div>
            </template>
        </Dialog>

        <!-- Help Modal -->
        <Dialog
            v-model:visible="showHelpDialog"
            header="مفاهيم المخزون"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div v-if="helpText" class="p-2 space-y-4 text-surface-700 dark:text-surface-300">
                <div v-if="typeof helpText === 'object'">
                    <h3 class="font-bold text-lg mb-2 text-primary-600 dark:text-primary-400">الفروقات الأساسية</h3>
                    <div class="mb-4">
                        <h4 class="font-bold text-surface-900 dark:text-surface-100">رمز المنتج (Product Code)</h4>
                        <p class="text-sm">{{ helpText.productCode || helpText.arabic?.productCode }}</p>
                    </div>
                    <div>
                        <h4 class="font-bold text-surface-900 dark:text-surface-100">رقم الدفعة (Batch Code)</h4>
                        <p class="text-sm">{{ helpText.batchCode || helpText.arabic?.batchCode }}</p>
                    </div>
                </div>
                <div v-else>
                    {{ helpText }}
                </div>
            </div>
            <div v-else class="flex justify-center p-8">
                <ProgressSpinner strokeWidth="4" class="w-8 h-8" />
            </div>
            <template #footer>
                <Button label="فهمت ذلك" @click="showHelpDialog = false" />
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

@media (max-width: 768px) {
    .inventory-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* Header */
.inventory-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    flex-wrap: wrap;
    gap: 1rem;
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

/* Inventory Stats Grid */
.inventory-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.25rem;
    margin-bottom: 0.5rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.dark .stat-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
}

.stat-icon.blue {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
}

.stat-icon.red {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.stat-icon.orange, .stat-icon.amber {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
}

.stat-icon.green {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    line-height: 1.2;
    margin: 0.125rem 0;
}

.dark .stat-value {
    color: var(--p-surface-0);
}

.stat-sub {
    font-size: 0.75rem;
    color: var(--p-surface-400);
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

:deep(.p-datatable-tbody > tr > td) {
    border-bottom: none !important;
}
</style>
