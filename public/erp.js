let ME, D = { items: [], parties: [], emps: [], set: {} };
const A = () => ME.role === 'admin';
const today = () => new Date().toISOString().slice(0, 10);
const GST = [0, 5, 12, 18, 28];
const MODES = [['cash', 'Cash'], ['bank', 'Bank / UPI']];
const CATS = ['Rent', 'Electricity', 'Transport', 'Packaging', 'Tools and repairs', 'Marketing', 'Professional fees', 'Other'];
const FUND = [['capital_in', 'Capital introduced'], ['drawing', 'Owner drawing'], ['loan_in', 'Loan taken'], ['loan_repay', 'Loan repaid']];
const PAGES = {};
const NAV = {
  admin: [['dash', 'Dashboard', 'grid'], ['sales', 'Sales', 'cart'], ['purchases', 'Purchases', 'truck'], ['production', 'Production', 'gear'], ['stock', 'Stock', 'box'], ['parties', 'Parties', 'users'], ['money', 'Money', 'rupee'], ['reports', 'Reports', 'chart'], ['team', 'Team', 'list']],
  employee: [['sales', 'Sales', 'cart'], ['production', 'Production', 'gear'], ['stock', 'Stock', 'box'], ['deliveries', 'Deliveries', 'truck'], ['me', 'My money', 'wallet']],
};
const opt = (a, sel) => a.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, ...(String(v) === String(sel) ? { selected: '' } : {}) }, l); });
const fail = e => alert(e.message);
const refresh = async () => { await refs(); route(); };
async function refs() {
  const [items, parties, set, emps] = await Promise.all([api('/api/items'), api('/api/parties'), api('/api/settings'), A() ? api('/api/employees') : []]);
  D = { items, parties, set, emps };
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
  const calc = () => { const t = rows.filter(r => r.on).reduce((a, r) => a + num(r.q.value) * num(r.r?.value) * (1 + num(r.g?.value) / 100), 0); tot.textContent = o.rate ? 'Total incl. GST: ' + money(t) : ''; };
  const plus = h('button', { type: 'button', class: 'btn', onclick: () => add() }, '+ Add item');
  function add(v) {
    const r = { on: true }, s = h('select', {}, opt(items.map(i => [i._id, i.name]), v?.item)), kids = [s];
    r.s = s; r.q = h('input', { type: 'number', step: 'any', min: '0', placeholder: 'Qty', value: v?.qty ?? '' }); kids.push(r.q);
    if (o.rate) { r.r = h('input', { type: 'number', step: 'any', min: '0', placeholder: 'Rate', value: v?.rate ?? '' }); r.g = h('select', {}, opt(GST, v?.gstRate ?? 18)); kids.push(r.r, r.g); }
    const fill = () => { const it = items.find(i => i._id === s.value); if (it && o.rate) { r.r.value = o.rate === 'sale' ? it.salePrice || '' : it.avgCost || ''; r.g.value = it.gstRate; } calc(); };
    s.onchange = fill; if (!v) fill();
    const row = h('div', { class: 'lrow' }, kids, h('button', { type: 'button', class: 'del', 'aria-label': 'Remove line', onclick: () => { r.on = false; row.remove(); calc(); } }, '✕'));
    [r.q, r.r, r.g].forEach(x => x && (x.oninput = calc)); rows.push(r); box.insertBefore(row, plus);
  }
  box.append(plus, tot); (o.init?.length ? o.init : [null]).forEach(v => add(v || undefined)); calc();
  box.get = () => rows.filter(r => r.on).map(r => ({ item: r.s.value, qty: r.q.value, ...(o.rate ? { rate: r.r.value, gstRate: r.g.value } : {}) }));
  return box;
}
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
  return h('div', {},
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
const payAsk = (kind, r) => ask('Record payment', [{ k: 'amount', l: 'Amount', t: 'number', r: 1 }, { k: 'mode', l: 'Paid via', t: 'select', o: MODES }, { k: 'date', l: 'Date', t: 'date' }],
  { amount: r2(r.total - r.paid), date: today() }, d => api('/api/pay', 'POST', { ...d, kind, ref: r._id }), 'Save payment');
PAGES.sales = async () => {
  const rows = await api('/api/sales'), q = h('input', { placeholder: 'Search invoice or customer' }), body = h('div');
  const status = r => r.status === 'cancelled' ? tag('cancelled', 'var(--muted)') : r.total - r.paid > 0.5 ? tag('due', 'var(--expense)') : tag('paid', 'var(--sale)');
  const draw = () => { const s = q.value.toLowerCase(); body.replaceChildren(tbl([['Invoice', r => r.no], ['Date', r => fdate(r.date)], ['Customer', r => r.customerName], ['Total', r => money(r.total), 'amt'],
    ['Due', r => r.status === 'cancelled' ? '-' : money(Math.max(0, r.total - r.paid)), 'amt'], ['', status],
    ['', r => acts(h('a', { class: 'btn', href: '/invoice/' + r._id, target: '_blank' }, 'Print'),
      r.status === 'active' && r.total - r.paid > 0.5 ? h('button', { class: 'btn', onclick: () => payAsk('sale', r) }, 'Receive') : '',
      A() && r.status === 'active' ? h('button', { class: 'btn danger', onclick: async () => { if (confirm('Cancel invoice ' + r.no + '? Stock returns and any payment is refunded in the books.')) { try { await api('/api/sales/' + r._id + '/cancel', 'POST'); await refresh(); } catch (e) { fail(e); } } } }, 'Cancel') : '')]],
    rows.filter(r => (r.no + ' ' + r.customerName).toLowerCase().includes(s)), 'No invoices yet.')); };
  q.oninput = draw; draw();
  return h('section', {}, head('Invoices', q, addBtn('+ New invoice', newSale)), body);
};
function newSale() {
  if (!D.set.state) return alert('First set your business details (state, GSTIN) under Team, Business settings, so GST is worked out correctly.');
  const custs = D.parties.filter(p => p.kind === 'customer'), ed = lineEd(byKind('finished'), { rate: 'sale' });
  const f = F([{ k: 'customer', l: 'Customer', t: 'select', o: [['', 'Walk-in customer'], ...custs.map(c => [c._id, c.name])] }, { k: 'customerName', l: 'Walk-in name (optional)' }, { k: 'date', l: 'Date', t: 'date', r: 1 },
    { k: 'place', l: 'Place of supply (walk-in)', t: 'select', o: STATES }, { k: 'paid', l: 'Received now', t: 'number' }, { k: 'mode', l: 'Received via', t: 'select', o: MODES }, { k: 'note', l: 'Note', w: 1 }],
    { date: today(), place: D.set.state }, async d => {
      const s = await api('/api/sales', 'POST', { ...d, lines: ed.get() }); await refresh();
      dlg.querySelector('.mb').replaceChildren(h('div', {}, h('p', {}, 'Invoice ' + s.no + ' saved. Total ' + money(s.total) + '.'), acts(h('a', { class: 'btn', href: '/invoice/' + s._id, target: '_blank' }, 'Print invoice'), h('button', { class: 'btn', onclick: () => dlg.close() }, 'Close'))));
    }, 'Save invoice');
  put(f, ed); const dlg = modal('New invoice', f);
}

// ---------- purchases and deliveries
async function setStatus(p, s) {
  if (s === 'received' && !confirm('Mark as received? The items will be added to stock.')) return;
  if (s === 'cancelled' && !confirm('Cancel this purchase?')) return;
  try { await api('/api/purchases/' + p._id + '/status', 'PATCH', { status: s }); await refresh(); } catch (e) { fail(e); }
}
function deliveryList(list, empty) {
  const late = p => p.expected && new Date(p.expected) < new Date(today());
  return h('div', {}, list.length ? list.map(p => h('div', { class: 'li dl' },
    h('div', {}, h('b', {}, p.supplierName || 'Supplier'), p.billNo ? ' · ' + p.billNo : '', h('span', { class: 'kx' }, p.lines.map(l => l.name + ' × ' + l.qty).join(', ')), h('span', { class: 'kx' }, p.expected ? 'Expected ' + fdate(p.expected) : 'No date set')),
    acts(tag(late(p) ? 'overdue' : p.status.replace('_', ' '), late(p) ? 'var(--expense)' : 'var(--invest)'),
      p.status === 'ordered' ? h('button', { class: 'btn', onclick: () => setStatus(p, 'in_transit') }, 'In transit') : '', h('button', { class: 'btn', onclick: () => setStatus(p, 'received') }, 'Received')))) : h('div', { class: 'empty' }, empty));
}
PAGES.deliveries = async () => h('section', {}, head('Incoming deliveries'), deliveryList(await api('/api/deliveries'), 'No deliveries pending.'));
PAGES.purchases = async () => {
  const rows = await api('/api/purchases'), pend = rows.filter(p => ['ordered', 'in_transit'].includes(p.status));
  const st = p => tag(p.status.replace('_', ' '), p.status === 'received' ? 'var(--sale)' : p.status === 'cancelled' ? 'var(--muted)' : 'var(--invest)');
  return h('div', {}, h('section', {}, head('Incoming deliveries', addBtn('+ New purchase', newPurchase)), deliveryList(pend, 'No deliveries pending.')),
    h('section', {}, h('h2', {}, 'All purchases'), tbl([['Date', p => fdate(p.date)], ['Supplier', p => p.supplierName], ['Bill no', p => p.billNo || '-'], ['Status', st], ['Total', p => money(p.total), 'amt'],
      ['Due', p => p.status === 'cancelled' ? '-' : money(Math.max(0, p.total - p.paid)), 'amt'],
      ['', p => acts(p.status !== 'cancelled' && p.total - p.paid > 0.5 ? h('button', { class: 'btn', onclick: () => payAsk('purchase', p) }, 'Pay') : '', ['ordered', 'in_transit'].includes(p.status) ? h('button', { class: 'btn danger', onclick: () => setStatus(p, 'cancelled') }, 'Cancel') : '')]], rows, 'No purchases yet.')));
};
function newPurchase() {
  const sups = D.parties.filter(p => p.kind === 'supplier'), ed = lineEd(byKind('raw'), { rate: 'purchase' });
  const f = F([{ k: 'supplier', l: 'Supplier', t: 'select', o: [['', 'Other / not listed'], ...sups.map(c => [c._id, c.name])] }, { k: 'supplierName', l: 'Supplier name (if not listed)' }, { k: 'billNo', l: 'Bill / order no' },
    { k: 'status', l: 'Status', t: 'select', o: [['ordered', 'Ordered'], ['in_transit', 'In transit'], ['received', 'Already received']] }, { k: 'date', l: 'Bill date', t: 'date', r: 1 }, { k: 'expected', l: 'Expected delivery', t: 'date' },
    { k: 'paid', l: 'Paid now', t: 'number' }, { k: 'mode', l: 'Paid via', t: 'select', o: MODES }, { k: 'note', l: 'Note', w: 1 }], { date: today() },
    async d => { await api('/api/purchases', 'POST', { ...d, lines: ed.get() }); dlg.close(); await refresh(); }, 'Save purchase');
  put(f, ed); const dlg = modal('New purchase', f);
}

// ---------- production
PAGES.production = async () => {
  const runs = await api('/api/production');
  return h('section', {}, head('Production runs', addBtn('+ New run', newRun)), tbl([['Date', r => fdate(r.date)], ['Product', r => r.productName], ['Built', r => r.qty, 'amt'],
    ...(A() ? [['Material cost', r => money(r.material), 'amt'], ['Cost per unit', r => money(r.unitCost), 'amt']] : [])], runs, 'No production recorded yet.'));
};
function newRun() {
  const fin = D.items.filter(i => i.kind === 'finished' && i.bom?.length);
  if (!fin.length) return alert('Add a finished product with its bill of materials in Stock first.');
  const prev = h('div', { class: 'tot', style: 'text-align:left;font-weight:500' });
  const f = F([{ k: 'product', l: 'Product', t: 'select', o: fin.map(i => [i._id, i.name]) }, { k: 'qty', l: 'Quantity built', t: 'number', r: 1 }, { k: 'date', l: 'Date', t: 'date' }, { k: 'note', l: 'Note' }],
    { date: today() }, async d => { await api('/api/production', 'POST', d); dlg.close(); await refresh(); }, 'Record production');
  const upd = () => { const it = fin.find(i => i._id === f.product.value), q = num(f.qty.value);
    prev.replaceChildren(...(it ? it.bom.map(b => { const raw = D.items.find(x => x._id === b.item), need = r2(b.qty * (q || 1)); return h('div', { class: raw && raw.qty >= need ? 'ok' : 'bad' }, `${raw ? raw.name : 'Missing item'}: need ${need}, have ${raw ? raw.qty : 0}`); }) : [])); };
  f.oninput = upd; f.onchange = upd; put(f, prev); upd(); const dlg = modal('New production run', f);
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
    expenses: { add: 'expense', fields: [{ k: 'category', l: 'Category', t: 'select', o: CATS }, { k: 'amount', l: 'Amount', t: 'number', r: 1 }, { k: 'mode', l: 'Paid via', t: 'select', o: MODES }, { k: 'date', l: 'Date', t: 'date' }, { k: 'note', l: 'Note', w: 1 }],
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
    body.replaceChildren(h('p', { class: 'dim', style: 'margin:0 0 8px' }, 'Showing latest ' + rows.length + ' · total ' + money(total)), tbl([...g.cols, ['', del]], rows, 'No records yet.'));
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
  const form = e => ask(e ? 'Edit ' + e.name : 'New staff member', [{ k: 'name', l: 'Name', r: 1 }, { k: 'designation', l: 'Role', r: 1 }, { k: 'phone', l: 'Phone' }, { k: 'monthlySalary', l: 'Monthly salary', t: 'number' }], e || {},
    async d => { if (e) await api('/api/employees/' + e._id, 'PATCH', d); else cred(await api('/api/employees', 'POST', d)); }, e ? 'Save' : 'Create staff login');
  const set = D.set, sf = F([{ k: 'name', l: 'Business name', r: 1 }, { k: 'gstin', l: 'GSTIN' }, { k: 'state', l: 'State', t: 'select', o: [['', 'Select state'], ...STATES] }, { k: 'phone', l: 'Phone' }, { k: 'prefix', l: 'Invoice prefix' }, { k: 'address', l: 'Address', w: 1 },
    { k: 'cert', l: 'Certification note on invoices (for example BIS licence number)', w: 1 }], set, async d => { await api('/api/settings', 'PUT', d); await refs(); $('biz').textContent = d.name || 'ERP'; alert('Saved'); }, 'Save business details');
  return h('div', {}, h('section', {}, head('Staff', addBtn('+ Add staff', () => form())), tbl([['Name', e => h('div', {}, e.name, h('small', {}, e.designation))], ['Login ID', e => e.loginId || 'not set'], ['Salary', e => money(e.monthlySalary), 'amt'], ['Status', e => tag(e.status, e.status === 'active' ? 'var(--sale)' : 'var(--muted)')],
    ['', e => acts(h('button', { class: 'btn', onclick: run(async () => cred(await api('/api/employees/' + e._id + '/reset', 'POST'))) }, 'Reset password'), h('button', { class: 'btn', onclick: () => form(e) }, 'Edit'),
      h('button', { class: 'btn', onclick: run(() => api('/api/employees/' + e._id, 'PATCH', { status: e.status === 'active' ? 'inactive' : 'active' })) }, e.status === 'active' ? 'Deactivate' : 'Activate'),
      h('button', { class: 'btn danger', onclick: run(async () => { if (confirm('Delete ' + e.name + '? Their personal records are deleted too.')) await api('/api/employees/' + e._id, 'DELETE'); }) }, 'Delete'))]], D.emps, 'No staff yet.')),
    h('section', {}, h('h2', {}, 'Business details'), sf));
};

// ---------- router and boot
function route() {
  const def = A() ? 'dash' : 'sales', p = (location.hash || '#/').slice(2) || def, ok = NAV[ME.role].some(n => n[0] === p) && PAGES[p], page = ok ? p : def;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.p === page));
  $('title').textContent = (NAV[ME.role].find(n => n[0] === page) || [])[1]; const v = $('view'); v.replaceChildren(h('div', { class: 'empty' }, 'Loading...'));
  PAGES[page]().then(el => v.replaceChildren(el)).catch(e => v.replaceChildren(h('div', { class: 'empty' }, e.message)));
}
(async () => {
  try { ME = await api('/api/session'); await refs(); } catch { return; }
  $('who').textContent = ME.name; $('biz').textContent = D.set.name || 'ERP';
  NAV[ME.role].forEach(([p, l, ic]) => { const b = h('button', { 'data-p': p, onclick: () => p === 'me' ? (location.href = '/me') : (location.hash = '#/' + p) }); b.innerHTML = svg(ic); b.append(h('em', {}, l)); $('nav').append(b); });
  addEventListener('hashchange', route); route();
})();
