<template>
    <Button
        @click="toggle"
        class="bg-transparent rounded-full! w-9 h-9 p-1! border-none"
        :class="
            isDeactivate
                ? 'hover:bg-orange-500/10! hover:dark:bg-orange-500/20!'
                : isActivate
                ? 'hover:bg-green-500/10! hover:dark:bg-green-500/20!'
                : 'hover:bg-red-500/10! hover:dark:bg-red-500/20!'
        "
    >
        <Trash
            v-if="!isDeactivate && !isActivate"
            class="w-4 h-4 text-red-500!"
        />
        <CircleOff v-if="isDeactivate" class="w-4 h-4 text-orange-500!" />
        <CheckCircle v-if="isActivate" class="w-4 h-4 text-green-500!" />
    </Button>
    <Popover ref="menu">
        <div class="flex flex-col justify-between gap-6">
            <div
                v-if="!loading"
                class="flex flex-col gap-2 justify-center text-center"
            >
                <p>
                    {{
                        isDeactivate
                            ? `هل أنت متأكد من تعطيل ${itemType} "${itemName}"؟`
                            : isActivate
                            ? `هل أنت متأكد من تفعيل ${itemType} "${itemName}"؟`
                            : `هل أنت متأكد من حذف ${itemType} "${itemName}"؟`
                    }}
                </p>
                <div class="flex gap-2 w-full">
                    <Button
                        v-if="isDeactivate"
                        class="p-1.5! h-7 bg-orange-500! hover:bg-orange-700! border-none text-sm min-w-max"
                        @click="confirmDelete"
                        ><span class="text-white">نعم، تعطيل</span></Button
                    >
                    <Button
                        v-else-if="isActivate"
                        class="p-1.5! h-7 bg-green-500! hover:bg-green-700! border-none text-sm min-w-max"
                        @click="confirmDelete"
                        ><span class="text-white">نعم، تفعيل</span></Button
                    >
                    <Button
                        v-else
                        class="p-1.5! h-7 bg-red-500! hover:bg-red-700! border-none text-sm min-w-max"
                        @click="confirmDelete"
                        ><span class="text-white">نعم، حذف</span></Button
                    >
                    <Button
                        class="p-1.5! h-7 bg-surface-500! hover:bg-surface-700! border-none text-sm min-w-max"
                        @click="menu.hide()"
                        ><span class="text-white">لا، إلغاء</span></Button
                    >
                </div>
            </div>
            <div
                v-if="loading"
                class="w-full flex justify-center items-center text-center gap-2"
            >
                <div
                    :class="
                        isDeactivate
                            ? 'animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600'
                            : isActivate
                            ? 'animate-spin rounded-full h-4 w-4 border-b-2 border-green-600'
                            : 'animate-spin rounded-full h-4 w-4 border-b-2 border-red-600'
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
        </div>
    </Popover>
</template>
<script setup>
const menu = ref();
const toggle = (event) => {
    menu.value.toggle(event);
};
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
    try {
        await props.confirm();
    } finally {
        menu.value?.hide();
        loading.value = false;
    }
};
</script>
