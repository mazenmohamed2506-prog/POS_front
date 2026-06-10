<script setup>
import { computed, reactive, watch } from "vue";
import { useDark } from "@vueuse/core";
import AppSubMenuSimple from "./AppSubMenuSimple.vue";
import { useBaseStore } from "@/stores/base/baseStore";
import { usePosStore } from "@/stores/pos/posStore";
import { useSidebar } from "./useSidebar";
import { Settings, ShoppingCart, X } from "lucide-vue-next";

// Use project's existing dark mode system
const props = defineProps({
    isMobile: {
        type: Boolean,
        default: false,
    },
});

// Get menu model from store and filter dynamically by user role
const baseStore = useBaseStore();
const posStore = usePosStore();

const model = computed(() => {
    const role = posStore.role; // "Manager" | "Cashier"
    return baseStore.menuModel.map((group) => {
        const filteredItems = group.items ? group.items.filter((item) => {
            // Cashier can only see POS and Shifts
            if (role === "Cashier") {
                return item.to === "/pos" || item.to === "/shifts";
            }
            // Manager can see everything
            return true;
        }) : [];

        return {
            ...group,
            items: filteredItems,
        };
    }).filter((group) => group.items.length > 0);
});

// Mobile sidebar state
const { sidebarState: mobileSidebarState, closeMobile } = useSidebar();

// Local sidebar state
const sidebarState = reactive({
    sidebarActive: false,
    anchored: typeof window !== 'undefined' ? localStorage.getItem('sidebarAnchored') === 'true' : false,
});

// Timers for hover intent
let expandTimeout = null;
let collapseTimeout = null;

// Check if we're on mobile using VueUse

function onMouseEnter() {
    // Only expand on hover if not mobile and not anchored
    if (!props.isMobile && !sidebarState.anchored) {
        // Cancel any pending collapse
        if (collapseTimeout) {
            clearTimeout(collapseTimeout);
            collapseTimeout = null;
        }
        
        // Add delay before expanding to prevent accidental triggering
        if (!sidebarState.sidebarActive) {
            expandTimeout = setTimeout(() => {
                sidebarState.sidebarActive = true;
            }, 300); // 300ms delay for intent detection
        }
    }
}

function onMouseLeave() {
    // Cancel pending expansion if mouse leaves quickly
    if (expandTimeout) {
        clearTimeout(expandTimeout);
        expandTimeout = null;
    }

    // Only collapse on mouse leave if not mobile and not anchored
    if (!props.isMobile && !sidebarState.anchored) {
        if (!collapseTimeout) {
            collapseTimeout = setTimeout(() => (sidebarState.sidebarActive = false), 300);
        }
    }
}

function onAnchorToggle() {
    sidebarState.anchored = !sidebarState.anchored;
    if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarAnchored', sidebarState.anchored);
    }
    // Try to ensure sidebar stays open if we just anchored it
    if (sidebarState.anchored) {
        sidebarState.sidebarActive = true; 
    }
}

// Computed for sidebar classes
const sidebarClass = computed(() => {
    const isExpanded = props.isMobile 
        ? mobileSidebarState.mobileOpen 
        : sidebarState.sidebarActive || sidebarState.anchored;
    
    return {
        "sidebar-expanded": isExpanded,
        "sidebar-anchored": sidebarState.anchored,
        "mobile-open": props.isMobile && mobileSidebarState.mobileOpen,
    };
});

// Auto-close mobile menu on desktop transition
watch(() => props.isMobile, (newValue) => {
    if (!newValue && mobileSidebarState.mobileOpen) {
        closeMobile();
    }
});


</script>

<template>
    <!-- Mobile Mask/Backdrop -->
    <div
        v-if="isMobile && mobileSidebarState.mobileOpen"
        class="sidebar-mask"
        @click="closeMobile"
        aria-hidden="true"
    ></div>
    
    <div 
        class="app-sidebar-container" 
        :class="{ 
            'is-mobile': isMobile,
            'mobile-open': isMobile && mobileSidebarState.mobileOpen 
        }"
    >
        <aside
            class="app-sidebar"
            :class="sidebarClass"
            @mouseenter="onMouseEnter"
            @mouseleave="onMouseLeave"
            aria-label="Main Sidebar"
            :aria-expanded="isMobile ? mobileSidebarState.mobileOpen : sidebarState.sidebarActive || sidebarState.anchored"
        >
            <!-- Header with Logo -->
            <div class="sidebar-header">
                <router-link to="/" class="app-logo" aria-label="Go to Homepage">
                    <!-- Full Logo (shown when expanded) -->
                    <ShoppingCart class="app-logo-normal"/>
                    <span class="app-logo-normal">نظام نقطة البيع</span>
                    <!-- Small Logo (shown when collapsed) -->
                    <ShoppingCart :size="40" class="app-logo-small"/>
                </router-link>

                <!-- Mobile Close Button -->
                <button
                    class="mobile-close-btn"
                    :class="{ 'mobile-close-btn-visible': isMobile }"
                    type="button"
                    @click="closeMobile"
                    title="Close sidebar"
                    aria-label="Close sidebar"
                >
                    <X :size="20" />
                </button>

                <!-- Anchor/Pin button (desktop only) -->
                <button
                    class="layout-sidebar-anchor"
                    :class="{ 'layout-sidebar-anchor-hidden': isMobile }"
                    type="button"
                    @click="onAnchorToggle"
                    :title="sidebarState.anchored ? 'Unpin sidebar' : 'Pin sidebar'"
                    :aria-label="sidebarState.anchored ? 'Unpin sidebar' : 'Pin sidebar'"
                    :aria-pressed="sidebarState.anchored"
                ></button>
            </div>
            <!-- Menu Container -->
            <nav class="layout-menu-container" aria-label="Main Navigation">
                <AppSubMenuSimple :model="model" />
            </nav>
        </aside>
    </div>
</template>

<style>
@import "@/assets/sidebar-component.css";
</style>

