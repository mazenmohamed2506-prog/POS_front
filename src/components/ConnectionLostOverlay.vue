<script setup>
/**
 * ConnectionLostOverlay — Global full-screen overlay that appears when
 * the backend API becomes unreachable. Monitors health via periodic
 * pings to /api/health and auto-dismisses when the connection is restored.
 */
import { ref, onMounted, onUnmounted } from 'vue';

const API_URL = import.meta.env.VITE_API_URL || '';
const HEALTH_ENDPOINT = `${API_URL.replace(/\/api\/?$/, '')}/api/health`;
const PING_INTERVAL_MS = 15000;   // Check every 15 seconds
const FAIL_THRESHOLD = 3;          // Show overlay after 3 consecutive failures
const RETRY_INTERVAL_MS = 3000;    // When overlay is shown, retry every 3 seconds

const isDisconnected = ref(false);
const isRetrying = ref(false);
const failCount = ref(0);

let healthTimer = null;
let retryTimer = null;

async function pingHealth() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(HEALTH_ENDPOINT, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store'
        });
        clearTimeout(timeout);

        if (res.ok) {
            onConnectionRestored();
            return true;
        }
    } catch {
        // Connection failed
    }

    failCount.value++;
    if (failCount.value >= FAIL_THRESHOLD && !isDisconnected.value) {
        onConnectionLost();
    }
    return false;
}

function onConnectionLost() {
    isDisconnected.value = true;
    // Switch to faster retry interval while overlay is shown
    stopHealthTimer();
    startRetryTimer();
}

function onConnectionRestored() {
    failCount.value = 0;
    if (isDisconnected.value) {
        isDisconnected.value = false;
        isRetrying.value = false;
        stopRetryTimer();
        startHealthTimer();
    }
}

function startHealthTimer() {
    stopHealthTimer();
    healthTimer = setInterval(pingHealth, PING_INTERVAL_MS);
}

function stopHealthTimer() {
    if (healthTimer) {
        clearInterval(healthTimer);
        healthTimer = null;
    }
}

function startRetryTimer() {
    stopRetryTimer();
    retryTimer = setInterval(pingHealth, RETRY_INTERVAL_MS);
}

function stopRetryTimer() {
    if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
    }
}

async function handleManualRetry() {
    isRetrying.value = true;
    const success = await pingHealth();
    if (!success) {
        // Keep isRetrying true briefly for UX feedback, then reset
        setTimeout(() => {
            isRetrying.value = false;
        }, 1500);
    }
}

onMounted(() => {
    // Start monitoring after a short initial delay (let the app settle)
    setTimeout(() => {
        startHealthTimer();
    }, 5000);
});

onUnmounted(() => {
    stopHealthTimer();
    stopRetryTimer();
});
</script>

<template>
    <Teleport to="body">
        <Transition name="overlay-fade">
            <div v-if="isDisconnected" class="connection-overlay" id="connection-lost-overlay">
                <div class="connection-overlay__backdrop" />
                <div class="connection-overlay__card">
                    <!-- Animated disconnection icon -->
                    <div class="connection-overlay__icon-ring">
                        <svg class="connection-overlay__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                            <line x1="12" y1="20" x2="12.01" y2="20" />
                        </svg>
                    </div>

                    <h2 class="connection-overlay__title">فقد الاتصال بالخادم</h2>
                    <p class="connection-overlay__message">
                        تعذر الوصول للخادم المحلي. يقوم النظام بمحاولة إعادة الاتصال تلقائياً...
                    </p>

                    <!-- Auto-retry spinner -->
                    <div class="connection-overlay__auto-retry">
                        <div class="connection-overlay__spinner" />
                        <span>جاري إعادة الاتصال...</span>
                    </div>

                    <!-- Manual retry button -->
                    <button class="connection-overlay__retry-btn" :disabled="isRetrying" @click="handleManualRetry"
                        id="connection-retry-btn">
                        <template v-if="isRetrying">
                            <div class="connection-overlay__btn-spinner" />
                            جاري المحاولة...
                        </template>
                        <template v-else>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            إعادة المحاولة يدوياً
                        </template>
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/* ─── Overlay transition ─── */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
    transition: opacity 0.35s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
    opacity: 0;
}

/* ─── Full-screen overlay ─── */
.connection-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.connection-overlay__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

/* ─── Card ─── */
.connection-overlay__card {
    position: relative;
    z-index: 1;
    background: linear-gradient(145deg, #1e293b, #0f172a);
    border: 1px solid rgba(99, 102, 241, 0.15);
    border-radius: 20px;
    padding: 40px 48px;
    text-align: center;
    max-width: 400px;
    width: 90%;
    box-shadow:
        0 25px 50px rgba(0, 0, 0, 0.4),
        0 0 60px rgba(99, 102, 241, 0.06);
    animation: cardPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardPop {
    from {
        opacity: 0;
        transform: scale(0.92) translateY(12px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

/* ─── Icon ─── */
.connection-overlay__icon-ring {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.1);
    border: 2px solid rgba(239, 68, 68, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    animation: iconPulse 2s ease-in-out infinite;
}

@keyframes iconPulse {

    0%,
    100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.15);
    }

    50% {
        box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
    }
}

.connection-overlay__icon {
    width: 32px;
    height: 32px;
    color: #f87171;
}

/* ─── Text ─── */
.connection-overlay__title {
    font-size: 20px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 10px;
}

.connection-overlay__message {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.7;
    margin-bottom: 24px;
}

/* ─── Auto-retry indicator ─── */
.connection-overlay__auto-retry {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #64748b;
    font-size: 13px;
    margin-bottom: 20px;
}

.connection-overlay__spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(99, 102, 241, 0.2);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* ─── Retry button ─── */
.connection-overlay__retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff;
    border: none;
    padding: 10px 28px;
    border-radius: 12px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.connection-overlay__retry-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
}

.connection-overlay__retry-btn:active:not(:disabled) {
    transform: translateY(0);
}

.connection-overlay__retry-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.connection-overlay__btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}
</style>
