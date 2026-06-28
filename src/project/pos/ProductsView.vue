<script setup>
import { ref, computed, onMounted } from "vue";
import { useProductStore } from "@/stores/pos/productStore";
import { useToastStore } from "@/stores/base/toastStore";
import { Package, Plus, Pencil, Trash2, Search, Info, Star, PlusCircle, ArrowLeft } from "lucide-vue-next";

// Category combobox state
const isAddingNewCategory = ref(false);
const newCategoryName = ref("");

const productStore = useProductStore();
const toastStore = useToastStore();

const showProductDialog = ref(false);
const editingProduct = ref(null);
const showConversionsDialog = ref(false);
const unitConversions = ref(null);
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
});

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
    
    // Convert units to the form structure
    units = units.map(u => ({
        id: u.id || 0,
        name: u.name || "",
        factor: u.factor || 1,
        barcode: u.barcode || "",
        price: u.sellingPrice || u.price || 0,
        cost: u.costPrice || 0,
        itemDiscount: u.itemDiscount || 0,
        isBaseUnit: u.isBaseUnit || u.factor === 1
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

    if (editingProduct.value) {
        await productStore.updateProduct({ ...productForm.value, id: editingProduct.value.id });
    } else {
        await productStore.createProduct({ ...productForm.value });
    }
    showProductDialog.value = false;
};

const deleteProduct = async (product) => {
    if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
        await productStore.deleteProduct(product.id);
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
            <Button label="إضافة منتج" @click="openNewProduct">
                <template #icon>
                    <Plus :size="18" />
                </template>
            </Button>
        </div>

        <!-- Table Container Card -->
        <div class="products-card">
            <!-- Filter TopBar -->
            <div class="products-filter-bar">
                <div class="relative w-full max-w-xs">
                    <Search :size="16" class="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                    <InputText
                        v-model="filters.global.value"
                        placeholder="بحث سريع عن صنف..."
                        class="ps-9 w-full"
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
                filterDisplay="row"
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
                <Column field="barcode" header="الباركود" style="min-width: 160px">
                    <template #body="{ data }">
                        <span class="text-sm text-surface-600 dark:text-surface-400">{{ data.barcode || '—' }}</span>
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

                <Column header="الوحدات" style="min-width: 140px">
                    <template #body="{ data }">
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-surface-500">
                                {{ data.units?.length || 0 }} وحدة
                            </span>
                            <div v-if="data.units?.some(u => u.isBaseUnit)" class="flex gap-1">
                                <Tag severity="success" value="أساسية" class="text-[10px] px-1 py-0 h-4 leading-none" />
                            </div>
                        </div>
                    </template>
                </Column>
                <Column header="إجراءات" style="min-width: 130px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex gap-1 justify-center">
                            <button class="action-info-btn" @click="viewConversions(data)" title="عرض تحويلات الوحدات">
                                <Info :size="15" />
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
                <div class="form-field">
                    <label class="required">اسم المنتج</label>
                    <InputText v-model="productForm.name" fluid placeholder="أدخل اسم المنتج" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-field">
                        <label class="required">رمز المنتج (SKU)</label>
                        <InputText v-model="productForm.sku" fluid placeholder="SKU" />
                    </div>
                    <div class="form-field">
                        <label>الباركود</label>
                        <InputText v-model="productForm.barcode" fluid placeholder="باركود المنتج" />
                    </div>
                </div>
                <div class="form-field">
                    <label class="required">الفئة</label>
                    <!-- Mode: Select existing category -->
                    <div v-if="!isAddingNewCategory" class="category-combobox">
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
                        <button type="button" class="add-category-btn" @click="isAddingNewCategory = true" title="إضافة فئة جديدة">
                            <PlusCircle :size="18" />
                            <span>فئة جديدة</span>
                        </button>
                    </div>
                    <!-- Mode: Type new category -->
                    <div v-else class="category-combobox">
                        <div class="new-category-input-wrap">
                            <button type="button" class="back-to-select-btn" @click="isAddingNewCategory = false" title="الرجوع للقائمة">
                                <ArrowLeft :size="16" />
                            </button>
                            <InputText 
                                v-model="productForm.category" 
                                fluid 
                                placeholder="اكتب اسم الفئة الجديدة..." 
                                autofocus
                            />
                        </div>
                        <p class="new-category-hint">سيتم إنشاء الفئة تلقائياً عند حفظ المنتج</p>
                    </div>
                </div>
                
                <!-- Units section -->
                <div class="units-section">
                    <div class="flex justify-between items-center mb-2">
                        <label class="font-bold text-surface-700 dark:text-surface-200">وحدات المنتج <span class="text-xs font-normal text-surface-500">(يجب أن توجد وحدة أساسية واحدة بمعامل 1)</span></label>
                        <Button label="إضافة وحدة" size="small" outlined @click="addUnitLine">
                            <template #icon><Plus :size="14" /></template>
                        </Button>
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
                                    <InputText v-model="unit.name" size="small" fluid placeholder="مثال: قطعة، كرتونة" />
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
</style>
