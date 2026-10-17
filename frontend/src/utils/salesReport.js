// Builds the Sales History PDF. Pure: takes data, returns a jsPDF document,
// so the layout can be checked outside the browser.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const INK = [17, 24, 39];       // headings
const TEXT = [55, 65, 81];      // body
const MUTED = [107, 114, 128];  // labels
const LINE = [229, 231, 235];   // rules
const GREEN = [5, 150, 105];    // money and bars
const GREEN_SOFT = [236, 253, 245];

const MARGIN = 14;

// jsPDF's built-in fonts only cover Latin-1; keep names printable
const clean = (s) => String(s ?? '').replace(/[^\x20-\x7E -ÿ]/g, '').trim() || '-';
// "2026-10-17" reads better as "Sat 17 Oct 2026"
const periodName = (name) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(name || '');
  if (!m) return clean(name);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const money = (n) => `PKR ${Math.round(n || 0).toLocaleString('en-US')}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Right-align money/number columns in every row, header and total included
const alignRight = (...columns) => ({
  didParseCell: ({ cell, column }) => {
    if (columns.includes(column.index)) cell.styles.halign = 'right';
  },
});

const periodWord = { daily: 'Day', weekly: 'Week', monthly: 'Month' };

function sectionTitle(doc, text, y, x = MARGIN) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(text, x, y);
  return y + 3;
}

function ensureSpace(doc, y, needed) {
  if (y + needed > doc.internal.pageSize.getHeight() - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

/**
 * @param {object} data
 * @param {string} data.restaurantName
 * @param {'daily'|'weekly'|'monthly'} data.groupBy
 * @param {string} data.rangeLabel     e.g. "1 Oct 2026 to 17 Oct 2026" or "All time"
 * @param {Array}  data.groups         [{ displayName, totalOrders, totalRevenue }]
 * @param {Array}  data.dishes         [{ name, quantity, revenue }]
 * @param {Array}  data.waiters        [{ name, orders, revenue }]
 * @param {Array}  [data.orders]       paid orders, for a single-period report
 * @param {string} [data.title]        overrides "Sales report"
 * @param {Date}   [data.generatedAt]
 */
export { periodName };

export function buildSalesReport(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - MARGIN * 2;
  const groups = data.groups || [];
  const generatedAt = data.generatedAt || new Date();

  const totalRevenue = groups.reduce((s, g) => s + (g.totalRevenue || 0), 0);
  const totalOrders = groups.reduce((s, g) => s + (g.totalOrders || 0), 0);
  const avgBill = totalOrders ? totalRevenue / totalOrders : 0;
  const best = groups.reduce((b, g) => (!b || (g.totalRevenue || 0) > (b.totalRevenue || 0) ? g : b), null);

  // ── Header band ──
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(clean(data.restaurantName), MARGIN, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(209, 213, 219);
  doc.text(clean(data.title || 'Sales report'), MARGIN, 23);
  doc.setFontSize(9);
  doc.text(clean(data.rangeLabel), pageW - MARGIN, 15, { align: 'right' });
  doc.text(`Printed ${generatedAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    pageW - MARGIN, 23, { align: 'right' });

  // ── Headline figures ──
  let y = 44;
  const gap = 4;
  const boxW = (contentW - gap * 3) / 4;
  const boxes = [
    { label: 'Total sales', value: money(totalRevenue), strong: true },
    { label: 'Paid orders', value: totalOrders.toLocaleString('en-US') },
    { label: 'Average bill', value: money(avgBill) },
    { label: `Best ${(periodWord[data.groupBy] || 'period').toLowerCase()}`, value: best && best.totalRevenue ? periodName(best.displayName) : '-', sub: best && best.totalRevenue ? money(best.totalRevenue) : '' },
  ];
  boxes.forEach((b, i) => {
    const x = MARGIN + i * (boxW + gap);
    doc.setFillColor(...(b.strong ? GREEN_SOFT : [249, 250, 251]));
    doc.setDrawColor(...(b.strong ? GREEN : LINE));
    doc.roundedRect(x, y, boxW, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(b.label, x + 4, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(b.value.length > 14 ? 10 : 13);
    doc.setTextColor(...(b.strong ? GREEN : INK));
    doc.text(doc.splitTextToSize(b.value, boxW - 8)[0], x + 4, y + 15);
    if (b.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT);
      doc.text(b.sub, x + 4, y + 20.5);
    }
  });
  y += 34;

  // ── Sales by period, with a bar showing each period's share ──
  const tableBase = {
    showFoot: 'lastPage',
    margin: { left: MARGIN, right: MARGIN },
    styles: { font: 'helvetica', fontSize: 9.5, textColor: TEXT, cellPadding: 2.4, lineColor: LINE, lineWidth: 0 },
    headStyles: { fillColor: [243, 244, 246], textColor: INK, fontStyle: 'bold' },
    footStyles: { fillColor: [243, 244, 246], textColor: INK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 252, 253] },
  };

  if (groups.length > 0) {
    y = sectionTitle(doc, `Sales by ${(periodWord[data.groupBy] || 'period').toLowerCase()}`, y);
    const maxRevenue = Math.max(...groups.map(g => g.totalRevenue || 0), 1);
    autoTable(doc, {
      ...tableBase,
      startY: y + 1,
      head: [[periodWord[data.groupBy] || 'Period', 'Orders', 'Sales', 'Average bill', '']],
      body: groups.map(g => [
        periodName(g.displayName),
        (g.totalOrders || 0).toLocaleString('en-US'),
        money(g.totalRevenue),
        money(g.totalOrders ? g.totalRevenue / g.totalOrders : 0),
        '',
      ]),
      foot: [['Total', totalOrders.toLocaleString('en-US'), money(totalRevenue), money(avgBill), '']],
      ...alignRight(1, 2, 3),
      columnStyles: {
        1: { halign: 'right', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 34 },
        3: { halign: 'right', cellWidth: 30 },
        4: { cellWidth: 40 },
      },
      didDrawCell: ({ section, column, row, cell }) => {
        if (section === 'body' && column.index === 4) {
          const g = groups[row.index];
          const w = (cell.width - 4) * ((g.totalRevenue || 0) / maxRevenue);
          if (w > 0.3) {
            doc.setFillColor(...GREEN);
            doc.rect(cell.x + 2, cell.y + cell.height / 2 - 1.6, w, 3.2, 'F');
          }
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text('No paid orders in this period.', MARGIN, y + 4);
    y += 14;
  }

  // ── Best-selling dishes and waiters, side by side ──
  const dishes = data.dishes || [];
  const waiters = data.waiters || [];
  if (dishes.length || waiters.length) {
    // Both tables start on the same page, so make room for the longer one
    y = ensureSpace(doc, y, 16 + 7.5 * Math.max(dishes.length, waiters.length));
    const half = (contentW - 6) / 2;
    const startY = y;
    const startPage = doc.getNumberOfPages();
    let endLeft = y, endRight = y;

    if (dishes.length) {
      sectionTitle(doc, 'Best-selling dishes', startY);
      autoTable(doc, {
        ...tableBase,
        startY: startY + 4,
        margin: { left: MARGIN, right: MARGIN + half + 6 },
        tableWidth: half,
        head: [['Dish', 'Qty', 'Sales']],
        body: dishes.map(d => [clean(d.name), String(d.quantity), money(d.revenue)]),
        ...alignRight(1, 2),
        columnStyles: { 1: { halign: 'right', cellWidth: 12 }, 2: { halign: 'right', cellWidth: 28 } },
      });
      endLeft = doc.lastAutoTable.finalY;
    }
    if (waiters.length) {
      // Draw beside the dishes table, on the page where it started
      doc.setPage(startPage);
      sectionTitle(doc, 'Sales by waiter', startY, MARGIN + half + 6);
      autoTable(doc, {
        ...tableBase,
        startY: startY + 4,
        margin: { left: MARGIN + half + 6, right: MARGIN },
        tableWidth: half,
        head: [['Waiter', 'Orders', 'Sales']],
        body: waiters.map(w => [clean(w.name), String(w.orders), money(w.revenue)]),
        ...alignRight(1, 2),
        columnStyles: { 1: { halign: 'right', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 28 } },
      });
      endRight = doc.lastAutoTable.finalY;
    }
    doc.setPage(doc.getNumberOfPages());
    y = Math.max(endLeft, endRight) + 10;
  }

  // ── Every paid order (single-period report) ──
  if (data.orders && data.orders.length) {
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, `Paid orders (${plural(data.orders.length, 'order')})`, y);
    autoTable(doc, {
      ...tableBase,
      startY: y + 1,
      head: [['Time', 'Table', 'Waiter', 'Items', 'Total']],
      ...alignRight(4),
      body: data.orders.map(o => [
        new Date(o.paidAt || o.createdAt).toLocaleString('en-GB', data.groupBy === 'daily'
          ? { hour: '2-digit', minute: '2-digit' }
          : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        o.table === 0 ? 'Takeaway' : String(o.table),
        clean(o.waiterName || '-'),
        o.items.map(i => `${i.quantity} x ${clean(i.name)}`).join('\n'),
        money(o.total),
      ]),
      columnStyles: {
        0: { cellWidth: data.groupBy === 'daily' ? 16 : 28 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        4: { halign: 'right', cellWidth: 28 },
      },
    });
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...LINE);
    doc.line(MARGIN, h - 12, pageW - MARGIN, h - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${clean(data.restaurantName)} sales report`, MARGIN, h - 7);
    doc.text(`Page ${i} of ${pages}`, pageW - MARGIN, h - 7, { align: 'right' });
  }

  return doc;
}
