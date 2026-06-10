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
                <p class="login-subtitle">سجّل دخولك للمتابعة</p>
            </div>

            <!-- Demo credentials hint -->
            <div class="login-hint">
                <AlertCircle :size="14" />
                <span>
                    مدير: <strong>manager</strong> / كاشير: <strong>cashier</strong> — كلمة المرور: <strong>1234</strong>
                </span>
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

                <p v-if="error" class="login-error">{{ error }}</p>

                <Button
                    type="submit"
                    :label="loading ? '' : 'تسجيل الدخول'"
                    :loading="loading"
                    class="w-full"
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
    background: linear-gradient(135deg, #eff6ff 0%, #f0f4ff 50%, #eef2ff 100%);
    position: relative;
    overflow: hidden;
}

.dark .login-page {
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
}

.login-bg-blob {
    position: absolute;
    border-radius: 9999px;
    filter: blur(80px);
    pointer-events: none;
    opacity: 0.4;
    animation: drift 18s ease-in-out infinite;
}

.login-bg-blob-1 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, #c7d2fe 0%, #818cf8 60%, transparent 100%);
    top: -100px;
    left: -100px;
}

.login-bg-blob-2 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, #bae6fd 0%, #38bdf8 60%, transparent 100%);
    bottom: -80px;
    right: -80px;
    animation-delay: -8s;
}

@keyframes drift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(30px, -20px) scale(1.05); }
    66%       { transform: translate(-20px, 15px) scale(0.96); }
}

.login-card {
    width: 100%;
    max-width: 420px;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-200);
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    z-index: 1;
}

.dark .login-card {
    background: var(--p-surface-900);
    border-color: var(--p-surface-700);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.login-logo {
    text-align: center;
    margin-bottom: 1.5rem;
}

.login-logo-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 1rem;
    background: var(--p-primary-50);
    color: var(--p-primary-500);
    margin-bottom: 1rem;
}

.dark .login-logo-icon {
    background: color-mix(in srgb, var(--p-primary-500), transparent 84%);
}

.login-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--p-surface-900);
    margin: 0 0 0.25rem;
}

.dark .login-title {
    color: var(--p-surface-0);
}

.login-subtitle {
    font-size: 0.875rem;
    color: var(--p-surface-500);
    margin: 0;
}

.login-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--p-primary-600);
    background: var(--p-primary-50);
    border: 1px solid color-mix(in srgb, var(--p-primary-500), transparent 80%);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 1.5rem;
}

.dark .login-hint {
    background: color-mix(in srgb, var(--p-primary-500), transparent 90%);
    border-color: color-mix(in srgb, var(--p-primary-500), transparent 70%);
    color: var(--p-primary-300);
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
    font-weight: 600;
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
    color: var(--p-surface-400);
    z-index: 1;
    pointer-events: none;
}

.input-with-icon :deep(input) {
    padding-right: 2.5rem;
}

.login-error {
    font-size: 0.8125rem;
    color: #ef4444;
    margin: 0;
    text-align: center;
}
</style>
