<template>
    <div class="flex flex-col">
        <FileUpload
            v-model="value"
            :accept="accept"
            :multiple="multiple"
            :max-size="maxSize"
            :disabled="disabled"
            @select="onFileSelect"
        />

        <!-- File List with Delete Buttons -->
        <div v-if="fileList.length > 0" class="mt-4 space-y-2">
            <div
                v-for="(file, index) in fileList"
                :key="file.name"
                class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"
            >
                <div class="flex items-center gap-3">
                    <FileIcon class="w-5 h-5 text-surface-500" />
                    <div class="flex flex-col">
                        <span
                            class="text-sm font-medium text-surface-900 dark:text-surface-0"
                        >
                            {{ file.name }}
                        </span>
                        <div class="flex items-center gap-2">
                            <span
                                class="text-xs text-surface-500 dark:text-surface-400"
                            >
                                {{ formatFileSize(file.size) }}
                            </span>
                            <span
                                class="text-xs text-surface-400 dark:text-surface-500"
                                >•</span
                            >
                            <span
                                class="text-xs font-medium"
                                :class="getFileTypeClass(file.type)"
                            >
                                {{ getFileTypeLabel(file.type) }}
                            </span>
                        </div>
                    </div>
                </div>
                <Button
                    type="button"
                    severity="danger"
                    size="small"
                    icon="pi pi-trash"
                    @click="removeFile(index)"
                    :disabled="disabled"
                    class="!p-2"
                />
            </div>
        </div>

        <span class="text-red-500 text-sm">{{ errorMessage }}</span>
    </div>
</template>

<script setup>
import { FileIcon } from "lucide-vue-next";

const props = defineProps({
    name: String,
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
        default: 10 * 1024 * 1024, // 10MB
    },
    disabled: Boolean,
});

const { value, errorMessage, setValue } = useField(() => props.name);

// Reactive file list
const fileList = ref([]);

// Initialize file list from value
watch(
    () => value.value,
    (newValue) => {
        if (newValue) {
            if (props.multiple && Array.isArray(newValue)) {
                fileList.value = [...newValue];
            } else if (!props.multiple && newValue instanceof File) {
                fileList.value = [newValue];
            } else {
                fileList.value = [];
            }
        } else {
            fileList.value = [];
        }
    },
    { immediate: true }
);

// Handle file selection
const onFileSelect = (event) => {
    const files = Array.from(event.files);

    if (props.multiple) {
        const newFiles = [...fileList.value, ...files];
        fileList.value = newFiles;
        setValue(newFiles);
    } else {
        fileList.value = files.length > 0 ? [files[0]] : [];
        setValue(files.length > 0 ? files[0] : null);
    }
};

// Remove file from list
const removeFile = (index) => {
    if (props.multiple) {
        const newFiles = fileList.value.filter((_, i) => i !== index);
        fileList.value = newFiles;
        setValue(newFiles.length > 0 ? newFiles : null);
    } else {
        fileList.value = [];
        setValue(null);
    }
};

// Format file size
const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Get file type label
const getFileTypeLabel = (fileType) => {
    if (fileType === "application/pdf") {
        return "PDF";
    } else if (fileType.startsWith("image/")) {
        return "Image";
    } else {
        return "File";
    }
};

// Get file type styling class
const getFileTypeClass = (fileType) => {
    if (fileType === "application/pdf") {
        return "text-red-600 dark:text-red-400";
    } else if (fileType.startsWith("image/")) {
        return "text-green-600 dark:text-green-400";
    } else {
        return "text-blue-600 dark:text-blue-400";
    }
};
</script>
