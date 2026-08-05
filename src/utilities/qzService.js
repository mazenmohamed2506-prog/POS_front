import * as qz from "qz-tray";

class QZService {
    constructor() {
        this.connected = false;
        this.connectionPromise = null;
    }

    /**
     * Connect to QZ Tray WebSocket.
     * Reuses an active connection or connection promise to avoid redundant connection attempts.
     */
    async connect() {
        if (qz.websocket.isActive()) {
            this.connected = true;
            return true;
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = (async () => {
            try {
                // Connect with no cert config (will request user approval on first action)
                await qz.websocket.connect();
                this.connected = true;
                return true;
            } catch (err) {
                this.connected = false;
                console.warn("Failed to connect to QZ Tray WebSocket:", err);
                return false;
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    /**
     * Disconnect from QZ Tray WebSocket.
     */
    async disconnect() {
        try {
            if (qz.websocket.isActive()) {
                await qz.websocket.disconnect();
            }
        } catch (err) {
            console.warn("Error disconnecting from QZ Tray:", err);
        } finally {
            this.connected = false;
        }
    }

    /**
     * Checks if QZ Tray is currently connected.
     */
    isConnected() {
        return qz.websocket.isActive();
    }

    /**
     * Fetch the list of available printers from QZ Tray.
     */
    async getPrinters() {
        try {
            const connected = await this.connect();
            if (!connected) return [];
            return await qz.printers.find();
        } catch (err) {
            console.error("Error finding printers:", err);
            return [];
        }
    }

    /**
     * Send a raw kick command to trigger the cash drawer.
     * Supports Pin 2 (\x1B\x70\x00\x19\xFA) and Pin 5 (\x1B\x70\x01\x19\xFA).
     * @param {string} printerName - Target printer name
     * @param {number} pin - 2 or 5 (defaults to 2)
     */
    async kickDrawer(printerName, pin = 2) {
        try {
            const connected = await this.connect();
            if (!connected) throw new Error("QZ Tray is not connected");

            const config = qz.configs.create(printerName);
            // ESC/POS Drawer Kick command
            // Pin 2: \x1B\x70\x00\x19\xFA (Hex: 1B700019FA)
            // Pin 5: \x1B\x70\x01\x19\xFA (Hex: 1B700119FA)
            const commandHex = pin === 5 ? "1B700119FA" : "1B700019FA";

            const rawData = [
                {
                    type: "raw",
                    format: "command",
                    flavor: "hex",
                    data: commandHex
                }
            ];

            await qz.print(config, rawData);
            return true;
        } catch (err) {
            console.error("Failed to kick drawer via QZ Tray:", err);
            throw err;
        }
    }

    /**
     * Send a raw cut paper command to the printer.
     * Full cut command: \x1D\x56\x41\x00 (Hex: 1D564100)
     */
    async cutPaper(printerName) {
        try {
            const connected = await this.connect();
            if (!connected) return false;

            const config = qz.configs.create(printerName);
            const rawData = [
                {
                    type: "raw",
                    format: "command",
                    flavor: "hex",
                    data: "1D564100"
                }
            ];
            await qz.print(config, rawData);
            return true;
        } catch (err) {
            console.warn("Failed to cut paper via QZ Tray raw command:", err);
            return false;
        }
    }

    /**
     * Formats receipt data as a beautiful HTML document.
     */
    generateReceiptHTML(order, settings) {
        const storeName = settings.storeName || "نقطة البيع";
        const receiptHeader = (settings.receiptHeader || "").replace(/\n/g, "<br>");
        const receiptFooter = (settings.receiptFooter || "").replace(/\n/g, "<br>");
        const currency = settings.currency || "EGP";

        const itemsHtml = (order.items || []).map(item => `
            <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding: 6px 0; text-align: right; font-size: 12px; font-weight: bold; max-width: 170px; word-wrap: break-word;">
                    ${item.name}
                    <div style="font-size: 10px; font-weight: normal; color: #555;">
                        ${item.qty} × ${item.price.toFixed(2)} ${currency}
                    </div>
                </td>
                <td style="padding: 6px 0; text-align: left; vertical-align: bottom; font-weight: bold; font-size: 12px;">
                    ${item.total.toFixed(2)} ${currency}
                </td>
            </tr>
        `).join("");

        const paymentMethodText = order.paymentMethod === 'cash' 
            ? 'نقدي (كاش)' 
            : order.paymentMethod === 'card' 
                ? 'بطاقة بنكية' 
                : 'آجل (على الحساب)';

        const discountHtml = order.discount > 0 
            ? `<tr>
                <td style="padding: 4px 0; text-align: right; font-size: 11px;">الخصم:</td>
                <td style="padding: 4px 0; text-align: left; font-size: 11px; color: #ef4444; font-weight: bold;">-${order.discount.toFixed(2)} ${currency}</td>
               </tr>`
            : "";

        return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: 'Courier New', Courier, monospace, 'Inter', sans-serif;
                    font-size: 12px;
                    line-height: 1.3;
                    color: #000;
                    margin: 0;
                    padding: 8px;
                    width: 270px;
                }
                .text-center { text-align: center; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; }
                .store-title { margin: 0; font-size: 16px; font-weight: 900; }
                .receipt-meta { font-size: 10px; color: #333; margin-top: 4px; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <h2 class="store-title">${storeName}</h2>
                <div style="font-size: 10px; margin-top: 2px; font-weight: bold;">إيصال مبيعات مبسط</div>
                ${receiptHeader ? `<div style="font-size: 10px; margin-top: 4px; line-height: 1.4;">${receiptHeader}</div>` : ""}
            </div>
            
            <div class="divider"></div>
            
            <div class="receipt-meta">
                <div><strong>رقم الفاتورة:</strong> ${order.orderNumber}</div>
                <div><strong>التاريخ:</strong> ${new Date(order.date).toLocaleString('ar-EG')}</div>
            </div>
            
            <div class="divider"></div>
            
            <table>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div class="divider"></div>
            
            <table>
                <tbody>
                    <tr>
                        <td style="padding: 4px 0; text-align: right; font-size: 11px;">المجموع الفرعي:</td>
                        <td style="padding: 4px 0; text-align: left; font-size: 11px;">${order.subtotal.toFixed(2)} ${currency}</td>
                    </tr>
                    ${discountHtml}
                    <tr>
                        <td style="padding: 4px 0; text-align: right; font-size: 11px;">الضريبة:</td>
                        <td style="padding: 4px 0; text-align: left; font-size: 11px;">${order.tax.toFixed(2)} ${currency}</td>
                    </tr>
                    <tr style="font-size: 13px; font-weight: 900;">
                        <td style="padding: 6px 0; text-align: right; border-top: 1px solid #000;">الإجمالي الكلي:</td>
                        <td style="padding: 6px 0; text-align: left; border-top: 1px solid #000;">${order.total.toFixed(2)} ${currency}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="divider"></div>
            
            <div class="text-center" style="font-size: 10px;">
                <div style="margin: 4px 0;">طريقة الدفع: <strong>${paymentMethodText}</strong></div>
                ${receiptFooter ? `<div style="margin-top: 6px; line-height: 1.4;">${receiptFooter}</div>` : ""}
                <div style="margin-top: 10px; font-weight: bold; font-style: italic;">شكراً لزيارتكم!</div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Prints a receipt html silently to the specified printer and kicks the cash drawer if configured.
     * Wraps operations in strict try/catch blocks so any printer error is caught and propagated cleanly.
     * @param {string} printerName - Target printer name
     * @param {string} htmlContent - HTML receipt content
     * @param {boolean} autoOpenDrawer - True if we should pulse the cash drawer
     */
    async printReceipt(printerName, htmlContent, autoOpenDrawer = true) {
        try {
            const connected = await this.connect();
            if (!connected) {
                throw new Error("QZ Tray is not connected. Make sure the local QZ Tray application is running.");
            }

            // 1. Kick the cash drawer first if autoOpenDrawer is enabled
            if (autoOpenDrawer) {
                await this.kickDrawer(printerName, 2).catch(e => {
                    console.warn("Could not kick cash drawer, proceeding with receipt print", e);
                });
            }

            // 2. Print HTML receipt
            const config = qz.configs.create(printerName);
            const printData = [{
                type: 'html',
                format: 'plain',
                data: htmlContent
            }];
            await qz.print(config, printData);

            // 3. Append Cut Paper raw command to cut paper at the end
            await this.cutPaper(printerName).catch(e => {
                console.warn("Could not execute paper cut command", e);
            });

            return true;
        } catch (err) {
            console.error("QZ Tray silent print transaction error:", err);
            throw err;
        }
    }
}

export default new QZService();
