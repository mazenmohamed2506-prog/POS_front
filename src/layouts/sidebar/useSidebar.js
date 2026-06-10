import { reactive } from 'vue';

const sidebarState = reactive({
    mobileOpen: false,
});

export function useSidebar() {
    const toggleMobile = () => {
        sidebarState.mobileOpen = !sidebarState.mobileOpen;
    };

    const closeMobile = () => {
        sidebarState.mobileOpen = false;
    };

    const openMobile = () => {
        sidebarState.mobileOpen = true;
    };

    return {
        sidebarState,
        toggleMobile,
        closeMobile,
        openMobile,
    };
}

