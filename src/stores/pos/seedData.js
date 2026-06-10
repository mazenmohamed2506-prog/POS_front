// POS Centralized Seed Data
// Demonstrates a realistic grocery/supermarket cycle in Arabic

export const initialProducts = [
    {
        id: 1,
        name: "أرز بسمتي الضحى 1 كجم",
        sku: "RICE-001",
        barcode: "6281001000001",
        category: "بقالة",
        price: 45.00,
        cost: 35.00,
        units: [
            { name: "كيس", barcode: "6281001000001", factor: 1 },
            { name: "كرتونة (12 كيس)", barcode: "6281001000012", factor: 12 }
        ]
    },
    {
        id: 2,
        name: "زيت ذرة كريستال 1 لتر",
        sku: "OIL-001",
        barcode: "6281002000002",
        category: "بقالة",
        price: 65.00,
        cost: 50.00,
        units: [
            { name: "زجاجة", barcode: "6281002000002", factor: 1 }
        ]
    },
    {
        id: 3,
        name: "سكر ناعم الأسرة 1 كجم",
        sku: "SUG-001",
        barcode: "6281003000003",
        category: "بقالة",
        price: 30.00,
        cost: 22.00,
        units: [
            { name: "كيس", barcode: "6281003000003", factor: 1 },
            { name: "كرتونة (10 كيس)", barcode: "6281003000010", factor: 10 }
        ]
    },
    {
        id: 4,
        name: "حليب كامل الدسم جهينة 1 لتر",
        sku: "MLK-001",
        barcode: "6281004000004",
        category: "ألبان",
        price: 25.00,
        cost: 18.00,
        units: [
            { name: "علبة", barcode: "6281004000004", factor: 1 }
        ]
    },
    {
        id: 5,
        name: "خبز أبيض بلدي (5 أرغفة)",
        sku: "BRD-001",
        barcode: "6281005000005",
        category: "مخبوزات",
        price: 10.00,
        cost: 7.00,
        units: [
            { name: "ربطة", barcode: "6281005000005", factor: 1 }
        ]
    },
    {
        id: 6,
        name: "شاي العروسة خرز 250 جم",
        sku: "TEA-001",
        barcode: "6281006000006",
        category: "بقالة",
        price: 40.00,
        cost: 30.00,
        units: [
            { name: "علبة", barcode: "6281006000006", factor: 1 }
        ]
    },
    {
        id: 7,
        name: "مياه معدنية إيفال 1.5 لتر",
        sku: "WTR-001",
        barcode: "6281007000007",
        category: "مشروبات",
        price: 8.00,
        cost: 5.00,
        units: [
            { name: "زجاجة", barcode: "6281007000007", factor: 1 }
        ]
    },
    {
        id: 8,
        name: "مشروب غازي كوكاكولا 330 مل",
        sku: "SDA-001",
        barcode: "6281008000008",
        category: "مشروبات",
        price: 15.00,
        cost: 11.00,
        units: [
            { name: "عبوة", barcode: "6281008000008", factor: 1 }
        ]
    }
];

export const initialInventory = [
    { id: 1, productId: 1, productName: "أرز بسمتي الضحى 1 كجم", sku: "RICE-001", shelfStock: 15, warehouseStock: 120, unit: "كيس" },
    { id: 2, productId: 2, productName: "زيت ذرة كريستال 1 لتر", sku: "OIL-001", shelfStock: 8, warehouseStock: 60, unit: "زجاجة" },
    { id: 3, productId: 3, productName: "سكر ناعم الأسرة 1 كجم", sku: "SUG-001", shelfStock: 20, warehouseStock: 100, unit: "كيس" },
    { id: 4, productId: 4, productName: "حليب كامل الدسم جهينة 1 لتر", sku: "MLK-001", shelfStock: 5, warehouseStock: 30, unit: "علبة" },
    { id: 5, productId: 5, productName: "خبز أبيض بلدي (5 أرغفة)", sku: "BRD-001", shelfStock: 25, warehouseStock: 0, unit: "ربطة" },
    { id: 6, productId: 6, productName: "شاي العروسة خرز 250 جم", sku: "TEA-001", shelfStock: 2, warehouseStock: 15, unit: "علبة" }, // Low shelf stock!
    { id: 7, productId: 7, productName: "مياه معدنية إيفال 1.5 لتر", sku: "WTR-001", shelfStock: 50, warehouseStock: 200, unit: "زجاجة" },
    { id: 8, productId: 8, productName: "مشروب غازي كوكاكولا 330 مل", sku: "SDA-001", shelfStock: 0, warehouseStock: 40, unit: "عبوة" } // Zero stock on shelf, needs transfer!
];

export const initialPurchases = [
    {
        id: 2001,
        invoiceNumber: "PUR-1001",
        supplier: "شركة الضحى للصناعات الغذائية",
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        items: [
            { productId: 1, productName: "أرز بسمتي الضحى 1 كجم", qty: 100, cost: 35.00 },
            { productId: 3, productName: "سكر ناعم الأسرة 1 كجم", qty: 80, cost: 22.00 }
        ],
        total: 5260.00,
        status: "received"
    },
    {
        id: 2002,
        invoiceNumber: "PUR-1002",
        supplier: "شركة جهينة للألبان",
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        items: [
            { productId: 4, productName: "حليب كامل الدسم جهينة 1 لتر", qty: 30, cost: 18.00 }
        ],
        total: 540.00,
        status: "received"
    }
];

export const initialOrders = [
    {
        id: 1001,
        orderNumber: "ORD-1001",
        type: "sale",
        status: "completed",
        items: [
            { id: 1, name: "أرز بسمتي الضحى 1 كجم", sku: "RICE-001", qty: 2, price: 45.00 },
            { id: 2, name: "زيت ذرة كريستال 1 لتر", sku: "OIL-001", qty: 1, price: 65.00 }
        ],
        subtotal: 155.00,
        tax: 21.70,
        total: 176.70,
        paymentMethod: "cash",
        date: new Date(Date.now() - 5 * 3600000).toISOString(),
        cashier: "محمد الكاشير"
    },
    {
        id: 1002,
        orderNumber: "ORD-1002",
        type: "sale",
        status: "completed",
        items: [
            { id: 3, name: "سكر ناعم الأسرة 1 كجم", sku: "SUG-001", qty: 3, price: 30.00 },
            { id: 6, name: "شاي العروسة خرز 250 جم", sku: "TEA-001", qty: 1, price: 40.00 }
        ],
        subtotal: 130.00,
        tax: 18.20,
        total: 148.20,
        paymentMethod: "card",
        date: new Date(Date.now() - 2 * 3600000).toISOString(),
        cashier: "أحمد المدير"
    },
    {
        id: 1003,
        orderNumber: "RET-1003",
        type: "return",
        status: "completed",
        originalOrderId: 1001,
        items: [
            { id: 2, name: "زيت ذرة كريستال 1 لتر", sku: "OIL-001", qty: 1, price: 65.00 }
        ],
        subtotal: 65.00,
        tax: 9.10,
        total: 74.10,
        paymentMethod: "cash",
        date: new Date(Date.now() - 1 * 3600000).toISOString(),
        cashier: "محمد الكاشير"
    }
];

export const initialSettings = {
    storeName: "سوبرماركت الخير",
    taxRate: 14,
    currency: "EGP",
    receiptHeader: "سوبرماركت الخير - فرع القاهرة\nهاتف: 01000000000",
    receiptFooter: "شكراً لزيارتكم! يرجى الاحتفاظ بالايصال للمرتجعات خلال 14 يوماً"
};
