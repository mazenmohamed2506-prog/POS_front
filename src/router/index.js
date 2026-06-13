import { createRouter, createWebHistory } from "vue-router";
import { usePosStore } from "@/stores/pos/posStore";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/login",
            name: "login",
            component: () => import("@/project/pos/LoginView.vue"),
        },
        // ── Full-screen POS (Cashier) ──
        {
            path: "/pos",
            component: () => import("@/layouts/posLayout.vue"),
            children: [
                {
                    path: "",
                    name: "POS",
                    component: () => import("@/project/pos/PosView.vue"),
                    meta: { roles: ["Manager", "Cashier"] },
                },
            ],
        },
        // ── Manager pages (with sidebar) ──
        {
            path: "/",
            name: "main",
            component: () => import("@/layouts/mainLayoutWithSidebar.vue"),
            children: [
                {
                    path: "",
                    name: "Landing",
                    redirect: () => {
                        const posStore = usePosStore();
                        return posStore.role === "Cashier" ? "/pos" : "/dashboard";
                    },
                },
                {
                    path: "dashboard",
                    name: "Dashboard",
                    component: () => import("@/project/pos/DashboardView.vue"),
                    meta: { roles: ["Manager"] },
                },
                {
                    path: "products",
                    name: "Products",
                    component: () => import("@/project/pos/ProductsView.vue"),
                    meta: { roles: ["Manager"] },
                },
                {
                    path: "inventory",
                    name: "Inventory",
                    component: () => import("@/project/pos/InventoryView.vue"),
                    meta: { roles: ["Manager"] },
                },
                {
                    path: "purchases",
                    name: "Purchases",
                    component: () => import("@/project/pos/PurchasesView.vue"),
                    meta: { roles: ["Manager"] },
                },
                {
                    path: "returns",
                    name: "Returns",
                    component: () => import("@/project/pos/ReturnsView.vue"),
                    meta: { roles: ["Manager"] },
                },
                {
                    path: "orders",
                    name: "Orders",
                    component: () => import("@/project/pos/OrdersView.vue"),
                    meta: { roles: ["Manager"] },
                },
                {
                    path: "shifts",
                    name: "Shifts",
                    component: () => import("@/project/pos/ShiftView.vue"),
                    meta: { roles: ["Manager", "Cashier"] },
                },
                {
                    path: "settings",
                    name: "Settings",
                    component: () => import("@/project/pos/SettingsView.vue"),
                    meta: { roles: ["Manager"] },
                },
                {
                    path: "users",
                    name: "Users",
                    component: () => import("@/project/pos/UsersView.vue"),
                    meta: { roles: ["Manager"] },
                },
                {
                    path: "pages",
                    name: "Pages",
                    component: () => import("@/project/pos/PagesView.vue"),
                    meta: { roles: ["Manager"] },
                },
            ],
        },
        // ── 404 ──
        {
            path: "/:pathMatch(.*)*",
            name: "NotFound",
            component: () => import("@/project/NotFound.vue"),
        },
    ],
});

// ── Navigation Guard ──
router.beforeEach(async (to, from, next) => {
    const posStore = usePosStore();
    const isAuthenticated = posStore.isAuthenticated;

    // Public routes
    if (to.name === "login" || to.name === "NotFound") {
        if (isAuthenticated && to.name === "login") {
            // Redirect logged-in users to their default page
            return next(posStore.role === "Cashier" ? "/pos" : "/dashboard");
        }
        return next();
    }

    // Require authentication
    if (!isAuthenticated) {
        return next({ name: "login" });
    }

    // Role-based access
    const allowedRoles = to.meta?.roles;
    if (allowedRoles && !allowedRoles.includes(posStore.role)) {
        // Cashier trying to access Manager page → redirect to POS
        if (posStore.role === "Cashier") {
            return next("/pos");
        }
        return next({ name: "NotFound" });
    }

    next();
});

export default router;
