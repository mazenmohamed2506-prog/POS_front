<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { usePosStore } from "@/stores/pos/posStore";
import { ShoppingBag, User, Lock, AlertCircle } from "lucide-vue-next";

const router = useRouter();
const posStore = usePosStore();

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

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
        <!-- Background decoration -->
        <div class="login-bg-blob login-bg-blob-1"></div>
        <div class="login-bg-blob login-bg-blob-2"></div>

        <div class="login-card">
            <!-- Logo -->
            <div class="login-logo">
                <div class="login-logo-icon">
                    <ShoppingBag :size="32" />
                </div>
                <h1 class="login-title">نظام نقطة البيع</h1>
                <p class="login-subtitle">سجّل دخولك للمتابعة والعمل</p>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleLogin" class="login-form">
                <div class="form-field">
                    <label for="username">اسم المستخدم</label>
                    <div class="input-with-icon">
                        <User :size="18" class="field-icon" />
                        <InputText
                            id="username"
                            v-model="username"
                            placeholder="أدخل اسم المستخدم"
                            fluid
                            @keydown.enter="$refs.passInput?.$el?.focus()"
                        />
                    </div>
                </div>

                <div class="form-field">
                    <label for="password">كلمة المرور</label>
                    <div class="input-with-icon">
                        <Lock :size="18" class="field-icon" />
                        <InputText
                            ref="passInput"
                            id="password"
                            v-model="password"
                            type="password"
                            placeholder="أدخل كلمة المرور"
                            fluid
                        />
                    </div>
                </div>

                <Transition name="slide-fade">
                    <p v-if="error" class="login-error flex items-center justify-center gap-1.5">
                        <AlertCircle :size="14" />
                        <span>{{ error }}</span>
                    </p>
                </Transition>

                <Button
                    type="submit"
                    :label="loading ? '' : 'تسجيل الدخول'"
                    :loading="loading"
                    class="w-full login-submit-btn"
                />
            </form>
        </div>
    </div>
</template>

<style scoped>
.login-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%);
    position: relative;
    overflow: hidden;
}

.dark .login-page {
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
}

.login-bg-blob {
    position: absolute;
    border-radius: 9999px;
    filter: blur(90px);
    pointer-events: none;
    opacity: 0.35;
    animation: drift 20s ease-in-out infinite;
}

.login-bg-blob-1 {
    width: 450px;
    height: 450px;
    background: radial-gradient(circle, #818cf8 0%, #6366f1 60%, transparent 100%);
    top: -100px;
    left: -100px;
}

.login-bg-blob-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, #38bdf8 0%, #0284c7 60%, transparent 100%);
    bottom: -80px;
    right: -80px;
    animation-delay: -10s;
}

@keyframes drift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(40px, -30px) scale(1.08); }
    66%       { transform: translate(-30px, 20px) scale(0.95); }
}

.login-card {
    width: 100%;
    max-width: 420px;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 1.5rem;
    padding: 2.75rem 2.25rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    z-index: 1;
}

.dark .login-card {
    background: rgba(15, 23, 42, 0.65);
    border-color: rgba(255, 255, 255, 0.06);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
}

.login-logo {
    text-align: center;
    margin-bottom: 2rem;
}

.login-logo-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 1.25rem;
    background: var(--p-primary-50);
    color: var(--p-primary-500);
    margin-bottom: 1rem;
    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(99, 102, 241, 0.06);
}

.dark .login-logo-icon {
    background: color-mix(in srgb, var(--p-primary-500), transparent 85%);
    box-shadow: none;
}

.login-title {
    font-size: 1.625rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0 0 0.375rem;
}

.dark .login-title {
    color: var(--p-surface-0);
}

.login-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.form-field label {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--p-surface-700);
}

.dark .form-field label {
    color: var(--p-surface-200);
}

.input-with-icon {
    position: relative;
}

.field-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--p-surface-450);
    z-index: 1;
    pointer-events: none;
}

.input-with-icon :deep(input) {
    padding-right: 2.5rem;
}

.login-error {
    font-size: 0.8125rem;
    color: #ef4444;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin: 0;
    text-align: center;
}

.dark .login-error {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
}

.login-submit-btn {
    transition: transform 0.15s;
}

.login-submit-btn:hover {
    transform: scale(1.02);
}

.login-submit-btn:active {
    transform: scale(0.98);
}

/* slide-fade transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.3s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateY(-10px);
    opacity: 0;
}
</style>
