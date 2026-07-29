<template>
    <Teleport to="body">
        <!-- Backdrop -->
        <Transition name="backdrop-fade">
            <div v-if="modelValue" class="help-backdrop" @click="$emit('update:modelValue', false)" />
        </Transition>

        <!-- Drawer Panel -->
        <Transition name="drawer-slide">
            <div v-if="modelValue" class="help-drawer" role="dialog" :aria-label="`دليل استخدام ${pageTitle}`">

                <!-- Header -->
                <div class="help-header" :style="headerStyle">
                    <div class="help-header-content">
                        <div class="help-header-icon">
                            <component :is="pageIcon" :size="28" />
                        </div>
                        <div class="help-header-text">
                            <h2 class="help-title">{{ pageTitle }}</h2>
                            <p class="help-subtitle">{{ pageSubtitle }}</p>
                        </div>
                    </div>
                    <button class="help-close-btn" @click="$emit('update:modelValue', false)" aria-label="إغلاق">
                        <X :size="20" />
                    </button>
                </div>

                <!-- Body -->
                <div class="help-body">

                    <!-- Steps Sections -->
                    <div
                        v-for="(section, si) in sections"
                        :key="si"
                        class="help-section"
                    >
                        <div class="help-section-header">
                            <div class="help-section-icon" :style="{ background: section.color || 'var(--p-primary-100)', color: section.iconColor || 'var(--p-primary-600)' }">
                                <component :is="section.icon" :size="18" />
                            </div>
                            <h3 class="help-section-title">{{ section.title }}</h3>
                        </div>

                        <div class="help-steps">
                            <div
                                v-for="(step, idx) in section.steps"
                                :key="idx"
                                class="help-step"
                            >
                                <div class="help-step-num">{{ idx + 1 }}</div>
                                <div class="help-step-content">
                                    <p class="help-step-title">{{ step.title }}</p>
                                    <p v-if="step.desc" class="help-step-desc">{{ step.desc }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tips -->
                    <div v-if="tips && tips.length" class="help-tips-box">
                        <div class="help-tips-header">
                            <Lightbulb :size="18" />
                            <span>نصائح مفيدة</span>
                        </div>
                        <ul class="help-tips-list">
                            <li v-for="(tip, i) in tips" :key="i" class="help-tip-item">
                                <span class="tip-bullet">✦</span>
                                <span>{{ tip }}</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Shortcuts -->
                    <div v-if="shortcuts && shortcuts.length" class="help-shortcuts-box">
                        <div class="help-shortcuts-header">
                            <Keyboard :size="18" />
                            <span>اختصارات لوحة المفاتيح</span>
                        </div>
                        <div class="help-shortcuts-grid">
                            <div v-for="(sc, i) in shortcuts" :key="i" class="help-shortcut-item">
                                <kbd class="help-kbd">{{ sc.key }}</kbd>
                                <span class="help-shortcut-label">{{ sc.label }}</span>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Footer -->
                <div class="help-footer">
                    <button class="help-footer-btn" @click="$emit('update:modelValue', false)">
                        <Check :size="16" />
                        <span>فهمت، شكراً!</span>
                    </button>
                </div>

            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { X, Lightbulb, Keyboard, Check } from 'lucide-vue-next';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    pageTitle: { type: String, default: 'دليل الاستخدام' },
    pageSubtitle: { type: String, default: 'كل ما تحتاجه في مكان واحد' },
    pageIcon: { type: [Object, Function], default: null },
    headerGradient: { type: String, default: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    sections: { type: Array, default: () => [] },
    tips: { type: Array, default: () => [] },
    shortcuts: { type: Array, default: () => [] },
});

defineEmits(['update:modelValue']);

const headerStyle = {
    background: props.headerGradient,
};
</script>

<style scoped>
/* ── Backdrop ── */
.help-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
    z-index: 900;
}

/* ── Drawer ── */
.help-drawer {
    position: fixed;
    top: 0;
    inset-inline-end: 0;
    width: min(420px, 95vw);
    height: 100dvh;
    background: var(--p-surface-0);
    display: flex;
    flex-direction: column;
    z-index: 901;
    box-shadow: -4px 0 40px rgba(0, 0, 0, 0.18);
    border-inline-start: 1px solid var(--p-surface-200);
    border-radius: 1rem 0 0 1rem;
    overflow: hidden;
}

.dark .help-drawer {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
}

/* ── Header ── */
.help-header {
    position: relative;
    padding: 1.75rem 1.5rem 1.5rem;
    flex-shrink: 0;
}

.help-header-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.help-header-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.help-header-text {
    flex: 1;
}

.help-title {
    font-size: 1.2rem;
    font-weight: 800;
    color: white;
    margin: 0 0 0.25rem;
    letter-spacing: -0.3px;
}

.help-subtitle {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
}

.help-close-btn {
    position: absolute;
    top: 1rem;
    inset-inline-start: 1rem;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.help-close-btn:hover {
    background: rgba(255, 255, 255, 0.35);
}

/* ── Body ── */
.help-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.25rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    scrollbar-width: thin;
    scrollbar-color: var(--p-surface-300) transparent;
}

/* ── Section ── */
.help-section {
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
    border-radius: 1rem;
    padding: 1rem 1rem 1rem;
    transition: box-shadow 0.2s;
}

.help-section:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.dark .help-section {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
}

.help-section-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 0.875rem;
}

.help-section-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.help-section-title {
    font-size: 0.925rem;
    font-weight: 700;
    color: var(--p-surface-900);
    margin: 0;
}

.dark .help-section-title {
    color: var(--p-surface-100);
}

/* ── Steps ── */
.help-steps {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
}

.help-step {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
}

.help-step-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--p-primary-500);
    color: white;
    font-size: 0.75rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
}

.help-step-content {
    flex: 1;
    padding-top: 0.1rem;
}

.help-step-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--p-surface-800);
    margin: 0 0 0.15rem;
    line-height: 1.4;
}

.dark .help-step-title {
    color: var(--p-surface-200);
}

.help-step-desc {
    font-size: 0.77rem;
    color: var(--p-surface-500);
    margin: 0;
    line-height: 1.5;
}

.dark .help-step-desc {
    color: var(--p-surface-400);
}

/* ── Tips ── */
.help-tips-box {
    background: linear-gradient(135deg, #fef9c3, #fef08a20);
    border: 1px solid #fde047;
    border-radius: 1rem;
    padding: 1rem;
}

.dark .help-tips-box {
    background: linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(234, 179, 8, 0.05));
    border-color: rgba(234, 179, 8, 0.3);
}

.help-tips-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: #a16207;
    margin-bottom: 0.75rem;
}

.dark .help-tips-header {
    color: #fbbf24;
}

.help-tips-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.help-tip-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #78350f;
    line-height: 1.5;
}

.dark .help-tip-item {
    color: #fde68a;
}

.tip-bullet {
    color: #d97706;
    font-size: 0.65rem;
    margin-top: 0.22rem;
    flex-shrink: 0;
}

/* ── Shortcuts ── */
.help-shortcuts-box {
    background: var(--p-surface-50);
    border: 1px solid var(--p-surface-200);
    border-radius: 1rem;
    padding: 1rem;
}

.dark .help-shortcuts-box {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
}

.help-shortcuts-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-700);
    margin-bottom: 0.75rem;
}

.dark .help-shortcuts-header {
    color: var(--p-surface-300);
}

.help-shortcuts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
}

.help-shortcut-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.help-kbd {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.45rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-300);
    border-bottom-width: 2px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--p-surface-700);
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.dark .help-kbd {
    background: var(--p-surface-700);
    border-color: var(--p-surface-600);
    color: var(--p-surface-200);
}

.help-shortcut-label {
    font-size: 0.78rem;
    color: var(--p-surface-600);
}

.dark .help-shortcut-label {
    color: var(--p-surface-400);
}

/* ── Footer ── */
.help-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--p-surface-200);
    flex-shrink: 0;
}

.dark .help-footer {
    border-color: var(--p-surface-700);
}

.help-footer-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--p-primary-500);
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
}

.help-footer-btn:hover {
    background: var(--p-primary-600);
    transform: translateY(-1px);
}

.help-footer-btn:active {
    transform: translateY(0);
}

/* ── Transitions ── */
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
    transition: opacity 0.3s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
    opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
    transform: translateX(-100%);
    opacity: 0;
}

/* RTL: slide from right */
[dir="rtl"] .drawer-slide-enter-from,
[dir="rtl"] .drawer-slide-leave-to {
    transform: translateX(100%);
}
</style>
