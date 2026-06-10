<template>
    <div class="topbar-container rounded-e-md border-s-1 border-surface-200 dark:border-surface-700 ps-0.5">
        <!-- Mobile Menu Button (only on small screens) -->
        <button
            class="mobile-menu-btn"
            :class="{ 'mobile-menu-btn-visible': isMobile }"
            @click="toggleSidebar"
            type="button"
            aria-label="Toggle sidebar"
        >
            <Menu :size="20" />
        </button>

        <!-- Breadcrumb Section -->
        <Breadcrumb  />

        <!-- Right Section -->
        <div class="right-section">
            <!-- Date Display
            <div v-if="isFullScreen" @click="navigateTo('/user/calendar')" class="date-display">
                <div class="icon-wrapper date-icon-wrapper">
                    <Calendar class="icon date-icon" />
                </div>
                <span class="date-text">{{ currentDate }}</span>
            </div> -->

            <!-- Time Display -->
            <!-- <div v-if="isFullScreen" :class="[
                'time-display',
                currentLocale === 'ar' ? 'time-display-ar' : 'time-display-en',
            ]">
                <div class="icon-wrapper">
                    <Clock class="icon" />
                </div>
                <span class="time-text">{{ currentTime }}</span>
            </div> -->
            <!-- Language Selector -->
            <ThemeSwitch />
            <!-- Notifications -->
            <!-- <NotificationMenu /> -->

            <!-- User Profile -->
            <div class="user-avatar" @click="toggleUserMenu">
                <img
                    v-if="userPhoto"
                    :src="userPhoto"
                    alt="User"
                    class="avatar-image cursor-pointer"
                />
                <div
                    v-else
                    class="avatar-image cursor-pointer flex items-center justify-center bg-primary-500 text-white font-bold text-sm"
                >
                    {{ userInitials }}
                </div>
            </div>
            <Popover ref="userMenuRef">
                <div class="flex flex-col gap-2 min-w-64">
                    <!-- User Photo & Name Header -->
                    <div class="flex items-center gap-3 px-3 py-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex-shrink-0">
                            <img
                                v-if="userPhoto"
                                :src="userPhoto"
                                alt="User"
                                class="w-10 h-10 rounded-full object-cover ring-2 ring-primary-300 dark:ring-primary-600"
                            />
                            <div
                                v-else
                                class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-primary-300 dark:ring-primary-600"
                            >
                                {{ userInitials }}
                            </div>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <p class="text-sm font-semibold text-surface-900 dark:text-white truncate">
                                {{ userFullName || "مستخدم" }}
                            </p>
                        </div>
                    </div>
                    
                    <!-- Logout -->
                    <div
                        @click="logout"
                        class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors text-red-600 dark:text-red-400"
                    >
                        <LogOut class="w-5 h-5" />
                        <span class="text-sm font-medium">
                            تسجيل الخروج
                        </span>
                    </div>
                </div>
            </Popover>

        </div>
    </div>
</template>

<script setup>
import ThemeSwitch from "../components/themeSwitch.vue";
import Breadcrumb from "../components/Breadcrumb.vue";
import Popover from "../volt/Popover.vue";
import { Calendar, Clock, Menu, UserCog, LogOut } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useSidebar } from "./sidebar/useSidebar";
import { useBaseStore } from "@/stores/base/baseStore";
import { useAuthStore } from "@/stores/base/authStore";
const props = defineProps({
    isMobile: {
        type: Boolean,
        default: false,
    },
});
const router = useRouter();
const { toggleMobile } = useSidebar();
const baseStore = useBaseStore();
const userMenuRef = ref(null);
const showRoleSelectPopup = ref(false);

// Get user full name – supports both API shapes
const userFullName = computed(() => {
    const u = baseStore.user;
    const authStore = useAuthStore();
    return u?.FULL_EMP_N || u?.fullName || authStore.userName || u?.name || null;
});

// Get user photo – prefer MinIO imagePath from SIS API, fallback to PROFILE_PIC from sec API
const userPhoto = computed(() => {
    const u = baseStore.user;
    const pic = u?.imagePath || u?.PROFILE_PIC;
    if (!pic) return null;
    // Already a data-URI or http URL
    if (pic.startsWith('data:') || pic.startsWith('http')) return pic;
    // Raw base64 – wrap it
    return `data:image/jpeg;base64,${pic}`;
});

// Initials fallback when no photo
const userInitials = computed(() => {
    const name = userFullName.value || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts[0]) return parts[0][0].toUpperCase();
    return 'U';
});

const toggleUserMenu = (event) => {
    if (userMenuRef.value) {
        userMenuRef.value.toggle(event, event.currentTarget);
    }
};

const switchRole = () => {
    if (userMenuRef.value?.hide) {
        userMenuRef.value.hide();
    }
    showRoleSelectPopup.value = true;
};

const logout = async () => {
    const authStore = useAuthStore();
    authStore.logout();
};

const navigateTo = (path) => {
    router.push(path);
};

const toggleSidebar = () => {
    toggleMobile();
};

const currentDate = ref("");
const currentTime = ref("");
const isFullScreen = ref(false); // New state for full screen
let timeInterval = null;

// Get current locale for date/time formatting

const updateDateTime = () => {
    const now = new Date();
    currentDate.value = formatDate(now, "dd MMM yyyy");
    // Updated format to show hours, minutes, and seconds (24h)
    currentTime.value = formatTime(now, "HH:mm:ss");
};

const checkFullScreen = () => {
    isFullScreen.value = !!document.fullscreenElement || (window.innerWidth === screen.width && window.innerHeight === screen.height);
};

onMounted(() => {
    updateDateTime();
    timeInterval = setInterval(updateDateTime, 1000);

    // Check initial state
    checkFullScreen();
    // Add event listener for full screen changes and window resizing (for F11)
    document.addEventListener("fullscreenchange", checkFullScreen);
    window.addEventListener("resize", checkFullScreen);
});

onUnmounted(() => {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    // Clean up event listener
    document.removeEventListener("fullscreenchange", checkFullScreen);
    window.removeEventListener("resize", checkFullScreen);
});
</script>

<style scoped>
.topbar-container {
    background-color: var(--p-surface-0);
    
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    padding: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

:deep(.dark) .topbar-container,
.dark .topbar-container {
    background-color: var(--p-surface-900);
}

/* Right Section */
.right-section {
    display: flex;
    align-items: center;
    gap: 1rem;
}

/* Date Display */
.date-display {
    display: flex;
    align-items: center;
    background-color: var(--p-surface-0);
    border-radius: 0.75rem;
    padding: 0.25rem;
    padding-inline-start: 0.25rem;
    padding-inline-end: 0.75rem;
    gap: 0.5rem;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
    cursor: pointer;
}

.dark .date-display {
    background-color: var(--p-surface-900);
    border-color: #4b5563;
}

.date-display:hover {
    border-color: #6b7280;
}

.dark .date-display:hover {
    border-color: #d1d5db;
}

/* Icon Wrapper */
.icon-wrapper {
    display: flex;
    align-items: center;
    background-color: var(--p-surface-100);
    border-radius: 0.5rem;
    padding: 0.5rem;
    gap: 0.5rem;
    transition: all 0.2s ease;
}

.dark .icon-wrapper {
    background-color: var(--p-surface-800);
}

.date-icon-wrapper {
    transition: all 0.2s ease;
}

.date-display:hover .date-icon-wrapper {
    background-color: var(--p-primary-800);
}

.dark .date-display:hover .date-icon-wrapper {
    background-color: var(--p-primary-50);
}

/* Icons */
.icon {
    height: 1rem;
    width: 1rem;
    color: #1f2937;
    transition: all 0.2s ease;
}

.dark .icon {
    color: var(--p-surface-200);
}

.date-display:hover .date-icon {
    color: var(--p-primary-50);
}

.dark .date-display:hover .date-icon {
    color: var(--p-primary-500);
}

/* Text Styles */
.date-text,
.time-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
}

.dark .date-text,
.dark .time-text {
    color: #ffffff;
}

/* Time Display */
.time-display {
    display: flex;
    align-items: center;
    background-color: var(--p-surface-0);
    border-radius: 0.75rem;
    padding: 0.25rem;
    padding-inline-start: 0.25rem;
    padding-inline-end: 0.75rem;
    gap: 0.5rem;
    border: 1px solid #e5e7eb;
    justify-content: space-between;
}

.dark .time-display {
    background-color: var(--p-surface-900);
    border-color: #4b5563;
}

.time-display-ar {
    width: 130px;
}

.time-display-en {
    width: 140px;
}

/* User Avatar */
.user-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    border: 2px solid #e5e7eb;
    overflow: hidden;
    transition: border-color 0.2s ease;
    margin-inline-end: 0.25rem;
}

.dark .user-avatar {
    border-color: #4b5563;
}

.user-avatar:hover {
    border-color: #d1d5db;
}

.dark .user-avatar:hover {
    border-color: #6b7280;
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Mobile Menu Button */
.mobile-menu-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--p-content-border-color);
    background-color: var(--p-surface-0);
    color: var(--p-text-color);
    cursor: pointer;
    transition: all 0.2s ease;
}

.dark .mobile-menu-btn {
    background-color: var(--p-surface-900);
    border-color: var(--p-content-border-color);
    color: var(--p-text-color);
}

.mobile-menu-btn:hover {
    background-color: var(--p-content-hover-background);
}

.mobile-menu-btn-visible {
    display: flex;
}
</style>
