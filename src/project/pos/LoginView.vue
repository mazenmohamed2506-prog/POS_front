<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { usePosStore } from "@/stores/pos/posStore";
import { ShoppingBag, User, Lock, AlertCircle, Eye, EyeOff } from "lucide-vue-next";

const router = useRouter();
const posStore = usePosStore();

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const showPassword = ref(false);

const handleLogin = async () => {
    error.value = "";
    if (!username.value || !password.value) {
        error.value = "يرجى إدخال اسم المستخدم وكلمة المرور";
        return;
    }

    loading.value = true;
    try {
        const user = await posStore.login(username.value, password.value);
        // Redirect based on role
        if (user.role === "Cashier") {
            router.push("/pos");
        } else {
            router.push("/products");
        }
    } catch (err) {
        error.value = err.message || "فشل تسجيل الدخول";
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="login-page">
        <!-- ==================== LEFT HERO PANEL ==================== -->
        <div class="login-hero">
            <!-- Animated gradient mesh -->
            <div class="hero-gradient"></div>

            <!-- Floating particles -->
            <div class="hero-particles">
                <span v-for="i in 20" :key="i" class="particle" :style="{
                    '--x': Math.random() * 100 + '%',
                    '--y': Math.random() * 100 + '%',
                    '--size': (Math.random() * 4 + 2) + 'px',
                    '--duration': (Math.random() * 20 + 15) + 's',
                    '--delay': (Math.random() * -20) + 's',
                }"></span>
            </div>

            <!-- Grid pattern overlay -->
            <div class="hero-grid"></div>

            <!-- Hero content -->
            <div class="hero-content">
                <div class="hero-icon-wrap">
                    <div class="hero-icon-ring"></div>
                    <div class="hero-icon-bg">
                        <ShoppingBag :size="44" />
                    </div>
                </div>
                <h1 class="hero-title">نظام نقطة البيع</h1>
                <p class="hero-desc">إدارة ذكية · سرعة فائقة · تحكم كامل</p>

                <!-- Feature pills -->
                <div class="hero-features">
                    <div class="feature-pill">
                        <span class="pill-dot"></span>
                        <span>تقارير لحظية</span>
                    </div>
                    <div class="feature-pill">
                        <span class="pill-dot"></span>
                        <span>إدارة المخزون</span>
                    </div>
                    <div class="feature-pill">
                        <span class="pill-dot"></span>
                        <span>واجهة سهلة</span>
                    </div>
                </div>
            </div>

            <!-- Decorative rings -->
            <div class="hero-ring hero-ring-1"></div>
            <div class="hero-ring hero-ring-2"></div>
        </div>

        <!-- ==================== RIGHT FORM PANEL ==================== -->
        <div class="login-form-panel">
            <!-- Subtle background pattern -->
            <div class="form-panel-bg-dots"></div>

            <div class="login-card-wrapper">
                <!-- Mobile logo (hidden on desktop) -->
                <div class="mobile-logo">
                    <div class="mobile-logo-icon">
                        <ShoppingBag :size="28" />
                    </div>
                    <span class="mobile-logo-text">نظام نقطة البيع</span>
                </div>

                <!-- Greeting -->
                <div class="login-greeting">
                    <h2 class="greeting-title">مرحباً بعودتك 👋</h2>
                    <p class="greeting-sub">سجّل دخولك للمتابعة إلى لوحة التحكم</p>
                </div>

                <!-- Form -->
                <form @submit.prevent="handleLogin" class="login-form">
                    <!-- Username -->
                    <div class="form-group">
                        <label for="username" class="form-label">اسم المستخدم</label>
                        <div class="input-wrapper" :class="{ 'input-focus': false }">
                            <div class="input-icon-box">
                                <User :size="18" />
                            </div>
                            <InputText
                                id="username"
                                v-model="username"
                                placeholder="أدخل اسم المستخدم"
                                fluid
                                class="login-input"
                                @keydown.enter="$refs.passInput?.$el?.focus()"
                            />
                        </div>
                    </div>

                    <!-- Password -->
                    <div class="form-group">
                        <label for="password" class="form-label">كلمة المرور</label>
                        <div class="input-wrapper">
                            <div class="input-icon-box">
                                <Lock :size="18" />
                            </div>
                            <InputText
                                ref="passInput"
                                id="password"
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                placeholder="أدخل كلمة المرور"
                                fluid
                                class="login-input"
                            />
                            <button
                                type="button"
                                class="password-toggle"
                                @click="showPassword = !showPassword"
                                tabindex="-1"
                            >
                                <Eye v-if="!showPassword" :size="18" />
                                <EyeOff v-else :size="18" />
                            </button>
                        </div>
                    </div>

                    <!-- Error -->
                    <Transition name="shake-in">
                        <div v-if="error" class="login-error">
                            <AlertCircle :size="16" />
                            <span>{{ error }}</span>
                        </div>
                    </Transition>

                    <!-- Submit -->
                    <Button
                        type="submit"
                        :loading="loading"
                        class="login-submit-btn"
                    >
                        <template #default>
                            <span v-if="!loading" class="btn-content">
                                <Lock :size="18" />
                                <span>تسجيل الدخول</span>
                            </span>
                        </template>
                    </Button>
                </form>

                <!-- Footer -->
                <p class="login-footer">
                    محمي بتشفير آمن · جميع الحقوق محفوظة
                </p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* =========================================================
   VARIABLES
   ========================================================= */
:root {
    --login-accent: #6366f1;
    --login-accent-light: #818cf8;
    --login-accent-dark: #4f46e5;
}

/* =========================================================
   PAGE LAYOUT — split screen
   ========================================================= */
.login-page {
    display: flex;
    min-height: 100vh;
    direction: rtl;
    font-family: 'Segoe UI', 'Cairo', system-ui, sans-serif;
}

/* =========================================================
   LEFT HERO PANEL
   ========================================================= */
.login-hero {
    position: relative;
    flex: 0 0 48%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: linear-gradient(160deg, #4f46e5 0%, #6366f1 30%, #7c3aed 70%, #a855f7 100%);
}

.hero-gradient {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse 80% 80% at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 80% 80%, rgba(168,85,247,0.35) 0%, transparent 60%);
    animation: gradientShift 12s ease-in-out infinite alternate;
}

@keyframes gradientShift {
    0%   { opacity: 0.8; transform: scale(1)   rotate(0deg); }
    100% { opacity: 1;   transform: scale(1.1) rotate(3deg); }
}

/* Floating particles */
.hero-particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
}

.particle {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--size);
    height: var(--size);
    background: rgba(255, 255, 255, 0.35);
    border-radius: 50%;
    animation: float var(--duration) ease-in-out var(--delay) infinite;
}

@keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1);   opacity: 0.3; }
    25%      { transform: translate(30px, -50px) scale(1.4); opacity: 0.7; }
    50%      { transform: translate(-20px, -90px) scale(0.8); opacity: 0.4; }
    75%      { transform: translate(50px, -40px) scale(1.2); opacity: 0.6; }
}

/* Grid overlay */
.hero-grid {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
}

/* Hero content */
.hero-content {
    position: relative;
    z-index: 2;
    text-align: center;
    color: #fff;
    padding: 2rem;
}

.hero-icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
}

.hero-icon-ring {
    position: absolute;
    width: 110px;
    height: 110px;
    border: 2px solid rgba(255,255,255,0.15);
    border-radius: 50%;
    animation: pulseRing 3s ease-in-out infinite;
}

@keyframes pulseRing {
    0%, 100% { transform: scale(1);   opacity: 0.4; }
    50%      { transform: scale(1.25); opacity: 0; }
}

.hero-icon-bg {
    width: 88px;
    height: 88px;
    border-radius: 1.5rem;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    border: 1px solid rgba(255,255,255,0.2);
}

.hero-title {
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: -0.02em;
    margin: 0 0 0.75rem;
    text-shadow: 0 2px 20px rgba(0,0,0,0.15);
}

.hero-desc {
    font-size: 1.05rem;
    opacity: 0.85;
    margin: 0 0 2.5rem;
    letter-spacing: 0.08em;
}

/* Feature pills */
.hero-features {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
}

.feature-pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1.1rem;
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 100px;
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255,255,255,0.92);
    transition: background 0.3s, transform 0.3s;
}

.feature-pill:hover {
    background: rgba(255,255,255,0.2);
    transform: translateY(-2px);
}

.pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 8px rgba(52,211,153,0.6);
}

/* Decorative rings */
.hero-ring {
    position: absolute;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 50%;
    pointer-events: none;
}

.hero-ring-1 {
    width: 500px;
    height: 500px;
    top: -120px;
    right: -180px;
    animation: spinSlow 60s linear infinite;
}

.hero-ring-2 {
    width: 350px;
    height: 350px;
    bottom: -80px;
    left: -120px;
    animation: spinSlow 45s linear infinite reverse;
}

@keyframes spinSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}

/* =========================================================
   RIGHT FORM PANEL
   ========================================================= */
.login-form-panel {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 2rem;
    background: #fafbfc;
    overflow: hidden;
}

.dark .login-form-panel {
    background: #0c0f1a;
}

/* Subtle dot grid */
.form-panel-bg-dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
}

.dark .form-panel-bg-dots {
    background-image: radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px);
}

/* Card wrapper */
.login-card-wrapper {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
}

/* Mobile logo — visible only on small screens */
.mobile-logo {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
}

.mobile-logo-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.875rem;
    background: linear-gradient(135deg, #6366f1, #7c3aed);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 4px 16px rgba(99,102,241,0.3);
}

.mobile-logo-text {
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--p-surface-900);
}

.dark .mobile-logo-text {
    color: var(--p-surface-0);
}

/* Greeting */
.login-greeting {
    margin-bottom: 2rem;
}

.greeting-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0 0 0.5rem;
}

.dark .greeting-title {
    color: #f1f5f9;
}

.greeting-sub {
    font-size: 0.95rem;
    color: var(--p-surface-500);
    margin: 0;
    line-height: 1.6;
}

/* =========================================================
   FORM
   ========================================================= */
.login-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--p-surface-700);
    letter-spacing: 0.01em;
}

.dark .form-label {
    color: var(--p-surface-300);
}

/* Input wrapper */
.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: #fff;
    border: 1.5px solid var(--p-surface-200);
    border-radius: 0.875rem;
    transition: border-color 0.25s, box-shadow 0.25s;
    overflow: hidden;
}

.dark .input-wrapper {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.08);
}

.input-wrapper:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}

.dark .input-wrapper:focus-within {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(129,140,248,0.12);
}

.input-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    flex-shrink: 0;
    color: var(--p-surface-400);
    transition: color 0.25s;
}

.input-wrapper:focus-within .input-icon-box {
    color: #6366f1;
}

.dark .input-wrapper:focus-within .input-icon-box {
    color: #818cf8;
}

.login-input {
    flex: 1;
}

.input-wrapper :deep(input) {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
    padding: 0.8rem 0.75rem 0.8rem 0;
    font-size: 0.95rem;
    width: 100%;
}

.dark .input-wrapper :deep(input) {
    color: #f1f5f9;
}

/* Password toggle */
.password-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 100%;
    background: none;
    border: none;
    color: var(--p-surface-400);
    cursor: pointer;
    transition: color 0.2s;
    padding: 0;
}

.password-toggle:hover {
    color: #6366f1;
}

.dark .password-toggle:hover {
    color: #818cf8;
}

/* =========================================================
   ERROR MESSAGE
   ========================================================= */
.login-error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    background: linear-gradient(135deg, #fef2f2, #fff1f2);
    border: 1px solid #fecaca;
    border-radius: 0.75rem;
    color: #dc2626;
    font-size: 0.85rem;
    font-weight: 600;
}

.dark .login-error {
    background: rgba(239,68,68,0.08);
    border-color: rgba(239,68,68,0.2);
    color: #fca5a5;
}

/* =========================================================
   SUBMIT BUTTON
   ========================================================= */
.login-submit-btn {
    width: 100%;
    padding: 0.9rem 1.5rem !important;
    border-radius: 0.875rem !important;
    font-size: 1rem !important;
    font-weight: 700 !important;
    background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%) !important;
    border: none !important;
    color: #fff !important;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
}

.login-submit-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s;
}

.login-submit-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 30px rgba(99,102,241,0.45);
}

.login-submit-btn:hover::before {
    opacity: 1;
}

.login-submit-btn:active {
    transform: translateY(0) scale(0.98);
}

.btn-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

/* =========================================================
   FOOTER
   ========================================================= */
.login-footer {
    text-align: center;
    margin-top: 2.25rem;
    font-size: 0.78rem;
    color: var(--p-surface-400);
    letter-spacing: 0.02em;
}

/* =========================================================
   TRANSITIONS
   ========================================================= */
.shake-in-enter-active {
    animation: shakeIn 0.45s ease-out;
}

.shake-in-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}

.shake-in-enter-from,
.shake-in-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

@keyframes shakeIn {
    0%   { opacity: 0; transform: translateX(0); }
    20%  { opacity: 1; transform: translateX(-8px); }
    40%  { transform: translateX(6px); }
    60%  { transform: translateX(-4px); }
    80%  { transform: translateX(2px); }
    100% { transform: translateX(0); }
}

/* =========================================================
   RESPONSIVE
   ========================================================= */
@media (max-width: 900px) {
    .login-page {
        flex-direction: column;
    }

    .login-hero {
        flex: none;
        min-height: 0;
        padding: 0;
        display: none;
    }

    .login-form-panel {
        min-height: 100vh;
    }

    .mobile-logo {
        display: flex;
    }
}

@media (max-width: 480px) {
    .login-form-panel {
        padding: 1.25rem;
    }

    .greeting-title {
        font-size: 1.4rem;
    }

    .login-card-wrapper {
        max-width: 100%;
    }
}
</style>
