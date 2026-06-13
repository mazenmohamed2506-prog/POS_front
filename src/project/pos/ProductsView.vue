<script setup>
import { ref, onMounted } from "vue";
import { useProductStore } from "@/stores/pos/productStore";
import { Package, Plus, Pencil, Trash2, Search } from "lucide-vue-next";

const productStore = useProductStore();

const showProductDialog = ref(false);
const editingProduct = ref(null);
const productForm = ref({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    price: 0,
    cost: 0,
    units: [],
});

const filters = ref({ global: { value: "", matchMode: "contains" } });

onMounted(() => {
    productStore.fetchProducts();
});

const openNewProduct = () => {
    editingProduct.value = null;
    productForm.value = { name: "", sku: "", barcode: "", category: "", price: 0, cost: 0, units: [] };
    showProductDialog.value = true;
};

const openEditProduct = (product) => {
    editingProduct.value = product;
    productForm.value = { ...product, units: [...(product.units || [])] };
    showProductDialog.value = true;
};

const saveProduct = async () => {
    if (editingProduct.value) {
        await productStore.updateProduct({ ...productForm.value, id: editingProduct.value.id });
    } else {
        await productStore.createProduct({ ...productForm.value });
    }
    showProductDialog.value = false;
};

const deleteProduct = async (product) => {
    // TODO: Add confirmation dialog
    await productStore.deleteProduct(product.id);
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
                class="products-table"
            >
                <Column field="name" header="اسم المنتج" sortable style="min-width: 220px">
                    <template #body="{ data }">
                        <span class="font-bold text-surface-800 dark:text-surface-100">{{ data.name }}</span>
                    </template>
                </Column>
                <Column field="sku" header="رمز المنتج" sortable style="width: 140px">
                    <template #body="{ data }">
                        <span class="text-sm font-semibold font-mono text-surface-600 dark:text-surface-400">{{ data.sku }}</span>
                    </template>
                </Column>
                <Column field="barcode" header="الباركود" style="width: 160px">
                    <template #body="{ data }">
                        <span class="text-sm text-surface-600 dark:text-surface-400">{{ data.barcode || '—' }}</span>
                    </template>
                </Column>
                <Column field="category" header="الفئة" sortable style="width: 130px">
                    <template #body="{ data }">
                        <Tag :value="data.category" severity="info" class="font-medium" />
                    </template>
                </Column>
                <Column field="price" header="سعر البيع" sortable style="width: 130px">
                    <template #body="{ data }">
                        <span class="font-black text-primary-600 dark:text-primary-450">{{ data.price?.toFixed(2) }} EGP</span>
                    </template>
                </Column>
                <Column field="cost" header="سعر الشراء" sortable style="width: 130px">
                    <template #body="{ data }">
                        <span class="font-semibold text-surface-600 dark:text-surface-400">{{ data.cost?.toFixed(2) }} EGP</span>
                    </template>
                </Column>
                <Column header="الوحدات" style="width: 120px">
                    <template #body="{ data }">
                        <span class="text-sm font-medium text-surface-500">
                            {{ data.units?.length || 0 }} وحدة
                        </span>
                    </template>
                </Column>
                <Column header="إجراءات" style="width: 100px; text-align: center">
                    <template #body="{ data }">
                        <div class="flex gap-1 justify-center">
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
                    <InputText v-model="productForm.category" fluid placeholder="الفئة (مثال: مشروبات)" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-field">
                        <label class="required">سعر البيع</label>
                        <InputNumber v-model="productForm.price" :minFractionDigits="2" fluid placeholder="0.00" />
                    </div>
                    <div class="form-field">
                        <label class="required">سعر الشراء (التكلفة)</label>
                        <InputNumber v-model="productForm.cost" :minFractionDigits="2" fluid placeholder="0.00" />
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2 w-full justify-end">
                    <Button label="إلغاء" outlined severity="secondary" @click="showProductDialog = false" />
                    <Button label="حفظ المنتج" @click="saveProduct" :loading="productStore.loading" />
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

/* Header */
.products-header {
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
.action-delete-btn {
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

.dark .action-edit-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-300);
}

.action-edit-btn:hover {
    background: var(--p-primary-50);
    border-color: var(--p-primary-300);
    color: var(--p-primary-600);
}

.dark .action-edit-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
    color: var(--p-primary-400);
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
</style>
