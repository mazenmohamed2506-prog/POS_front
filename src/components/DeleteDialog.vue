<template>
    <Dialog
        :closable="false"
        :showHeader="false"
        :visible="displayDeleteDialog"
        modal
        :style="{ width: '34vw' }"
        class="transition-all duration-300"
    >
        <div class="p-3 !rounded-[20px] flex flex-col justify-between gap-6">
            <div
                class="w-full flex justify-center items-center text-center pt-5"
            >
                <div
                    v-if="isDeactivate"
                    class="rounded-full border-2 outline-4 outline-orange-200 border-orange-500 p-2 w-20 h-20 flex items-center justify-center"
                >
                    <CircleOff class="w-10 h-10 !text-orange-500" />
                </div>
                <div
                    v-else-if="isActivate"
                    class="rounded-full border-2 outline-4 outline-green-200 border-green-500 p-2 w-20 h-20 flex items-center justify-center"
                >
                    <CheckCircle class="w-10 h-10 !text-green-500" />
                </div>
                <div
                    v-else
                    class="rounded-full border-2 outline-4 outline-red-200 border-red-500 p-2 w-20 h-20 flex items-center justify-center"
                >
                    <Trash class="w-10 h-10 !text-red-500" />
                </div>
            </div>
            <div
                v-if="!loading"
                class="w-full flex justify-center items-center text-center"
            >
                <p class="font-[700] text-2xl">
                    {{
                        isDeactivate
                            ? `تعطيل ${itemType}`
                            : isActivate
                            ? `تفعيل ${itemType}`
                            : `حذف ${itemType}`
                    }}
                </p>
            </div>
            <div
                v-if="loading"
                class="w-full flex justify-center items-center text-center gap-2"
            >
                <div
                    :class="
                        isDeactivate
                            ? 'animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600'
                            : isActivate
                            ? 'animate-spin rounded-full h-8 w-8 border-b-2 border-green-600'
                            : 'animate-spin rounded-full h-8 w-8 border-b-2 border-red-600'
                    "
                ></div>
                <span
                    v-if="isDeactivate"
                    class="ml-2 text-surface-600 dark:text-surface-400"
                    >جاري تعطيل {{ itemType }} {{ itemName }}...</span
                >
                <span
                    v-else-if="isActivate"
                    class="ml-2 text-surface-600 dark:text-surface-400"
                    >جاري تفعيل {{ itemType }} {{ itemName }}...</span
                >
                <span
                    v-else
                    class="ml-2 text-surface-600 dark:text-surface-400"
                    >جاري حذف {{ itemType }} {{ itemName }}...</span
                >
            </div>
            <div
                v-if="!loading"
                class="flex flex-col gap-2 justify-center text-center"
            >
                <p
                    class="text-xl font-[500] text-surface-500 dark:text-surface-400"
                >
                    {{
                        isDeactivate
                            ? `هل أنت متأكد من تعطيل ${itemType} "${itemName}"؟`
                            : isActivate
                            ? `هل أنت متأكد من تفعيل ${itemType} "${itemName}"؟`
                            : `هل أنت متأكد من حذف ${itemType} "${itemName}"؟`
                    }}
                </p>
            </div>

            <div v-if="!loading" class="flex mt-6 gap-2">
                <Button
                    v-if="isDeactivate"
                    class="w-full !bg-orange-500/20 !text-orange-700 dark:!text-orange-300 hover:!bg-orange-500/30 border-none text-lg font-bold"
                    @click="confirmDelete"
                    >نعم، تعطيل</Button
                >
                <Button
                    v-else-if="isActivate"
                    class="w-full !bg-green-500/20 !text-green-700 dark:!text-green-300 hover:!bg-green-500/30 border-none text-lg font-bold"
                    @click="confirmDelete"
                    >نعم، تفعيل</Button
                >
                <Button
                    v-else
                    class="w-full bg-red-500/20 text-red-700 dark:text-red-300 hover:!bg-red-500/30 border-none text-lg font-bold"
                    @click="confirmDelete"
                    >نعم، حذف</Button
                >
                <Button
                    class="w-full bg-surface-500/20 text-surface-700 dark:text-surface-300 hover:!bg-surface-500/30 border-none text-lg font-bold"
                    @click="displayDeleteDialog = false"
                    @keydown="displayDeleteDialog = false"
                    >لا، إلغاء</Button
                >
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { computed } from "vue";
const displayDeleteDialog = defineModel();
const props = defineProps({
    itemType: String,
    itemName: String,
    isDeactivate: {
        type: Boolean,
        default: false,
    },
    isActivate: {
        type: Boolean,
        default: false,
    },
    confirm: {
        type: Function,
        default: () => {},
    },
});
const loading = ref(false);
const confirmDelete = async () => {
    loading.value = true;
    await props.confirm();
    displayDeleteDialog.value = false;
    loading.value = false;
};
</script>
