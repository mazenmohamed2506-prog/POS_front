<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useInventoryStore } from "@/stores/pos/inventoryStore";
import { useProductStore } from "@/stores/pos/productStore";
import { Warehouse, ArrowRightLeft, Search, Plus, HelpCircle, Package, AlertTriangle, CheckCircle2, AlertCircle, Clock, Filter } from "lucide-vue-next";
import InventoryTable from "./InventoryTable.vue";

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
const activeFilter = ref("all"); // "all" | "healthy" | "low" | "out" | "expiry"
const productStatusFilter = ref(null); // null = All, true = Active, false = Inactive

const productStatusOptions = [
    { label: 'الكل', value: null },
    { label: 'نشط', value: true },
    { label: 'غير نشط', value: false }
];

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
    fetchWithStatusFilter();
    productStore.fetchProducts();
});

function fetchWithStatusFilter() {
    const filters = {};
    if (productStatusFilter.value !== null) {
        filters.productStatus = productStatusFilter.value;
    }
    inventoryStore.fetchInventory(filters);
}

watch(productStatusFilter, () => {
    fetchWithStatusFilter();
});

const filteredInventory = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    let items = inventoryStore.inventory;
    
    if (q) {
        items = items.filter((item) =>
            (item.productName && item.productName.toLowerCase().includes(q)) ||
            (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
            (item.batchNumber && item.batchNumber.toLowerCase().includes(q))
        );
    }
    
    return items;
});

// ─── Inventory Summary Metrics (now provided by backend stats) ───────────────

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
            <div class="header-start">
                <div class="header-icon-wrap">
                    <Warehouse :size="26" />
                </div>
                <div class="header-text">
                    <h1 class="inventory-title">إدارة المخزون</h1>
                    <p class="inventory-subtitle">متابعة ونقل البضائع بين المستودع ورفوف البيع</p>
                </div>
                <button class="help-btn" @click="openHelp" aria-label="مساعدة">
                    <HelpCircle :size="18" />
                </button>
            </div>
            <Button label="إستلام مخزون" @click="openAddStock" class="add-stock-btn">
                <template #icon><Plus :size="18" /></template>
            </Button>
        </div>

        <!-- Inventory Summary Stats Cards -->
        <div class="inventory-stats-grid">
            <div class="stat-card" :class="{ 'stat-active': activeFilter === 'all' }" @click="activeFilter = 'all'">
                <div class="stat-icon-circle blue">
                    <Package :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ inventoryStore.stats.totalUnits }}</span>
                    <span class="stat-label">إجمالي الوحدات</span>
                </div>
                <div class="stat-accent blue"></div>
            </div>
            <div class="stat-card" :class="{ 'stat-active': activeFilter === 'healthy' }" @click="activeFilter = 'healthy'">
                <div class="stat-icon-circle green">
                    <CheckCircle2 :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ inventoryStore.stats.healthyStock }}</span>
                    <span class="stat-label">مخزون سليم</span>
                </div>
                <div class="stat-accent green"></div>
            </div>
            <div class="stat-card" :class="{ 'stat-active': activeFilter === 'low' }" @click="activeFilter = 'low'">
                <div class="stat-icon-circle orange">
                    <AlertTriangle :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ inventoryStore.stats.lowStock }}</span>
                    <span class="stat-label">مخزون منخفض</span>
                </div>
                <div class="stat-accent orange"></div>
            </div>
            <div class="stat-card" :class="{ 'stat-active': activeFilter === 'out' }" @click="activeFilter = 'out'">
                <div class="stat-icon-circle red">
                    <AlertCircle :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ inventoryStore.stats.outOfStock }}</span>
                    <span class="stat-label">نفذ المخزون</span>
                </div>
                <div class="stat-accent red"></div>
            </div>
            <div class="stat-card" :class="{ 'stat-active': activeFilter === 'expiry' }" @click="activeFilter = 'expiry'">
                <div class="stat-icon-circle amber">
                    <Clock :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ inventoryStore.stats.expiringSoon + inventoryStore.stats.expired }}</span>
                    <span class="stat-label">تنتهي / منتهية</span>
                </div>
                <div class="stat-sub-detail">
                    <span class="sub-chip warn">{{ inventoryStore.stats.expiringSoon }} قريباً</span>
                    <span class="sub-chip danger">{{ inventoryStore.stats.expired }} منتهية</span>
                </div>
                <div class="stat-accent amber"></div>
            </div>
        </div>

        <!-- Table Container Card -->
        <div class="inventory-card">
            <!-- Filter Bar -->
            <div class="inventory-filter-bar">
                <div class="search-input-wrap">
                    <Search :size="16" class="search-icon" />
                    <InputText
                        v-model="searchQuery"
                        placeholder="ابحث باسم المنتج، رقم الدفعة، أو الرمز..."
                        class="ps-10 pr-4 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
                <Select
                    v-model="productStatusFilter"
                    :options="productStatusOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="حالة المنتج"
                    class="status-filter-select"
                    size="small"
                />
            </div>

            <!-- Inventory Table -->
            <InventoryTable 
                :items="filteredInventory" 
                :loading="inventoryStore.loading"
                @transfer="(loc, direction) => openTransfer(loc, direction)"
            />
        </div>

        <!-- Transfer Dialog -->
        <Dialog
            v-model:visible="showTransferDialog"
            :header="transferDirection === 'toShelf' ? 'نقل المخزون إلى الرف' : 'نقل المخزون إلى المستودع'"
            :style="{ width: '440px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body" v-if="transferItem">
                <div class="transfer-product-card">
                    <div class="transfer-product-name">{{ transferItem.productName }}</div>
                    <div class="transfer-direction">
                        <div class="transfer-from">
                            <span class="transfer-loc-label">من</span>
                            <span class="transfer-loc-value">{{ transferItem.location === 'BackWarehouse' ? 'المستودع' : 'الرف' }}</span>
                        </div>
                        <div class="transfer-arrow">
                            <ArrowRightLeft :size="18" />
                        </div>
                        <div class="transfer-to">
                            <span class="transfer-loc-label">إلى</span>
                            <span class="transfer-loc-value">{{ transferDirection === 'toShelf' ? 'الرف' : 'المستودع' }}</span>
                        </div>
                    </div>
                </div>

                <div class="form-field mt-3">
                    <label class="required">
                        الكمية المراد نقلها 
                        <span class="label-hint">(الحد الأقصى: {{ maxTransferQty() }})</span>
                    </label>
                    <InputNumber v-model="transferQty" :min="1" :max="maxTransferQty()" fluid placeholder="أدخل الكمية" />
                </div>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <Button label="إلغاء" outlined severity="secondary" @click="showTransferDialog = false" />
                    <Button label="نقل الكمية" @click="handleTransfer" :loading="inventoryStore.loading" :disabled="maxTransferQty() === 0">
                        <template #icon><ArrowRightLeft :size="16" /></template>
                    </Button>
                </div>
            </template>
        </Dialog>

        <!-- Add Stock Dialog -->
        <Dialog
            v-model:visible="showAddStockDialog"
            header="إستلام مخزون (دفعة جديدة)"
            :style="{ width: '560px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body">
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
                
                <Transition name="fade-slide">
                    <div v-if="addStockForm.productUnitId" class="base-qty-indicator">
                        <div class="base-qty-row">
                            <span class="base-qty-label">الكمية الإجمالية بالوحدة الأساسية</span>
                            <span class="base-qty-value">{{ calculateBaseQuantity }} قطعة</span>
                        </div>
                    </div>
                </Transition>

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
                <div class="dialog-footer">
                    <Button label="إلغاء" outlined severity="secondary" @click="showAddStockDialog = false" />
                    <Button label="حفظ الإستلام" @click="submitAddStock" :loading="inventoryStore.loading" :disabled="!addStockForm.productId || !addStockForm.batchNumber || !addStockForm.productUnitId">
                        <template #icon><Plus :size="16" /></template>
                    </Button>
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
            <div v-if="helpText" class="help-content">
                <div v-if="typeof helpText === 'object'">
                    <h3 class="help-section-title">الفروقات الأساسية</h3>
                    <div class="help-item">
                        <h4 class="help-item-title">رمز المنتج (Product Code)</h4>
                        <p class="help-item-text">{{ helpText.productCode || helpText.arabic?.productCode }}</p>
                    </div>
                    <div class="help-item">
                        <h4 class="help-item-title">رقم الدفعة (Batch Code)</h4>
                        <p class="help-item-text">{{ helpText.batchCode || helpText.arabic?.batchCode }}</p>
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
/* ─── Page Layout ───────────────────────────────────────── */
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

/* ─── Header ────────────────────────────────────────────── */
.inventory-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    flex-wrap: wrap;
    gap: 1rem;
}

.header-start {
    display: flex;
    align-items: center;
    gap: 0.875rem;
}

.header-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.875rem;
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.header-text {
    display: flex;
    flex-direction: column;
}

.inventory-title {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
    line-height: 1.2;
}
.dark .inventory-title { color: var(--p-surface-0); }

.inventory-subtitle {
    font-size: 0.825rem;
    color: var(--p-surface-450);
    margin: 0.125rem 0 0;
    font-weight: 500;
}

.help-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--p-surface-200);
    border-radius: 0.625rem;
    background: var(--p-surface-0);
    color: var(--p-surface-400);
    cursor: pointer;
    transition: all 0.2s ease;
}
.dark .help-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-500);
}
.help-btn:hover {
    border-color: var(--p-primary-300);
    color: var(--p-primary-500);
    background: var(--p-primary-50);
}
.dark .help-btn:hover {
    border-color: var(--p-primary-700);
    color: var(--p-primary-400);
    background: rgba(59, 130, 246, 0.1);
}

/* ─── Stats Grid ────────────────────────────────────────── */
.inventory-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.875rem;
}

.stat-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 1.125rem 1rem;
    border-radius: 1rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-150);
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}
.dark .stat-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}
.dark .stat-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.stat-card.stat-active {
    border-color: var(--p-primary-300);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}
.dark .stat-card.stat-active {
    border-color: var(--p-primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.stat-accent {
    position: absolute;
    bottom: 0;
    inset-inline-start: 0;
    inset-inline-end: 0;
    height: 3px;
    border-radius: 0 0 1rem 1rem;
    opacity: 0;
    transition: opacity 0.25s ease;
}
.stat-card.stat-active .stat-accent,
.stat-card:hover .stat-accent { opacity: 1; }

.stat-accent.blue { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.stat-accent.green { background: linear-gradient(90deg, #10b981, #34d399); }
.stat-accent.orange { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.stat-accent.red { background: linear-gradient(90deg, #ef4444, #f87171); }
.stat-accent.amber { background: linear-gradient(90deg, #ea580c, #fb923c); }

.stat-icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
}

.stat-icon-circle.blue  { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.stat-icon-circle.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.stat-icon-circle.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.stat-icon-circle.red   { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.stat-icon-circle.amber { background: rgba(234, 88, 12, 0.1); color: #ea580c; }

.stat-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 850;
    color: var(--p-surface-900);
    line-height: 1.1;
}
.dark .stat-value { color: var(--p-surface-0); }

.stat-label {
    font-size: 0.775rem;
    font-weight: 600;
    color: var(--p-surface-450);
    margin-top: 0.125rem;
}

.stat-sub-detail {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-inline-start: auto;
}

.sub-chip {
    font-size: 0.675rem;
    font-weight: 700;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    white-space: nowrap;
}

.sub-chip.warn {
    background: #fef3c7;
    color: #b45309;
}
.dark .sub-chip.warn {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
}

.sub-chip.danger {
    background: #fef2f2;
    color: #dc2626;
}
.dark .sub-chip.danger {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
}

/* ─── Card Wrapper ──────────────────────────────────────── */
.inventory-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-150);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
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
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-100);
    background: var(--p-surface-25);
    gap: 0.75rem;
}
.dark .inventory-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

.search-input-wrap {
    position: relative;
    width: 100%;
    max-width: 22rem;
}

.search-icon {
    position: absolute;
    inset-inline-start: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--p-surface-400);
    pointer-events: none;
}

.status-filter-select {
    min-width: 9rem;
    flex-shrink: 0;
}

/* ─── Dialog Styles ─────────────────────────────────────── */
.dialog-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.25rem 0;
}

.dialog-footer {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
    width: 100%;
}

/* Transfer Dialog Card */
.transfer-product-card {
    padding: 1rem 1.125rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
}
.dark .transfer-product-card {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.transfer-product-name {
    font-size: 0.95rem;
    font-weight: 750;
    color: var(--p-surface-900);
    margin-bottom: 0.75rem;
}
.dark .transfer-product-name { color: var(--p-surface-50); }

.transfer-direction {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.transfer-from, .transfer-to {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.625rem;
    border-radius: 0.625rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
}
.dark .transfer-from, .dark .transfer-to {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
}

.transfer-loc-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--p-surface-400);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.transfer-loc-value {
    font-size: 0.875rem;
    font-weight: 750;
    color: var(--p-surface-800);
}
.dark .transfer-loc-value { color: var(--p-surface-150); }

.transfer-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background: var(--p-primary-50);
    color: var(--p-primary-600);
    flex-shrink: 0;
}
.dark .transfer-arrow {
    background: rgba(59, 130, 246, 0.15);
    color: var(--p-primary-400);
}

/* ─── Form Fields ───────────────────────────────────────── */
.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.form-field label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--p-surface-700);
}
.dark .form-field label { color: var(--p-surface-200); }

.label-hint {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--p-surface-400);
}

/* Base Quantity Indicator */
.base-qty-indicator {
    padding: 0.75rem 1rem;
    border-radius: 0.625rem;
    background: var(--p-primary-50);
    border: 1px solid var(--p-primary-100);
}
.dark .base-qty-indicator {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.2);
}

.base-qty-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.base-qty-label {
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--p-surface-600);
}
.dark .base-qty-label { color: var(--p-surface-350); }

.base-qty-value {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--p-primary-600);
}
.dark .base-qty-value { color: var(--p-primary-400); }

/* ─── Help Content ──────────────────────────────────────── */
.help-content {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    color: var(--p-surface-700);
}
.dark .help-content { color: var(--p-surface-300); }

.help-section-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--p-primary-600);
    margin: 0 0 0.5rem;
}
.dark .help-section-title { color: var(--p-primary-400); }

.help-item {
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-100);
}
.dark .help-item {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.help-item-title {
    font-size: 0.9rem;
    font-weight: 750;
    color: var(--p-surface-900);
    margin: 0 0 0.375rem;
}
.dark .help-item-title { color: var(--p-surface-100); }

.help-item-text {
    font-size: 0.85rem;
    line-height: 1.6;
    margin: 0;
}

/* ─── Transitions ───────────────────────────────────────── */
.fade-slide-enter-active {
    animation: fadeSlide 0.3s ease;
}
.fade-slide-leave-active {
    animation: fadeSlide 0.2s ease reverse;
}

@keyframes fadeSlide {
    0% {
        opacity: 0;
        transform: translateY(-4px);
        max-height: 0;
    }
    100% {
        opacity: 1;
        transform: translateY(0);
        max-height: 100px;
    }
}

:deep(.p-datatable-tbody > tr > td) {
    border-bottom: none !important;
}
</style>
