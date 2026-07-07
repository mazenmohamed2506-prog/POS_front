<script setup>
import { ref, onMounted, computed } from "vue";
import { usePurchaseStore } from "@/stores/pos/purchaseStore";
import { useProductStore } from "@/stores/pos/productStore";
import { useSupplierStore } from "@/stores/pos/supplierStore";
import {
    Receipt, Plus, Trash2, Eye, Search, HelpCircle,
    ShoppingBag, Hash, Calendar, Package,
    Layers, CheckCircle2, DollarSign, Truck,
    ClipboardList
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

const purchaseStore = usePurchaseStore();
const productStore = useProductStore();
const supplierStore = useSupplierStore();

// ── Help Drawer ──
const showHelp = ref(false);
const purchasesHelpSections = [
    {
        title: 'عرض المشتريات',
        icon: ClipboardList,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'قائمة الفواتير', desc: 'تعرض جميع فواتير الشراء مرتبة من الأحدث إلى الأقدم' },
            { title: 'البحث', desc: 'ابحث برقم الفاتورة أو اسم المورد' },
            { title: 'عرض التفاصيل', desc: 'اضغط على أيقونة العين لرؤية محتويات الفاتورة كاملة' },
        ]
    },
    {
        title: 'إضافة فاتورة شراء',
        icon: Plus,
        color: '#d1fae5',
        iconColor: '#059669',
        steps: [
            { title: 'فاتورة جديدة', desc: 'اضغط "فاتورة جديدة" واملأ بيانات المورد والأصناف' },
            { title: 'إضافة أصناف', desc: 'اضغط "إضافة صنف" لإضافة منتجات متعددة للفاتورة' },
            { title: 'حفظ الفاتورة', desc: 'بعد مراجعة البيانات اضغط حفظ لتسجيل الفاتورة وتحديث المخزون' },
        ]
    },
    {
        title: 'تتبع تفاصيل الصنف',
        icon: Package,
        color: '#fef3c7',
        iconColor: '#d97706',
        steps: [
            { title: 'الفئة والمنتج', desc: 'حدد الفئة أولاً ثم اختر المنتج من القائمة المفلترة' },
            { title: 'الوحدة والكمية', desc: 'اختر وحدة الشراء وأدخل الكمية وسعر التكلفة' },
            { title: 'الدفعة والصلاحية', desc: 'أدخل رقم الدفعة وتاريخ الصلاحية لتتبع المخزون بشكل متكامل' },
        ]
    },
];
const purchasesHelpTips = [
    'فاتورة الشراء تضيف المخزون تلقائياً بعد الحفظ',
    'يمكنك إضافة أكثر من صنف في نفس الفاتورة',
    'تأكد من صحة الوحدة ومعامل التحويل قبل الحفظ',
    'سعر التكلفة يتحدد تلقائياً من بيانات الوحدة',
];

const showPurchaseDialog = ref(false);
const showDetailDialog = ref(false);
const selectedPurchase = ref(null);
const searchQuery = ref("");

const purchaseForm = ref({
    supplier: "",
    items: [{ categoryId: null, productId: null, productUnitId: null, qty: 1, cost: 0, batchNumber: "", expirationDate: null }],
});

const getFilteredProducts = (item) => {
    if (item.categoryId) {
        return productStore.products.filter(p => p.categoryId === item.categoryId);
    }
    return productStore.products;
};

const getProductUnits = (productId) => {
    if (!productId) return [];
    const p = productStore.products.find(x => x.id === productId);
    return p ? p.units || [] : [];
};

const getSelectedUnit = (item) => {
    if (!item.productId || !item.productUnitId) return null;
    const units = getProductUnits(item.productId);
    return units.find(u => u.id === item.productUnitId) || null;
};

const getBaseQuantity = (item) => {
    const unit = getSelectedUnit(item);
    if (!unit) return item.qty;
    return item.qty * (unit.factor || 1);
};

const onProductChange = (item) => {
    // Auto-select base unit when a product is chosen
    const units = getProductUnits(item.productId);
    if (units.length > 0) {
        const baseUnit = units.find(u => u.isBaseUnit || u.factor === 1) || units[0];
        item.productUnitId = baseUnit.id;
    } else {
        item.productUnitId = null;
    }
};

onMounted(() => {
    purchaseStore.fetchPurchases();
    productStore.fetchProducts();
    supplierStore.fetchSuppliers();
});

const filteredPurchases = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return purchaseStore.purchases;
    return purchaseStore.purchases.filter((p) =>
        (p.purchaseNo && p.purchaseNo.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q))
    );
});

const purchaseTotal = computed(() =>
    purchaseForm.value.items.reduce((sum, i) => sum + getBaseQuantity(i) * i.cost, 0)
);

// ─── Summary Metrics ─────────────────────────────────────────────────────────

const totalPurchases = computed(() => purchaseStore.purchases.length);

const totalSpent = computed(() =>
    purchaseStore.purchases.reduce((sum, p) => sum + (p.total || 0), 0)
);

const totalItemsBought = computed(() =>
    purchaseStore.purchases.reduce((sum, p) => sum + (p.itemNo ?? p.items?.length ?? 0), 0)
);

const addPurchaseLine = () => {
    purchaseForm.value.items.push({ categoryId: null, productId: null, productUnitId: null, qty: 1, cost: 0, batchNumber: "", expirationDate: null });
};

const removePurchaseLine = (idx) => {
    purchaseForm.value.items.splice(idx, 1);
};

const openNewPurchase = () => {
    purchaseForm.value = {
        supplier: "",
        items: [{ categoryId: null, productId: null, productUnitId: null, qty: 1, cost: 0, batchNumber: "", expirationDate: null }],
    };
    showPurchaseDialog.value = true;
};

const savePurchase = async () => {
    // format items to match API schema
    const itemsPayload = purchaseForm.value.items.map(item => {
        let expDate = null;
        if (item.expirationDate) {
            const d = new Date(item.expirationDate);
            expDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00Z`;
        }
        return {
            productId: item.productId,
            categoryId: item.categoryId || null,
            productUnitId: item.productUnitId || null,
            quantity: getBaseQuantity(item),
            originalReceivedQuantity: item.qty,
            costPrice: item.cost,
            batchNumber: item.batchNumber || null,
            expirationDate: expDate
        };
    });

    const payload = {
        supplierName: purchaseForm.value.supplier || "مورد عام",
        items: itemsPayload
    };

    await purchaseStore.addPurchase(payload);
    showPurchaseDialog.value = false;
};

const viewDetails = (purchase) => {
    selectedPurchase.value = purchase;
    showDetailDialog.value = true;
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat("ar-EG", {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 2,
    }).format(val || 0);
};

const getStatusConfig = (status) => {
    if (status === 'received') return { label: 'مستلم', class: 'status-success' };
    if (status === 'pending') return { label: 'معلق', class: 'status-warning' };
    if (status === 'cancelled') return { label: 'ملغي', class: 'status-danger' };
    return { label: status || '—', class: 'status-info' };
};
</script>

<template>
    <div class="purchases-page">
        <!-- Header -->
        <div class="purchases-header">
            <div class="header-start">
                <div class="header-icon-wrap">
                    <Receipt :size="26" />
                </div>
                <div class="header-text">
                    <h1 class="purchases-title">فواتير المشتريات</h1>
                    <p class="purchases-subtitle">تسجيل وإدارة فواتير شراء المنتجات من الموردين</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button label="فاتورة جديدة" @click="openNewPurchase">
                    <template #icon><Plus :size="18" /></template>
                </Button>
            </div>
        </div>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="فواتير المشتريات"
            page-subtitle="تسجيل ومتابعة فواتير الشراء"
            :page-icon="Receipt"
            header-gradient="linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)"
            :sections="purchasesHelpSections"
            :tips="purchasesHelpTips"
        />

        <!-- Stats Cards -->
        <div class="purchases-stats-grid">
            <div class="stat-card">
                <div class="stat-icon-circle Purple">
                    <ClipboardList :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ totalPurchases }}</span>
                    <span class="stat-label">إجمالي الفواتير</span>
                </div>
                <div class="stat-accent Purple"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-circle green">
                    <DollarSign :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ formatCurrency(totalSpent) }}</span>
                    <span class="stat-label">إجمالي المشتريات</span>
                </div>
                <div class="stat-accent green"></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-circle orange">
                    <Package :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ totalItemsBought }}</span>
                    <span class="stat-label">أصناف تم شراؤها</span>
                </div>
                <div class="stat-accent orange"></div>
            </div>
        </div>

        <!-- Table Container Card -->
        <div class="purchases-card">
            <!-- Filter Bar -->
            <div class="purchases-filter-bar">
                <div class="search-input-wrap">
                    <Search :size="16" class="search-icon" />
                    <InputText
                        v-model="searchQuery"
                        placeholder="ابحث برقم الفاتورة أو المورد..."
                        class="pr-10 pl-4 w-full search-input"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Purchases Table -->
            <DataTable
                :value="filteredPurchases"
                :loading="purchaseStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 15, 25, 50]"
                emptyMessage="لا توجد فواتير مشتريات مطابقة"
                stripedRows
                removableSort
                scrollable
                class="purchases-table"
            >
                <Column field="purchaseNo" header="رقم الفاتورة" sortable style="min-width: 170px">
                    <template #body="{ data }">
                        <div class="inv-number-cell">
                            <div class="inv-number-icon">
                                <Receipt :size="14" />
                            </div>
                            <span class="inv-number-text">{{ data.purchaseNo }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="supplier" header="المورد" sortable style="min-width: 180px">
                    <template #body="{ data }">
                        <div class="supplier-cell">
                            <Truck :size="14" class="supplier-icon" />
                            <span class="supplier-name">{{ data.supplier }}</span>
                        </div>
                    </template>
                </Column>
                <Column field="date" header="التاريخ" sortable style="min-width: 200px">
                    <template #body="{ data }">
                        <div class="date-cell">
                            <Calendar :size="13" class="date-icon" />
                            <span>{{ formatDate(data.date) }}</span>
                        </div>
                    </template>
                </Column>
                <Column header="عدد الأصناف" style="min-width: 120px">
                    <template #body="{ data }">
                        <span class="items-count-chip">
                            {{ data.itemNo ?? data.items?.length ?? 0 }} صنف
                        </span>
                    </template>
                </Column>
                <Column field="total" header="الإجمالي" sortable style="min-width: 160px">
                    <template #body="{ data }">
                        <span class="total-cell">{{ formatCurrency(data.total) }}</span>
                    </template>
                </Column>
                <Column field="status" header="الحالة" style="min-width: 120px">
                    <template #body="{ data }">
                        <span class="status-chip" :class="getStatusConfig(data.status).class">
                            {{ getStatusConfig(data.status).label }}
                        </span>
                    </template>
                </Column>
                <Column header="عرض" style="min-width: 80px; text-align: center">
                    <template #body="{ data }">
                        <button class="act-btn act-view" @click="viewDetails(data)" title="عرض التفاصيل">
                            <Eye :size="15" />
                        </button>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- ═══ Detail Dialog ═══ -->
        <Dialog
            v-model:visible="showDetailDialog"
            header="تفاصيل فاتورة المشتريات"
            :style="{ width: '700px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body" v-if="selectedPurchase">
                <!-- Invoice Header Card -->
                <div class="detail-header-card">
                    <div class="detail-header-top">
                        <div class="detail-invoice-icon">
                            <Receipt :size="22" />
                        </div>
                        <div class="detail-invoice-info">
                            <span class="detail-invoice-no">{{ selectedPurchase.purchaseNo }}</span>
                            <span class="detail-invoice-supplier">
                                <Truck :size="13" />
                                {{ selectedPurchase.supplier }}
                            </span>
                        </div>
                        <span class="status-chip" :class="getStatusConfig(selectedPurchase.status).class" style="margin-inline-start: auto;">
                            {{ getStatusConfig(selectedPurchase.status).label }}
                        </span>
                    </div>
                    <div class="detail-meta-strip">
                        <div class="detail-meta-item">
                            <Calendar :size="13" />
                            <span>{{ formatDate(selectedPurchase.date) }}</span>
                        </div>
                        <div class="detail-meta-item">
                            <Package :size="13" />
                            <span>{{ selectedPurchase.items?.length || 0 }} صنف</span>
                        </div>
                    </div>
                </div>

                <!-- Items List -->
                <div v-if="selectedPurchase.items && selectedPurchase.items.length > 0">
                    <div class="detail-section-title">
                        <ShoppingBag :size="15" />
                        <span>أصناف الفاتورة</span>
                    </div>
                    <div class="detail-items-list">
                        <div v-for="(item, idx) in selectedPurchase.items" :key="idx" class="detail-item-row">
                            <div class="detail-item-index">{{ idx + 1 }}</div>
                            <div class="detail-item-info">
                                <span class="detail-item-name">{{ item.productName }}</span>
                                <span class="detail-item-id">كود: {{ item.productId }}</span>
                            </div>
                            <div class="detail-item-qty">{{ item.qty }} وحدة</div>
                            <div class="detail-item-cost">{{ formatCurrency(item.cost) }}</div>
                            <div class="detail-item-total">{{ formatCurrency(item.qty * item.cost) }}</div>
                        </div>
                    </div>
                </div>
                <div v-else class="detail-empty">
                    <Package :size="32" />
                    <span>لا تتوفر تفاصيل أصناف لهذه الفاتورة</span>
                </div>

                <!-- Totals Summary -->
                <div class="detail-totals-card">
                    <div class="totals-row">
                        <span class="totals-label">عدد الأصناف الفريدة</span>
                        <span class="totals-value">{{ selectedPurchase.items?.length || 0 }}</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">إجمالي الكميات المشتراة</span>
                        <span class="totals-value">{{ selectedPurchase.items?.reduce((s, i) => s + (i.qty || 0), 0) || 0 }}</span>
                    </div>
                    <div class="totals-divider"></div>
                    <div class="totals-row totals-final">
                        <span class="totals-label">إجمالي الفاتورة</span>
                        <span class="totals-value-final">{{ formatCurrency(selectedPurchase.total) }}</span>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <Button label="إغلاق" outlined severity="secondary" @click="showDetailDialog = false" />
                </div>
            </template>
        </Dialog>

        <!-- ═══ New Purchase Dialog ═══ -->
        <Dialog
            v-model:visible="showPurchaseDialog"
            header="تسجيل فاتورة مشتريات جديدة"
            :style="{ width: '700px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body">
                <div class="form-field">
                    <label class="required">اسم المورد</label>
                    <Select
                        v-model="purchaseForm.supplier"
                        :options="supplierStore.suppliers"
                        optionLabel="name"
                        optionValue="name"
                        filter
                        fluid
                        placeholder="اختر المورد"
                    />
                </div>

                <!-- Item Lines -->
                <div class="purchase-items-section">
                    <div class="purchase-items-header">
                        <div class="purchase-items-title">
                            <ShoppingBag :size="16" />
                            <span>أصناف الفاتورة</span>
                            <span class="purchase-items-count">{{ purchaseForm.items.length }}</span>
                        </div>
                        <Button label="إضافة صنف" outlined size="small" @click="addPurchaseLine">
                            <template #icon><Plus :size="14" /></template>
                        </Button>
                    </div>

                    <div class="purchase-lines-list">
                        <div
                            v-for="(item, idx) in purchaseForm.items"
                            :key="idx"
                            class="purchase-line-card"
                        >
                            <div class="line-card-header">
                                <span class="line-number">صنف #{{ idx + 1 }}</span>
                                <button
                                    class="line-remove-btn"
                                    @click="removePurchaseLine(idx)"
                                    :disabled="purchaseForm.items.length <= 1"
                                    title="حذف السطر"
                                >
                                    <Trash2 :size="13" />
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-12 gap-3 mb-3">
                                <div class="col-span-12 md:col-span-3">
                                    <div class="form-field-sm">
                                        <label>الفئة (اختياري)</label>
                                        <Select
                                            v-model="item.categoryId"
                                            @update:modelValue="() => { item.productId = null; item.productUnitId = null; }"
                                            :options="productStore.categories"
                                            optionLabel="name"
                                            optionValue="id"
                                            filter
                                            showClear
                                            fluid
                                            placeholder="اختر الفئة"
                                            size="small"
                                        />
                                    </div>
                                </div>
                                <div class="col-span-12 md:col-span-3">
                                    <div class="form-field-sm">
                                        <label class="required">المنتج</label>
                                        <Select
                                            :modelValue="item.productId"
                                            @update:modelValue="(val) => { item.productId = val; onProductChange(item); }"
                                            :options="getFilteredProducts(item)"
                                            optionLabel="name"
                                            optionValue="id"
                                            filter
                                            fluid
                                            placeholder="اختر المنتج"
                                            size="small"
                                        />
                                    </div>
                                </div>
                                <div class="col-span-6 md:col-span-2">
                                    <div class="form-field-sm">
                                        <label class="required">الوحدة</label>
                                        <Select
                                            v-model="item.productUnitId"
                                            :options="getProductUnits(item.productId)"
                                            optionLabel="name"
                                            optionValue="id"
                                            fluid
                                            :disabled="!item.productId || getProductUnits(item.productId).length === 0"
                                            placeholder="اختر الوحدة"
                                            size="small"
                                        />
                                    </div>
                                </div>
                                <div class="col-span-3 md:col-span-2">
                                    <div class="form-field-sm">
                                        <label class="required">الكمية</label>
                                        <InputNumber v-model="item.qty" :min="1" fluid placeholder="الكمية" size="small" />
                                    </div>
                                </div>
                                <div class="col-span-3 md:col-span-2">
                                    <div class="form-field-sm">
                                        <label class="required">سعر الشراء</label>
                                        <InputNumber v-model="item.cost" :minFractionDigits="2" fluid placeholder="0.00" size="small" />
                                    </div>
                                </div>
                            </div>

                            <!-- Base quantity info -->
                            <Transition name="fade-slide">
                                <div v-if="item.productUnitId && getSelectedUnit(item) && getSelectedUnit(item).factor !== 1" class="base-qty-indicator">
                                    <span class="base-qty-label">الكمية بالوحدة الأساسية:</span>
                                    <span class="base-qty-value">{{ getBaseQuantity(item) }} قطعة</span>
                                </div>
                            </Transition>
                            
                            <div class="grid grid-cols-12 gap-3">
                                <div class="col-span-12 md:col-span-6">
                                    <div class="form-field-sm">
                                        <label>تاريخ الصلاحية (إن وجد)</label>
                                        <DatePicker v-model="item.expirationDate" dateFormat="yy-mm-dd" fluid placeholder="تاريخ الصلاحية" size="small" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Purchase Total -->
                <div class="purchase-total-bar">
                    <span class="purchase-total-label">إجمالي الفاتورة المتوقع</span>
                    <span class="purchase-total-value">{{ formatCurrency(purchaseTotal) }}</span>
                </div>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <Button label="إلغاء" outlined severity="secondary" @click="showPurchaseDialog = false" />
                    <Button label="حفظ الفاتورة" @click="savePurchase" :loading="purchaseStore.loading">
                        <template #icon><CheckCircle2 :size="16" /></template>
                    </Button>
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* ─── Page Layout ───────────────────────────────────────── */
.purchases-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .purchases-page { padding: 0.75rem; gap: 1rem; }
}

/* ─── Header ────────────────────────────────────────────── */
.purchases-header {
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

.purchases-title {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
    line-height: 1.2;
}
.dark .purchases-title { color: var(--p-surface-0); }

.purchases-subtitle {
    font-size: 0.825rem;
    color: var(--p-surface-450);
    margin: 0.125rem 0 0;
    font-weight: 500;
}

/* ─── Stats Grid ────────────────────────────────────────── */
.purchases-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
    overflow: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.dark .stat-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
}
.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}
.dark .stat-card:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }

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
.stat-card:hover .stat-accent { opacity: 1; }
.stat-accent.Purple { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.stat-accent.green { background: linear-gradient(90deg, #10b981, #34d399); }
.stat-accent.orange { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

.stat-icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
}
.stat-icon-circle.Purple  { background: rgba(124, 58, 237, 0.1); color: #7c3aed; }
.stat-icon-circle.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.stat-icon-circle.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

.stat-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.stat-value {
    font-size: 1.35rem;
    font-weight: 850;
    color: var(--p-surface-900);
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .stat-value { color: var(--p-surface-0); }

.stat-label {
    font-size: 0.775rem;
    font-weight: 600;
    color: var(--p-surface-450);
    margin-top: 0.125rem;
}

/* ─── Card & Filter Bar ─────────────────────────────────── */
.purchases-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-150);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
}
.dark .purchases-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.purchases-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-100);
    background: var(--p-surface-25);
    gap: 0.75rem;
}
.dark .purchases-filter-bar {
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
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--p-surface-400);
    pointer-events: none;
}

.search-input {
    padding-right: 2.75rem !important;
}

/* ─── Table Cells ───────────────────────────────────────── */
.inv-number-cell {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

.inv-number-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    background: var(--p-primary-50);
    color: var(--p-primary-500);
    flex-shrink: 0;
}
.dark .inv-number-icon {
    background: rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.12);
    color: var(--p-primary-400);
}

.inv-number-text {
    font-size: 0.875rem;
    font-weight: 750;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    color: var(--p-primary-600);
}
.dark .inv-number-text { color: var(--p-primary-400); }

.supplier-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.supplier-icon {
    color: var(--p-surface-400);
    flex-shrink: 0;
}

.supplier-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-800);
}
.dark .supplier-name { color: var(--p-surface-100); }

.date-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--p-surface-600);
}
.dark .date-cell { color: var(--p-surface-350); }

.date-icon { color: var(--p-surface-400); flex-shrink: 0; }

.items-count-chip {
    display: inline-flex;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    background: #f5f3ff;
    color: #7c3aed;
    border: 1px solid #ddd6fe;
}
.dark .items-count-chip {
    background: rgba(124, 58, 237, 0.1);
    color: #a78bfa;
    border-color: rgba(124, 58, 237, 0.25);
}

.total-cell {
    font-size: 0.9rem;
    font-weight: 850;
    color: var(--p-surface-900);
}
.dark .total-cell { color: var(--p-surface-50); }

/* ─── Status Chip ───────────────────────────────────────── */
.status-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    border: 1px solid;
}

.status-success {
    background: #ecfdf5; color: #059669; border-color: #a7f3d0;
}
.dark .status-success {
    background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.25);
}

.status-warning {
    background: #fef3c7; color: #d97706; border-color: #fde68a;
}
.dark .status-warning {
    background: rgba(245, 158, 11, 0.1); color: #fbbf24; border-color: rgba(245, 158, 11, 0.25);
}

.status-danger {
    background: #fef2f2; color: #dc2626; border-color: #fecaca;
}
.dark .status-danger {
    background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.25);
}

.status-info {
    background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe;
}
.dark .status-info {
    background: rgba(124, 58, 237, 0.1); color: #a78bfa; border-color: rgba(124, 58, 237, 0.25);
}

/* ─── Action Button ─────────────────────────────────────── */
.act-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    border: 1px solid;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
}

.act-btn.act-view {
    color: #7c3aed;
    border-color: #ddd6fe;
    background: #f5f3ff;
}
.dark .act-btn.act-view {
    background: rgba(124, 58, 237, 0.1);
    border-color: rgba(124, 58, 237, 0.25);
    color: #a78bfa;
}
.act-btn.act-view:hover {
    background: #ede9fe;
    border-color: #c4b5fd;
}
.dark .act-btn.act-view:hover { background: rgba(124, 58, 237, 0.2); }

/* ─── Dialog Body ───────────────────────────────────────── */
.dialog-body {
    display: flex;
    flex-direction: column;
    gap: 1.125rem;
    padding: 0.25rem 0;
}

.dialog-footer {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
    width: 100%;
}

/* ─── Detail Dialog ─────────────────────────────────────── */
.detail-header-card {
    padding: 1.125rem;
    border-radius: 0.875rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}
.dark .detail-header-card {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.detail-header-top {
    display: flex;
    align-items: center;
    gap: 0.875rem;
}

.detail-invoice-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    color: white;
    flex-shrink: 0;
}

.detail-invoice-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.detail-invoice-no {
    font-size: 1rem;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    color: var(--p-primary-600);
}
.dark .detail-invoice-no { color: var(--p-primary-400); }

.detail-invoice-supplier {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.detail-meta-strip {
    display: flex;
    gap: 1.25rem;
    padding-top: 0.625rem;
    border-top: 1px solid var(--p-surface-150);
}
.dark .detail-meta-strip { border-color: var(--p-surface-750); }

.detail-meta-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.775rem;
    font-weight: 500;
    color: var(--p-surface-450);
}

.detail-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 750;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding-bottom: 0.375rem;
    border-bottom: 1px dashed var(--p-surface-200);
}
.dark .detail-section-title { border-color: var(--p-surface-750); color: var(--p-surface-400); }

.detail-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    max-height: 280px;
    overflow-y: auto;
}

.detail-item-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    border-radius: 0.625rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-100);
    transition: background-color 0.15s;
}
.dark .detail-item-row {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}
.detail-item-row:hover { background: var(--p-surface-50); }
.dark .detail-item-row:hover { background: var(--p-surface-800); }

.detail-item-index {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    background: var(--p-surface-100);
    color: var(--p-surface-500);
    font-size: 0.75rem;
    font-weight: 800;
    flex-shrink: 0;
}
.dark .detail-item-index { background: var(--p-surface-800); color: var(--p-surface-400); }

.detail-item-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
}

.detail-item-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--p-surface-800);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .detail-item-name { color: var(--p-surface-100); }

.detail-item-id {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--p-surface-400);
    font-family: 'JetBrains Mono', monospace;
}

.detail-item-qty {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--p-surface-600);
    white-space: nowrap;
}
.dark .detail-item-qty { color: var(--p-surface-350); }

.detail-item-cost {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--p-surface-500);
    white-space: nowrap;
}

.detail-item-total {
    font-size: 0.85rem;
    font-weight: 850;
    color: var(--p-surface-900);
    white-space: nowrap;
}
.dark .detail-item-total { color: var(--p-surface-50); }

.detail-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2.5rem;
    color: var(--p-surface-350);
    text-align: center;
    font-size: 0.875rem;
    font-weight: 500;
}

/* ─── Totals Card ───────────────────────────────────────── */
.detail-totals-card {
    padding: 1rem 1.125rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.dark .detail-totals-card {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.totals-label {
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--p-surface-500);
}

.totals-value {
    font-size: 0.875rem;
    font-weight: 750;
    color: var(--p-surface-700);
}
.dark .totals-value { color: var(--p-surface-250); }

.totals-divider {
    border-top: 1px dashed var(--p-surface-200);
    margin: 0.25rem 0;
}
.dark .totals-divider { border-color: var(--p-surface-700); }

.totals-final .totals-label {
    font-size: 1rem;
    font-weight: 800;
    color: var(--p-surface-800);
}
.dark .totals-final .totals-label { color: var(--p-surface-150); }

.totals-value-final {
    font-size: 1.2rem;
    font-weight: 900;
    color: var(--p-primary-600);
}
.dark .totals-value-final { color: var(--p-primary-400); }

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

.form-field-sm {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.form-field-sm label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--p-surface-600);
}
.dark .form-field-sm label { color: var(--p-surface-300); }

/* ─── Purchase Items Section ────────────────────────────── */
.purchase-items-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border-top: 1px solid var(--p-surface-150);
    padding-top: 1rem;
}
.dark .purchase-items-section { border-color: var(--p-surface-800); }

.purchase-items-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.purchase-items-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 750;
    color: var(--p-surface-700);
}
.dark .purchase-items-title { color: var(--p-surface-200); }

.purchase-items-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.375rem;
    height: 1.375rem;
    border-radius: 9999px;
    background: var(--p-primary-100);
    color: var(--p-primary-700);
    font-size: 0.7rem;
    font-weight: 800;
}
.dark .purchase-items-count {
    background: rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.15);
    color: var(--p-primary-400);
}

.purchase-lines-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 380px;
    overflow-y: auto;
    padding-inline-end: 0.25rem;
}

.purchase-line-card {
    padding: 1rem;
    border-radius: 0.875rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
    transition: all 0.2s ease;
}
.dark .purchase-line-card {
    border-color: var(--p-surface-750);
    background: var(--p-surface-850);
}

.line-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.line-number {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--p-surface-500);
}

.line-remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.15s ease;
}
.line-remove-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.line-remove-btn:not(:disabled):hover { background: #fee2e2; border-color: #fca5a5; }
.dark .line-remove-btn {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
}

/* ─── Base Qty Indicator ────────────────────────────────── */
.base-qty-indicator {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.75rem;
    border-radius: 0.5rem;
    background: var(--p-primary-50);
    border: 1px solid var(--p-primary-100);
}
.dark .base-qty-indicator {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.2);
}

.base-qty-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-surface-600);
}
.dark .base-qty-label { color: var(--p-surface-350); }

.base-qty-value {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--p-primary-600);
}
.dark .base-qty-value { color: var(--p-primary-400); }

/* ─── Purchase Total Bar ────────────────────────────────── */
.purchase-total-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.125rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
    border-top: 3px solid var(--p-primary-500);
}
.dark .purchase-total-bar {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
    border-top-color: var(--p-primary-500);
}

.purchase-total-label {
    font-size: 0.9rem;
    font-weight: 750;
    color: var(--p-surface-600);
}
.dark .purchase-total-label { color: var(--p-surface-350); }

.purchase-total-value {
    font-size: 1.25rem;
    font-weight: 900;
    color: var(--p-primary-600);
}
.dark .purchase-total-value { color: var(--p-primary-400); }

/* ─── Transitions ───────────────────────────────────────── */
.fade-slide-enter-active { animation: fadeSlide 0.3s ease; }
.fade-slide-leave-active { animation: fadeSlide 0.2s ease reverse; }

@keyframes fadeSlide {
    0% { opacity: 0; transform: translateY(-4px); max-height: 0; }
    100% { opacity: 1; transform: translateY(0); max-height: 100px; }
}

:deep(.p-datatable-tbody > tr > td) {
    border-bottom: none !important;
}
</style>
