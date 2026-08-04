<script setup>
import { ref, computed, onMounted } from "vue";
import { useProductStore } from "@/stores/pos/productStore";
import { useUnitStore } from "@/stores/pos/unitStore";
import { useToastStore } from "@/stores/base/toastStore";
import { usePosStore } from "@/stores/pos/posStore";
import {
    Package, Plus, Pencil, Trash2, Search, Star,
    PlusCircle, ArrowLeft, Eye, HelpCircle,
    LayoutGrid, CheckCircle2, XCircle, AlertCircle,
    ChevronDown, Hash, Barcode, DollarSign, Tag as TagIcon, Layers, RefreshCw, Printer
} from "lucide-vue-next";
import HelpDrawer from "@/components/HelpDrawer.vue";

// Category combobox state
const isAddingNewCategory = ref(false);
const newCategoryName = ref("");

// ── Help Drawer ──
const showHelp = ref(false);
const productsHelpSections = [
    {
        title: 'استعراض وتصفية المنتجات',
        icon: Package,
        color: '#dbeafe',
        iconColor: '#2563eb',
        steps: [
            { title: 'البحث الشامل', desc: 'استخدم خانة البحث للعثور على المنتجات باسم المنتج، الباركود، أو التكلفة وسعر البيع.' },
            { title: 'التصفية حسب الفئة', desc: 'تصفية قائمة المنتجات بناءً على القسم أو الفئة التابعة لها لسهولة الوصول.' },
            { title: 'حالة الصنف', desc: 'متابعة المنتجات النشطة وغير النشطة والتي بلغت حد إعادة الطلب.' },
        ]
    },
    {
        title: 'إضافة وتعديل بيانات المنتج',
        icon: Plus,
        color: '#d1fae5',
        iconColor: '#059669',
        steps: [
            { title: 'بيانات المنتج والباركود', desc: 'أدخل الاسم، الباركود الفريد، الفئة، وحد إعادة الطلب لتلقي التنبيهات.' },
            { title: 'التسعير والتكلفة', desc: 'حدد سعر الشراء وسعر البيع لحساب نسبة وتكلفة هامش الربح آلياً.' },
            { title: 'حفظ والتعديل', desc: 'تحديث بيانات المنتج في أي وقت مع احتفاظ النظام بسجل الحركات التاريخية.' },
        ]
    },
    {
        title: 'طباعة الباركود والبطاقات',
        icon: Printer,
        color: '#ede9fe',
        iconColor: '#7c3aed',
        steps: [
            { title: 'طباعة ملصقات الباركود', desc: 'توليد وطباعة باركود المنتجات لطابعات الملصقات الحرارية لاستخدامها في الكاشير.' },
        ]
    }
];
const productsHelpTips = [
    'تأكد من إضافة باركود فريد لكل صنف لضمان سرعة المسح في نقطة البيع.',
    'تحديد حد إعادة الطلب يرسل لك تنبيهات آلياً قبل نفاد المخزون.',
    'تعديل سعر الشراء لا تؤثر على الفواتير السابقة الصادرة في النظام.'
];

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
    isActive: true,
    units: [],
});

const filters = ref({ global: { value: "", matchMode: "contains" } });

// ─── Status Filtering ────────────────────────────────────────────────────────
const statusFilter = ref("ALL"); // "ALL" | "ACTIVE" | "INACTIVE" | "INCOMPLETE"
const statusOptions = [
    { label: "جميع الحالات", value: "ALL" },
    { label: "نشط فقط", value: "ACTIVE" },
    { label: "غير نشط فقط", value: "INACTIVE" },
    { label: "بيانات ناقصة", value: "INCOMPLETE" },
];

const filteredProducts = computed(() => {
    if (statusFilter.value === "ACTIVE") {
        return productStore.products.filter(p => p.isActive === true);
    }
    if (statusFilter.value === "INACTIVE") {
        return productStore.products.filter(p => p.isActive === false);
    }
    if (statusFilter.value === "INCOMPLETE") {
        return productStore.products.filter(p => {
            const baseUnit = (p.units || []).find(u => u.factor === 1) || (p.units || [])[0];
            const missingBarcode = !baseUnit?.barcode;
            const missingPrice = (baseUnit?.sellingPrice ?? baseUnit?.price ?? p.sellingPrice ?? 0) === 0;
            return missingBarcode || missingPrice;
        });
    }
    return productStore.products;
});

const toggleProductStatus = async (product) => {
    try {
        await productStore.updateProduct({
            ...product,
            isActive: !product.isActive
        });
    } catch {
        // Handled by store toasts
    }
};

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
        isActive: true,
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

    productForm.value = {
        ...product,
        isActive: product.isActive ?? true,
        units
    };
    isAddingNewCategory.value = false;
    newCategoryName.value = "";
    showProductDialog.value = true;
};

const getBaseUnit = () => {
    return productForm.value.units.find(u => u.factor === 1) || productForm.value.units[0];
};

const recalculateSubUnitPricesFromBase = () => {
    const baseUnit = getBaseUnit();
    if (!baseUnit) return;
    const basePrice = Number(baseUnit.price) || 0;

    productForm.value.units.forEach(u => {
        if (u !== baseUnit) {
            const uFactor = Number(u.factor) || 1;
            if (basePrice > 0) {
                u.price = Number((basePrice * uFactor).toFixed(2));
            }
        }
    });
};

const onUnitFactorChange = (idx) => {
    const unit = productForm.value.units[idx];
    if (!unit) return;
    const factor = Number(unit.factor) || 1;
    const baseUnit = getBaseUnit();

    if (unit === baseUnit) {
        recalculateSubUnitPricesFromBase();
        return;
    }

    if (baseUnit) {
        // For Cost: Larger unit cost adjusts base unit cost (cost / factor)
        const unitCost = Number(unit.cost) || 0;
        if (unitCost > 0 && factor > 0) {
            baseUnit.cost = Number((unitCost / factor).toFixed(2));
        }

        // For Selling Price: Base unit price adjusts larger unit price
        const basePrice = Number(baseUnit.price) || 0;
        if (basePrice > 0) {
            unit.price = Number((basePrice * factor).toFixed(2));
        } else if (unit.price > 0 && factor > 0) {
            baseUnit.price = Number((unit.price / factor).toFixed(2));
        }
    }
};

const onUnitCostChange = (idx) => {
    const unit = productForm.value.units[idx];
    if (!unit) return;
    const baseUnit = getBaseUnit();
    const cost = Number(unit.cost) || 0;
    const factor = Number(unit.factor) || 1;

    // Editing larger unit (not base unit) updates base unit cost: baseUnit.cost = cost / factor
    if (unit !== baseUnit && baseUnit) {
        if (factor > 0) {
            baseUnit.cost = Number((cost / factor).toFixed(2));
        }
    }
    // Note: Editing base unit cost does NOT alter larger units' cost (as requested)
};

const onUnitPriceChange = (idx) => {
    const unit = productForm.value.units[idx];
    if (!unit) return;
    const baseUnit = getBaseUnit();
    const price = Number(unit.price) || 0;
    const factor = Number(unit.factor) || 1;

    if (unit === baseUnit) {
        productForm.value.units.forEach(u => {
            if (u !== baseUnit) {
                const uFactor = Number(u.factor) || 1;
                u.price = Number((price * uFactor).toFixed(2));
            }
        });
    } else {
        const basePrice = Number(baseUnit?.price) || 0;
        if (basePrice === 0 && price > 0 && factor > 0 && baseUnit) {
            baseUnit.price = Number((price / factor).toFixed(2));
            recalculateSubUnitPricesFromBase();
        }
    }
};

const addUnitLine = () => {
    const baseUnit = getBaseUnit();
    const baseCost = Number(baseUnit?.cost) || 0;
    const basePrice = Number(baseUnit?.price) || 0;

    productForm.value.units.push({
        id: 0,
        name: "",
        factor: 1,
        barcode: "",
        price: basePrice > 0 ? basePrice : 0,
        cost: baseCost > 0 ? baseCost : 0,
        itemDiscount: 0
    });
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
            <div class="header-start">
                <div class="header-icon-wrap">
                    <Package :size="26" />
                </div>
                <div class="header-text">
                    <h1 class="products-title">إدارة المنتجات</h1>
                    <p class="products-subtitle">عرض وإضافة وتعديل بيانات المنتجات والأسعار</p>
                </div>
            </div>
            <div class="header-actions">
                <button class="help-icon-btn" @click="showHelp = true" title="دليل الاستخدام">
                    <HelpCircle :size="18" />
                </button>
                <Button v-if="posStore.role === 'Manager' || posStore.role === 'Admin'" label="إضافة منتج" @click="openNewProduct" class="add-product-btn">
                    <template #icon><Plus :size="18" /></template>
                </Button>
            </div>
        </div>

        <!-- Help Drawer -->
        <HelpDrawer
            v-model="showHelp"
            page-title="إدارة المنتجات والتصنيفات"
            page-subtitle="إضافة وتعديل أصناف المنتجات، التسعير، والباركود"
            :page-icon="Package"
            header-gradient="linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
            :sections="productsHelpSections"
            :tips="productsHelpTips"
        />

        <!-- Catalog Overview Stats Cards -->
        <div class="products-stats-grid">
            <div class="stat-card clickable" :class="{ 'stat-card-active': statusFilter === 'ALL' }" @click="statusFilter = 'ALL'">
                <div class="stat-icon-circle Purple">
                    <Package :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ totalProducts }}</span>
                    <span class="stat-label">إجمالي المنتجات</span>
                </div>
                <div class="stat-accent Purple"></div>
            </div>
            <div class="stat-card clickable" :class="{ 'stat-card-active': statusFilter === 'ACTIVE' }" @click="statusFilter = 'ACTIVE'">
                <div class="stat-icon-circle green">
                    <CheckCircle2 :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ activeProducts }}</span>
                    <span class="stat-label">منتجات نشطة</span>
                </div>
                <div class="stat-accent green"></div>
            </div>
            <div class="stat-card clickable" :class="{ 'stat-card-active': statusFilter === 'INACTIVE' }" @click="statusFilter = 'INACTIVE'">
                <div class="stat-icon-circle red">
                    <XCircle :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ inactiveProducts }}</span>
                    <span class="stat-label">غير نشطة</span>
                </div>
                <div class="stat-accent red"></div>
            </div>
            <div class="stat-card clickable" :class="{ 'stat-card-active': statusFilter === 'INCOMPLETE' }" @click="statusFilter = 'INCOMPLETE'">
                <div class="stat-icon-circle orange">
                    <AlertCircle :size="20" />
                </div>
                <div class="stat-body">
                    <span class="stat-value">{{ incompleteProducts }}</span>
                    <span class="stat-label">بيانات ناقصة</span>
                </div>
                <span class="stat-hint">بدون باركود أو سعر</span>
                <div class="stat-accent orange"></div>
            </div>
        </div>

        <!-- Error Banner -->
        <Transition name="fade-slide">
            <div v-if="productStore.error" class="error-banner">
                <div class="error-banner-content">
                    <AlertCircle :size="18" />
                    <span>{{ productStore.error }}</span>
                </div>
                <Button label="إعادة المحاولة" size="small" severity="danger" text @click="productStore.fetchProducts()">
                    <template #icon><RefreshCw :size="14" /></template>
                </Button>
            </div>
        </Transition>

        <!-- Table Container Card -->
        <div class="products-card">
            <!-- Filter TopBar -->
            <div class="products-filter-bar">
                <div class="search-input-wrap flex-1">
                    <Search :size="16" class="search-icon" />
                    <InputText
                        v-model="filters.global.value"
                        placeholder="بحث سريع عن المنتج، الباركود، أو الفئة..."
                        class="pr-10 pl-4 w-full search-input"
                        autocomplete="off"
                        size="small"
                    />
                </div>
                <!-- <div class="status-filter-wrap">
                    <Select
                        v-model="statusFilter"
                        :options="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="فلتر الحالة"
                        class="status-filter-select"
                        size="small"
                    />
                </div> -->
                <div class="filter-actions">
                    <Button label="إدارة الفئات" size="small" outlined severity="secondary" @click="openManageCategories">
                        <template #icon><LayoutGrid :size="14" /></template>
                    </Button>
                    <Button label="إدارة الوحدات" size="small" outlined severity="secondary" @click="openManageUnits">
                        <template #icon><Layers :size="14" /></template>
                    </Button>
                </div>
            </div>

            <!-- Products Table -->
            <DataTable
                :value="filteredProducts"
                :loading="productStore.loading"
                paginator
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                v-model:filters="filters"
                :globalFilterFields="['name', 'sku', 'barcode', 'category']"
                emptyMessage="لا توجد منتجات مطابقة للبحث أو الفلتر"
                stripedRows
                removableSort
                scrollable
                class="products-table"
            >
                <Column field="name" header="المنتج" sortable style="min-width: 240px">
                    <template #body="{ data }">
                        <div class="product-name-cell">
                            <div class="product-avatar" :class="{ 'is-inactive': !data.isActive }">
                                <Package :size="16" />
                            </div>
                            <div class="product-name-info">
                                <span class="product-name-text">{{ data.name }}</span>
                                <span class="product-sku-text">
                                    <Hash :size="11" />
                                    {{ data.sku || '—' }}
                                </span>
                            </div>
                        </div>
                    </template>
                </Column>

                <Column field="category" header="الفئة" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="category-chip" v-if="data.category">
                            <TagIcon :size="12" />
                            {{ data.category }}
                        </span>
                        <span v-else class="text-surface-300 dark:text-surface-600 text-sm">—</span>
                    </template>
                </Column>

                <Column field="costPrice" header="سعر الشراء" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="price-cell cost">{{ data.costPrice?.toFixed(2) || '0.00' }} <small>EGP</small></span>
                    </template>
                </Column>

                <Column field="sellingPrice" header="سعر البيع" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <span class="price-cell sell">{{ data.sellingPrice?.toFixed(2) || '0.00' }} <small>EGP</small></span>
                    </template>
                </Column>

                <Column field="itemDiscount" header="الخصم" sortable style="min-width: 110px">
                    <template #body="{ data }">
                        <span v-if="data.itemDiscount > 0" class="discount-badge">
                            -{{ data.itemDiscount.toFixed(2) }}
                        </span>
                        <span v-else class="text-surface-300 dark:text-surface-600 text-sm">—</span>
                    </template>
                </Column>

                <Column field="isActive" header="الحالة" sortable style="min-width: 130px">
                    <template #body="{ data }">
                        <button
                            type="button"
                            class="status-toggle-btn"
                            :class="data.isActive ? 'is-active' : 'is-inactive'"
                            @click="toggleProductStatus(data)"
                            :title="data.isActive ? 'انقر لتعطيل المنتج' : 'انقر لتفعيل المنتج'"
                        >
                            <CheckCircle2 v-if="data.isActive" :size="13" />
                            <XCircle v-else :size="13" />
                            <span>{{ data.isActive ? 'نشط' : 'غير نشط' }}</span>
                        </button>
                    </template>
                </Column>

                <Column header="إجراءات" style="min-width: 140px; text-align: center">
                    <template #body="{ data }">
                        <div class="actions-cell">
                            <button class="act-btn act-view" @click="openProductDetails(data)" title="عرض التفاصيل">
                                <Eye :size="15" />
                            </button>
                            <button class="act-btn act-edit" @click="openEditProduct(data)" title="تعديل">
                                <Pencil :size="15" />
                            </button>
                            <button class="act-btn act-delete" @click="deleteProduct(data)" title="حذف">
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
            :style="{ width: '560px' }"
            modal
            dismissableMask
        >
            <div class="dialog-body">

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

                <!-- Product Status Toggle -->
                <div class="form-field status-toggle-field">
                    <div class="status-toggle-info">
                        <label class="font-bold text-sm mb-0.5 block">حالة المنتج</label>
                        <span class="text-xs text-surface-500">
                            {{ productForm.isActive ? 'المنتج نشط ومتاح في جميع شاشات العمل والبيع' : 'المنتج غير نشط ويتم إخفاؤه من شاشة البيع' }}
                        </span>
                    </div>
                    <ToggleSwitch v-model="productForm.isActive" id="product-status-switch" />
                </div>
                
                <!-- Units section -->
                <div class="units-section">
                    <div class="units-section-header">
                        <div class="units-section-title">
                            <Layers :size="16" />
                            <span>وحدات المنتج</span>
                            <span class="units-hint">يجب أن توجد وحدة أساسية بمعامل 1</span>
                        </div>
                        <Button label="إضافة وحدة" size="small" outlined @click="addUnitLine">
                            <template #icon><Plus :size="14" /></template>
                        </Button>
                    </div>
                    
                    <div class="units-list">
                        <div v-for="(unit, idx) in productForm.units" :key="idx" class="unit-card" :class="{'unit-card-base': unit.factor === 1}">
                            <div class="unit-card-header">
                                <div class="unit-card-title">
                                    <span class="unit-number">#{{ idx + 1 }}</span>
                                    <span v-if="unit.factor === 1" class="base-unit-badge">
                                        <Star :size="10" />
                                        أساسية
                                    </span>
                                </div>
                                <button class="unit-remove-btn" @click="removeUnitLine(idx)" :disabled="productForm.units.length === 1" title="حذف">
                                    <Trash2 :size="13" />
                                </button>
                            </div>
                            <div class="grid grid-cols-2 gap-3 mb-3">
                                <div class="form-field">
                                    <label class="required">اسم الوحدة</label>
                                    <Select v-model="unit.name" :options="unitStore.units" optionLabel="name" optionValue="name" filter fluid placeholder="اختر وحدة" size="small" />
                                </div>
                                <div class="form-field">
                                    <label class="required">معامل التحويل</label>
                                    <InputNumber v-model="unit.factor" :min="1" size="small" fluid placeholder="1 للوحدة الأساسية" @update:modelValue="onUnitFactorChange(idx)" />
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3 mb-3">
                                <div class="form-field">
                                    <label>سعر البيع</label>
                                    <InputNumber v-model="unit.price" :minFractionDigits="2" size="small" fluid placeholder="0.00" @update:modelValue="onUnitPriceChange(idx)" />
                                </div>
                                <div class="form-field">
                                    <label>التكلفة</label>
                                    <InputNumber v-model="unit.cost" :minFractionDigits="2" size="small" fluid placeholder="0.00" @update:modelValue="onUnitCostChange(idx)" />
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="form-field">
                                    <label>باركود الوحدة</label>
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
                <div class="dialog-footer">
                    <Button label="إلغاء" outlined severity="secondary" @click="showProductDialog = false" />
                    <Button label="حفظ المنتج" @click="saveProduct" :loading="productStore.loading" :disabled="!productForm.name || productForm.units.length === 0">
                        <template #icon><CheckCircle2 :size="16" /></template>
                    </Button>
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
            <div v-if="unitConversions" class="dialog-body">
                <div class="conv-product-card">
                    <p class="conv-product-name">{{ unitConversions.product }}</p>
                    <p class="conv-base-unit">
                        الوحدة الأساسية: <strong>{{ unitConversions.baseUnit }}</strong>
                    </p>
                </div>
                
                <div class="conv-section-title">التحويلات المتاحة</div>
                <div class="conv-list">
                    <div v-for="(conv, idx) in unitConversions.conversions" :key="idx" class="conv-item">
                        <div class="conv-item-start">
                            <span class="conv-unit-name">{{ conv.unit }}</span>
                            <span v-if="conv.factor === 1" class="base-unit-badge">
                                <Star :size="10" />
                                أساسية
                            </span>
                        </div>
                        <span class="conv-description">{{ conv.description }}</span>
                    </div>
                </div>
            </div>
            <div v-else class="flex justify-center p-8">
                <ProgressSpinner strokeWidth="4" class="w-8 h-8" />
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <Button label="إغلاق" outlined severity="secondary" @click="showConversionsDialog = false" />
                </div>
            </template>
        </Dialog>

        <!-- Product Details Dialog -->
        <Dialog
            v-model:visible="showDetailsDialog"
            header="تفاصيل المنتج"
            :style="{ width: '520px' }"
            modal
            dismissableMask
        >
            <div v-if="selectedProductDetails" class="dialog-body">
                <!-- Product Header Card -->
                <div class="detail-header-card">
                    <div class="detail-header-top">
                        <div class="detail-product-avatar">
                            <Package :size="22" />
                        </div>
                        <div class="detail-product-info">
                            <h3 class="detail-product-name">{{ selectedProductDetails.name }}</h3>
                            <div class="detail-meta-row">
                                <span class="detail-sku">
                                    <Hash :size="12" />
                                    {{ selectedProductDetails.sku }}
                                </span>
                                <span class="category-chip" v-if="selectedProductDetails.category">
                                    <TagIcon :size="11" />
                                    {{ selectedProductDetails.category }}
                                </span>
                                <span class="status-chip-sm" :class="selectedProductDetails.isActive ? 'status-success' : 'status-danger'">
                                    <CheckCircle2 v-if="selectedProductDetails.isActive" :size="12" />
                                    <XCircle v-else :size="12" />
                                    {{ selectedProductDetails.isActive ? 'نشط' : 'غير نشط' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Units -->
                <div class="detail-section-title">
                    <Layers :size="16" />
                    <span>الوحدات والأسعار</span>
                </div>
                
                <div class="detail-units-list">
                    <div v-for="(unit, idx) in selectedProductDetails.units" :key="idx" 
                         class="detail-unit-card"
                         :class="{'detail-unit-base': unit.factor === 1}">
                         
                        <div class="detail-unit-header">
                            <div class="detail-unit-name-row">
                                <span class="detail-unit-name">{{ unit.name }}</span>
                                <span v-if="unit.factor === 1" class="base-unit-badge">
                                    <Star :size="10" />
                                    أساسية
                                </span>
                                <span v-else class="factor-chip">معامل: {{ unit.factor }}</span>
                            </div>
                        </div>
                        
                        <div class="detail-barcode" v-if="unit.barcode || selectedProductDetails.barcode">
                            <Barcode :size="13" />
                            <span>{{ unit.barcode || selectedProductDetails.barcode }}</span>
                        </div>

                        <div class="detail-prices-row">
                            <div class="detail-price-box cost">
                                <span class="dpb-label">سعر الشراء</span>
                                <span class="dpb-value">{{ unit.costPrice?.toFixed(2) ?? unit.cost?.toFixed(2) ?? '0.00' }} <small>EGP</small></span>
                            </div>
                            <div class="detail-price-box sell">
                                <span class="dpb-label">سعر البيع</span>
                                <span class="dpb-value">{{ unit.sellingPrice?.toFixed(2) ?? unit.price?.toFixed(2) ?? '0.00' }} <small>EGP</small></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="dialog-footer">
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
            <div class="dialog-body">
                <div class="manage-input-row">
                    <div class="form-field" style="flex:1">
                        <label>{{ editingCategory ? 'تعديل فئة' : 'إضافة فئة جديدة' }}</label>
                        <InputText v-model="categoryForm.name" fluid placeholder="اسم الفئة" @keyup.enter="saveCategory" />
                    </div>
                    <Button :label="editingCategory ? 'حفظ' : 'إضافة'" @click="saveCategory" :disabled="!categoryForm.name || productStore.loading">
                        <template #icon><component :is="editingCategory ? CheckCircle2 : Plus" :size="16" /></template>
                    </Button>
                    <Button v-if="editingCategory" severity="secondary" outlined @click="editingCategory = null; categoryForm.name = ''" title="إلغاء التعديل">
                        <template #icon><XCircle :size="16" /></template>
                    </Button>
                </div>

                <div class="manage-list-wrap">
                    <div v-if="productStore.categories?.length === 0" class="manage-empty">لا توجد فئات بعد</div>
                    <div v-for="cat in productStore.categories" :key="cat.id" class="manage-list-item">
                        <span class="manage-item-name">{{ cat.name }}</span>
                        <div class="manage-item-actions">
                            <button class="act-btn act-edit" @click="editCategory(cat)" title="تعديل">
                                <Pencil :size="14" />
                            </button>
                            <button class="act-btn act-delete" @click="removeCategory(cat)" title="حذف">
                                <Trash2 :size="14" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="dialog-footer">
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
            <div class="dialog-body">
                <div class="manage-input-row">
                    <div class="form-field" style="flex:1">
                        <label>{{ editingUnit ? 'تعديل وحدة' : 'إضافة وحدة جديدة' }}</label>
                        <InputText v-model="unitForm.name" fluid placeholder="اسم الوحدة" @keyup.enter="saveUnit" />
                    </div>
                    <Button :label="editingUnit ? 'حفظ' : 'إضافة'" @click="saveUnit" :disabled="!unitForm.name || unitStore.loading">
                        <template #icon><component :is="editingUnit ? CheckCircle2 : Plus" :size="16" /></template>
                    </Button>
                    <Button v-if="editingUnit" severity="secondary" outlined @click="editingUnit = null; unitForm.name = ''" title="إلغاء التعديل">
                        <template #icon><XCircle :size="16" /></template>
                    </Button>
                </div>

                <div class="manage-list-wrap">
                    <div v-if="unitStore.units?.length === 0" class="manage-empty">لا توجد وحدات بعد</div>
                    <div v-for="u in unitStore.units" :key="u.id" class="manage-list-item">
                        <span class="manage-item-name">{{ u.name }}</span>
                        <div class="manage-item-actions">
                            <button class="act-btn act-edit" @click="editUnit(u)" title="تعديل">
                                <Pencil :size="14" />
                            </button>
                            <button class="act-btn act-delete" @click="removeUnit(u)" title="حذف">
                                <Trash2 :size="14" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <Button label="إغلاق" outlined severity="secondary" @click="showManageUnitsDialog = false" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
/* ─── Page Layout ───────────────────────────────────────── */
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
    .products-page { padding: 0.75rem; gap: 1rem; }
}

/* ─── Header ────────────────────────────────────────────── */
.products-header {
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

.products-title {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
    line-height: 1.2;
}
.dark .products-title { color: var(--p-surface-0); }

.products-subtitle {
    font-size: 0.825rem;
    color: var(--p-surface-450);
    margin: 0.125rem 0 0;
    font-weight: 500;
}

.header-actions {
    display: flex;
    gap: 0.5rem;
}

/* ─── Stats Grid ────────────────────────────────────────── */
.products-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
.dark .stat-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
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
.stat-card:hover .stat-accent { opacity: 1; }
.stat-accent.Purple { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.stat-accent.green { background: linear-gradient(90deg, #10b981, #34d399); }
.stat-accent.red { background: linear-gradient(90deg, #ef4444, #f87171); }
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
.stat-icon-circle.red   { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.stat-icon-circle.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

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

.stat-hint {
    font-size: 0.675rem;
    font-weight: 500;
    color: var(--p-surface-350);
    margin-inline-start: auto;
    white-space: nowrap;
}

/* ─── Error Banner ──────────────────────────────────────── */
.error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    border-radius: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
}
.dark .error-banner {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
}

.error-banner-content {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 0.875rem;
    font-weight: 600;
}

/* ─── Card & Filter Bar ─────────────────────────────────── */
.products-card {
    border-radius: 1rem;
    border: 1px solid var(--p-surface-150);
    background: var(--p-surface-0);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
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
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--p-surface-100);
    background: var(--p-surface-25);
    gap: 0.75rem;
    flex-wrap: wrap;
}
.dark .products-filter-bar {
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

.filter-actions {
    display: flex;
    gap: 0.5rem;
}

/* ─── Table Cells ───────────────────────────────────────── */
.product-name-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.product-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.625rem;
    background: var(--p-surface-100);
    color: var(--p-surface-500);
    flex-shrink: 0;
}
.dark .product-avatar {
    background: var(--p-surface-800);
    color: var(--p-surface-400);
}

.product-name-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.product-name-text {
    font-size: 0.9rem;
    font-weight: 750;
    color: var(--p-surface-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .product-name-text { color: var(--p-surface-50); }

.product-sku-text {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.725rem;
    font-weight: 500;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    color: var(--p-surface-400);
}

.category-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 650;
    background: #f5f3ff;
    color: #7c3aed;
    border: 1px solid #ddd6fe;
}
.dark .category-chip {
    background: rgba(124, 58, 237, 0.1);
    color: #a78bfa;
    border-color: rgba(124, 58, 237, 0.25);
}

.price-cell {
    font-size: 0.875rem;
    font-weight: 800;
}
.price-cell small {
    font-size: 0.65rem;
    font-weight: 600;
    opacity: 0.6;
}
.price-cell.cost {
    color: var(--p-surface-700);
}
.dark .price-cell.cost { color: var(--p-surface-300); }
.price-cell.sell {
    color: var(--p-primary-600);
}
.dark .price-cell.sell { color: var(--p-primary-400); }

.discount-badge {
    display: inline-flex;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 750;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}
.dark .discount-badge {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.25);
}

/* ─── Action Buttons ────────────────────────────────────── */
.actions-cell {
    display: flex;
    gap: 0.375rem;
    justify-content: center;
}

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
.dark .act-btn.act-view:hover {
    background: rgba(124, 58, 237, 0.2);
}

.act-btn.act-edit {
    color: var(--p-surface-550);
    border-color: var(--p-surface-250);
    background: var(--p-surface-0);
}
.dark .act-btn.act-edit {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-300);
}
.act-btn.act-edit:hover {
    color: var(--p-primary-600);
    border-color: var(--p-primary-200);
    background: var(--p-primary-50);
}
.dark .act-btn.act-edit:hover {
    color: var(--p-primary-400);
    border-color: rgba(99, 102, 241, 0.3);
    background: rgba(99, 102, 241, 0.12);
}

.act-btn.act-delete {
    color: #ef4444;
    border-color: #fecaca;
    background: #fef2f2;
}
.dark .act-btn.act-delete {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
}
.act-btn.act-delete:hover {
    background: #fee2e2;
    border-color: #fca5a5;
}
.dark .act-btn.act-delete:hover {
    background: rgba(239, 68, 68, 0.18);
    border-color: #f87171;
}

/* ─── Dialog Body ───────────────────────────────────────── */
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

/* ─── Units Section ─────────────────────────────────────── */
.units-section {
    margin-top: 0.5rem;
    border-top: 1px solid var(--p-surface-150);
    padding-top: 1rem;
}
.dark .units-section { border-color: var(--p-surface-800); }

.units-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.units-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 750;
    color: var(--p-surface-700);
}
.dark .units-section-title { color: var(--p-surface-200); }

.units-hint {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--p-surface-400);
}

.units-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
    padding-inline-end: 0.25rem;
}

.unit-card {
    padding: 1rem;
    border-radius: 0.875rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
    transition: all 0.2s ease;
}
.dark .unit-card {
    border-color: var(--p-surface-750);
    background: var(--p-surface-850);
}

.unit-card-base {
    border-color: var(--p-primary-200);
    background: var(--p-primary-50);
}
.dark .unit-card-base {
    border-color: rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.25);
    background: rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.06);
}

.unit-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.unit-card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.unit-number {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--p-surface-500);
}

.base-unit-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.65rem;
    font-weight: 700;
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
}
.dark .base-unit-badge {
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.25);
}

.unit-remove-btn {
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
.unit-remove-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.unit-remove-btn:not(:disabled):hover { background: #fee2e2; border-color: #fca5a5; }
.dark .unit-remove-btn {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
}

/* ─── Conversions Dialog ────────────────────────────────── */
.conv-product-card {
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--p-primary-50);
    border: 1px solid var(--p-primary-100);
}
.dark .conv-product-card {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.2);
}

.conv-product-name {
    font-size: 0.95rem;
    font-weight: 750;
    color: var(--p-surface-900);
    margin: 0 0 0.25rem;
}
.dark .conv-product-name { color: var(--p-surface-50); }

.conv-base-unit {
    font-size: 0.825rem;
    color: var(--p-surface-500);
    margin: 0;
}
.conv-base-unit strong {
    color: var(--p-primary-600);
}
.dark .conv-base-unit strong { color: var(--p-primary-400); }

.conv-section-title {
    font-size: 0.8rem;
    font-weight: 750;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding-bottom: 0.375rem;
    border-bottom: 1px dashed var(--p-surface-200);
}
.dark .conv-section-title { border-color: var(--p-surface-750); }

.conv-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.conv-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 0.625rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
    transition: background-color 0.15s;
}
.dark .conv-item {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.conv-item-start {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.conv-unit-name {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-800);
}
.dark .conv-unit-name { color: var(--p-surface-150); }

.conv-description {
    font-size: 0.8rem;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    color: var(--p-surface-450);
}

/* ─── Detail Dialog ─────────────────────────────────────── */
.detail-header-card {
    padding: 1.125rem;
    border-radius: 0.875rem;
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-150);
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

.detail-product-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, var(--p-primary-500), var(--p-primary-600));
    color: white;
    flex-shrink: 0;
}

.detail-product-info {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
}

.detail-product-name {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0;
}
.dark .detail-product-name { color: var(--p-surface-50); }

.detail-meta-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
}

.detail-sku {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    color: var(--p-surface-400);
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

.detail-units-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
}

.detail-unit-card {
    border: 1px solid var(--p-surface-200);
    border-radius: 0.875rem;
    background: var(--p-surface-0);
    padding: 1rem;
    transition: all 0.2s ease;
}
.dark .detail-unit-card {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.detail-unit-base {
    border-inline-start: 3px solid var(--p-primary-500);
}

.detail-unit-header {
    margin-bottom: 0.625rem;
}

.detail-unit-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.detail-unit-name {
    font-size: 0.95rem;
    font-weight: 750;
    color: var(--p-surface-800);
}
.dark .detail-unit-name { color: var(--p-surface-100); }

.factor-chip {
    font-size: 0.675rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 0.375rem;
    background: var(--p-surface-100);
    color: var(--p-surface-500);
}
.dark .factor-chip {
    background: var(--p-surface-800);
    color: var(--p-surface-400);
}

.detail-barcode {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    color: var(--p-surface-450);
    padding: 0.375rem 0.625rem;
    background: var(--p-surface-50);
    border-radius: 0.375rem;
    margin-bottom: 0.625rem;
}
.dark .detail-barcode {
    background: var(--p-surface-900);
}

.detail-prices-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.625rem;
}

.detail-price-box {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.625rem;
}

.detail-price-box.cost {
    background: var(--p-surface-50);
}
.dark .detail-price-box.cost { background: var(--p-surface-900); }

.detail-price-box.sell {
    background: var(--p-primary-50);
}
.dark .detail-price-box.sell { background: rgba(59, 130, 246, 0.08); }

.dpb-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--p-surface-400);
}
.detail-price-box.sell .dpb-label {
    color: var(--p-primary-500);
}

.dpb-value {
    font-size: 0.95rem;
    font-weight: 850;
    color: var(--p-surface-800);
}
.dark .dpb-value { color: var(--p-surface-150); }
.detail-price-box.sell .dpb-value {
    color: var(--p-primary-700);
}
.dark .detail-price-box.sell .dpb-value { color: var(--p-primary-300); }

.dpb-value small {
    font-size: 0.65rem;
    font-weight: 600;
    opacity: 0.6;
}

/* ─── Manage Categories / Units Dialog ──────────────────── */
.manage-input-row {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
}

.manage-list-wrap {
    border: 1px solid var(--p-surface-200);
    border-radius: 0.75rem;
    overflow: hidden;
    max-height: 300px;
    overflow-y: auto;
    margin-top: 0.75rem;
}
.dark .manage-list-wrap {
    border-color: var(--p-surface-750);
}

.manage-empty {
    padding: 2rem;
    text-align: center;
    font-size: 0.85rem;
    color: var(--p-surface-400);
    font-weight: 500;
}

.manage-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--p-surface-100);
    transition: background-color 0.15s ease;
}
.dark .manage-list-item { border-color: var(--p-surface-800); }
.manage-list-item:last-child { border-bottom: none; }
.manage-list-item:hover {
    background: var(--p-surface-50);
}
.dark .manage-list-item:hover { background: var(--p-surface-850); }

.manage-item-name {
    font-size: 0.875rem;
    font-weight: 650;
    color: var(--p-surface-800);
}
.dark .manage-item-name { color: var(--p-surface-150); }

.manage-item-actions {
    display: flex;
    gap: 0.375rem;
}

/* ─── Transitions ───────────────────────────────────────── */
.fade-slide-enter-active { animation: fadeSlide 0.3s ease; }
.fade-slide-leave-active { animation: fadeSlide 0.2s ease reverse; }

@keyframes fadeSlide {
    0% { opacity: 0; transform: translateY(-6px); }
    100% { opacity: 1; transform: translateY(0); }
}

:deep(.p-datatable-tbody > tr > td) {
    border-bottom: none !important;
}

/* ─── Status Filter & Cards ────────────────────────────── */
.stat-card.clickable {
    cursor: pointer;
}

.stat-card-active {
    border-color: var(--p-primary-500) !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25) !important;
}
.stat-card-active .stat-accent {
    opacity: 1 !important;
}

.status-filter-wrap {
    min-width: 150px;
}

.status-filter-select {
    width: 100%;
}

.product-avatar.is-inactive {
    background: rgba(239, 68, 68, 0.1) !important;
    color: #ef4444 !important;
}

.status-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.775rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-toggle-btn.is-active {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
}
.status-toggle-btn.is-active:hover {
    background: rgba(16, 185, 129, 0.25);
}
.dark .status-toggle-btn.is-active {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
}

.status-toggle-btn.is-inactive {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
}
.status-toggle-btn.is-inactive:hover {
    background: rgba(239, 68, 68, 0.25);
}
.dark .status-toggle-btn.is-inactive {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
}

.status-toggle-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--p-surface-200);
    background: var(--p-surface-50);
    margin-bottom: 1rem;
}
.dark .status-toggle-field {
    border-color: var(--p-surface-750);
    background: var(--p-surface-850);
}

.status-chip-sm {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
}

.status-chip-sm.status-success {
    background: rgba(16, 185, 129, 0.15);
    color: #059669;
}
.dark .status-chip-sm.status-success {
    color: #34d399;
}

.status-chip-sm.status-danger {
    background: rgba(239, 68, 68, 0.15);
    color: #dc2626;
}
.dark .status-chip-sm.status-danger {
    color: #f87171;
}
</style>
