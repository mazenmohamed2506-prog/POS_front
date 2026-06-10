<template>
    <div class="main-layout">
        <!-- Sidebar on the left -->
        <div class="sidebar-wrapper">
            <AppSidebar :isMobile="isMobile" />
        </div>
        
        <!-- Main content area with TopBar and router-view -->
        <div class="content-area">
            <TopBar :isMobile="isMobile" />
            <div class="content-scroll">
                <router-view />
            </div>
        </div>
    </div>
</template>

<script setup>
import { useWindowSize } from "@vueuse/core";
import TopBar from "./topBar.vue";
import AppSidebar from "./sidebar/AppSidebar.vue";
const { width: windowWidth } = useWindowSize();

const getOperatingSystem = () => {
    if (typeof window === 'undefined') return 'unknown';
    const userAgent = window.navigator.userAgent;
    if (/Win/i.test(userAgent)) return 'Windows';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/Mac/i.test(userAgent)) return 'MacOS';
    if (/Linux/i.test(userAgent)) return 'Linux';    
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    return 'Unknown';
};

const currentOS = getOperatingSystem();
const isMobile = computed(() => windowWidth.value <= 1024 || ['Android', 'iOS'].includes(currentOS));

</script>

<style scoped>
.main-layout {
    display: flex;
    flex-direction: row;
    height: 100vh;
    background-color: var(--p-surface-100);
}

.dark .main-layout {
    background-color: var(--p-surface-950);
}

.sidebar-wrapper {
    flex-shrink: 0;
    padding: 0;
}

@media screen and (max-width: 1024px) {
    .sidebar-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
        width: 0;
        height: 0;
        overflow: visible;
    }
}

.content-area {
    display: flex;
    flex-direction: column;
    gap: 0rem;
    flex: 1;
    min-width: 0;
}

.content-scroll {
    flex: 1;
    overflow: auto;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
}
</style>

