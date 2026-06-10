<template>
    <div class="login-layout-root">
        <!-- Animated ambient blobs -->
        <div class="blob blob-2" aria-hidden="true"></div>
        <div class="blob blob-3" aria-hidden="true"></div>
        <!-- Noise/grain overlay -->
        <div class="grain-overlay" aria-hidden="true"></div>
        <router-view />
    </div>
</template>

<script setup></script>

<style scoped>
.login-layout-root {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: #f0f4ff;
}

:global(.dark) .login-layout-root {
    background: #0f172a;
}

/* ── Ambient blobs ── */
.blob {
    position: absolute;
    border-radius: 9999px;
    filter: blur(80px);
    pointer-events: none;
    opacity: 0.45;
    animation: drift 18s ease-in-out infinite;
}

:global(.dark) .blob {
    opacity: 0.28;
}

.blob-2 {
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, #c7d2fe 0%, #818cf8 60%, transparent 100%);
    bottom: -120px;
    right: -100px;
    animation-duration: 24s;
    animation-delay: -6s;
}

.blob-3 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, #bae6fd 0%, #38bdf8 60%, transparent 100%);
    bottom: 20%;
    left: 30%;
    animation-duration: 16s;
    animation-delay: -10s;
    opacity: 0.25;
}

@keyframes drift {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(40px, -30px) scale(1.06); }
    66%       { transform: translate(-25px, 20px) scale(0.95); }
}

/* ── Grain overlay ── */
.grain-overlay {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    background-size: 160px 160px;
    opacity: 0.5;
    pointer-events: none;
}
</style>
