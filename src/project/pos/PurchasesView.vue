<script setup>
import { ref, onMounted, computed } from "vue";
import { usePosStore } from "@/stores/pos/posStore";
import { Receipt, Plus, Trash2 } from "lucide-vue-next";

const posStore = usePosStore();

const showPurchaseDialog = ref(false);
const purchaseForm = ref({
    supplier: "",
    items: [{ productId: null, productName: "", qty: 1, cost: 0 }],
});

onMounted(() => {
    posStore.fetchProducts();
    // purchases are populated via addPurchase actions
});

const purchaseTotal = computed(() =>
    purchaseForm.value.items.reduce((sum, i) => sum + i.qty * i.cost, 0)
);

const addPurchaseLine = () => {
    purchaseForm.value.items.push({ productId: null, productName: "", qty: 1, cost: 0 });
};

const removePurchaseLine = (idx) => {
    purchaseForm.value.items.splice(idx, 1);
};

const openNewPurchase = () => {
    purchaseForm.value = {
        supplier: "",
        items: [{ productId: null, productName: "", qty: 1, cost: 0 }],
    };
    showPurchaseDialog.value = true;
};

const savePurchase = async () => {
    await posStore.addPurchase(
        { supplier: purchaseForm.value.supplier },
        purchaseForm.value.items
    );
    showPurchaseDialog.value = false;
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric", month: "short", day: "numeric",
    });
};
</script>

<template>
    <div class="p-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <Receipt :size="24" class="text-primary-500" />
                <h1 class="text-xl font-bold text-surface-800 dark:text-surface-100">فواتير المشتريات</h1>
            </div>
            <Button label="فاتورة جديدة" @click="openNewPurchase">
                <template #icon><Plus :size="18" /></template>
            </Button>
        </div>

        <!-- Purchases Table -->
        <DataTable
            :value="posStore.purchases"
            :loading="posStore.loading"
            paginator
            :rows="10"
            emptyMessage="لا توجد فواتير مشتريات"
        >
            <Column field="invoiceNumber" header="رقم الفاتورة" sortable style="width: 160px" />
            <Column field="supplier" header="المورد" sortable style="min-width: 180px" />
            <Column field="date" header="التاريخ" sortable style="width: 140px">
                <template #body="{ data }">
                    {{ formatDate(data.date) }}
                </template>
            </Column>
            <Column header="عدد الأصناف" style="width: 120px">
                <template #body="{ data }">
                    {{ data.items?.length || 0 }}
                </template>
            </Column>
            <Column field="total" header="الإجمالي" sortable style="width: 130px">
                <template #body="{ data }">
                    <span class="font-bold">{{ data.total?.toFixed(2) }}</span>
                </template>
            </Column>
            <Column field="status" header="الحالة" style="width: 100px">
                <template #body="{ data }">
                    <Tag :value="data.status === 'received' ? 'مستلم' : data.status" severity="success" />
                </template>
            </Column>
        </DataTable>

        <!-- Purchase Dialog -->
        <Dialog
            v-model:visible="showPurchaseDialog"
            title="فاتورة مشتريات جديدة"
            :style="{ width: '650px' }"
        >
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold">اسم المورد</label>
                    <InputText v-model="purchaseForm.supplier" fluid placeholder="اسم المورد" />
                </div>

                <!-- Item Lines -->
                <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold">الأصناف</label>
                    <div
                        v-for="(item, idx) in purchaseForm.items"
                        :key="idx"
                        class="flex gap-2 items-end"
                    >
                        <div class="flex-1">
                            <InputText v-model="item.productName" fluid placeholder="اسم الصنف" />
                        </div>
                        <div class="w-24">
                            <InputNumber v-model="item.qty" :min="1" fluid placeholder="كمية" />
                        </div>
                        <div class="w-28">
                            <InputNumber v-model="item.cost" :minFractionDigits="2" fluid placeholder="سعر" />
                        </div>
                        <Button
                            size="small"
                            text
                            rounded
                            severity="danger"
                            @click="removePurchaseLine(idx)"
                            :disabled="purchaseForm.items.length <= 1"
                        >
                            <template #icon><Trash2 :size="16" /></template>
                        </Button>
                    </div>
                    <Button label="إضافة صنف" text size="small" @click="addPurchaseLine" class="self-start">
                        <template #icon><Plus :size="16" /></template>
                    </Button>
                </div>

                <div class="text-left font-bold text-lg pt-2 border-t border-surface-200 dark:border-surface-700">
                    الإجمالي: {{ purchaseTotal.toFixed(2) }}
                </div>
            </div>
            <template #footer>
                <Button label="إلغاء" text @click="showPurchaseDialog = false" />
                <Button label="حفظ الفاتورة" @click="savePurchase" :loading="posStore.loading" />
            </template>
        </Dialog>
    </div>
</template>
