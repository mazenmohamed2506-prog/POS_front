import { createRouter, createWebHashHistory } from "vue-router";
import { usePosStore } from "@/stores/pos/posStore";

const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
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
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "products",
                    name: "Products",
                    component: () => import("@/project/pos/ProductsView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "inventory",
                    name: "Inventory",
                    component: () => import("@/project/pos/InventoryView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "purchases",
                    name: "Purchases",
                    component: () => import("@/project/pos/PurchasesView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "suppliers",
                    name: "Suppliers",
                    component: () => import("@/project/pos/SuppliersView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "returns",
                    name: "Returns",
                    component: () => import("@/project/pos/ReturnsView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "orders",
                    name: "Orders",
                    component: () => import("@/project/pos/OrdersView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "shifts",
                    name: "AllShifts",
                    component: () => import("@/project/pos/AllShiftsView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "my-shift",
                    name: "MyShift",
                    component: () => import("@/project/pos/ShiftView.vue"),
                    meta: { roles: ["Manager", "Cashier", "Admin"] },
                },
                {
                    path: "settings",
                    name: "Settings",
                    component: () => import("@/project/pos/SettingsView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "users",
                    name: "Users",
                    component: () => import("@/project/pos/UsersView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "stock-count",
                    name: "StockCount",
                    component: () => import("@/project/pos/StockCountView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "damages",
                    name: "Damages",
                    component: () => import("@/project/pos/DamagesView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "receivables",
                    name: "Receivables",
                    component: () => import("@/project/pos/ReceivablesView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "expenses",
                    name: "Expenses",
                    component: () => import("@/project/pos/ExpensesView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "payroll",
                    name: "Payroll",
                    component: () => import("@/project/pos/PayrollView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
                },
                {
                    path: "reports",
                    name: "Reports",
                    component: () => import("@/project/pos/ReportsView.vue"),
                    meta: { roles: ["Manager", "Admin"] },
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
    const hasToken = !!localStorage.getItem("accessToken");
    const posStore = usePosStore();
    const isAuthenticated = posStore.isAuthenticated && hasToken;

    // Public routes
    if (to.name === "login" || to.name === "NotFound") {
        if (isAuthenticated && to.name === "login") {
            // Redirect logged-in users to their default page
            return next(posStore.role === "Cashier" ? "/pos" : "/dashboard");
        }
        return next();
    }

    // Require authentication
    if (!hasToken || !isAuthenticated) {
        return next({ name: "login" });
    }

    // Dynamic Role-based Page Access
    if (posStore.role !== "Admin") {
        const authorizedPages = posStore.pages || [];
        const isPublicPath = to.path === "/" || to.name === "login" || to.name === "NotFound";
        
        if (!isPublicPath) {
            let hasAccess = authorizedPages.includes(to.path);
            
            // Allow /my-shift if user has access to /shifts or /pos
            if (to.path === '/my-shift' || to.path === '/my-shift/') {
                hasAccess = authorizedPages.some(p => p.includes('/shifts') || p.includes('/pos'));
            }

            if (!hasAccess) {
                // Redirect to the first authorized page, or POS, or dashboard
                if (authorizedPages.length > 0) {
                    return next(authorizedPages[0]);
                }
                return next(posStore.role === "Cashier" ? "/pos" : "/dashboard");
            }
        }
    }

    next();
});

export default router;
