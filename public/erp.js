let ME, D = { items: [], parties: [], emps: [], set: {}, phases: [] };
let deferredInstall; addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; const b = $('install'); if (b) b.hidden = false; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
const A = () => ME.role === 'admin';
const today = () => new Date().toISOString().slice(0, 10);
const GST = [0, 5, 12, 18, 28];
const MODES = [['cash', 'Cash'], ['bank', 'Bank / UPI']];
const CATS = ['Rent', 'Electricity', 'Transport', 'Packaging', 'Tools and repairs', 'Marketing', 'Professional fees', 'Other'];
const FUND = [['capital_in', 'Capital introduced'], ['drawing', 'Owner drawing'], ['loan_in', 'Loan taken'], ['loan_repay', 'Loan repaid']];
const PAGES = {};
const NAV = {
  admin: [['dash', 'Dashboard', 'grid'], ['sales', 'Sales', 'cart'], ['purchases', 'Orders', 'truck'], ['production', 'Production', 'gear'], ['stock', 'Stock', 'box'], ['phases', 'Phases', 'chart'], ['parties', 'Parties', 'users'], ['money', 'Money', 'rupee'], ['reports', 'Reports', 'chart'], ['import', 'Import', 'download'], ['team', 'Team', 'list']],
  workshop: [['production', 'Production', 'gear'], ['deliveries', 'Deliveries', 'truck'], ['stock', 'Stock', 'box'], ['me', 'My money', 'wallet']],
  sales: [['sales', 'Sales', 'cart'], ['me', 'My money', 'wallet']],
};
const navKey = () => ME.role === 'admin' ? 'admin' : ME.dept === 'sales' ? 'sales' : 'workshop';
const opt = (a, sel) => a.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, ...(String(v) === String(sel) ? { selected: '' } : {}) }, l); });
const fail = e => alert(e.message);
const refresh = async () => { await refs(); route(); };
async function refs() {
  const [items, parties, set, emps, phases] = await Promise.all([api('/api/items'), api('/api/parties'), api('/api/settings'), A() ? api('/api/employees') : [], A() ? api('/api/phase-list') : []]);
  D = { items, parties, set, emps, phases };
}

// ---------- building blocks
function modal(title, body) {
  const dlg = h('dialog', { class: 'modal' }, h('div', { class: 'mh' }, h('b', {}, title), h('button', { class: 'del', 'aria-label': 'Close', onclick: () => dlg.close() }, '✕')), h('div', { class: 'mb' }, body));
  dlg.onclose = () => dlg.remove(); document.body.append(dlg); dlg.showModal(); return dlg;
}
function F(fields, vals, onsub, label = 'Save') {
  const err = h('p', { class: 'ferr', role: 'alert' });
  const f = h('form', {}, fields.map(x => {
    const v = vals?.[x.k] ?? '';
    const inp = x.t === 'select' ? h('select', { name: x.k }, opt(x.o || [], v))
      : x.t === 'textarea' ? h('textarea', { name: x.k, rows: 2 }, v)
      : h('input', { name: x.k, type: x.t || 'text', value: v, placeholder: x.ph || '', ...(x.r ? { required: '' } : {}), ...(x.t === 'number' ? { step: 'any', min: '0', inputmode: 'decimal' } : {}) });
    return h('label', { class: x.w ? 'wide' : '' }, x.l, inp);
  }), h('button', { class: 'primary wide' }, label), err);
  f.onsubmit = async e => { e.preventDefault(); err.textContent = ''; try { await onsub(Object.fromEntries(new FormData(f))); } catch (x) { err.textContent = x.message; } };
  return f;
}
function ask(title, fields, vals, fn, label) {
  const dlg = modal(title, F(fields, vals, async d => { await fn(d); dlg.close(); await refresh(); }, label)); return dlg;
}
function tbl(cols, rows, empty = 'Nothing here yet.', onRow) {
  const t = h('table', {}, h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: c[2] || '' }, c[0])))),
    h('tbody', {}, rows.map(r => { const tr = h('tr', onRow ? { class: 'click', onclick: () => onRow(r) } : {}, cols.map(c => h('td', { class: c[2] || '' }, c[1](r)))); return tr; })));
  return h('div', {}, h('div', { class: 'scroll' }, t), rows.length ? '' : h('div', { class: 'empty' }, empty));
}
const head = (title, ...acts) => h('div', { class: 'page-h' }, h('h2', {}, title), ...acts);
const addBtn = (label, fn) => h('button', { class: 'primary', style: 'padding:0 16px', onclick: fn }, label);
const acts = (...k) => h('div', { class: 'acts', style: 'margin:0;justify-content:flex-end' }, ...k);
function lineEd(items, o = {}) {
  const box = h('div', { class: 'lines' }), rows = [], tot = h('div', { class: 'tot' });
  const list = [...items.map(i => [i._id, i.name]), ...(o.allowNew ? [['__new', '+ New item']] : [])];
  const calc = () => { const t = rows.filter(r => r.on).reduce((a, r) => a + num(r.q.value) * num(r.r?.value) * (1 + num(r.g?.value) / 100), 0); tot.textContent = o.rate ? 'Total incl. GST: ' + money(t) : ''; };
  const plus = h('button', { type: 'button', class: 'btn', onclick: () => add() }, '+ Add item');
  function add(v) {
    const r = { on: true }, s = h('select', {}, opt(list, v?.item)); r.s = s;
    r.n = h('input', { placeholder: 'New item name', value: v?.name || '', style: v?.item === '__new' ? '' : 'display:none' });
    r.q = h('input', { type: 'number', step: 'any', min: '0', placeholder: 'Qty', value: v?.qty ?? '' }); const kids = [h('div', { style: 'display:grid;gap:4px' }, s, r.n), r.q];
    if (o.rate) { r.r = h('input', { type: 'number', step: 'any', min: '0', placeholder: 'Rate', value: v?.rate ?? '' }); r.g = h('select', {}, opt(GST, v?.gstRate ?? 18)); kids.push(r.r, r.g); }
    const fill = () => { r.n.style.display = s.value === '__new' ? '' : 'none'; const it = items.find(i => i._id === s.value); if (it && o.rate) { r.r.value = o.rate === 'sale' ? it.salePrice || '' : it.avgCost || ''; r.g.value = it.gstRate; } calc(); };
    s.onchange = fill; if (!v) fill();
    const row = h('div', { class: 'lrow' }, kids, h('button', { type: 'button', class: 'del', 'aria-label': 'Remove line', onclick: () => { r.on = false; row.remove(); calc(); } }, '✕'));
    r.el = row; [r.q, r.r, r.g].forEach(x => x && (x.oninput = calc)); rows.push(r); box.insertBefore(row, plus);
  }
  box.append(plus, tot); (o.init?.length ? o.init : [null]).forEach(v => add(v || undefined)); calc();
  box.get = () => rows.filter(r => r.on).map(r => ({ item: r.s.value, name: r.n.value, qty: r.q.value, ...(o.rate ? { rate: r.r.value, gstRate: r.g.value } : {}) }));
  box.set = arr => { rows.splice(0).forEach(r => { r.on = false; r.el.remove(); }); (arr.length ? arr : [null]).forEach(v => add(v || undefined)); calc(); };
  return box;
}
// uploads: shrink photos, send, show what was read
async function shrink(file) {
  if (!file.type.startsWith('image/')) return file;
  try { const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', 0.82)); } catch { return file; }
}
async function sendFile(file, kind) {
  const blob = await shrink(file), r = await fetch('/api/upload?kind=' + kind + '&name=' + encodeURIComponent(file.name), { method: 'POST', headers: { 'Content-Type': blob.type || file.type }, body: blob });
  if (r.status === 401) { location.href = '/login.html'; throw new Error('Signed out'); }
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Upload failed'); return j;
}
function picker(kind, label, onDone) {
  const st = h('small', {}, 'Attach a photo, screenshot or PDF. It is saved with the record.'), inp = h('input', { type: 'file', accept: 'image/*,application/pdf' });
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return; st.textContent = 'Uploading and reading...';
    try { const j = await sendFile(f, kind); st.textContent = j.extracted ? 'Saved. Details were read automatically. Please check them below.' : j.aiOn ? 'Saved, but the details could not be read' + (j.error ? ' (' + j.error + ')' : '') + '. Please type them in.' : 'Saved. Automatic reading is switched off, so please type the details in.'; onDone(j); } catch (e) { st.textContent = e.message; }
  };
  return h('div', { class: 'wide', style: 'display:grid;gap:6px' }, h('label', {}, label, inp), st);
}
const kv = rows => h('table', { style: 'min-width:0' }, h('tbody', {}, rows.map(([l, v, b]) => h('tr', {}, h('td', { style: b ? 'font-weight:700' : '' }, l), h('td', { class: 'amt', style: b ? 'font-weight:800' : '' }, typeof v === 'number' ? money(v) : v)))));
const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const toks = x => String(x || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const matchItem = d => { const n = norm(d); if (!n) return null; let best = null, bs = 0;
  for (const i of D.items) { if (norm(i.name) === n) return i; const t = toks(i.name); if (t.length && t.every(w => n.includes(w))) { const sc = t.join('').length; if (sc > bs) { bs = sc; best = i; } } }
  return best; };
const matchParty = (gstin, name, kind) => D.parties.find(p => p.kind === kind && ((gstin && p.gstin && p.gstin.toUpperCase() === String(gstin).toUpperCase()) || (norm(name) && norm(p.name) === norm(name)))) || null;
const phaseName = id => (D.phases.find(p => p._id === id) || {}).name || '-';
const activePhaseId = () => (D.phases.find(p => p.status === 'active') || {})._id || '';
const byKind = k => [...D.items].sort((a, b) => (b.kind === k) - (a.kind === k));
const put = (f, node) => f.insertBefore(node, f.querySelector('button.primary'));

// ---------- dashboard
PAGES.dash = async () => {
  const r = await api('/api/reports');
  const k = (l, v, c, sub) => h('div', { class: 'kpi', style: '--c:' + c }, h('small', {}, l), h('strong', {}, v), sub ? h('span', { class: 'kx' }, sub) : '');
  const mx = Math.max(1, ...r.months.map(m => Math.max(m.rev, Math.abs(m.profit))));
  const chart = h('div', { class: 'bars' }, r.months.map(m => h('div', { class: 'mo' }, h('div', { class: 'pair' },
    h('i', { style: `height:${m.rev / mx * 100}%;background:var(--sale)`, title: money(m.rev) }),
    h('i', { style: `height:${Math.abs(m.profit) / mx * 100}%;background:${m.profit >= 0 ? 'var(--invest)' : 'var(--expense)'}`, title: money(m.profit) })), h('small', {}, m.l))));
  const list = (rows, fn, empty) => rows.length ? rows.slice(0, 6).map(fn) : [h('div', { class: 'empty', style: 'padding:6px 0;text-align:left' }, empty)];
  const dl = await api('/api/deliveries'), dueNow = dl.filter(p => p.expected && p.expected.slice(0, 10) <= today());
  const banner = dueNow.length ? h('section', { style: 'border-color:var(--p2);margin:0 0 16px' }, h('b', {}, 'Delivery reminder'), ...dueNow.map(p => h('div', { class: 'li' }, (p.supplierName || 'Supplier') + (p.billNo ? ' · ' + p.billNo : '') + ' · ' + p.lines.map(l => l.name + ' × ' + l.qty).join(', '),
    h('span', { class: p.expected.slice(0, 10) < today() ? 'bad' : 'ok' }, p.expected.slice(0, 10) < today() ? 'overdue ' + fdate(p.expected) : 'due today')))) : '';
  return h('div', {}, banner,
    h('div', { class: 'kpis' }, k('Cash + bank', money(r.cash + r.bank), 'var(--sale)', 'Cash ' + money(r.cash) + ', bank ' + money(r.bank)), k('Stock value', money(r.stockRaw + r.stockFin), 'var(--invest)', 'Materials ' + money(r.stockRaw) + ', machines ' + money(r.stockFin)),
      k('Customers owe you', money(r.recvTotal), 'var(--p2)'), k('You owe suppliers', money(r.payTotal), 'var(--expense)')),
    h('div', { class: 'kpis', style: 'margin-top:12px' }, k('Sales this month', money(r.pl.revenue), 'var(--sale)', 'excluding GST'), k('Profit this month', money(r.pl.net), r.pl.net >= 0 ? 'var(--sale)' : 'var(--expense)', 'after expenses and salaries'),
      k('GST payable this month', money(r.gst.net), 'var(--invest)', 'output minus input'), k('Business worth', money(r.worth), 'var(--p1)', 'assets minus dues')),
    h('div', { class: 'grid2' },
      h('section', {}, h('h2', {}, 'Last 6 months'), h('div', { class: 'key' }, h('span', { style: '--c:var(--sale)' }, 'Sales'), h('span', { style: '--c:var(--invest)' }, 'Profit')), chart),
      h('section', {}, h('h2', {}, 'Needs attention'), h('b', {}, 'Deliveries on the way'),
        ...list(r.pending, p => h('div', { class: 'li' }, p.supplierName + (p.billNo ? ' · ' + p.billNo : ''), h('span', {}, p.expected ? fdate(p.expected) : 'no date')), 'Nothing pending.'),
        h('b', { style: 'margin-top:14px;display:block' }, 'Low stock'), ...list(r.low, i => h('div', { class: 'li bad' }, i.name, h('span', {}, i.qty + ' ' + i.unit)), 'Everything is above its reorder level.'))));
};

// ---------- sales
PAGES.sales = async () => {
  const rows = await api('/api/sales'), q = h('input', { placeholder: 'Search invoice or customer' }), body = h('div');
  const status = r => r.status === 'cancelled' ? tag('cancelled', 'var(--muted)') : r.total - r.paid <= 0.5 ? tag('paid', 'var(--sale)') : r.paid > 0.5 ? tag('part paid', 'var(--invest)') : tag('unpaid', 'var(--expense)');
  const draw = () => { const s = q.value.toLowerCase(); body.replaceChildren(tbl([['Invoice', r => r.no], ['Date', r => fdate(r.date)], ['Customer', r => r.customerName], ['Total', r => money(r.total), 'amt'],
    ['Due', r => r.status === 'cancelled' ? '-' : money(Math.max(0, r.total - r.paid)), 'amt'], ['', status],
    ['', r => acts(h('a', { class: 'btn', href: '/invoice/' + r._id, target: '_blank' }, 'Print'),
      r.status === 'active' && r.total - r.paid > 0.5 ? h('button', { class: 'btn', onclick: () => payAsk('sale', r) }, 'Mark paid') : '',
      A() && r.status === 'active' && r.paid > 0.5 ? h('button', { class: 'btn', onclick: async () => { if (confirm('Mark ' + r.no + ' as unpaid? The payments are reversed in the books.')) { try { await api('/api/sales/' + r._id + '/unpaid', 'POST'); await refresh(); } catch (e) { fail(e); } } } }, 'Mark unpaid') : '',
      A() && r.status === 'active' ? h('button', { class: 'btn danger', onclick: async () => { if (confirm('Cancel invoice ' + r.no + '? Stock returns and any payment is refunded in the books.')) { try { await api('/api/sales/' + r._id + '/cancel', 'POST'); await refresh(); } catch (e) { fail(e); } } } }, 'Cancel') : '')]],
    rows.filter(r => (r.no + ' ' + r.customerName).toLowerCase().includes(s)), 'No invoices yet.')); };
  q.oninput = draw; draw();
  const mineOnly = !A() && ME.dept === 'sales';
  return h('section', {}, head(mineOnly ? 'My sales' : 'Invoices', q, addBtn(mineOnly ? '+ New sale' : '+ New invoice', newSale)), body);
};
function newSale() {
  if (!D.set.state) return alert('First set your business details (state, GSTIN) under Team, Business settings, so GST is worked out correctly.');
  const custs = D.parties.filter(p => p.kind === 'customer'), ed = lineEd(byKind('finished'), { rate: 'sale' });
  const f = F([{ k: 'customer', l: 'Customer', t: 'select', o: [['', 'Walk-in customer'], ...custs.map(c => [c._id, c.name])] }, { k: 'customerName', l: 'Walk-in name (optional)' }, { k: 'date', l: 'Date', t: 'date', r: 1 },
    { k: 'place', l: 'Place of supply (walk-in)', t: 'select', o: STATES }, { k: 'payStatus', l: 'Payment', t: 'select', o: [['paid', 'Paid in full'], ['unpaid', 'Unpaid (credit)'], ['part', 'Part paid']] }, { k: 'mode', l: 'Received via', t: 'select', o: MODES }, { k: 'paid', l: 'Amount received (if part paid)', t: 'number' }, { k: 'note', l: 'Note', w: 1 }],
    { date: today(), place: D.set.state, payStatus: 'paid' }, async d => {
      const s = await api('/api/sales', 'POST', { ...d, lines: ed.get() }); await refresh();
      dlg.querySelector('.mb').replaceChildren(h('div', {}, h('p', {}, 'Invoice ' + s.no + ' saved. Total ' + money(s.total) + '.'), acts(h('a', { class: 'btn', href: '/invoice/' + s._id, target: '_blank' }, 'Print invoice'), h('button', { class: 'btn', onclick: () => dlg.close() }, 'Close'))));
    }, 'Save invoice');
  put(f, ed); const dlg = modal('New invoice', f);
}

// ---------- purchases and deliveries
async function setStatus(p, s) {
  if (s === 'received' && !confirm('Mark as received? The items will be added to stock.')) return;
  if (s === 'cancelled' && !confirm('Cancel this order?')) return;
  try { await api('/api/purchases/' + p._id + '/status', 'PATCH', { status: s }); await refresh(); } catch (e) { fail(e); }
}
const trackUrl = p => 'https://www.google.com/search?q=' + encodeURIComponent((p.carrier || '') + ' tracking ' + (p.tracking || ''));
function deliveryList(list, empty) {
  const late = p => p.expected && p.expected.slice(0, 10) < today(), now = p => p.expected && p.expected.slice(0, 10) === today();
  return h('div', {}, list.length ? list.map(p => h('div', { class: 'li dl' },
    h('div', {}, h('b', {}, p.supplierName || 'Supplier'), p.billNo ? ' · ' + p.billNo : '', h('span', { class: 'kx' }, p.lines.map(l => l.name + ' × ' + l.qty).join(', ')),
      h('span', { class: 'kx' }, (p.carrier || p.tracking ? (p.carrier || '') + ' ' + (p.tracking || '') + ' · ' : '') + (p.expected ? 'Expected ' + fdate(p.expected) : 'No delivery date yet'))),
    acts(tag(late(p) ? 'overdue' : now(p) ? 'due today' : p.status.replace('_', ' '), late(p) ? 'var(--expense)' : now(p) ? 'var(--p2)' : 'var(--invest)'),
      p.tracking ? h('a', { class: 'btn', href: trackUrl(p), target: '_blank' }, 'Track') : '', p.expected ? h('a', { class: 'btn', href: '/api/purchases/' + p._id + '/reminder.ics' }, 'Remind me') : '',
      h('button', { class: 'btn', onclick: () => setStatus(p, 'received') }, 'Received')))) : h('div', { class: 'empty' }, empty));
}
PAGES.deliveries = async () => h('section', {}, head('Deliveries on the way'), deliveryList(await api('/api/deliveries'), 'No deliveries pending.'));
PAGES.purchases = async () => {
  const rows = await api('/api/purchases'), open_ = p => ['ordered', 'in_transit'].includes(p.status), pend = rows.filter(open_);
  const st = p => tag(p.status.replace('_', ' '), p.status === 'received' ? 'var(--sale)' : p.status === 'cancelled' ? 'var(--muted)' : 'var(--invest)');
  return h('div', {}, h('section', {}, head('Deliveries on the way', addBtn('+ New order / invoice', newPurchase)), deliveryList(pend, 'No deliveries pending.')),
    h('section', {}, h('h2', {}, 'Orders and invoices'), tbl([['Date', p => fdate(p.date)], ['Supplier', p => h('div', {}, p.supplierName, h('small', {}, (p.billNo || 'no invoice no') + ' · ' + phaseName(p.phase)))], ['Status', st], ['Total', p => money(p.total), 'amt'],
      ['Due', p => p.status === 'cancelled' ? '-' : money(Math.max(0, p.total - p.paid)), 'amt'],
      ['', p => acts(p.invoiceFile ? h('a', { class: 'btn', href: '/api/files/' + p.invoiceFile, target: '_blank' }, 'Invoice') : '', p.receiptFile ? h('a', { class: 'btn', href: '/api/files/' + p.receiptFile, target: '_blank' }, 'Receipt') : '',
        p.status !== 'cancelled' && p.total - p.paid > 0.5 ? h('button', { class: 'btn', onclick: () => payAsk('purchase', p) }, 'Pay') : '',
        open_(p) ? h('button', { class: 'btn', onclick: () => shipModal(p) }, 'Delivery') : '', open_(p) ? h('button', { class: 'btn danger', onclick: () => setStatus(p, 'cancelled') }, 'Cancel') : '')]], rows, 'No orders yet.')));
};
function newPurchase() {
  const sups = D.parties.filter(p => p.kind === 'supplier'); let fileId = '';
  const ed = lineEd(byKind('raw'), { rate: 'purchase', allowNew: true });
  const f = F([{ k: 'supplier', l: 'Supplier', t: 'select', o: [['', 'Other / not listed'], ...sups.map(c => [c._id, c.name])] }, { k: 'supplierName', l: 'Supplier name (if not listed)' }, { k: 'billNo', l: 'Invoice / order no' },
    { k: 'date', l: 'Invoice date', t: 'date', r: 1 }, { k: 'phase', l: 'Phase', t: 'select', o: D.phases.length ? D.phases.map(p => [p._id, p.name]) : [['', 'No phase yet']] }, { k: 'expected', l: 'Expected delivery (if known)', t: 'date' }, { k: 'note', l: 'Note', w: 1 }],
    { date: today(), phase: activePhaseId() }, async d => { await api('/api/purchases', 'POST', { ...d, lines: ed.get(), invoiceFile: fileId }); dlg.close(); await refresh(); }, 'Save order');
  put(f, ed);
  f.insertBefore(picker('invoice', 'Supplier invoice (photo or PDF)', j => {
    fileId = j.id; const e = j.extracted; if (!e) return;
    const sup = matchParty(e.supplierGstin, e.supplierName, 'supplier'); f.supplier.value = sup ? sup._id : ''; f.supplierName.value = sup ? '' : (e.supplierName || '');
    if (e.invoiceNo) f.billNo.value = e.invoiceNo; if (e.date) f.date.value = e.date;
    ed.set((e.lines || []).map(l => { const it = matchItem(l.description); return { item: it ? it._id : '__new', name: it ? '' : l.description, qty: l.qty, rate: l.rate, gstRate: GST.includes(Number(l.gstRate)) ? Number(l.gstRate) : 18 }; }));
  }), f.firstChild);
  const dlg = modal('New order / invoice', f);
}
function payAsk(kind, r) {
  let fileId = '';
  const f = F([{ k: 'amount', l: 'Amount', t: 'number', r: 1 }, { k: 'mode', l: 'Paid via', t: 'select', o: MODES }, { k: 'date', l: 'Date', t: 'date' }, { k: 'txnId', l: 'Transaction / UTR no' }, { k: 'payee', l: kind === 'sale' ? 'Received from' : 'Paid to' }, { k: 'note', l: 'Note', w: 1 }],
    { amount: r2(r.total - r.paid), date: today(), payee: kind === 'sale' ? r.customerName : r.supplierName }, async d => { await api('/api/pay', 'POST', { ...d, kind, ref: r._id, file: fileId }); dlg.close(); await refresh(); }, 'Save payment');
  if (A()) f.insertBefore(picker('payment', 'Payment screenshot', j => {
    fileId = j.id; const e = j.extracted; if (!e) return;
    if (e.amount) f.amount.value = e.amount; if (e.date) f.date.value = e.date; if (e.txnId) f.txnId.value = e.txnId; if (e.payeeName && kind === 'purchase') f.payee.value = e.payeeName; if (e.payerName && kind === 'sale') f.payee.value = e.payerName;
    if (e.status && !/succ|complet/i.test(e.status)) alert('The screenshot says this payment is "' + e.status + '". Check it before saving.');
  }), f.firstChild);
  const dlg = modal(kind === 'sale' ? 'Mark as paid' : 'Record payment', f);
}
function shipModal(p) {
  if (p.paid <= 0) return alert('Record the payment first. Delivery details can be added after payment.');
  let fileId = p.receiptFile || '';
  const f = F([{ k: 'carrier', l: 'Delivery company', ph: 'for example VRL Logistics' }, { k: 'tracking', l: 'Tracking / LR number' }, { k: 'dispatched', l: 'Dispatch date', t: 'date' }, { k: 'expected', l: 'Expected delivery date (required)', t: 'date', r: 1 }],
    { carrier: p.carrier, tracking: p.tracking, dispatched: (p.dispatched || '').slice(0, 10), expected: (p.expected || '').slice(0, 10) }, async d => { await api('/api/purchases/' + p._id + '/shipment', 'POST', { ...d, receiptFile: fileId }); dlg.close(); await refresh(); }, 'Save delivery details');
  f.insertBefore(picker('receipt', 'Delivery receipt (photo or PDF)', j => {
    fileId = j.id; const e = j.extracted || {};
    if (e.carrier) f.carrier.value = e.carrier; if (e.trackingNo) f.tracking.value = e.trackingNo; if (e.dispatchDate) f.dispatched.value = e.dispatchDate;
    if (e.expectedDate) f.expected.value = e.expectedDate; else { f.expected.focus(); alert('The delivery date is not on the receipt. Please enter the expected delivery date.'); }
  }), f.firstChild);
  const dlg = modal('Delivery details', f);
}

// ---------- production
PAGES.production = async () => {
  const runs = await api('/api/production');
  return h('section', {}, head('Daily production', addBtn("+ Add today's units", newRun)), tbl([['Date', r => fdate(r.date)], ['Product', r => r.productName], ['Units made', r => r.qty, 'amt'],
    ...(A() ? [['Phase', r => phaseName(r.phase)], ['Cost per unit', r => money(r.unitCost), 'amt']] : [])], runs, 'No production recorded yet.'));
};
function newRun() {
  const fin = D.items.filter(i => i.kind === 'finished' && i.bom?.length);
  if (!fin.length) return alert('Add a finished product with its bill of materials in Stock first.');
  const prev = h('div', { class: 'tot', style: 'text-align:left;font-weight:500' });
  const f = F([{ k: 'product', l: 'Product', t: 'select', o: fin.map(i => [i._id, i.name]) }, { k: 'qty', l: 'Total units made today', t: 'number', r: 1 }, { k: 'date', l: 'Date', t: 'date' },
    ...(A() ? [{ k: 'phase', l: 'Phase', t: 'select', o: D.phases.length ? D.phases.map(p => [p._id, p.name]) : [['', 'No phase yet']] }] : []), { k: 'note', l: 'Note', w: 1 }],
    { date: today(), phase: activePhaseId() }, async d => { await api('/api/production', 'POST', d); dlg.close(); await refresh(); }, "Save today's production");
  const upd = () => { const it = fin.find(i => i._id === f.product.value), q = num(f.qty.value);
    prev.replaceChildren(...(it ? it.bom.map(b => { const raw = D.items.find(x => x._id === b.item), need = r2(b.qty * (q || 1)); return h('div', { class: raw && raw.qty >= need ? 'ok' : 'bad' }, `${raw ? raw.name : 'Missing item'}: need ${need}, have ${raw ? raw.qty : 0}`); }) : [])); };
  f.oninput = upd; f.onchange = upd; put(f, prev); upd(); const dlg = modal("Add today's production", f);
}

// ---------- stock
PAGES.stock = async () => {
  const its = D.items, low = i => i.reorder > 0 && i.qty <= i.reorder;
  const value = k => its.filter(i => i.kind === k).reduce((a, i) => a + Math.max(i.qty, 0) * (i.avgCost || 0), 0);
  const cols = [['Item', i => h('div', {}, i.name, h('small', {}, (i.kind === 'finished' ? 'Finished product' : 'Raw material') + (i.code ? ' · ' + i.code : '')))], ['Stock', i => i.qty + ' ' + i.unit, 'amt'],
    ...(A() ? [['Avg cost', i => money(i.avgCost), 'amt'], ['Value', i => money(i.qty * i.avgCost), 'amt']] : []), ['', i => low(i) ? tag('low', 'var(--expense)') : '']];
  const tools = A() ? [h('button', { class: 'btn', onclick: adjust }, 'Count / adjust'), addBtn('+ Add item', () => editItem())] : [];
  return h('section', {}, head('Stock', ...tools), A() && its.length ? h('p', { class: 'dim', style: 'margin:0 0 8px' }, `Materials ${money(value('raw'))} · Finished machines ${money(value('finished'))}`) : '',
    tbl(cols, its, 'No items yet.', A() ? editItem : null),
    A() && !its.length ? h('div', { class: 'acts' }, h('button', { class: 'btn', onclick: async () => { try { await api('/api/seed', 'POST'); await refresh(); } catch (e) { fail(e); } } }, 'Load sample items (solar zatka machine)')) : '');
};
function adjust() {
  ask('Count / adjust stock', [{ k: 'item', l: 'Item', t: 'select', o: D.items.map(i => [i._id, i.name + ' (now ' + i.qty + ')']) }, { k: 'counted', l: 'Counted quantity', t: 'number', r: 1 }, { k: 'note', l: 'Reason', w: 1 }], {},
    d => api('/api/items/' + d.item + '/adjust', 'POST', d), 'Save count');
}
function editItem(it) {
  const ed = lineEd(D.items.filter(i => i.kind === 'raw' && i._id !== it?._id), { init: it?.bom || [] });
  const fields = [{ k: 'name', l: 'Name', r: 1, w: 1 }, { k: 'kind', l: 'Type', t: 'select', o: [['raw', 'Raw material'], ['finished', 'Finished product']] }, { k: 'unit', l: 'Unit' }, { k: 'code', l: 'Code / SKU' }, { k: 'hsn', l: 'HSN code' },
    { k: 'gstRate', l: 'GST %', t: 'select', o: GST }, { k: 'salePrice', l: 'Selling price (excl. GST)', t: 'number' }, { k: 'labour', l: 'Assembly labour per unit', t: 'number' }, { k: 'warrantyMonths', l: 'Warranty (months)', t: 'number' },
    { k: 'reorder', l: 'Reorder level', t: 'number' }, ...(it ? [] : [{ k: 'openingQty', l: 'Opening stock', t: 'number' }, { k: 'openingCost', l: 'Cost per unit', t: 'number' }])];
  const f = F(fields, it || { kind: 'raw', unit: 'pcs', gstRate: 18 }, async d => { await api(it ? '/api/items/' + it._id : '/api/items', it ? 'PUT' : 'POST', { ...d, bom: ed.get() }); dlg.close(); await refresh(); }, 'Save item');
  put(f, h('small', { class: 'wide', style: 'grid-column:1/-1' }, 'Bill of materials per finished unit (finished products only)')); put(f, ed);
  const dlg = modal(it ? 'Edit item' : 'New item', f);
}

// ---------- parties
PAGES.parties = async () => {
  let kind = 'customer'; const body = h('div'), tabs = h('div', { class: 'tabs' });
  const form = p => ask(p ? 'Edit ' + p.name : 'New ' + kind, [{ k: 'name', l: 'Name', r: 1, w: 1 }, { k: 'phone', l: 'Phone' }, { k: 'gstin', l: 'GSTIN' }, { k: 'state', l: 'State', t: 'select', o: [['', 'Select state'], ...STATES] }, { k: 'address', l: 'Address', w: 1 }],
    p || { state: D.set.state }, d => api(p ? '/api/parties/' + p._id : '/api/parties', p ? 'PATCH' : 'POST', { ...d, kind }));
  const draw = () => {
    tabs.replaceChildren(...[['customer', 'Customers'], ['supplier', 'Suppliers']].map(([k, l]) => h('button', { class: kind === k ? 'on' : '', onclick: () => { kind = k; draw(); } }, l)));
    body.replaceChildren(tbl([['Name', p => p.name], ['Phone', p => p.phone || '-'], ['GSTIN', p => p.gstin || '-'], ['State', p => p.state || '-'],
      [kind === 'customer' ? 'Owes you' : 'You owe', p => p.balance > 0.5 ? h('span', { class: kind === 'customer' ? 'ok' : 'bad' }, money(p.balance)) : '-', 'amt']], D.parties.filter(p => p.kind === kind), 'Nothing here yet.', form));
  };
  draw(); return h('section', {}, head('Customers and suppliers', tabs, addBtn('+ Add', () => form())), body);
};

// ---------- money
PAGES.money = async () => {
  let c = 'expenses'; const body = h('div'), tabs = h('div', { class: 'tabs' });
  const cfg = () => ({
    expenses: { add: 'expense', fields: [{ k: 'category', l: 'Category', t: 'select', o: CATS }, { k: 'phase', l: 'Phase', t: 'select', o: [['', 'Current phase'], ...D.phases.map(p => [p._id, p.name])] }, { k: 'amount', l: 'Amount', t: 'number', r: 1 }, { k: 'mode', l: 'Paid via', t: 'select', o: MODES }, { k: 'date', l: 'Date', t: 'date' }, { k: 'note', l: 'Note', w: 1 }],
      cols: [['Date', r => fdate(r.date)], ['Category', r => r.category], ['Note', r => r.note || ''], ['Via', r => r.mode], ['Amount', r => money(r.amount), 'amt']] },
    fund: { add: 'fund entry', fields: [{ k: 'type', l: 'Type', t: 'select', o: FUND }, { k: 'amount', l: 'Amount', t: 'number', r: 1 }, { k: 'mode', l: 'Into / from', t: 'select', o: MODES }, { k: 'date', l: 'Date', t: 'date' }, { k: 'note', l: 'Note', w: 1 }],
      cols: [['Date', r => fdate(r.date)], ['Type', r => (FUND.find(f => f[0] === r.type) || [])[1]], ['Note', r => r.note || ''], ['Via', r => r.mode], ['Amount', r => money(r.amount), 'amt']] },
    salary: { add: 'salary payment', fields: [{ k: 'employee', l: 'Staff member', t: 'select', o: D.emps.map(e => [e._id, e.name]) }, { k: 'type', l: 'Type', t: 'select', o: [['salary', 'Salary'], ['advance', 'Advance'], ['bonus', 'Bonus']] }, { k: 'month', l: 'For month', t: 'month' },
      { k: 'amount', l: 'Amount', t: 'number', r: 1 }, { k: 'mode', l: 'Paid via', t: 'select', o: MODES }, { k: 'date', l: 'Date', t: 'date' }, { k: 'note', l: 'Note', w: 1 }],
      cols: [['Date', r => fdate(r.date)], ['Staff', r => r.employeeName], ['Month', r => r.month], ['Type', r => r.type], ['Amount', r => money(r.amount), 'amt']] },
  })[c];
  const draw = async () => {
    const rows = await api('/api/m/' + c), g = cfg(), del = r => h('button', { class: 'del', 'aria-label': 'Delete', onclick: async () => { if (confirm('Delete this record?')) { await api('/api/m/' + c + '/' + r._id, 'DELETE'); draw(); } } }, '✕');
    tabs.replaceChildren(...[['expenses', 'Expenses'], ['fund', 'Company fund'], ['salary', 'Salary']].map(([k, l]) => h('button', { class: c === k ? 'on' : '', onclick: () => { c = k; draw(); } }, l)));
    addB.onclick = () => {
      if (c === 'salary' && !D.emps.length) return alert('Add your staff under Team first.');
      const dlg = ask('Add ' + g.add, g.fields, { date: today(), month: today().slice(0, 7), amount: c === 'salary' ? D.emps[0]?.monthlySalary || '' : '' }, d => api('/api/m/' + c, 'POST', d));
      if (c === 'salary') { const f = dlg.querySelector('form'); f.employee.onchange = () => { const e = D.emps.find(x => x._id === f.employee.value); if (e) f.amount.value = e.monthlySalary || ''; }; }
    };
    const total = rows.reduce((a, r) => a + r.amount, 0);
    body.replaceChildren(h('p', { class: 'dim', style: 'margin:0 0 8px' }, 'Showing latest ' + rows.length + ' · total ' + money(total)), c !== 'salary' ? h('button', { class: 'btn', style: 'margin-bottom:8px', onclick: dedupe }, 'Remove duplicate entries') : '', tbl([...g.cols, ['', del]], rows, 'No records yet.'));
  };
  const addB = addBtn('+ Add', () => {}); draw();
  return h('section', {}, head('Money', tabs, addB), body);
};

// ---------- reports
PAGES.reports = async () => {
  const from = h('input', { type: 'date', value: today().slice(0, 8) + '01' }), to = h('input', { type: 'date', value: today() }), out = h('div');
  const kv = rows => h('table', { style: 'min-width:0' }, h('tbody', {}, rows.map(([l, v, b]) => h('tr', {}, h('td', { style: b ? 'font-weight:700' : '' }, l), h('td', { class: 'amt', style: b ? 'font-weight:800' : '' }, money(v))))));
  const dues = (title, rows) => h('section', {}, h('h2', {}, title), tbl([['Party', r => r.name || '-'], ['Ref', r => r.no || '-'], ['Due', r => money(r.due), 'amt']], rows.slice(0, 15), 'Nothing outstanding.'));
  const go = async () => {
    const r = await api(`/api/reports?from=${from.value}&to=${to.value}`), pl = r.pl;
    out.replaceChildren(
      h('section', {}, h('h2', {}, `Profit and loss: ${fdate(r.from)} to ${fdate(r.to)}`), kv([['Sales (excl. GST)', pl.revenue], ['Cost of materials sold', -pl.cogs], ['Gross profit', pl.gross, 1], ...Object.entries(pl.expBy).map(([k, v]) => ['Expense: ' + k, -v]), ['Salaries and advances paid', -pl.salTotal], ['Net profit', pl.net, 1]])),
      h('section', {}, h('h2', {}, 'GST summary for this period'), kv([['Output CGST', r.gst.out.cgst], ['Output SGST', r.gst.out.sgst], ['Output IGST', r.gst.out.igst], ['Total GST collected', r.gst.out.total, 1], ['Input GST on purchases received', r.gst.in], ['Net GST payable', r.gst.net, 1]]),
        h('small', {}, 'Estimate from your entries. Confirm with your CA before filing returns.')),
      h('section', {}, h('h2', {}, 'Business position today'), kv([['Raw materials in stock', r.stockRaw], ['Finished machines in stock', r.stockFin], ['Customers owe you', r.recvTotal], ['Advances paid to suppliers', r.advances], ['Cash in hand', r.cash], ['Bank / UPI', r.bank],
        ['Less: you owe suppliers', -r.payTotal], ['Less: loans', -r.loans], ['Business worth', r.worth, 1], ['Capital you put in (net of drawings)', r.capital], ['Growth over capital', r2(r.worth - r.capital), 1]])),
      h('div', { class: 'grid2' }, dues('Customers who owe you', r.recv), dues('Suppliers you owe', r.pay)));
  };
  return h('div', {}, h('section', { class: 'no-print' }, h('div', { class: 'page-h' }, h('h2', {}, 'Reports'), from, to, addBtn('Show', go), h('button', { class: 'btn', onclick: () => print() }, 'Print / PDF')),
    h('div', { class: 'acts', style: 'margin:0' }, ['sales', 'purchases', 'expenses', 'stock'].map(k => h('a', { class: 'btn', href: '/api/export/' + k, download: '' }, 'Download ' + k + ' CSV')))), out, await go().then(() => '') );
};

// ---------- team and settings
PAGES.team = async () => {
  const cred = c => modal('Login for ' + c.name, h('div', { class: 'cred' }, h('div', {}, 'ID: ', h('code', {}, c.loginId), '  Password: ', h('code', {}, c.password)), h('small', {}, 'Copy it now. The password is shown only once.'),
    h('button', { class: 'btn', onclick: () => navigator.clipboard.writeText('AuraVolt login\nID: ' + c.loginId + '\nPassword: ' + c.password) }, 'Copy')));
  const run = fn => async () => { try { await fn(); await refresh(); } catch (e) { fail(e); } };
  const form = e => ask(e ? 'Edit ' + e.name : 'New staff member', [{ k: 'name', l: 'Name', r: 1 }, { k: 'designation', l: 'Role', r: 1 }, { k: 'phone', l: 'Phone' }, { k: 'monthlySalary', l: 'Monthly salary', t: 'number' }, { k: 'dept', l: 'Department', t: 'select', o: [['workshop', 'Workshop (production and deliveries)'], ['sales', 'Sales (sales screen only)']] }], e || {},
    async d => { if (e) await api('/api/employees/' + e._id, 'PATCH', d); else cred(await api('/api/employees', 'POST', d)); }, e ? 'Save' : 'Create staff login');
  const set = D.set, sf = F([{ k: 'name', l: 'Business name', r: 1 }, { k: 'gstin', l: 'GSTIN' }, { k: 'state', l: 'State', t: 'select', o: [['', 'Select state'], ...STATES] }, { k: 'phone', l: 'Phone' }, { k: 'prefix', l: 'Invoice prefix' }, { k: 'address', l: 'Address', w: 1 },
    { k: 'investorName', l: 'Investor name' }, { k: 'opsName', l: 'Operations partner name' }, { k: 'investorPct', l: 'Investor share of profit (%)', t: 'number' }, { k: 'cert', l: 'Certification note on invoices (for example BIS licence number)', w: 1 }], set, async d => { await api('/api/settings', 'PUT', d); await refs(); $('biz').textContent = d.name || 'ERP'; alert('Saved'); }, 'Save business details');
  return h('div', {}, h('section', {}, head('Staff', addBtn('+ Add staff', () => form())), tbl([['Name', e => h('div', {}, e.name, h('small', {}, e.designation + ' · ' + (e.dept || 'workshop')))], ['Login ID', e => e.loginId || 'not set'], ['Salary', e => money(e.monthlySalary), 'amt'], ['Status', e => tag(e.status, e.status === 'active' ? 'var(--sale)' : 'var(--muted)')],
    ['', e => acts(h('button', { class: 'btn', onclick: run(async () => cred(await api('/api/employees/' + e._id + '/reset', 'POST'))) }, 'Reset password'), h('button', { class: 'btn', onclick: () => form(e) }, 'Edit'),
      h('button', { class: 'btn', onclick: run(() => api('/api/employees/' + e._id, 'PATCH', { status: e.status === 'active' ? 'inactive' : 'active' })) }, e.status === 'active' ? 'Deactivate' : 'Activate'),
      h('button', { class: 'btn danger', onclick: run(async () => { if (confirm('Delete ' + e.name + '? Their personal records are deleted too.')) await api('/api/employees/' + e._id, 'DELETE'); }) }, 'Delete'))]], D.emps, 'No staff yet.')),
    h('section', {}, h('h2', {}, 'Business details'), sf));
};

// ---------- phases and profit split
async function dedupe() {
  try {
    const a = await api('/api/m/dedupe', 'POST', { dryRun: true }); if (!a.found) return alert('No exact duplicates found.');
    if (confirm(a.found + ' entries are exact copies of another entry (same date, amount, type, mode and note). Delete the copies and keep one of each?')) { const b = await api('/api/m/dedupe', 'POST', {}); alert(b.removed + ' duplicate entries removed.'); route(); }
  } catch (e) { fail(e); }
}
PAGES.phases = async () => {
  const r = await api('/api/phases'), pays = r.payouts;
  const payout = (p, due) => ask('Record payout: ' + p.name, [{ k: 'partner', l: 'Paid to', t: 'select', o: [['investor', r.investorName], ['ops', r.opsName]] }, { k: 'amount', l: 'Amount', t: 'number', r: 1 }, { k: 'mode', l: 'Paid via', t: 'select', o: MODES }, { k: 'date', l: 'Date', t: 'date' }, { k: 'note', l: 'Note', w: 1 }],
    { partner: 'investor', amount: Math.max(0, due), date: today() }, d => api('/api/payouts', 'POST', { ...d, phase: p._id }), 'Save payout');
  const start = () => ask('Start a new phase', [{ k: 'name', l: 'Phase name', r: 1 }, { k: 'start', l: 'Start date', t: 'date', r: 1 }, { k: 'plannedUnits', l: 'Units planned', t: 'number' }], { start: today(), name: 'Phase ' + (r.phases.length + 1) }, d => api('/api/phases', 'POST', d), 'Start phase');
  const card = p => {
    const invDue = r2(p.investor - p.investorPaid), opsDue = r2(p.ops - p.opsPaid), mine = pays.filter(x => String(x.phase) === p._id);
    return h('section', {}, head(p.name + (p.status === 'active' ? ' (current)' : ''), h('small', {}, fdate(p.start) + (p.end ? ' to ' + fdate(p.end) : ' onwards')), h('button', { class: 'btn', onclick: () => payout(p, invDue) }, 'Record payout')),
      kv([['Units built', p.built + (p.plannedUnits ? ' of ' + p.plannedUnits + ' planned' : '')], ['Units sold', p.sold + ' of ' + p.built], ['Unsold units in stock', p.left + ' (cost ' + money(p.costLeft) + ')'], ['Materials ordered (excl. GST)', p.ordered],
        ['Sales (excl. GST)', p.revenue], ['Cost of units sold', -p.cogs], ['Expenses and salaries in this phase', p.overhead], ['Share counted for units sold', -p.recognised], ['Profit so far', p.profit, 1],
        [r.investorName + ' (' + r.pct + '%)', p.investor, 1], ['Paid so far', p.investorPaid], ['Still to pay', invDue], [r.opsName + ' (' + (100 - r.pct) + '%)', p.ops, 1], ['Paid so far', p.opsPaid], ['Still to pay', opsDue]]),
      mine.length ? h('div', { style: 'margin-top:10px' }, h('b', {}, 'Payouts'), ...mine.map(x => h('div', { class: 'li' }, fdate(x.date) + '  ' + (x.partner === 'investor' ? r.investorName : r.opsName),
        h('span', {}, money(x.amount) + ' ', h('button', { class: 'del', 'aria-label': 'Delete payout', onclick: async () => { if (confirm('Delete this payout record?')) { await api('/api/payouts/' + x._id, 'DELETE'); route(); } } }, '✕'))))) : '');
  };
  return h('div', {}, h('section', {}, head('Phases and profit split', addBtn('+ Start new phase', start)),
    h('p', { class: 'dim', style: 'margin:0' }, 'Orders, production and expenses go to the current phase, and sales use the oldest unsold units first. Profit counts only the units sold: their sales, minus their cost, minus the matching share of the phase expenses and salaries. It is split ' + r.pct + ':' + (100 - r.pct) + ' between ' + r.investorName + ' and ' + r.opsName + '.')),
    ...(r.phases.length ? r.phases.map(card) : [h('section', {}, h('div', { class: 'empty' }, 'No phases yet. Start Phase 1 to begin tracking profit by phase.'))]),
    r.other ? h('section', {}, h('h2', {}, 'Before phases (opening stock)'), kv([['Units sold', String(r.other.sold)], ['Sales (excl. GST)', r.other.revenue], ['Cost', -r.other.cogs], ['Profit', r.other.profit, 1]])) : '');
};

// ---------- import
PAGES.import = async () => {
  const ta = h('textarea', { rows: 10, placeholder: 'Paste the JSON from Gemini here', style: 'font-family:monospace;font-size:12px', spellcheck: 'false' }), out = h('div');
  const file = h('input', { type: 'file', accept: '.json,.txt' }); file.onchange = async () => { ta.value = await file.files[0].text(); };
  const parse = () => { try { return JSON.parse(ta.value.replace(/```json|```/g, '').trim()); } catch { throw new Error('That is not valid JSON. Ask Gemini to output only the JSON, with nothing before or after it.'); } };
  const show = r => out.replaceChildren(h('div', { style: 'margin-top:12px' },
    r.errors.length ? h('div', {}, h('p', { class: 'bad' }, 'Nothing was imported. Fix these problems first:'), ...r.errors.map(e => h('div', { class: 'li bad' }, e)), r.moreErrors ? h('small', {}, '...and ' + r.moreErrors + ' more') : '')
      : h('p', { class: 'ok' }, (r.dryRun ? 'Looks good. Ready to import: ' : 'Imported: ') + `${r.counts.items} items, ${r.counts.parties} parties, ${r.counts.expenses} expenses, ${r.counts.fund} fund entries.` + (Object.values(r.skipped).some(Boolean) ? ` Skipped ${Object.values(r.skipped).reduce((a, b) => a + b, 0)} records that already exist.` : ''))));
  const run = async dry => { try { const r = await api('/api/import', 'POST', { data: parse(), dryRun: dry }); show(r); if (!dry && r.ok) { await refs(); ta.value = ''; } } catch (e) { out.replaceChildren(h('p', { class: 'bad' }, e.message)); } };
  const copy = h('button', { class: 'btn', onclick: async () => { try { await navigator.clipboard.writeText(await (await fetch('/gemini-prompt.txt')).text()); copy.textContent = 'Copied. Paste it into Gemini'; } catch { location.href = '/gemini-prompt.txt'; } } }, 'Copy the Gemini prompt');
  return h('section', {}, head('Import data'),
    h('p', { class: 'dim', style: 'margin-top:0' }, '1. Copy the prompt and paste it into Gemini, in the chat that has your data. 2. Paste Gemini\'s answer here. 3. Tap Check data, then Import. It brings in items with opening stock and bill of materials, customers and suppliers, expenses and company fund. Past invoices are not imported. Run each batch only once, because expenses and fund entries are not checked for duplicates.'),
    h('div', { class: 'acts' }, copy, file), ta, h('div', { class: 'acts', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => run(true) }, 'Check data'), addBtn('Import', () => run(false))), out);
};

// ---------- router and boot
function route() {
  const nav = NAV[navKey()], def = nav[0][0], p = (location.hash || '#/').slice(2) || def, ok = nav.some(n => n[0] === p) && PAGES[p], page = ok ? p : def;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.p === page));
  $('title').textContent = (nav.find(n => n[0] === page) || [])[1]; const v = $('view'); v.replaceChildren(h('div', { class: 'empty' }, 'Loading...'));
  PAGES[page]().then(el => v.replaceChildren(el)).catch(e => v.replaceChildren(h('div', { class: 'empty' }, e.message)));
}
(async () => {
  try { ME = await api('/api/session'); await refs(); } catch { return; }
  $('who').textContent = ME.name; $('biz').textContent = D.set.name || 'ERP';
  $('install').onclick = async () => { if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; $('install').hidden = true; } };
  if (deferredInstall) $('install').hidden = false;
  NAV[navKey()].forEach(([p, l, ic]) => { const b = h('button', { 'data-p': p, onclick: () => p === 'me' ? (location.href = '/me') : (location.hash = '#/' + p) }); b.innerHTML = svg(ic); b.append(h('em', {}, l)); $('nav').append(b); });
  addEventListener('hashchange', route); route();
})();
