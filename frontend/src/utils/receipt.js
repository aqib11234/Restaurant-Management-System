// Prints a customer bill through a hidden iframe, so it works after async
// actions (a popup window opened then would be blocked by the browser)

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const money = (n) => `PKR ${Math.round(n).toLocaleString()}`;

const restaurantName = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').restaurantName || 'Restaurant';
  } catch {
    return 'Restaurant';
  }
};

export function printBill(order) {
  const paid = order.status === 'completed';
  const received = order.amountReceived;
  const lines = order.items.map(item => `
    <tr>
      <td class="qty">${item.quantity}</td>
      <td>${escapeHtml(item.name)}<div class="each">${money(item.price)} each</div></td>
      <td class="amt">${money(item.price * item.quantity)}</td>
    </tr>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Bill</title>
    <style>
      @page { margin: 4mm; }
      body { font-family: 'Courier New', monospace; font-size: 13px; color: #000; margin: 0; }
      .bill { width: 72mm; margin: 0 auto; }
      h1 { font-size: 18px; text-align: center; margin: 0 0 4px; }
      .center { text-align: center; }
      .rule { border-top: 1px dashed #000; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { vertical-align: top; padding: 2px 0; }
      .qty { width: 8mm; }
      .amt { text-align: right; white-space: nowrap; }
      .each { font-size: 11px; }
      .row { display: flex; justify-content: space-between; }
      .total { font-weight: bold; font-size: 16px; }
      .waiter { font-weight: bold; margin-top: 4px; }
    </style></head><body><div class="bill">
      <h1>${escapeHtml(restaurantName())}</h1>
      <div class="center">${paid ? 'Paid bill' : 'Bill'} #${escapeHtml(order._id.slice(-6).toUpperCase())}</div>
      <div class="rule"></div>
      <div class="row"><span>${order.table === 0 ? 'Takeaway' : `Table ${order.table}`}</span><span>${new Date(order.paidAt || order.createdAt).toLocaleString()}</span></div>
      <div class="row waiter"><span>Waiter</span><span>${escapeHtml(order.waiterName || 'Not assigned')}</span></div>
      <div class="rule"></div>
      <table>${lines}</table>
      <div class="rule"></div>
      <div class="row total"><span>Total</span><span>${money(order.total)}</span></div>
      ${paid && received != null ? `
        <div class="row"><span>Cash received</span><span>${money(received)}</span></div>
        <div class="row"><span>Change</span><span>${money(received - order.total)}</span></div>` : ''}
      <div class="rule"></div>
      <div class="center">Thank you for dining with us</div>
    </div></body></html>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow.focus();
  setTimeout(() => {
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
  }, 50);
}
