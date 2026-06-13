import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { LayoutDashboard, Package, Warehouse, Receipt, ShoppingCart, RotateCcw, ClipboardList, Clock, Settings, Users, FileText } from "lucide-vue-next";

export const useBaseStore = defineStore("base", () => {
    // ── State ──
    const user = ref(null);
    const entityConfiguration = ref({
        dateFormat: "dd/MM/yyyy",
        timeFormat: "HH:mm:ss",
        numberFormat: "#,##0.00",
        numberAppearance: "native",
    });

    // ── Sidebar Menu Model ──
    const menuModel = ref([
        {
            nameAr: "عمليات البيع والمخازن",
            nameEn: "Sales & Inventory",
            items: [
                {
                    nameAr: "لوحة التحكم",
                    nameEn: "Dashboard",
                    icon: LayoutDashboard,
                    to: "/dashboard",
                },
                {
                    nameAr: "نقطة البيع",
                    nameEn: "POS",
                    icon: ShoppingCart,
                    to: "/pos",
                },
                {
                    nameAr: "المنتجات",
                    nameEn: "Products",
                    icon: Package,
                    to: "/products",
                },
                {
                    nameAr: "المخزون",
                    nameEn: "Inventory",
                    icon: Warehouse,
                    to: "/inventory",
                },
                {
                    nameAr: "المشتريات",
                    nameEn: "Purchases",
                    icon: Receipt,
                    to: "/purchases",
                },
                {
                    nameAr: "المرتجعات",
                    nameEn: "Returns",
                    icon: RotateCcw,
                    to: "/returns",
                },
                {
                    nameAr: "الطلبات",
                    nameEn: "Orders",
                    icon: ClipboardList,
                    to: "/orders",
                },
            ],
        },
        {
            nameAr: "الإدارة والنظام",
            nameEn: "Administration & System",
            items: [
                {
                    nameAr: "الورديات",
                    nameEn: "Shifts",
                    icon: Clock,
                    to: "/shifts",
                },
                {
                    nameAr: "المستخدمون",
                    nameEn: "Users",
                    icon: Users,
                    to: "/users",
                },
                {
                    nameAr: "الصلاحيات",
                    nameEn: "Pages",
                    icon: FileText,
                    to: "/pages",
                },
                {
                    nameAr: "الإعدادات",
                    nameEn: "Settings",
                    icon: Settings,
                    to: "/settings",
                },
            ],
        },
    ]);

    // ── Getters ──
    const getMenuModel = computed(() => menuModel.value);

    // ── Actions ──
    function init() {
        // Load saved user from localStorage on app start
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            try {
                user.value = JSON.parse(savedUser);
            } catch {
                user.value = null;
            }
        }
    }

    function setUser(userData) {
        user.value = userData;
        if (userData) {
            localStorage.setItem("user", JSON.stringify(userData));
        } else {
            localStorage.removeItem("user");
        }
    }

    function setMenuModel(model) {
        menuModel.value = model;
    }

    /**
     * Build breadcrumb trail by walking the menu model for the given path.
     * Returns an array of { name, path } from the matched item up to the root.
     */
    function getBreadcrumbs(path, locale = "ar") {
        const crumbs = [];

        function search(items, trail) {
            if (!items) return false;
            for (const item of items) {
                const name = locale === "ar" ? (item.nameAr || item.nameEn || item.label) : (item.nameEn || item.nameAr || item.label);
                const current = [...trail, { name, path: item.to || null }];

                if (item.to === path) {
                    crumbs.push(...current);
                    return true;
                }
                if (item.items && search(item.items, current)) {
                    return true;
                }
            }
            return false;
        }

        search(menuModel.value, []);
        return crumbs;
    }

    return {
        user,
        entityConfiguration,
        menuModel,
        getMenuModel,
        init,
        setUser,
        setMenuModel,
        getBreadcrumbs,
    };
});
