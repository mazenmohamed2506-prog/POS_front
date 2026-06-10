<template>
    <div class="pos-layout" :class="{ dark: isDark }">
        <!-- Minimal top bar -->
        <header class="pos-topbar">
            <div class="pos-topbar-start">
                <Store :size="22" class="text-primary-500" />
                <span class="pos-store-name">{{ posStore.settings.storeName }}</span>
            </div>
            <div class="pos-topbar-center">
                <span class="pos-clock">{{ currentTime }}</span>
            </div>
            <div class="pos-topbar-end">
                <ThemeSwitch />
                <div class="pos-user-info">
                    <User :size="18" />
                    <span>{{ posStore.user?.name }}</span>
                </div>
                <button class="pos-nav-btn" @click="$router.push('/shifts')" title="الورديات">
                    <Clock :size="18" />
                </button>
                <button class="pos-logout-btn" @click="posStore.logout()" title="تسجيل الخروج">
                    <LogOut :size="18" />
                </button>
            </div>
        </header>

        <!-- Main content -->
        <main class="pos-main">
            <router-view />
        </main>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useDark } from "@vueuse/core";
import { usePosStore } from "@/stores/pos/posStore";
import ThemeSwitch from "@/components/themeSwitch.vue";
import { Store, User, Clock, LogOut } from "lucide-vue-next";

const posStore = usePosStore();
const isDark = useDark();

const currentTime = ref("");
let timeInterval = null;

const updateTime = () => {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
};

onMounted(() => {
    updateTime();
    timeInterval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
    if (timeInterval) clearInterval(timeInterval);
});
</script>

<style scoped>
.pos-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--p-surface-100);
    overflow: hidden;
}

.dark .pos-layout {
    background-color: var(--p-surface-950);
}

/* ── Top Bar ── */
.pos-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: var(--p-surface-0);
    border-bottom: 1px solid var(--p-surface-200);
    flex-shrink: 0;
    gap: 1rem;
}

.dark .pos-topbar {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
}

.pos-topbar-start,
.pos-topbar-center,
.pos-topbar-end {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pos-store-name {
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--p-surface-900);
}

.dark .pos-store-name {
    color: var(--p-surface-0);
}

.pos-clock {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--p-surface-500);
    font-variant-numeric: tabular-nums;
}

.pos-user-info {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    color: var(--p-surface-600);
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    background: var(--p-surface-50);
}

.dark .pos-user-info {
    color: var(--p-surface-300);
    background: var(--p-surface-800);
}

.pos-nav-btn,
.pos-logout-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: 1px solid var(--p-surface-200);
    background: transparent;
    color: var(--p-surface-500);
    cursor: pointer;
    transition: all 0.15s;
}

.dark .pos-nav-btn,
.dark .pos-logout-btn {
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}

.pos-nav-btn:hover {
    background: var(--p-surface-100);
    color: var(--p-primary-500);
}

.dark .pos-nav-btn:hover {
    background: var(--p-surface-800);
}

.pos-logout-btn:hover {
    background: #fef2f2;
    color: #ef4444;
    border-color: #fecaca;
}

.dark .pos-logout-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
}

/* ── Main ── */
.pos-main {
    flex: 1;
    overflow: auto;
    padding: 0;
}
</style>
