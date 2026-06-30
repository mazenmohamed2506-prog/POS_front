<script setup>
import { ref, computed, onMounted } from "vue";
import { useProductStore } from "@/stores/pos/productStore";
import { useUnitStore } from "@/stores/pos/unitStore";
import { useToastStore } from "@/stores/base/toastStore";
import { usePosStore } from "@/stores/pos/posStore";
import {
    Package, Plus, Pencil, Trash2, Search, Star,
    PlusCircle, ArrowLeft, Eye,
    LayoutGrid, CheckCircle2, XCircle, AlertCircle
} from "lucide-vue-next";

// Category combobox state
const isAddingNewCategory = ref(false);
const newCategoryName = ref("");

const productStore = useProductStore();
const unitStore = useUnitStore();
const toastStore = useToastStore();
const posStore = usePosStore();

const showManageCategoriesDialog = ref(false);
const editingCategory = ref(null);
const categoryForm = ref({ name: "" });

const openManageCategories = () => {
    editingCategory.value = null;
    categoryForm.value = { name: "" };
    showManageCategoriesDialog.value = true;
};

const editCategory = (c) => {
    editingCategory.value = c;
    categoryForm.value = { name: c.name };
};

const saveCategory = async () => {
    if (!categoryForm.value.name) return;
    try {
        if (editingCategory.value) {
            await productStore.updateCategory(editingCategory.value.id, categoryForm.value);
        } else {
            await productStore.createCategory(categoryForm.value);
        }
        categoryForm.value = { name: "" };
        editingCategory.value = null;
    } catch (e) {}
};

const removeCategory = async (c) => {
    if (confirm(`هل أنت متأكد من حذف الفئة "${c.name}"؟`)) {
        try {
            await productStore.deleteCategory(c.id);
        } catch (e) {}
    }
};

const showManageUnitsDialog = ref(false);
const editingUnit = ref(null);
const unitForm = ref({ name: "" });

const openManageUnits = () => {
    editingUnit.value = null;
    unitForm.value = { name: "" };
    showManageUnitsDialog.value = true;
};

const editUnit = (u) => {
    editingUnit.value = u;
    unitForm.value = { name: u.name };
};

const saveUnit = async () => {
    if (!unitForm.value.name) return;
    try {
        if (editingUnit.value) {
            await unitStore.updateUnit(editingUnit.value.id, unitForm.value);
        } else {
            await unitStore.createUnit(unitForm.value);
        }
        unitForm.value = { name: "" };
        editingUnit.value = null;
    } catch (e) {}
};

const removeUnit = async (u) => {
    if (confirm(`هل أنت متأكد من حذف الوحدة "${u.name}"؟`)) {
        try {
            await unitStore.deleteUnit(u.id);
        } catch (e) {}
    }
};

const showProductDialog = ref(false);
const editingProduct = ref(null);
const showConversionsDialog = ref(false);
const unitConversions = ref(null);

const showDetailsDialog = ref(false);
const selectedProductDetails = ref(null);

const openProductDetails = (product) => {
    selectedProductDetails.value = product;
    showDetailsDialog.value = true;
};

const productForm = ref({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    price: 0,
    sellingPrice: 0,
    cost: 0,
    costPrice: 0,
    itemDiscount: 0,
    units: [],
});

const filters = ref({ global: { value: "", matchMode: "contains" } });

onMounted(() => {
    productStore.fetchProducts();
    unitStore.fetchUnits();
});

// ─── Catalog Summary Metrics ────────────────────────────────────────────────

/** Total number of products in the catalog */
const totalProducts = computed(() => productStore.products.length);

/** Products where isActive === true */
const activeProducts = computed(() =>
    productStore.products.filter(p => p.isActive).length
);

/** Products where isActive === false */
const inactiveProducts = computed(() =>
    productStore.products.filter(p => !p.isActive).length
);

/**
 * Incomplete products: missing a barcode on the base unit (factor === 1)
 * OR have a selling price of 0.
 */
const incompleteProducts = computed(() =>
    productStore.products.filter(p => {
        const baseUnit = (p.units || []).find(u => u.factor === 1) || (p.units || [])[0];
        const missingBarcode = !baseUnit?.barcode;
        const missingPrice  = (baseUnit?.sellingPrice ?? baseUnit?.price ?? p.sellingPrice ?? 0) === 0;
        return missingBarcode || missingPrice;
    }).length
);

// ─── Product Dialog Handlers ─────────────────────────────────────────────────

const openNewProduct = () => {
    editingProduct.value = null;
    productForm.value = {
        name: "",
        sku: "",
        barcode: "",
        category: "",
        price: 0,
        sellingPrice: 0,
        cost: 0,
        costPrice: 0,
        itemDiscount: 0,
        units: [
            { id: 0, name: "قطعة", factor: 1, barcode: "", price: 0, cost: 0, itemDiscount: 0 }
        ]
    };
    isAddingNewCategory.value = false;
    newCategoryName.value = "";
    showProductDialog.value = true;
};

const openEditProduct = (product) => {
    editingProduct.value = product;
    let units = [...(product.units || [])];
    if (units.length === 0) {
        units = [{ id: 0, name: "قطعة", factor: 1, barcode: product.barcode || "", price: product.sellingPrice, cost: product.costPrice, itemDiscount: product.itemDiscount }];
    }

    units = units.map(u => ({
        id: u.id ?? 0,
        name: u.name || "",
        factor: u.factor || 1,
        barcode: u.barcode || "",
        price: u.sellingPrice ?? u.price ?? 0,
        cost: u.costPrice ?? u.cost ?? 0,
        itemDiscount: u.itemDiscount ?? 0,
        isBaseUnit: u.isBaseUnit ?? (u.factor === 1)
    }));

    productForm.value = { ...product, units };
    isAddingNewCategory.value = false;
    newCategoryName.value = "";
    showProductDialog.value = true;
};

const addUnitLine = () => {
    productForm.value.units.push({ id: 0, name: "", factor: 1, barcode: "", price: 0, cost: 0, itemDiscount: 0 });
};

const removeUnitLine = (idx) => {
    productForm.value.units.splice(idx, 1);
};

const validateUnits = () => {
    const baseUnitsCount = productForm.value.units.filter(u => u.factor === 1).length;
    if (baseUnitsCount !== 1) {
        toastStore.addErrorToast("يجب أن تكون هناك وحدة أساسية واحدة فقط (بمعامل تحويل = 1)");
        return false;
    }
    return true;
};

const saveProduct = async () => {
    if (!validateUnits()) return;

    // Sync base unit back to the root product object.
    if (productForm.value.units.length > 0) {
        const baseUnit = productForm.value.units[0];
        productForm.value.price = baseUnit.price;
        productForm.value.sellingPrice = baseUnit.price;
        productForm.value.cost = baseUnit.cost;
        productForm.value.costPrice = baseUnit.cost;
        productForm.value.itemDiscount = baseUnit.itemDiscount;
        if (baseUnit.barcode) {
            productForm.value.barcode = baseUnit.barcode;
        }
    }

    try {
        if (editingProduct.value) {
            await productStore.updateProduct({ ...productForm.value, id: editingProduct.value.id });
        } else {
            await productStore.createProduct({ ...productForm.value });
        }
        showProductDialog.value = false;
    } catch {
        // Handled by store toasts
    }
};

const deleteProduct = async (product) => {
    if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
        try {
            await productStore.deleteProduct(product.id);
        } catch {
            // Handled by store toasts
        }
    }
};

const viewConversions = async (product) => {
    unitConversions.value = null;
    showConversionsDialog.value = true;
    try {
        unitConversions.value = await productStore.fetchUnitConversions(product.id);
    } catch (err) {
        showConversionsDialog.value = false;
    }
};
</script>

<template>
    <div class="products-page">
        <!-- Header -->
        <div class="products-header">
            <div class="flex items-center gap-3">
                <div class="header-icon-wrap">
                    <Package :size="28" class="text-primary-500" />
                </div>
                <div>
                    <h1 class="products-title">إدارة المنتجات</h1>
                    <p class="products-subtitle">عرض وإضافة وتعديل بيانات المنتجات والأسعار</p>
                </div>
            </div>
            <Button v-if="posStore.role === 'Manager' || posStore.role === 'SuperAdmin'" label="إضافة منتج" @click="openNewProduct">
                <template #icon>
                    <Plus :size="18" />
                </template>
            </Button>
        </div>

        <!-- Catalog Overview Stats Cards -->
        <div class="products-stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue">
                    <Package :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">إجمالي المنتجات</span>
                    <span class="stat-value">{{ totalProducts }}</span>
                    <span class="stat-sub">جميع المنتجات المسجلة</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">
                    <CheckCircle2 :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">المنتجات النشطة</span>
                    <span class="stat-value">{{ activeProducts }}</span>
                    <span class="stat-sub">متاحة للبيع</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red">
                    <XCircle :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">المنتجات غير النشطة</span>
                    <span class="stat-value">{{ inactiveProducts }}</span>
                    <span class="stat-sub">غير معروضة للبيع</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange">
                    <AlertCircle :size="20" />
                </div>
                <div class="stat-info">
                    <span class="stat-label">بيانات غير مكتملة</span>
                    <span class="stat-value">{{ incompleteProducts }}</span>
                    <span class="stat-sub">بدون باركود أو السعر 0</span>
                </div>
            </div>
        </div>

        <!-- Error Banner -->
        <div v-if="productStore.error" class="mb-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center justify-between">
            <span>{{ productStore.error }}</span>
            <Button label="إعادة المحاولة" size="small" severity="danger" text @click="productStore.fetchProducts()" />
        </div>

        <!-- Table Container Card -->
        <div class="products-card">
            <!-- Filter TopBar -->
            <div class="products-filter-bar flex justify-between items-center flex-wrap gap-3">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="filters.global.value"
                        placeholder="         بحث سريع عن صنف..."
                        class="ps-10 pr-4 w-full"
                        autocomplete="off"
                        size="small"
                    />
                </div>
            </div>

            <!-- Products Table -->
            <DataTable
                :value="productStore.products"
                :loading="productStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                v-model:filters="filters"
                :globalFilterFields="['name', 'sku', 'barcode', 'category']"
                emptyMessage="لا توجد منتجات مطابقة للبحث"
                stripedRows
                removableSort
                scrollable
                class="products-table"
            >
                <Column field="name" header="اسم المنتج" sortable style="min-width: 220px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.name }}</span>
                    </template>
                </Column>
                <Column field="sku" header="رمز المنتج" sortable style="min-width: 140px">
                    <template #body="{ data }">
                        <span class="text-sm font-semibold font-mono text-surface-600 dark:text-surface-400">{{ data.sku }}</span>
                    </template>
                </Column>

                <Column field="category" header="الفئة" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <Tag :value="data.category" severity="info" class="font-medium" />
                    </template>
                </Column>
                 <Column field="costPrice" header="سعر الشراء" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="font-black text-primary-600 dark:text-primary-450">{{ data.costPrice?.toFixed(2) }} EGP</span>
                    </template>
                </Column>
                <Column field="sellingPrice" header="سعر البيع" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="font-black text-primary-600 dark:text-primary-450">{{ data.sellingPrice?.toFixed(2) }} EGP</span>
                    </template>
                </Column>
                <Column field="itemDiscount" header="الخصم" sortable style="min-width: 110px">
                    <template #body="{ data }">
                        <span :class="data.itemDiscount > 0 ? 'text-red-500 font-bold' : 'text-surface-400'">
                            {{ data.itemDiscount > 0 ? data.itemDiscount.toFixed(2) + ' EGP' : '—' }}
                        </span>
                    </template>
                </Column>



                <Column header="إجراءات" style="min-width: 130px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex gap-1 justify-center">
                            <button class="action-view-btn text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 p-1.5 rounded-md border border-primary-200 dark:border-primary-800 transition-colors" @click="openProductDetails(data)" title="عرض التفاصيل">
                                <Eye :size="15" />
                            </button>
                            <button class="action-edit-btn" @click="openEditProduct(data)" title="تعديل">
                                <Pencil :size="15" />
                            </button>
                            <button class="action-delete-btn" @click="deleteProduct(data)" title="حذف">
                                <Trash2 :size="15" />
                            </button>
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Product Dialog -->
        <Dialog
            v-model:visible="showProductDialog"
            :header="editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'"
            :style="{ width: '520px' }"
            modal
            dismissableMask
        >
            <div class="product-dialog-form">

                <div class="grid grid-cols-2 gap-4">
                    <div class="form-field">
                        <label class="required">اسم المنتج</label>
                        <InputText v-model="productForm.name" fluid placeholder="أدخل اسم المنتج" />
                    </div>
                    <div class="form-field">
                        <label class="required">رمز المنتج (SKU)</label>
                        <InputText v-model="productForm.sku" fluid placeholder="SKU" />
                    </div>

                </div>
                <div class="form-field">
                    <div class="flex justify-between items-center mb-1">
                        <label class="required">الفئة</label>
                        <Button label="إدارة الفئات" size="small" severity="info" outlined @click="openManageCategories" />
                    </div>
                    <Select 
                        v-model="productForm.category" 
                        :options="productStore.categories" 
                        optionLabel="name" 
                        optionValue="name" 
                        filter 
                        fluid 
                        placeholder="اختر فئة من القائمة"
                        showClear
                    />
                </div>
                
                <!-- Units section -->
                <div class="units-section">
                    <div class="flex justify-between items-center mb-2">
                        <label class="font-bold text-surface-700 dark:text-surface-200">وحدات المنتج <span class="text-xs font-normal text-surface-500">(يجب أن توجد وحدة أساسية واحدة بمعامل 1)</span></label>
                        <div class="flex gap-2">
                            <Button label="إدارة الوحدات" size="small" severity="info" outlined @click="openManageUnits" />
                            <Button label="إضافة وحدة" size="small" outlined @click="addUnitLine">
                                <template #icon><Plus :size="14" /></template>
                            </Button>
                        </div>
                    </div>
                    
                    <div class="units-list">
                        <div v-for="(unit, idx) in productForm.units" :key="idx" class="unit-card" :class="{'border-primary-400 bg-primary-50 dark:bg-primary-900/10': unit.factor === 1}">
                            <div class="flex justify-between items-center mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-sm">وحدة #{{ idx + 1 }}</span>
                                    <Tag v-if="unit.factor === 1" value="وحدة أساسية" severity="success" class="text-[10px] px-1 py-0 h-4 leading-none"><template #icon><Star :size="10" class="mr-1" /></template></Tag>
                                </div>
                                <button class="action-delete-btn !w-6 !h-6" @click="removeUnitLine(idx)" :disabled="productForm.units.length === 1" title="حذف">
                                    <Trash2 :size="12" />
                                </button>
                            </div>
                            <div class="grid grid-cols-2 gap-3 mb-3">
                                <div class="form-field">
                                    <label class="required">اسم الوحدة</label>
                                    <Select v-model="unit.name" :options="unitStore.units" optionLabel="name" optionValue="name" filter fluid placeholder="اختر وحدة" size="small" />
                                </div>
                                <div class="form-field">
                                    <label class="required">معامل التحويل</label>
                                    <InputNumber v-model="unit.factor" :min="1" size="small" fluid placeholder="1 للوحدة الأساسية" />
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3 mb-3">
                                <div class="form-field">
                                    <label>سعر البيع</label>
                                    <InputNumber v-model="unit.price" :minFractionDigits="2" size="small" fluid placeholder="0.00" />
                                </div>
                                <div class="form-field">
                                    <label>التكلفة</label>
                                    <InputNumber v-model="unit.cost" :minFractionDigits="2" size="small" fluid placeholder="0.00" />
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="form-field">
                                    <label>باركود الوحدة (اختياري)</label>
                                    <InputText v-model="unit.barcode" size="small" fluid placeholder="باركود هذه الوحدة" />
                                </div>
                                <div class="form-field">
                                    <label>خصم</label>
                                    <InputNumber v-model="unit.itemDiscount" :min="0" :minFractionDigits="2" size="small" fluid placeholder="0.00" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 w-full justify-end">
                    <Button label="إلغاء" outlined severity="secondary" @click="showProductDialog = false" />
                    <Button label="حفظ المنتج" @click="saveProduct" :loading="productStore.loading" :disabled="!productForm.name || productForm.units.length === 0" />
                </div>
            </template>
        </Dialog>

        <!-- Conversions Dialog -->
        <Dialog
            v-model:visible="showConversionsDialog"
            header="تحويلات الوحدات"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div v-if="unitConversions" class="py-2">
                <div class="mb-4 bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg border border-primary-200 dark:border-primary-800">
                    <p class="font-bold text-surface-800 dark:text-surface-200">
                        المنتج: <span class="text-primary-600 dark:text-primary-400">{{ unitConversions.product }}</span>
                    </p>
                    <p class="text-sm mt-1 text-surface-600 dark:text-surface-400">
                        الوحدة الأساسية: <span class="font-bold">{{ unitConversions.baseUnit }}</span>
                    </p>
                </div>
                
                <h4 class="font-bold mb-2 text-surface-700 dark:text-surface-300">التحويلات المتاحة:</h4>
                <div class="flex flex-col gap-2">
                    <div v-for="(conv, idx) in unitConversions.conversions" :key="idx" 
                         class="p-3 bg-surface-50 dark:bg-surface-900 rounded border border-surface-200 dark:border-surface-800 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="font-bold">{{ conv.unit }}</span>
                            <Tag v-if="conv.factor === 1" value="أساسية" severity="success" class="text-[10px] px-1 py-0 h-4 leading-none" />
                        </div>
                        <span class="text-surface-600 dark:text-surface-400 text-sm font-mono">{{ conv.description }}</span>
                    </div>
                </div>
            </div>
            <div v-else class="flex justify-center p-8">
                <ProgressSpinner strokeWidth="4" class="w-8 h-8" />
            </div>
            <template #footer>
                <div class="flex justify-end w-full">
                    <Button label="إغلاق" outlined severity="secondary" @click="showConversionsDialog = false" />
                </div>
            </template>
        </Dialog>

        <!-- Product Details Dialog -->
        <Dialog
            v-model:visible="showDetailsDialog"
            header="تفاصيل المنتج"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div v-if="selectedProductDetails" class="p-1 flex flex-col gap-4">
                <div class="bg-surface-50 dark:bg-surface-900 p-4 rounded-lg border border-surface-200 dark:border-surface-800">
                    <h3 class="font-bold text-lg mb-1">{{ selectedProductDetails.name }}</h3>
                    <p class="text-sm text-surface-500 font-mono mb-2">SKU: {{ selectedProductDetails.sku }}</p>
                    <Tag :value="selectedProductDetails.category" severity="info" class="font-medium" />
                </div>

                <h4 class="font-bold text-surface-700 dark:text-surface-300 mt-2 border-b pb-2 dark:border-surface-800">الوحدات والأسعار</h4>
                
                <div class="flex flex-col gap-3">
                    <div v-for="(unit, idx) in selectedProductDetails.units" :key="idx" 
                         class="p-4 bg-white dark:bg-surface-950 rounded-lg border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden"
                         :class="{'border-l-4 border-l-primary-500': unit.factor === 1}">
                         
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-md">{{ unit.name }}</span>
                                <Tag v-if="unit.factor === 1" value="وحدة أساسية" severity="success" class="text-[10px] px-1 py-0 h-4 leading-none"></Tag>
                                <span v-else class="text-xs bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded text-surface-600 dark:text-surface-400">معامل: {{ unit.factor }}</span>
                            </div>
                        </div>
                        
                        <div class="text-xs text-surface-500 font-mono mb-4 bg-surface-50 dark:bg-surface-900 px-2 py-1.5 rounded">
                            الباركود: {{ unit.barcode || selectedProductDetails.barcode || '—' }}
                        </div>

                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div class="flex flex-col bg-surface-50 dark:bg-surface-900/50 p-2 rounded">
                                <span class="text-surface-500 text-[11px] mb-1">سعر الشراء</span>
                                <span class="font-bold text-surface-800 dark:text-surface-200">{{ unit.costPrice?.toFixed(2) ?? unit.cost?.toFixed(2) ?? '0.00' }} <span class="text-[10px]">EGP</span></span>
                            </div>
                            <div class="flex flex-col bg-primary-50 dark:bg-primary-900/20 p-2 rounded">
                                <span class="text-primary-600 dark:text-primary-400 text-[11px] mb-1">سعر البيع</span>
                                <span class="font-black text-primary-700 dark:text-primary-300">{{ unit.sellingPrice?.toFixed(2) ?? unit.price?.toFixed(2) ?? '0.00' }} <span class="text-[10px]">EGP</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end w-full">
                    <Button label="إغلاق" outlined severity="secondary" @click="showDetailsDialog = false" />
                </div>
            </template>
        </Dialog>
        <!-- Manage Categories Dialog -->
        <Dialog
            v-model:visible="showManageCategoriesDialog"
            header="إدارة الفئات"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div class="flex flex-col gap-4 py-2">
                <div class="flex gap-2 items-end">
                    <div class="form-field flex-1">
                        <label>{{ editingCategory ? 'تعديل فئة' : 'إضافة فئة جديدة' }}</label>
                        <InputText v-model="categoryForm.name" fluid placeholder="اسم الفئة" @keyup.enter="saveCategory" />
                    </div>
                    <Button :label="editingCategory ? 'حفظ' : 'إضافة'" :icon="editingCategory ? 'pi pi-check' : 'pi pi-plus'" @click="saveCategory" :disabled="!categoryForm.name || productStore.loading" />
                    <Button v-if="editingCategory" icon="pi pi-times" severity="secondary" outlined @click="editingCategory = null; categoryForm.name = ''" title="إلغاء التعديل" />
                </div>

                <div class="border rounded-lg border-surface-200 dark:border-surface-800 overflow-hidden mt-4">
                    <DataTable :value="productStore.categories" :loading="productStore.loading" scrollable scrollHeight="300px" emptyMessage="لا توجد فئات">
                        <Column field="name" header="اسم الفئة"></Column>
                        <Column header="إجراءات" style="width: 100px">
                            <template #body="{ data }">
                                <div class="flex gap-1 justify-end">
                                    <button class="action-edit-btn !w-7 !h-7" @click="editCategory(data)" title="تعديل">
                                        <Pencil :size="14" />
                                    </button>
                                    <button class="action-delete-btn !w-7 !h-7" @click="removeCategory(data)" title="حذف">
                                        <Trash2 :size="14" />
                                    </button>
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end w-full">
                    <Button label="إغلاق" outlined severity="secondary" @click="showManageCategoriesDialog = false" />
                </div>
            </template>
        </Dialog>

        <!-- Manage Units Dialog -->
        <Dialog
            v-model:visible="showManageUnitsDialog"
            header="إدارة الوحدات"
            :style="{ width: '500px' }"
            modal
            dismissableMask
        >
            <div class="flex flex-col gap-4 py-2">
                <div class="flex gap-2 items-end">
                    <div class="form-field flex-1">
                        <label>{{ editingUnit ? 'تعديل وحدة' : 'إضافة وحدة جديدة' }}</label>
                        <InputText v-model="unitForm.name" fluid placeholder="اسم الوحدة" @keyup.enter="saveUnit" />
                    </div>
                    <Button :label="editingUnit ? 'حفظ' : 'إضافة'" :icon="editingUnit ? 'pi pi-check' : 'pi pi-plus'" @click="saveUnit" :disabled="!unitForm.name || unitStore.loading" />
                    <Button v-if="editingUnit" icon="pi pi-times" severity="secondary" outlined @click="editingUnit = null; unitForm.name = ''" title="إلغاء التعديل" />
                </div>

                <div class="border rounded-lg border-surface-200 dark:border-surface-800 overflow-hidden mt-4">
                    <DataTable :value="unitStore.units" :loading="unitStore.loading" scrollable scrollHeight="300px" emptyMessage="لا توجد وحدات">
                        <Column field="name" header="اسم الوحدة"></Column>
                        <Column header="إجراءات" style="width: 100px">
                            <template #body="{ data }">
                                <div class="flex gap-1 justify-end">
                                    <button class="action-edit-btn !w-7 !h-7" @click="editUnit(data)" title="تعديل">
                                        <Pencil :size="14" />
                                    </button>
                                    <button class="action-delete-btn !w-7 !h-7" @click="removeUnit(data)" title="حذف">
                                        <Trash2 :size="14" />
                                    </button>
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
            <template #footer>
                <div class="flex justify-end w-full">
                    <Button label="إغلاق" outlined severity="secondary" @click="showManageUnitsDialog = false" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.products-page {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 768px) {
    .products-page {
        padding: 0.75rem;
        gap: 1rem;
    }
}

/* Header */
.products-header {
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

.products-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .products-title {
    color: var(--p-surface-0);
}

.products-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0.125rem 0 0;
}

/* Table Container Card */
.products-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .products-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: none;
}

.products-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
}

.dark .products-filter-bar {
    border-color: var(--p-surface-800);
    background: var(--p-surface-950);
}

/* Action Buttons */
.action-edit-btn,
.action-delete-btn,
.action-info-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    cursor: pointer;
    transition: all 0.15s;
}

.action-edit-btn {
    color: var(--p-surface-650);
}

.action-info-btn {
    color: var(--p-blue-500);
}

.dark .action-edit-btn,
.dark .action-info-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
}
.dark .action-edit-btn { color: var(--p-surface-300); }
.dark .action-info-btn { color: var(--p-blue-400); }

.action-edit-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}

.action-info-btn:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
    color: var(--p-blue-600);
}

.dark .action-edit-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
}

.dark .action-info-btn:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.4);
    color: var(--p-blue-300);
}

.action-delete-btn {
    color: #ef4444;
    border-color: #fecaca;
    background: #fef2f2;
}

.dark .action-delete-btn {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
}

.action-delete-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
}

.dark .action-delete-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #f87171;
}

/* Dialog Form Styling */
.product-dialog-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0.5rem 0;
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

/* Discount Field */
.discount-field-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.discount-field-hint {
    font-size: 0.75rem;
    color: var(--p-surface-400);
    font-weight: 500;
}

/* Units section */
.units-section {
    margin-top: 0.5rem;
    border-top: 1px solid var(--p-surface-200);
    padding-top: 1rem;
}

.dark .units-section {
    border-color: var(--p-surface-800);
}

.units-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
    padding-inline-end: 0.5rem;
}

.unit-card {
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
    position: relative;
    transition: border-color 0.2s, background-color 0.2s;
}

.dark .unit-card {
    border-color: var(--p-surface-700);
    background: var(--p-surface-900);
}

/* Category Combobox */
.category-combobox {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.add-category-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px dashed var(--p-primary-300);
    background: var(--p-primary-50);
    color: var(--p-primary-600);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    align-self: flex-start;
}

.add-category-btn:hover {
    background: var(--p-primary-100);
    border-color: var(--p-primary-400);
    color: var(--p-primary-700);
}

.dark .add-category-btn {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.35);
    color: var(--p-primary-400);
}

.dark .add-category-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.5);
    color: var(--p-primary-300);
}

.new-category-input-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.back-to-select-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    min-width: 2.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--p-surface-300);
    background: var(--p-surface-0);
    color: var(--p-surface-600);
    cursor: pointer;
    transition: all 0.15s;
}

.back-to-select-btn:hover {
    background: var(--p-surface-100);
    border-color: var(--p-surface-400);
    color: var(--p-surface-800);
}

.dark .back-to-select-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}

.dark .back-to-select-btn:hover {
    background: var(--p-surface-700);
    color: var(--p-surface-200);
}

.new-category-hint {
    font-size: 0.75rem;
    color: var(--p-primary-500);
    font-weight: 500;
    margin: 0;
    padding-inline-start: 2.75rem;
}

.dark .new-category-hint {
    color: var(--p-primary-400);
}

/* Products Stats Grid */
.products-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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

.stat-icon.orange {
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

:deep(.p-datatable-tbody > tr > td) {
    border-bottom: none !important;
}


</style>
