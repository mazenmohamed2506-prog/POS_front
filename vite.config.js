import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import AutoImport from "unplugin-auto-import/vite";
import tailwindcss from "@tailwindcss/vite";
import Components from "unplugin-vue-components/vite";

//import federation from "@originjs/vite-plugin-federation";

// https://vite.dev/config/
export default defineConfig({
    base: process.env.VITE_BASE_PATH || "/", // Use relative paths for Electron
    plugins: [
        vue(),
        vueDevTools(),
        tailwindcss(),
        AutoImport({
            dts: true,
            dirs: ["src/stores", "src/utilities", "src/volt"],
            imports: [
                "vue",
                "vue-router",
                "vee-validate",
                {
                    "primevue/usetoast": ["useToast"],
                },
            ],
        }),
        Components({
            dts: true,
            dirs: ["src/components", "src/volt"],
        }),

    ],

    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            "@volt": fileURLToPath(new URL("./src/volt", import.meta.url)),
            "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
            "@utilities": fileURLToPath(new URL("./src/utilities", import.meta.url)),
            "@stores": fileURLToPath(new URL("./src/stores", import.meta.url)),
            "@router": fileURLToPath(new URL("./src/router", import.meta.url)),
            "@views": fileURLToPath(new URL("./src/views", import.meta.url)),
            "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
            "@projects": fileURLToPath(new URL("./src/projects", import.meta.url)),
        },
    },
});
/* Developed by: MSDC, Copyright 2026. All rights reserved. ~ el-bob */