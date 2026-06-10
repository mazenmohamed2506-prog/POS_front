<script setup>
import { ref, watch, onBeforeMount, computed } from "vue";
import { useRoute } from "vue-router";
import { ChevronDown } from "lucide-vue-next";
const route = useRoute();

const props = defineProps({
    item: {
        type: Object,
        default: () => ({}),
    },
    index: {
        type: Number,
        default: 0,
    },
    root: {
        type: Boolean,
        default: true,
    },
    parentItemKey: {
        type: String,
        default: null,
    },
});

const isActiveMenu = ref(false);
const itemKey = ref(null);

onBeforeMount(() => {
    itemKey.value = props.parentItemKey
        ? props.parentItemKey + "-" + props.index
        : String(props.index);
    handleRouteChange(route.path);
});

watch(
    () => route.path,
    (newPath) => {
        handleRouteChange(newPath);
    }
);

function handleRouteChange(newPath) {
    if (props.item.to && props.item.to === newPath) {
        isActiveMenu.value = true;
    } else if (props.item.items) {
        // Check if any child matches the route
        isActiveMenu.value = hasActiveChild(props.item.items, newPath);
    } else {
        isActiveMenu.value = false;
    }
}

function hasActiveChild(items, path) {
    if (!items) return false;
    return items.some((item) => {
        if (item.to === path) return true;
        if (item.items) return hasActiveChild(item.items, path);
        return false;
    });
}

function itemClick(event, item) {
    if (item.disabled) {
        event.preventDefault();
        return;
    }

    if (item.command) {
        item.command({ originalEvent: event, item: item });
    }

    if (item.items) {
        isActiveMenu.value = !isActiveMenu.value;
    }
}

function checkActiveRoute(item) {
    return route.path === item.to;
}

// Get the display name based on current locale
const displayName = computed(() => {
    if (props.item.nameAr) {
        return props.item.nameAr;
    }
    return props.item.nameEn || props.item.label || "";
});
</script>

<template>
    <li
        :class="{
            'layout-root-menuitem': root,
            'active-menuitem': isActiveMenu,
        }"
    >
        <!-- Root menu item header -->
        <div v-if="root && item.visible !== false" class="layout-menuitem-root-text">
            <component 
                :is="item.icon" 
                v-if="item.icon" 
                :size="20" 
                class="layout-menuitem-root-icon"
            />
            <span>{{ displayName }}</span>
        </div>

        <!-- Menu item with submenu (anchor tag) -->
        <a
            v-if="(!item.to || item.items) && item.visible !== false"
            :href="item.url"
            @click="itemClick($event, item)"
            :class="item.class"
            :target="item.target"
            tabindex="0"
        >
            <component 
                :is="item.icon" 
                v-if="item.icon" 
                :size="20" 
                class="layout-menuitem-icon"
            />
            <span class="layout-menuitem-text">{{ displayName }}</span>
            <ChevronDown
                v-if="item.items"
                :size="16"
                class="layout-submenu-toggler"
            />
        </a>

        <!-- Menu item with route (router-link) -->
        <router-link
            v-if="item.to && !item.items && item.visible !== false"
            @click="itemClick($event, item)"
            :class="[item.class, { 'active-route': checkActiveRoute(item) }]"
            tabindex="0"
            :to="item.to"
        >
            <component 
                :is="item.icon" 
                v-if="item.icon" 
                :size="20" 
                class="layout-menuitem-icon"
            />
            <span class="layout-menuitem-text">{{ displayName }}</span>
            <ChevronDown
                v-if="item.items"
                :size="14"
                class="layout-submenu-toggler"
            />
        </router-link>

        <!-- Submenu items -->
        <ul v-if="item.items && item.visible !== false">
            <AppMenuItemSimple
                v-for="(child, i) in item.items"
                :key="child.nameEn"
                :index="i"
                :item="child"
                :parentItemKey="itemKey"
                :root="false"
            />
        </ul>
    </li>
</template>
