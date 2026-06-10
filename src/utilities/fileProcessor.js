import { File, FileText, Image } from "lucide-vue-next";

/**
 * Processes a file and adds computed properties for consistent display
 * @param {File} file - The file object to process
 * @returns {Object} - Enhanced file object with additional properties
 */
export function processFile(file) {
    if (!file || (!isFileObject(file) && !file.presignedUrl)) {
        throw new Error(
            "Invalid file object provided - must be either a File object or have a presignedUrl"
        );
    }
    // Add computed properties directly to the file object
    file.fileIcon = getFileIcon(file.type);
    file.fileIconClass = getFileIconClass(file.type);
    file.fileTypeClass = getFileTypeClass(file.type);
    file.fileTypeLabel = getFileTypeLabel(file.type);
    file.formattedSize = formatFileSize(file.size);

    return file;
}
/**
 * Processes an array of files
 * @param {File[]} files - Array of file objects to process
 * @returns {File[]} - Array of enhanced file objects
 */
export function processFiles(files) {
    if (!Array.isArray(files)) {
        throw new Error("Files must be an array");
    }

    return files.map((file) => processFile(file));
}

/**
 * Gets the appropriate icon component for a file type
 * @param {string} fileType - MIME type of the file
 * @returns {Component} - Lucide Vue icon component
 */
export function getFileIcon(fileType) {
    if (fileType === "application/pdf") {
        return FileText;
    } else if (fileType?.startsWith("image/")) {
        return Image;
    } else {
        return File;
    }
}

/**
 * Gets the CSS classes for file type icons
 * @param {string} fileType - MIME type of the file
 * @returns {string} - CSS classes
 */
function getFileIconClass(fileType) {
    if (fileType === "application/pdf") {
        return "text-red-600 dark:text-red-400";
    } else if (fileType?.startsWith("image/")) {
        return "text-green-600 dark:text-green-400";
    } else if (fileType?.includes("word") || fileType?.includes("document")) {
        return "text-blue-600 dark:text-blue-400";
    } else {
        return "text-surface-600 dark:text-surface-400";
    }
}

/**
 * Gets the CSS classes for file type labels
 * @param {string} fileType - MIME type of the file
 * @returns {string} - CSS classes
 */
export function getFileTypeClass(fileType) {
    if (fileType === "application/pdf") {
        return "text-red-600 dark:text-red-400";
    } else if (fileType?.startsWith("image/")) {
        return "text-green-600 dark:text-green-400";
    } else if (fileType?.includes("word") || fileType?.includes("document")) {
        return "text-blue-600 dark:text-blue-400";
    } else {
        return "text-surface-600 dark:text-surface-400";
    }
}

/**
 * Gets the human-readable file type label
 * @param {string} fileType - MIME type of the file
 * @returns {string} - File type label
 */
export function getFileTypeLabel(fileType) {
    if (fileType === "application/pdf") {
        return "PDF";
    } else if (fileType?.startsWith("image/")) {
        return "Image";
    } else if (fileType?.includes("word") || fileType?.includes("document")) {
        return "Document";
    } else {
        return "File";
    }
}

/**
 * Formats file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Checks if a file is a PDF
 * @param {string} fileType - MIME type of the file
 * @returns {boolean} - True if PDF
 */
export function isPdfFile(fileType) {
    return fileType === "application/pdf";
}

/**
 * Checks if a file is an image
 * @param {string} fileType - MIME type of the file
 * @returns {boolean} - True if image
 */
export function isImageFile(fileType) {
    return fileType?.startsWith("image/");
}

/**
 * Checks if an object is a valid file object
 * @param {any} obj - The object to check
 * @returns {boolean} - True if it's a file object
 */
function isFileObject(obj) {
    return (
        obj &&
        typeof obj === "object" &&
        typeof obj.name === "string" &&
        typeof obj.size === "number" &&
        typeof obj.type === "string" &&
        typeof obj.lastModified === "number" &&
        typeof obj.stream === "function" &&
        typeof obj.arrayBuffer === "function" &&
        typeof obj.text === "function"
    );
}
