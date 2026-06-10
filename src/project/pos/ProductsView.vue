<script setup>
import { ref, onMounted } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { Package, Plus, Pencil, Trash2 } from "lucide-vue-next";

const posStore = usePosStore();

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
    posStore.fetchProducts();
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
        await posStore.updateProduct({ ...productForm.value, id: editingProduct.value.id });
    } else {
        await posStore.createProduct({ ...productForm.value });
    }
    showProductDialog.value = false;
};

const deleteProduct = async (product) => {
    // TODO: Add confirmation dialog
    await posStore.deleteProduct(product.id);
};
</script>

<template>
    <div class="p-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <Package :size="24" class="text-primary-500" />
                <h1 class="text-xl font-bold text-surface-800 dark:text-surface-100">إدارة المنتجات</h1>
            </div>
            <Button label="إضافة منتج" @click="openNewProduct">
                <template #icon>
                    <Plus :size="18" />
                </template>
            </Button>
        </div>

        <!-- Products Table -->
        <DataTable
            :value="posStore.products"
            :loading="posStore.loading"
            paginator
            :rows="10"
            v-model:filters="filters"
            filterDisplay="row"
            :globalFilterFields="['name', 'sku', 'barcode', 'category']"
            emptyMessage="لا توجد منتجات"
        >
            <template #header>
                <div class="flex justify-end">
                    <InputText
                        v-model="filters.global.value"
                        placeholder="بحث..."
                        class="w-64"
                    />
                </div>
            </template>

            <Column field="name" header="اسم المنتج" sortable style="min-width: 200px" />
            <Column field="sku" header="رمز المنتج" sortable style="width: 140px" />
            <Column field="barcode" header="الباركود" style="width: 160px" />
            <Column field="category" header="الفئة" sortable style="width: 120px">
                <template #body="{ data }">
                    <Tag :value="data.category" />
                </template>
            </Column>
            <Column field="price" header="سعر البيع" sortable style="width: 120px">
                <template #body="{ data }">
                    <span class="font-semibold">{{ data.price?.toFixed(2) }}</span>
                </template>
            </Column>
            <Column field="cost" header="سعر الشراء" sortable style="width: 120px">
                <template #body="{ data }">
                    <span>{{ data.cost?.toFixed(2) }}</span>
                </template>
            </Column>
            <Column header="الوحدات" style="width: 120px">
                <template #body="{ data }">
                    <span class="text-sm text-surface-500">
                        {{ data.units?.length || 0 }} وحدة
                    </span>
                </template>
            </Column>
            <Column header="إجراءات" style="width: 100px">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button size="small" text rounded @click="openEditProduct(data)">
                            <template #icon><Pencil :size="16" /></template>
                        </Button>
                        <Button size="small" text rounded severity="danger" @click="deleteProduct(data)">
                            <template #icon><Trash2 :size="16" /></template>
                        </Button>
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Product Dialog -->
        <Dialog
            v-model:visible="showProductDialog"
            :title="editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'"
            :style="{ width: '500px' }"
        >
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">اسم المنتج</label>
                    <InputText v-model="productForm.name" fluid placeholder="اسم المنتج" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold">رمز المنتج (SKU)</label>
                        <InputText v-model="productForm.sku" fluid placeholder="SKU" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold">الباركود</label>
                        <InputText v-model="productForm.barcode" fluid placeholder="باركود" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">الفئة</label>
                    <InputText v-model="productForm.category" fluid placeholder="الفئة" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold">سعر البيع</label>
                        <InputNumber v-model="productForm.price" :minFractionDigits="2" fluid />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-sm font-semibold">سعر الشراء</label>
                        <InputNumber v-model="productForm.cost" :minFractionDigits="2" fluid />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="إلغاء" text @click="showProductDialog = false" />
                <Button label="حفظ" @click="saveProduct" :loading="posStore.loading" />
            </template>
        </Dialog>
    </div>
</template>
