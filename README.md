# Correspondence (Vue 3 + Vite + Tailwind v4 + PrimeVue)

This guide documents, step-by-step, how to create this project from scratch, including tooling and structure. It is derived from `project.txt` and the current codebase.

### Prerequisites

-   Node.js: ^20.19 or >=22.12 (matches `package.json` engines)
-   Package manager: npm (used in commands below)

## 1) Create the project with Vite

```bash
npm create vite@latest Correspondence
cd Correspondence
npm install
```

## 2) Install and configure Tailwind CSS v4 (with the Vite plugin)

```bash
npm install tailwindcss @tailwindcss/vite
```

Add Tailwind plugin to `vite.config.js`:

```js
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        // ...other plugins
        tailwindcss(),
    ],
});
```

Import Tailwind in your global stylesheet `src/assets/main.css`:

```css
@import "tailwindcss";
```

## 3) PrimeVue (unstyled) + Tailwind PrimeUI integration

```bash
npm install primevue
npm install tailwindcss-primeui tailwind-merge
```

Extend `src/assets/main.css` to include PrimeUI styles and design tokens:

```css
@import "tailwindcss";
@import "tailwindcss-primeui";

/* Optional: CSS variables for light/dark themes as in the repo */
```

Enable PrimeVue (unstyled) in `src/main.js`:

```js
import PrimeVue from "primevue/config";

app.use(PrimeVue, { unstyled: true });
```

## 4) Volt for PrimeVue (component scaffolds)

This project uses Volt-flavored PrimeVue wrappers stored under `src/volt` (e.g., `Button.vue`, `Toast.vue`) and utility `twMerge` integration.

If you use the Volt CLI to scaffold, run:

```bash
npx volt-vue add Button
npx volt-vue add DataTable
npx volt-vue add Dialog
npx volt-vue add DatePicker
npx volt-vue add toast
```

Alternatively, create `src/volt` components as in this repo and reuse `twMerge` via `src/volt/utils.ts`.

## 5) Auto-imports and auto-components

```bash
npm i -D unplugin-auto-import unplugin-vue-components
```

Configure in `vite.config.js`:

```js
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";

export default defineConfig({
    plugins: [
        AutoImport({
            dts: true,
            dirs: ["src/stores", "src/utilities", "src/volt"],
            imports: [
                "vue",
                "vue-router",
                "vee-validate",
                { "primevue/usetoast": ["useToast"] },
            ],
        }),
        Components({ dts: true, dirs: ["src/components", "src/volt"] }),
    ],
});
```

## 6) Form validation

```bash
npm i vee-validate
```

Optional (used by `src/utilities/validations.js`):

```bash
npm i yup
```

## 7) HTTP client and API helpers

```bash
npm i axios
```

Create `src/utilities/apiClient.js` with base URL and interceptors. Example settings mirrored by the repo:

-   Base URL from `VITE_ROOT_URL`
-   Request interceptor attaching `Authorization: Bearer <token>` if present
-   Response interceptor showing success/error toasts (PrimeVue ToastService)

Create `src/utilities/fetchApi.js` thin wrappers for GET/POST/PUT/DELETE that optionally disable success toasts by setting `disableToast` header.

Environment file `.env`:

```bash
VITE_ROOT_URL=https://api.example.com
```

## 8) Internationalization (i18n)

```bash
npm install vue-i18n@11
```

### i18n Configuration

Setup `src/i18n/index.js` with modular translation structure:

```js
// index.js
import { createI18n } from "vue-i18n";
import constants from "./constants";
import authTranslations from "@/projects/authentication/translations/authTranslations";
import corrTranslations from "@/projects/correspondence/translations/corrTranslations";
import ecTranslations from "@/projects/employeeCenter/translations/ecTranslations";

// Get saved locale from localStorage or default to 'ar'
const savedLocale = localStorage.getItem("selectedLocale") || "ar";

const i18n = createI18n({
    legacy: false,
    locale: savedLocale,
    fallbackLocale: "ar",
    messages: {
        en: {
            ...constants.en,
            ...authTranslations.en,
            ...corrTranslations.en,
            ...ecTranslations.en,
        },
        ar: {
            ...constants.ar,
            ...authTranslations.ar,
            ...corrTranslations.ar,
            ...ecTranslations.ar,
        },
    },
});

export const supportedLocales = {
    en: { name: "English" },
    ar: { name: "العربية (Arabic)" },
};

// Function to change locale and save to localStorage
export function setLocale(locale) {
    if (supportedLocales[locale]) {
        i18n.global.locale.value = locale;
        localStorage.setItem("selectedLocale", locale);

        // Update document direction based on locale
        const isRTL = locale === "ar";
        document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
    }
}
```

Register in `src/main.js`:

```js
import i18n from "./i18n";
app.use(i18n);
```

### Translation Structure

-   **Constants**: `src/i18n/constants.js` - Common UI text
-   **Project-specific**: Each project module has its own translation files
    -   `src/projects/authentication/translations/authTranslations.js`
    -   `src/projects/correspondence/translations/corrTranslations.js`
    -   `src/projects/employeeCenter/translations/ecTranslations.js`

## 9) Right-to-Left (RTL) Support

### HTML Configuration

Set default RTL direction in `index.html`:

```html
<!DOCTYPE html>
<html lang="" dir="rtl">
    <!-- ... rest of HTML -->
</html>
```

### Dynamic RTL Switching

RTL direction is automatically managed based on the selected locale:

1. **Initial Setup** in `src/main.js`:

```js
// Initialize document direction based on saved locale
const savedLocale = localStorage.getItem("selectedLocale") || "ar";
const isRTL = savedLocale === "ar";
document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
```

2. **Dynamic Updates** when changing locale via `setLocale()` function:

```js
// Update document direction based on locale
const isRTL = locale === "ar";
document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
```

### RTL Features

-   **Arabic (ar)**: Automatically sets `dir="rtl"` on document root
-   **English (en)**: Automatically sets `dir="ltr"` on document root
-   **Persistence**: RTL preference is saved in localStorage with locale selection
-   **Component Support**: Individual components can override direction if needed

## 10) Lucide Vue icons (usage)

Use `lucide-vue-next` for lightweight, tree-shakable icons.

1. Install (already present in this repo):

```bash
npm i lucide-vue-next
```

2. Register only the icons you use in `src/assets/icons/icons.js` and call `importIcons(app)` in `src/main.js` (already set up):

```js
// src/assets/icons/icons.js
import { Camera, Sun, Moon } from "lucide-vue-next";

export const importIcons = (app) => {
    app.component("Camera", Camera);
    app.component("Sun", Sun);
    app.component("Moon", Moon);
};

// src/main.js
import { importIcons } from "@/assets/icons/icons.js";
const app = createApp(App);
importIcons(app);
```

3. Use in components:

```vue
<template>
    <Button>
        <Sun class="w-5 h-5 block dark:hidden" />
        <Moon class="w-5 h-5 hidden dark:block" />
    </Button>
    <Camera class="w-6 h-6 text-primary-500" />
</template>
```

Tips

-   Import additional icons from `lucide-vue-next` and register them in `importIcons` as needed.
-   You can also register icons locally per component via `import { Sun } from 'lucide-vue-next'` and use `<Sun />` without global registration.

## 11) Dark mode with VueUse

This project uses VueUse to toggle Tailwind's dark mode by adding a `dark` class to the root element.

1. Install VueUse (already present in this repo):

```bash
npm i @vueuse/core
```

2. Ensure Tailwind dark variant is enabled (already configured in `src/assets/main.css`):

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This tells Tailwind v4 to apply `dark:` utilities when an ancestor has the `dark` class (commonly on `<html>`).

3. Use `useDark` + `useToggle` in a toggle component (example `src/components/themeSwitcher.vue`):

```vue
<script setup>
import { useDark, useToggle } from "@vueuse/core";

const isDark = useDark(); // adds/removes the `dark` class on <html> and persists preference
const toggleDark = useToggle(isDark);
</script>

<template>
    <button
        type="button"
        @click="toggleDark()"
        class="rounded-full h-10 w-10 grid place-items-center bg-surface-0 hover:bg-surface-100 dark:bg-surface-950 dark:hover:bg-surface-700"
        aria-label="Toggle theme"
    >
        <span class="block dark:hidden">☀️</span>
        <span class="hidden dark:block">🌙</span>
    </button>
    <!-- Example usage of dark variant classes -->
    <!-- <h1 class="text-primary-600 dark:text-primary-300">Hello</h1> -->
</template>
```

## 12) Routing with nested project modules

```bash
npm i vue-router
```

Main router `src/router/index.js`:

```js
import { createRouter, createWebHistory } from "vue-router";
import ecRoutes from "@/projects/employeeCenter/router";
import caRoutes from "@/projects/correspondence/router";
import authRoutes from "@/projects/authentication/router";

export default createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/",
            name: "main",
            component: () => import("../layouts/mainLayout.vue"),
            children: [
                { path: "/ec", name: "Employee Center", children: ecRoutes },
                {
                    path: "/correspondence",
                    name: "Correspondance",
                    children: caRoutes,
                },
                { path: "/auth", name: "Authentication", children: authRoutes },
            ],
        },
    ],
});
```

Example child routers:

```js
// src/projects/employeeCenter/router.js
export default [{ path: 'employees', name: 'Employees', component: () => import('./pages/employeesPage.vue') }];

// src/projects/correspondence/router.js
export default [{ path: 'inbox/incoming', name: 'Incoming documents', component: () => import('./modules/inbox/inboxPage.vue') }];

// src/projects/authentication/router.js
export default [{ path: 'login', name: 'Login', component: () => import('./pages/loginPage.vue') }];
```

## 13) App entry, plugins, and icons

Enable core plugins in `src/main.js`:

```js
import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import router from "./router";
import i18n from "./i18n";
import App from "./App.vue";
import { importIcons } from "@/assets/icons/icons.js";

const app = createApp(App);
importIcons(app);
app.use(ToastService);
app.use(createPinia());
app.use(router);
app.use(PrimeVue, { unstyled: true });
app.use(i18n);
app.mount("#app");
```

## 14) ESLint (Vue plugin, flat config)

```bash
npm install --save-dev eslint eslint-plugin-vue
```

Use a flat config `eslint.config.js` similar to the repo, extending multiple Vue presets and adding rules (e.g., `vue/max-attributes-per-line`, `vue/attribute-hyphenation`, etc.).

## 15) Project structure (high-level)

```
src/
  assets/
    icons/
    main.css
  components/
  i18n/
  layouts/
  projects/
    authentication/
    correspondence/
    employeeCenter/
  router/
  stores/
  utilities/
  volt/
```

## 16) Scripts

-   `npm run dev`: start dev server
-   `npm run build`: production build
-   `npm run preview`: preview production build

## 17) Run the app

```bash
npm run dev
```

### Notes and tips

-   PrimeVue is configured in unstyled mode; styling comes from Tailwind + `tailwindcss-primeui` design tokens.
-   Toast messages are globally available via PrimeVue `ToastService` and custom wrappers under `src/volt`.
-   Auto-imports reduce boilerplate for common imports and local utilities/components.
-   i18n includes `en` and `ar` message catalogs; set `locale` accordingly.
