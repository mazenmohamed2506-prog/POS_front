<script setup>
import { useRouter } from "vue-router";
const router = useRouter();

const goToLogin = () => {
    router.push({ name: "login" });
};
</script>

<template>
    <div class="not-found-container">
        <div class="content">
            <h1 class="error-code">404</h1>
            <h2 class="error-title">عفواً، هذه الصفحة غير موجودة</h2>
            <p class="error-desc">الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
            <button class="home-btn" @click="goToLogin">
                العودة لتسجيل الدخول
            </button>
        </div>
    </div>
</template>

<style scoped>
.not-found-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: var(--surface-b, #f8f9fa);
    font-family: 'Cairo', sans-serif;
    color: var(--text-color, #333);
}

.content {
    text-align: center;
    padding: 2rem;
    background: var(--surface-a, #fff);
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.error-code {
    font-size: 6rem;
    margin: 0;
    color: var(--primary-color, #0d6efd);
    font-weight: 800;
}

.error-title {
    font-size: 1.5rem;
    margin: 1rem 0;
    font-weight: 600;
}

.error-desc {
    color: var(--text-color-secondary, #6c757d);
    margin-bottom: 2rem;
}

.home-btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    background-color: var(--primary-color, #0d6efd);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
    font-weight: 600;
}

.home-btn:hover {
    background-color: var(--primary-color-hover, #0b5ed7);
}
</style>
