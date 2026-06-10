import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import PrimeVue from "primevue/config";
import router from "./router";
import "./assets/main.css";
import ToastService from "primevue/toastservice";
import Tooltip from 'primevue/tooltip';
import { importIcons } from "@/assets/icons/icons.js";
import Column from "primevue/column";
import Tag from "primevue/tag";
import ProgressSpinner from "primevue/progressspinner";

// RTL setup
const savedLocale = localStorage.getItem("selectedLocale") || "ar";
document.documentElement.setAttribute("dir", savedLocale === "ar" ? "rtl" : "ltr");

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, { unstyled: true });
app.use(ToastService);

app.component("Column", Column);
app.component("Tag", Tag);
app.component("ProgressSpinner", ProgressSpinner);

app.directive("tooltip", Tooltip);

importIcons(app);

app.mount("#app");