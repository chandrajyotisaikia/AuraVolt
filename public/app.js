const CUR = '₹'; // currency symbol
const $ = id => document.getElementById(id);
const money = n => (n < 0 ? '-' : '') + CUR + Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdate = d => new Date(d).toLocaleDateString(undefined, { timeZone: 'UTC' });
const sum = (l, t) => l.filter(e => e.type === t).reduce((a, e) => a + e.amount, 0);
const COL = { expense: 'var(--expense)', investment: 'var(--invest)', sale: 'var(--sale)', income: 'var(--sale)', saving: 'var(--invest)' };
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v);
  }
  e.append(...kids.flat().map(c => c instanceof Node ? c : String(c ?? '')));
  return e;
}
async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body && JSON.stringify(body) });
  if (r.status === 401) { location.href = '/login.html'; throw new Error('Signed out'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}
async function logout() { await fetch('/api/logout', { method: 'POST' }); location.href = '/login.html'; }
const amtCell = (type, n) => h('td', { class: 'amt', style: 'color:' + COL[type] }, (type === 'expense' ? '-' : '+') + money(n));
const tag = (t, c) => h('span', { class: 'tag', style: 'color:' + (c || COL[t]) }, t);

const IC={grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.6 0 4.5 1.8 4.5 4.5"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="16.5" cy="13.5" r="1.2"/>',
logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'};
document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-i]').forEach(e=>e.insertAdjacentHTML('afterbegin','<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[e.dataset.i]+'</svg>')));
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('av-theme',t)}catch{}}
const toggleTheme=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
(()=>{let t;try{t=localStorage.getItem('av-theme')}catch{}document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')})();
const av=n=>h('span',{class:'av'},(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase());

Object.assign(IC,{box:'<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',rupee:'<path d="M7 4h10M7 9h10M7 4c6 0 6 9 0 9h-1l8 7"/>',chart:'<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/>',cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/>',truck:'<path d="M2 6h11v10H2zM13 10h5l3 3v3h-8"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>'});
const svg=n=>'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[n]+'</svg>';
const num=x=>Number(x)||0;
const r2=x=>Math.round((x+Number.EPSILON)*100)/100;
const STATES=['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];
