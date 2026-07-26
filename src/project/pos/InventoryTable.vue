<script setup>
import { ref, computed, watch } from 'vue';
import { ArrowRightLeft, ChevronDown, Layers, MapPin, Calendar, Hash, TrendingDown, AlertTriangle, ShieldCheck, Clock, PackageX, Package } from 'lucide-vue-next';

const props = defineProps({
    items: {
        type: Array,
        required: true,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    activeFilter: {
        type: String,
        default: "all"
    }
});

const emit = defineEmits(['transfer']);

const expandedProducts = ref(new Set());
const expandedBatches = ref(new Set());

const toggleProduct = (id) => {
    if (expandedProducts.value.has(id)) {
        expandedProducts.value.delete(id);
    } else {
        expandedProducts.value.add(id);
    }
    // Force reactivity
    expandedProducts.value = new Set(expandedProducts.value);
};

const toggleBatch = (id) => {
    if (expandedBatches.value.has(id)) {
        expandedBatches.value.delete(id);
    } else {
        expandedBatches.value.add(id);
    }
    expandedBatches.value = new Set(expandedBatches.value);
};

// Group data by Product -> Batch -> Location
const groupedInventory = computed(() => {
    const groups = {};
    props.items.forEach(item => {
        const key = item.productId;
        if (!groups[key]) {
            groups[key] = {
                id: key,
                productId: item.productId,
                productName: item.productName,
                isActive: item.isActive ?? true,
                totalQuantity: 0,
                status: 'healthy',
                batches: []
            };
        }
        groups[key].totalQuantity += item.quantity;

        // Find or create batch group
        let batch = groups[key].batches.find(b => b.batchNumber === item.batchNumber);
        if (!batch) {
            batch = {
                id: `${item.productId}_${item.batchNumber}`,
                batchNumber: item.batchNumber,
                expirationDate: item.expirationDate,
                costPrice: item.costPrice,
                sellingPrice: item.sellingPrice,
                quantity: 0,
                locations: []
            };
            groups[key].batches.push(batch);
        }
        batch.quantity += item.quantity;
        batch.locations.push(item);
    });

    // Compute status for each product based on its batches
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Object.values(groups).map(group => {
        let hasExpired = false;
        let hasExpiringSoon = false;
        
        group.batches.forEach(b => {
            if (b.expirationDate && b.quantity > 0) {
                const expDate = new Date(b.expirationDate);
                const timeDiff = expDate.getTime() - today.getTime();
                const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
                if (days < 0) hasExpired = true;
                else if (days <= 30) hasExpiringSoon = true;
            }
        });

        if (group.totalQuantity === 0) group.status = 'outOfStock';
        else if (hasExpired) group.status = 'expired';
        else if (hasExpiringSoon) group.status = 'expiringSoon';
        else if (group.totalQuantity <= 5) group.status = 'lowStock';
        else group.status = 'healthy';

        return group;
    });
});

// Filter grouped inventory based on active filter button
const filteredGroupedInventory = computed(() => {
    let result = groupedInventory.value;
    const filter = props.activeFilter;
    if (!filter || filter === 'all') return result;

    if (filter === 'healthy') {
        return result.filter(g => g.status === 'healthy');
    }
    if (filter === 'low') {
        return result.filter(g => g.status === 'lowStock');
    }
    if (filter === 'out') {
        return result.filter(g => g.status === 'outOfStock');
    }
    if (filter === 'expiry') {
        return result.filter(g => g.status === 'expired' || g.status === 'expiringSoon');
    }
    return result;
});

// Pagination
const currentPage = ref(1);
const rowsPerPage = ref(10);

watch(() => [props.activeFilter, props.items], () => {
    currentPage.value = 1;
});

const totalPages = computed(() => Math.ceil(filteredGroupedInventory.value.length / rowsPerPage.value) || 1);
const paginatedInventory = computed(() => {
    const start = (currentPage.value - 1) * rowsPerPage.value;
    return filteredGroupedInventory.value.slice(start, start + rowsPerPage.value);
});

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

const getStatusConfig = (status) => {
    const configs = {
        outOfStock: { label: 'نفذ المخزون', class: 'status-danger', icon: PackageX },
        lowStock: { label: 'مخزون منخفض', class: 'status-warning', icon: TrendingDown },
        expired: { label: 'دفعة منتهية', class: 'status-danger', icon: AlertTriangle },
        expiringSoon: { label: 'تنتهي قريباً', class: 'status-amber', icon: Clock },
        healthy: { label: 'متوفر', class: 'status-success', icon: ShieldCheck },
    };
    return configs[status] || configs.healthy;
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-EG");
};

const getBatchExpiryInfo = (batch) => {
    if (!batch.expirationDate || batch.quantity <= 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(batch.expirationDate);
    const timeDiff = expDate.getTime() - today.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (days < 0) return { label: 'منتهي', class: 'expiry-expired', days: Math.abs(days) };
    if (days <= 7) return { label: `${days} أيام`, class: 'expiry-critical', days };
    if (days <= 30) return { label: `${days} يوم`, class: 'expiry-warning', days };
    return { label: `${days} يوم`, class: 'expiry-safe', days };
};

const getStockPercentage = (quantity) => {
    const maxStock = 50; // Visual cap for the bar
    return Math.min((quantity / maxStock) * 100, 100);
};

const getStockBarClass = (quantity) => {
    if (quantity <= 0) return 'bar-empty';
    if (quantity <= 5) return 'bar-low';
    if (quantity <= 15) return 'bar-medium';
    return 'bar-healthy';
};
</script>

<template>
    <div class="inv-table-wrap">
        <!-- Loading Skeleton -->
        <div v-if="loading" class="inv-loading">
            <div v-for="i in 4" :key="i" class="skeleton-row">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-lines">
                    <div class="skeleton-line w-40"></div>
                    <div class="skeleton-line w-24"></div>
                </div>
                <div class="skeleton-bar"></div>
                <div class="skeleton-badge"></div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredGroupedInventory.length === 0" class="inv-empty">
            <Package :size="48" class="inv-empty-icon" />
            <p class="inv-empty-title">لا توجد بيانات مخزون</p>
            <p class="inv-empty-sub">لا توجد منتجات تطابق الفلتر المحدد</p>
        </div>

        <!-- Product Rows -->
        <template v-else>
            <div class="inv-list">
                <div
                    v-for="product in paginatedInventory"
                    :key="product.id"
                    class="inv-product"
                    :class="{ 'is-expanded': expandedProducts.has(product.id) }"
                >
                    <!-- Product Master Row -->
                    <div class="inv-product-row" @click="toggleProduct(product.id)">
                        <div class="inv-product-main">
                            <div class="inv-expand-trigger" :class="{ rotated: expandedProducts.has(product.id) }">
                                <ChevronDown :size="18" />
                            </div>
                            <div class="inv-product-info">
                                <div class="inv-product-name-row">
                                    <span class="inv-product-name">{{ product.productName }}</span>
                                    <span v-if="!product.isActive" class="inv-inactive-badge">غير نشط</span>
                                </div>
                                <span class="inv-product-meta">
                                    <Layers :size="13" />
                                    {{ product.batches.length }} {{ product.batches.length === 1 ? 'دفعة' : 'دفعات' }}
                                </span>
                            </div>
                        </div>

                        <div class="inv-product-stats">
                            <!-- Stock Bar -->
                            <div class="inv-stock-col">
                                <div class="inv-stock-header">
                                    <span class="inv-stock-qty">{{ product.totalQuantity }}</span>
                                    <span class="inv-stock-unit">وحدة</span>
                                </div>
                                <div class="inv-stock-bar">
                                    <div
                                        class="inv-stock-bar-fill"
                                        :class="getStockBarClass(product.totalQuantity)"
                                        :style="{ width: getStockPercentage(product.totalQuantity) + '%' }"
                                    ></div>
                                </div>
                            </div>

                            <!-- Status Badge -->
                            <div class="inv-status-badge" :class="getStatusConfig(product.status).class">
                                <component :is="getStatusConfig(product.status).icon" :size="14" />
                                <span>{{ getStatusConfig(product.status).label }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Expanded: Batch Details -->
                    <Transition name="expand">
                        <div v-if="expandedProducts.has(product.id)" class="inv-batches-panel">
                            <div class="inv-batches-header">
                                <Layers :size="16" />
                                <span>تفاصيل الدفعات</span>
                            </div>

                            <div class="inv-batches-grid">
                                <div
                                    v-for="batch in product.batches"
                                    :key="batch.id"
                                    class="inv-batch-card"
                                    :class="{ 'batch-expanded': expandedBatches.has(batch.id) }"
                                >
                                    <div class="inv-batch-top" @click.stop="toggleBatch(batch.id)">
                                        <div class="inv-batch-main-info">
                                            <div class="inv-batch-number">
                                                <Hash :size="14" class="inv-batch-hash" />
                                                <span>{{ batch.batchNumber || '—' }}</span>
                                            </div>
                                            <div class="inv-batch-details">
                                                <div class="inv-batch-detail">
                                                    <span class="detail-label">الكمية</span>
                                                    <span class="detail-value qty">{{ batch.quantity }} وحدة</span>
                                                </div>
                                                <div class="inv-batch-detail" v-if="batch.costPrice">
                                                    <span class="detail-label">التكلفة</span>
                                                    <span class="detail-value">{{ batch.costPrice?.toFixed(2) }} EGP</span>
                                                </div>
                                                <div class="inv-batch-detail" v-if="batch.sellingPrice">
                                                    <span class="detail-label">البيع</span>
                                                    <span class="detail-value">{{ batch.sellingPrice?.toFixed(2) }} EGP</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="inv-batch-side">
                                            <!-- Expiry indicator -->
                                            <div v-if="batch.expirationDate" class="inv-expiry-chip" :class="getBatchExpiryInfo(batch)?.class">
                                                <Calendar :size="13" />
                                                <span>{{ formatDate(batch.expirationDate) }}</span>
                                                <span v-if="getBatchExpiryInfo(batch)" class="expiry-countdown">
                                                    {{ getBatchExpiryInfo(batch).label }}
                                                </span>
                                            </div>
                                            <div v-else class="inv-expiry-chip expiry-none">
                                                <Calendar :size="13" />
                                                <span>بدون صلاحية</span>
                                            </div>

                                            <!-- Expand for locations -->
                                            <div class="inv-batch-expand-hint" :class="{ rotated: expandedBatches.has(batch.id) }">
                                                <MapPin :size="14" />
                                                <span>المواقع</span>
                                                <ChevronDown :size="14" />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Location details -->
                                    <Transition name="expand">
                                        <div v-if="expandedBatches.has(batch.id)" class="inv-locations">
                                            <div
                                                v-for="loc in batch.locations"
                                                :key="loc.id"
                                                class="inv-location-row"
                                            >
                                                <div class="inv-loc-info">
                                                    <div class="inv-loc-badge" :class="loc.location === 'StoreShelf' ? 'loc-shelf' : 'loc-warehouse'">
                                                        <MapPin :size="13" />
                                                        <span>{{ loc.location === 'BackWarehouse' ? 'المستودع' : (loc.location === 'StoreShelf' ? 'رف المعرض' : loc.location) }}</span>
                                                    </div>
                                                    <span class="inv-loc-qty">{{ loc.quantity }} وحدة</span>
                                                </div>
                                                <div class="inv-loc-actions">
                                                    <button
                                                        class="inv-transfer-btn to-shelf"
                                                        :disabled="loc.location === 'StoreShelf' || loc.quantity <= 0"
                                                        @click.stop="$emit('transfer', loc, 'toShelf')"
                                                    >
                                                        <ArrowRightLeft :size="14" />
                                                        <span>إلى الرف</span>
                                                    </button>
                                                    <button
                                                        class="inv-transfer-btn to-warehouse"
                                                        :disabled="loc.location === 'BackWarehouse' || loc.quantity <= 0"
                                                        @click.stop="$emit('transfer', loc, 'toWarehouse')"
                                                    >
                                                        <ArrowRightLeft :size="14" />
                                                        <span>إلى المستودع</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Transition>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="inv-pagination">
                <button class="inv-page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
                    السابق
                </button>
                <div class="inv-page-nums">
                    <button
                        v-for="page in totalPages"
                        :key="page"
                        class="inv-page-num"
                        :class="{ active: currentPage === page }"
                        @click="goToPage(page)"
                    >
                        {{ page }}
                    </button>
                </div>
                <button class="inv-page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
                    التالي
                </button>
            </div>

            <!-- Results count -->
            <div class="inv-results-info">
                عرض {{ (currentPage - 1) * rowsPerPage + 1 }} - {{ Math.min(currentPage * rowsPerPage, filteredGroupedInventory.length) }} من {{ filteredGroupedInventory.length }} منتج
            </div>
        </template>
    </div>
</template>

<style scoped>
/* ─── Container ─────────────────────────────────────────── */
.inv-table-wrap {
    padding: 0.5rem 0;
}

/* ─── Loading Skeletons ─────────────────────────────────── */
.inv-loading {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
}

.skeleton-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--p-surface-50);
    animation: pulse 1.8s ease-in-out infinite;
}

.dark .skeleton-row { background: var(--p-surface-800); }

.skeleton-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.625rem;
    background: var(--p-surface-200);
}
.dark .skeleton-avatar { background: var(--p-surface-700); }

.skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.skeleton-line {
    height: 0.625rem;
    border-radius: 0.25rem;
    background: var(--p-surface-200);
}
.dark .skeleton-line { background: var(--p-surface-700); }
.w-40 { width: 10rem; }
.w-24 { width: 6rem; }

.skeleton-bar {
    width: 5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--p-surface-200);
}
.dark .skeleton-bar { background: var(--p-surface-700); }

.skeleton-badge {
    width: 4.5rem;
    height: 1.5rem;
    border-radius: 9999px;
    background: var(--p-surface-200);
}
.dark .skeleton-badge { background: var(--p-surface-700); }

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* ─── Empty State ───────────────────────────────────────── */
.inv-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
}

.inv-empty-icon {
    color: var(--p-surface-300);
    margin-bottom: 1rem;
}
.dark .inv-empty-icon { color: var(--p-surface-600); }

.inv-empty-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--p-surface-700);
    margin: 0 0 0.25rem;
}
.dark .inv-empty-title { color: var(--p-surface-200); }

.inv-empty-sub {
    font-size: 0.85rem;
    color: var(--p-surface-400);
    margin: 0;
}

/* ─── Product List ──────────────────────────────────────── */
.inv-list {
    display: flex;
    flex-direction: column;
}

.inv-product {
    border-bottom: 1px solid var(--p-surface-100);
    transition: background-color 0.15s ease;
}
.dark .inv-product { border-color: var(--p-surface-800); }

.inv-product:last-child { border-bottom: none; }

.inv-product.is-expanded {
    background: var(--p-surface-50);
}
.dark .inv-product.is-expanded { background: var(--p-surface-900); }

/* ─── Product Master Row ────────────────────────────────── */
.inv-product-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
    gap: 1rem;
}

.inv-product-row:hover {
    background: var(--p-surface-50);
}
.dark .inv-product-row:hover { background: var(--p-surface-850); }

.inv-product.is-expanded .inv-product-row:hover {
    background: var(--p-surface-100);
}
.dark .inv-product.is-expanded .inv-product-row:hover { background: var(--p-surface-850); }

.inv-product-main {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex: 1;
    min-width: 0;
}

.inv-expand-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background: var(--p-surface-100);
    color: var(--p-surface-500);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
}
.dark .inv-expand-trigger {
    background: var(--p-surface-800);
    color: var(--p-surface-400);
}

.inv-expand-trigger.rotated {
    transform: rotate(180deg);
    background: var(--p-primary-50);
    color: var(--p-primary-600);
}
.dark .inv-expand-trigger.rotated {
    background: rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.15);
    color: var(--p-primary-400);
}

.inv-product-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
}

.inv-product-name {
    font-size: 0.95rem;
    font-weight: 750;
    color: var(--p-surface-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dark .inv-product-name { color: var(--p-surface-50); }

.inv-product-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.775rem;
    font-weight: 500;
    color: var(--p-surface-400);
}

.inv-product-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.inv-inactive-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.675rem;
    font-weight: 700;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    white-space: nowrap;
    flex-shrink: 0;
}
.dark .inv-inactive-badge {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.25);
}

.inv-product-stats {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-shrink: 0;
}

/* ─── Stock Column ──────────────────────────────────────── */
.inv-stock-col {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 7rem;
}

.inv-stock-header {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
}

.inv-stock-qty {
    font-size: 1.15rem;
    font-weight: 850;
    color: var(--p-surface-900);
    line-height: 1;
}
.dark .inv-stock-qty { color: var(--p-surface-50); }

.inv-stock-unit {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--p-surface-400);
}

.inv-stock-bar {
    width: 100%;
    height: 0.375rem;
    border-radius: 9999px;
    background: var(--p-surface-100);
    overflow: hidden;
}
.dark .inv-stock-bar { background: var(--p-surface-800); }

.inv-stock-bar-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.bar-empty { background: var(--p-surface-300); width: 4% !important; }
.bar-low { background: linear-gradient(90deg, #ef4444, #f87171); }
.bar-medium { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.bar-healthy { background: linear-gradient(90deg, #10b981, #34d399); }

/* ─── Status Badge ──────────────────────────────────────── */
.inv-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    transition: all 0.15s ease;
}

.status-success {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
}
.dark .status-success {
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.25);
}

.status-warning {
    background: #fef3c7;
    color: #d97706;
    border: 1px solid #fde68a;
}
.dark .status-warning {
    background: rgba(245, 158, 11, 0.1);
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.25);
}

.status-amber {
    background: #fff7ed;
    color: #ea580c;
    border: 1px solid #fed7aa;
}
.dark .status-amber {
    background: rgba(234, 88, 12, 0.1);
    color: #fb923c;
    border-color: rgba(234, 88, 12, 0.25);
}

.status-danger {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}
.dark .status-danger {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.25);
}

/* ─── Expand Animation ──────────────────────────────────── */
.expand-enter-active {
    animation: expandIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}
.expand-leave-active {
    animation: expandIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) reverse;
    overflow: hidden;
}

@keyframes expandIn {
    0% {
        opacity: 0;
        max-height: 0;
        transform: translateY(-8px);
    }
    100% {
        opacity: 1;
        max-height: 2000px;
        transform: translateY(0);
    }
}

/* ─── Batches Panel ─────────────────────────────────────── */
.inv-batches-panel {
    padding: 0 1.5rem 1.25rem;
}

.inv-batches-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--p-surface-500);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px dashed var(--p-surface-200);
}
.dark .inv-batches-header { border-color: var(--p-surface-750); color: var(--p-surface-400); }

.inv-batches-grid {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
}

/* ─── Batch Card ────────────────────────────────────────── */
.inv-batch-card {
    border: 1px solid var(--p-surface-200);
    border-radius: 0.875rem;
    background: var(--p-surface-0);
    overflow: hidden;
    transition: all 0.2s ease;
}
.dark .inv-batch-card {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.inv-batch-card:hover {
    border-color: var(--p-surface-300);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.dark .inv-batch-card:hover {
    border-color: var(--p-surface-650);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.inv-batch-card.batch-expanded {
    border-color: var(--p-primary-200);
    box-shadow: 0 2px 12px rgba(59, 130, 246, 0.06);
}
.dark .inv-batch-card.batch-expanded {
    border-color: rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.3);
    box-shadow: 0 2px 12px rgba(59, 130, 246, 0.08);
}

.inv-batch-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    cursor: pointer;
    gap: 1rem;
}

.inv-batch-main-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
}

.inv-batch-number {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    font-weight: 750;
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
    color: var(--p-surface-800);
}
.dark .inv-batch-number { color: var(--p-surface-150); }

.inv-batch-hash { color: var(--p-primary-400); }

.inv-batch-details {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
}

.inv-batch-detail {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--p-surface-400);
}

.detail-value {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--p-surface-700);
}
.dark .detail-value { color: var(--p-surface-300); }

.detail-value.qty {
    color: var(--p-primary-600);
    font-weight: 800;
}
.dark .detail-value.qty { color: var(--p-primary-400); }

.inv-batch-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    flex-shrink: 0;
}

/* ─── Expiry Chip ───────────────────────────────────────── */
.inv-expiry-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 0.5rem;
    font-size: 0.725rem;
    font-weight: 600;
    white-space: nowrap;
}

.expiry-safe {
    background: #f0fdf4;
    color: #15803d;
}
.dark .expiry-safe {
    background: rgba(22, 163, 74, 0.1);
    color: #4ade80;
}

.expiry-warning {
    background: #fffbeb;
    color: #b45309;
}
.dark .expiry-warning {
    background: rgba(245, 158, 11, 0.1);
    color: #fbbf24;
}

.expiry-critical {
    background: #fff1f2;
    color: #be123c;
    animation: pulse-danger 2s ease-in-out infinite;
}
.dark .expiry-critical {
    background: rgba(239, 68, 68, 0.12);
    color: #fb7185;
}

.expiry-expired {
    background: #fef2f2;
    color: #dc2626;
    text-decoration: line-through;
}
.dark .expiry-expired {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
}

.expiry-none {
    background: var(--p-surface-50);
    color: var(--p-surface-400);
}
.dark .expiry-none {
    background: var(--p-surface-800);
    color: var(--p-surface-500);
}

.expiry-countdown {
    padding-inline-start: 0.25rem;
    border-inline-start: 1px solid currentColor;
    opacity: 0.7;
    font-weight: 700;
}

@keyframes pulse-danger {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.75; }
}

/* ─── Batch Expand Hint ─────────────────────────────────── */
.inv-batch-expand-hint {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.725rem;
    font-weight: 600;
    color: var(--p-surface-400);
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
}

.inv-batch-expand-hint:hover {
    color: var(--p-primary-600);
    background: var(--p-primary-50);
}
.dark .inv-batch-expand-hint:hover {
    color: var(--p-primary-400);
    background: rgba(var(--p-primary-500-rgb, 59, 130, 246), 0.1);
}

.inv-batch-expand-hint.rotated svg:last-child {
    transform: rotate(180deg);
}

.inv-batch-expand-hint svg {
    transition: transform 0.2s ease;
}

/* ─── Location Rows ─────────────────────────────────────── */
.inv-locations {
    border-top: 1px solid var(--p-surface-100);
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: var(--p-surface-50);
}
.dark .inv-locations {
    border-color: var(--p-surface-750);
    background: var(--p-surface-900);
}

.inv-location-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.875rem;
    border-radius: 0.625rem;
    background: var(--p-surface-0);
    border: 1px solid var(--p-surface-150);
    gap: 0.75rem;
}
.dark .inv-location-row {
    background: var(--p-surface-850);
    border-color: var(--p-surface-750);
}

.inv-loc-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.inv-loc-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3rem 0.625rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
}

.loc-shelf {
    background: #ecfdf5;
    color: #059669;
}
.dark .loc-shelf {
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
}

.loc-warehouse {
    background: #eff6ff;
    color: #2563eb;
}
.dark .loc-warehouse {
    background: rgba(37, 99, 235, 0.1);
    color: #60a5fa;
}

.inv-loc-qty {
    font-size: 0.85rem;
    font-weight: 750;
    color: var(--p-surface-700);
}
.dark .inv-loc-qty { color: var(--p-surface-200); }

.inv-loc-actions {
    display: flex;
    gap: 0.375rem;
}

/* ─── Transfer Buttons ──────────────────────────────────── */
.inv-transfer-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
    font-family: inherit;
}

.inv-transfer-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.inv-transfer-btn.to-shelf {
    border-color: #a7f3d0;
    color: #059669;
}
.inv-transfer-btn.to-shelf:not(:disabled):hover {
    background: #ecfdf5;
    border-color: #059669;
}
.dark .inv-transfer-btn.to-shelf {
    border-color: rgba(16, 185, 129, 0.3);
    color: #34d399;
}
.dark .inv-transfer-btn.to-shelf:not(:disabled):hover {
    background: rgba(16, 185, 129, 0.1);
}

.inv-transfer-btn.to-warehouse {
    border-color: var(--p-surface-200);
    color: var(--p-surface-500);
}
.inv-transfer-btn.to-warehouse:not(:disabled):hover {
    background: var(--p-surface-50);
    border-color: var(--p-surface-400);
}
.dark .inv-transfer-btn.to-warehouse {
    border-color: var(--p-surface-700);
    color: var(--p-surface-400);
}
.dark .inv-transfer-btn.to-warehouse:not(:disabled):hover {
    background: var(--p-surface-800);
}

/* ─── Pagination ────────────────────────────────────────── */
.inv-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem 0.5rem;
}

.inv-page-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--p-surface-200);
    border-radius: 0.5rem;
    background: var(--p-surface-0);
    color: var(--p-surface-600);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
}
.dark .inv-page-btn {
    background: var(--p-surface-800);
    border-color: var(--p-surface-700);
    color: var(--p-surface-300);
}

.inv-page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.inv-page-btn:not(:disabled):hover {
    background: var(--p-surface-50);
    border-color: var(--p-surface-300);
}
.dark .inv-page-btn:not(:disabled):hover {
    background: var(--p-surface-750);
}

.inv-page-nums {
    display: flex;
    gap: 0.25rem;
}

.inv-page-num {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--p-surface-500);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
}

.inv-page-num.active {
    background: var(--p-primary-600);
    color: white;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.35);
}

.inv-page-num:not(.active):hover {
    background: var(--p-surface-100);
}
.dark .inv-page-num:not(.active):hover {
    background: var(--p-surface-800);
}

.inv-results-info {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--p-surface-400);
    padding: 0.5rem 1.5rem 1rem;
}

/* ─── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
    .inv-product-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
    }

    .inv-product-stats {
        width: 100%;
        justify-content: space-between;
    }

    .inv-batch-top {
        flex-direction: column;
        align-items: flex-start;
    }

    .inv-batch-side {
        align-items: flex-start;
        flex-direction: row;
        gap: 0.75rem;
        width: 100%;
    }

    .inv-location-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.625rem;
    }

    .inv-loc-actions {
        width: 100%;
    }

    .inv-transfer-btn {
        flex: 1;
        justify-content: center;
    }
}
</style>
