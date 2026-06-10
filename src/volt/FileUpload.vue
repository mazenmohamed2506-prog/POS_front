<template>
    <div class="flex flex-col">
        <!-- Empty State: Upload Button Mode -->
        <div v-if="showEmptyButtonMode"
            class="flex flex-row items-center gap-2 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-3 text-center">
            <input ref="fileInput" type="file" class="hidden" :accept="accept" :multiple="multiple"
                @change="handleFileSelect" />

            <Button @click="triggerFileInput" :disabled="disabled" class="p-2! text-sm gap-2">
                <Upload class="w-4 h-4" />
                اضغط للرفع
            </Button>

            <p class="text-xs text-surface-500 dark:text-surface-400 mt-2">
                {{ acceptText }}
            </p>
            <p class="text-xs text-surface-500 dark:text-surface-400 mt-2">
                {{ maxSizeText }}
            </p>
        </div>

        <!-- Empty State: Drag and Drop Mode -->
        <div v-else-if="showEmptyDragDropMode"
            class="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-4 text-center hover:border-primary transition-colors duration-200 cursor-pointer"
            :class="dragDropClasses" @drop="handleDrop" @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false" @click="triggerFileInput">
            <input ref="fileInput" type="file" class="hidden" :accept="accept" :multiple="multiple"
                @change="handleFileSelect" />

            <div class="flex flex-col items-center gap-3">
                <Upload class="w-12 h-12 text-surface-400" />
                <div class="text-sm text-surface-600 dark:text-surface-400">
                    <span class="font-medium text-primary">{{
                        dragDropText
                    }}</span>
                </div>
                <div class="text-xs text-surface-500 dark:text-surface-500">
                    {{ acceptText }}
                </div>
                <div v-if="!multiple" class="text-xs text-surface-500 dark:text-surface-500">
                    {{ maxSizeText }}
                </div>
            </div>
        </div>

        <!-- Empty State: Disabled -->
        <div v-else-if="showEmptyDisabled"
            class="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-4 text-center">
            <div class="flex flex-col items-center gap-3">
                <FileX2 class="w-8 h-8 text-surface-400" />
                <div class="text-sm text-surface-600 dark:text-surface-400">
                    <span class="font-medium text-surface-600 dark:text-surface-400">لا توجد مرفقات</span>
                </div>
            </div>
        </div>

        <!-- Single File Card -->
        <div v-else-if="!multiple && hasFiles" @click="openViewer(0)"
            class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer">
            <div class="flex items-center gap-3">
                <div class="relative">
                    <component :is="selectedFiles[0].fileIcon" class="w-5 h-5"
                        :class="selectedFiles[0].fileIconClass" />
                    <div
                        class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-800">
                    </div>
                </div>

                <div class="flex flex-col">
                    <span class="text-sm font-medium text-surface-900 dark:text-surface-0">
                        {{ selectedFiles[0].name }}
                    </span>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-surface-500 dark:text-surface-400">
                            {{ selectedFiles[0].formattedSize }}
                        </span>
                        <span class="text-xs text-surface-400 dark:text-surface-500">•</span>
                        <span class="text-xs font-medium" :class="selectedFiles[0].fileTypeClass">
                            {{ selectedFiles[0].fileTypeLabel }}
                        </span>
                    </div>
                </div>
            </div>

            <Button type="button" variant="text" size="small" @click.stop="removeFile(0)" :disabled="disabled"
                class="text-red-500 hover:text-red-700! hover:bg-red-50! dark:hover:bg-red-950! p-2!">
                <Trash class="w-4 h-4" />
            </Button>
        </div>

        <!-- Multiple Files List -->
        <div v-else-if="multiple && hasFiles" class="space-y-3">
            <input ref="fileInput" type="file" class="hidden" :accept="accept" multiple @change="handleFileSelect" />

            <div class="flex items-center gap-3 justify-between">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">
                    {{ attachmentsCountText }}
                </h3>

                <Button v-if="!disabled" type="button" variant="outline" size="small" @click="triggerFileInput"
                    class="flex items-center gap-2">
                    <Plus class="w-4 h-4" />
                    إضافة مرفق
                </Button>
            </div>

            <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                <div v-for="(file, index) in selectedFiles" :key="file.name"
                    class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer"
                    @click="openViewer(index)">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="shrink-0">
                            <component :is="file.fileIcon" class="w-8 h-8" :class="file.fileIconClass" />
                        </div>

                        <div class="flex flex-col min-w-0 flex-1">
                            <span class="text-sm font-medium text-surface-900 dark:text-surface-0 truncate"
                                :title="file.name">
                                {{ file.name }}
                            </span>
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-surface-500 dark:text-surface-400">
                                    {{ file.formattedSize }}
                                </span>
                                <span class="text-xs text-surface-400 dark:text-surface-500">•</span>
                                <span class="text-xs font-medium" :class="file.fileTypeClass">
                                    {{ file.fileTypeLabel }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button v-if="!disabled" type="button" variant="text" size="small" @click.stop="removeFile(index)"
                        class="shrink-0 text-red-500! hover:text-red-700! hover:bg-red-50! dark:hover:bg-red-950! p-2!">
                        <X class="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- Error Message -->
        <span v-if="errorMessage" class="text-red-500! text-sm! mt-1!">{{
            errorMessage
        }}</span>
    </div>

    <!-- Attachment Viewer Dialog -->
    <AttachmentViewer v-model="viewerVisible" :attachments="selectedFiles" :initialIndex="selectedAttachmentIndex" />
</template>

<script setup>
import { processFiles as processFilesUtil } from "@/utilities/fileProcessor";
import AttachmentViewer from "@/projects/correspondence/components/AttachmentViewer.vue";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

const props = defineProps({
    modelValue: {
        type: [File, Array],
        default: null,
    },
    accept: {
        type: String,
        default: "*/*",
    },
    multiple: {
        type: Boolean,
        default: false,
    },
    maxSize: {
        type: Number,
        default: DEFAULT_MAX_SIZE,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    dragDrop: {
        type: Boolean,
        default: true,
    },
});

const emit = defineEmits(["update:modelValue"]);

const fileInput = ref(null);
const isDragOver = ref(false);
const selectedFiles = ref([]);
const errorMessage = ref("");
const viewerVisible = ref(false);
const selectedAttachmentIndex = ref(0);

// Computed properties for template conditions
const hasFiles = computed(() => selectedFiles.value.length > 0);
const isEmpty = computed(() => !hasFiles.value);

const showEmptyButtonMode = computed(
    () => isEmpty.value && !props.dragDrop && !props.disabled
);

const showEmptyDragDropMode = computed(
    () => isEmpty.value && props.dragDrop && !props.disabled
);

const showEmptyDisabled = computed(() => isEmpty.value && props.disabled);

const dragDropClasses = computed(() => ({
    "border-primary bg-primary-50 dark:bg-primary-950": isDragOver.value,
}));

const acceptText = computed(() => {
    if (props.accept === "*/*") return "جميع أنواع الملفات";
    return `الأنواع المقبولة: ${props.accept}`;
});

const maxSizeText = computed(() => {
    return `(الحد الأقصى: ${formatFileSize(props.maxSize)})`;
});

const dragDropText = computed(() => {
    return "اضغط للرفع أو اسحب وأفلت";
});

const attachmentsCountText = computed(() => {
    return "المرفقات (" + selectedFiles.value.length + ")";
});

// Helper function to normalize modelValue (handles File, URL string, or object with presignedUrl)
const normalizeModelValue = (value) => {
    if (!value) return null;

    // If it's already a File object
    if (value instanceof File) {
        return value;
    }

    // If it's an object with presignedUrl (from API) - this is the primary case
    if (value && typeof value === "object" && value.presignedUrl) {
        // Ensure the object has required properties for fileProcessor
        const normalized = {
            ...value,
            name: value.name || extractFileNameFromUrl(value.presignedUrl),
            type: value.type || extractTypeFromUrl(value.presignedUrl),
            size: value.size || 0,
            lastModified: value.lastModified || Date.now(),
        };
        return normalized;
    }

    // If it's a URL string (fallback, but presignedUrl object is preferred)
    if (typeof value === "string") {
        return {
            name: extractFileNameFromUrl(value),
            type: extractTypeFromUrl(value),
            size: 0,
            presignedUrl: value,
            lastModified: Date.now(),
        };
    }

    return null;
};

// Helper to extract file name from URL
const extractFileNameFromUrl = (url) => {
    if (!url) return "logo";
    try {
        const urlPath = url.split("?")[0]; // Remove query params
        return urlPath.split("/").pop() || "logo";
    } catch {
        return "logo";
    }
};

// Helper to extract MIME type from URL/file name
const extractTypeFromUrl = (url) => {
    if (!url) return "image/*";

    try {
        const fileName = extractFileNameFromUrl(url);
        const extension = fileName.split(".").pop()?.toLowerCase();
        const imageTypes = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            webp: "image/webp",
            svg: "image/svg+xml",
        };

        return imageTypes[extension] || "image/*";
    } catch {
        return "image/*";
    }
};

// Initialize selectedFiles from modelValue
watch(
    () => props.modelValue,
    (newValue) => {
        if (props.multiple) {
            if (Array.isArray(newValue) && newValue.length > 0) {
                const normalized = newValue.map(normalizeModelValue).filter(Boolean);
                selectedFiles.value = normalized.length > 0 ? processFilesUtil(normalized) : [];
            } else {
                selectedFiles.value = [];
            }
        } else {
            const normalized = normalizeModelValue(newValue);
            selectedFiles.value = normalized ? processFilesUtil([normalized]) : [];
        }
        errorMessage.value = "";
    },
    { immediate: true }
);

const triggerFileInput = () => {
    if (!props.disabled) {
        fileInput.value?.click();
    }
};

const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    processFiles(files);
    event.target.value = "";
};

const handleDrop = (event) => {
    event.preventDefault();
    isDragOver.value = false;

    if (props.disabled) return;

    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
};

const processFiles = (files) => {
    const validFiles = files.filter((file) => {
        if (file.size > props.maxSize) {
            errorMessage.value = `حجم الملف يتجاوز الحد الأقصى (${formatFileSize(props.maxSize)})`;
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) return;

    errorMessage.value = "";
    const processedFiles = processFilesUtil(validFiles);

    if (props.multiple) {
        const newFiles = [...selectedFiles.value, ...processedFiles];
        selectedFiles.value = newFiles;
        emit("update:modelValue", newFiles);
    } else {
        selectedFiles.value = processedFiles.slice(0, 1);
        emit("update:modelValue", selectedFiles.value[0] || null);
    }
};

const removeFile = (index) => {
    selectedFiles.value.splice(index, 1);
    errorMessage.value = "";
    emit(
        "update:modelValue",
        props.multiple ? selectedFiles.value : selectedFiles.value[0] || null
    );
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const openViewer = (index) => {
    selectedAttachmentIndex.value = index;
    viewerVisible.value = true;
};

</script>
