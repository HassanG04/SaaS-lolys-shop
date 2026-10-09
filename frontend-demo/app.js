(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => 'EGP ' + Math.round(n).toLocaleString('en-US');
const C = [
  {id:'earrings', n:'Earrings', tone:'#ead9c6'}, {id:'chains', n:'Chains', tone:'#dde3d6'},
  {id:'rings', n:'Rings', tone:'#f1dbd2'}, {id:'bracelets', n:'Bracelets', tone:'#e5e0ef'}];
const KIND = {earrings:'pearl', chains:'chain', rings:'ring', bracelets:'bangle'};
const P = [
  {id:1, c:'earrings', n:'Pearl drop earrings', p:250, d:50, s:12, sold:128, m:'pearl'},
  {id:2, c:'earrings', n:'Gold hoop earrings', p:400, d:0, s:5, sold:96, m:'hoop'},
  {id:3, c:'chains', n:'Thin gold chain', p:650, d:20, s:8, sold:143, m:'chain'},
  {id:4, c:'chains', n:'Layered silver chain', p:520, d:0, s:0, sold:77, m:'chain2'},
  {id:5, c:'rings', n:'Stackable ring set', p:300, d:50, s:15, sold:164, m:'ring'},
  {id:6, c:'rings', n:'Gem solitaire ring', p:480, d:10, s:3, sold:58, m:'gem'},
  {id:7, c:'bracelets', n:'Charm bracelet', p:350, d:10, s:6, sold:88, m:'brace'},
  {id:8, c:'bracelets', n:'Gold bangle', p:420, d:0, s:9, sold:41, m:'bangle'}];
const fp = p => p.p * (100 - p.d) / 100;
const cat = id => C.find(c => c.id === id);
const byId = id => P.find(p => p.id == id);
let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const O = []; for (let i = 0; i < 14; i++) for (let k = 0, n = 2 + Math.floor(rnd() * 4); k < n; k++) O.push({i, t: 300 + Math.floor(rnd() * 1200), d: i < 11});
const st = {view:'home', role:null, cart:{}, q:'', stock:false, cat:'all', drawer:false, login:false, ship:'post'};
const fee = () => st.ship === 'rep' ? 40 : 60;

const art = (p, tone) => {
  const two = ['pearl','hoop','ring','chain2'].includes(p.m);
  return `<div class="art ${p.m === 'chain2' ? 'chain' : p.m}" style="--t:${tone || cat(p.c).tone}${p.m === 'chain2' ? ';--g:#b7bcc4' : ''}"><b></b>${two ? '<b></b>' : ''}</div>`;
};
const card = p => {
  const tag = p.s <= 0 ? '<span class="tag out">Sold out</span>' : p.d ? `<span class="tag">-${p.d}%</span>` : '';
  const note = p.s > 0 && p.s <= 5 ? `only ${p.s} left` : `${p.sold} sold`;
  return `<article class="card"><div class="ph">${art(p)}${tag}</div><h3>${esc(p.n)}</h3><div class="row"><span><b>${fmt(fp(p))}</b>${p.d ? ` <s class="muted">${fmt(p.p)}</s>` : ''}<br><small class="muted">${note}</small></span><button class="add" data-a="add" data-id="${p.id}"${p.s <= 0 ? ' disabled' : ''} aria-label="Add to cart">+</button></div></article>`;
};
const list = () => P.filter(p => (st.cat === 'all' || p.c === st.cat) && (!st.stock || p.s > 0) &&
  (!st.q || (p.n + ' ' + p.c).toLowerCase().includes(st.q.toLowerCase()))).sort((a, b) => b.sold - a.sold);
const grid = l => l.length ? `<div class="g4">${l.map(card).join('')}</div>` : '<p class="muted">Nothing matches. Try another search or filter.</p>';
const filters = all => `<div class="pills">${all ? ['all', ...C.map(c => c.id)].map(id => `<button class="pill${st.cat === id ? ' on' : ''}" data-a="cat" data-v="${id}">${id === 'all' ? 'All' : cat(id).n}</button>`).join('') : ''}<button class="pill${st.stock ? ' on' : ''}" data-a="stock">In stock only</button></div>`;

const home = () => `<section class="hero"><div class="float">${[1, 3, 5].map((id, i) => `<div class="fc f${i}">${art(byId(id))}<span class="nm">${byId(id).n}</span></div>`).join('')}</div>
<h1>Accessories, up to 50% off</h1><p class="muted">Earrings, chains, rings and bracelets, delivered across Egypt by Egypt Post or our own representative.</p>
<button class="btn" data-s="browse">Shop the sale</button>
<div class="pills mid">${C.map(c => `<a class="pill" href="#/c/${c.id}">${c.n}</a>`).join('')}</div></section>
<section id="store"><h2>Shop by category ›</h2><div class="g4">${C.map(c => `<a class="tile" href="#/c/${c.id}">${art(P.find(p => p.c === c.id), c.tone)}<span class="chip">${c.n}</span></a>`).join('')}</div></section>
<section id="browse"><h2>Browse: best sellers first ›</h2>${filters(true)}${grid(list())}</section>
<section id="about"><div class="about"><div><h2>About</h2><p class="muted">Small-batch accessories for everyday wear. Prices in Egyptian pounds, cash on delivery.</p></div><div><h2>Delivery</h2><p class="muted">Egypt Post to every governorate, or our own representative in selected cities. You choose at checkout.</p></div></div></section>`;
const catView = () => `<section><a class="muted" href="#/">← Back to store</a><h2 style="margin-top:12px">${cat(st.cat).n}</h2>${filters(false)}${grid(list())}</section>`;

const admin = () => {
  if (st.role !== 'admin') return '<section><h2>Admin area</h2><p class="muted">Log in as the admin demo to see the dashboard and the stock manager.</p><button class="btn" data-a="login">Log in</button></section>';
  let booked = 0, deliv = 0; const days = Array(14).fill(0);
  O.forEach(o => { booked += o.t; if (o.d) deliv += o.t; days[o.i] += o.t; });
  const max = Math.max(...days), low = P.filter(p => p.s <= 5).length;
  const bars = days.map((v, i) => { const h = Math.max(4, Math.round(v / max * 110)); return `<rect x="${i * 40 + 6}" y="${130 - h}" width="28" height="${h}" rx="8" fill="currentColor" opacity="${i === 13 ? 1 : .3}"/>`; }).join('');
  return `<section><h2>Dashboard</h2><div class="kpis">${[['Booked sales', fmt(booked)], ['Delivered revenue', fmt(deliv)], ['Orders', O.length], ['Low stock items', low]].map(([l, v]) => `<div class="kpi"><span class="muted">${l}</span><b>${v}</b></div>`).join('')}</div>
<div class="panel"><span class="muted">Booked sales per day, last 14 days (demo data)</span><svg class="chart" viewBox="0 0 560 140" width="100%" role="img" aria-label="Bar chart of daily sales">${bars}</svg></div></section>
<section><h2>Stock manager</h2><div class="panel"><table class="tbl"><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th></tr>${P.map(p => `<tr><td>${esc(p.n)}</td><td>${cat(p.c).n}</td><td>${fmt(fp(p))}</td><td><input type="number" min="0" value="${p.s}" data-a="stockin" data-id="${p.id}"> ${p.s > 0 ? '' : '<span class="muted">sold out</span>'}</td></tr>`).join('')}</table>
<form class="add-form" data-f="addp"><input name="n" placeholder="New product name" required><select name="c">${C.map(c => `<option value="${c.id}">${c.n}</option>`).join('')}</select><input name="p" type="number" min="0" placeholder="Price"><input name="d" type="number" min="0" max="100" placeholder="Discount %"><input name="s" type="number" min="0" placeholder="Stock"><button class="btn">Add product</button></form></div></section>`;
};

const top = () => {
  const n = Object.values(st.cart).reduce((a, b) => a + b, 0);
  return `<header class="top"><div class="nav"><a class="logo" href="#/">bareeq<i>.</i></a>
<form class="search" data-f="search"><input name="q" value="${esc(st.q)}" placeholder="Search earrings, chains, rings…" aria-label="Search"><button aria-label="Search">→</button></form>
<nav class="links"><a href="#/" data-s="store">Store</a><a href="#/" data-s="browse">Browse</a><a href="#/" data-s="about">About</a>${st.role === 'admin' ? '<a class="pill" href="#/admin">Admin</a>' : ''}</nav>
<button class="pill" data-a="cart">Cart · ${n}</button><button class="pill" data-a="login">${st.role ? 'Log out' : 'Log in'}</button><button class="circ" data-a="theme" aria-label="Switch light or dark theme">◐</button></div></header>`;
};
const drawer = () => {
  const it = Object.keys(st.cart).map(id => [byId(id), st.cart[id]]);
  const sub = it.reduce((a, [p, q]) => a + fp(p) * q, 0);
  return `<div class="scrim${st.drawer ? ' show' : ''}" data-a="close"></div><aside class="drawer${st.drawer ? ' open' : ''}"><div class="row"><h2>Your cart</h2><button class="circ" data-a="close" aria-label="Close">×</button></div>
${it.length ? it.map(([p, q]) => `<div class="line">${art(p)}<div><b>${esc(p.n)}</b><div class="muted">${fmt(fp(p))}</div></div><div class="qty"><button class="circ" data-a="dec" data-id="${p.id}">−</button><span>${q}</span><button class="circ" data-a="add" data-id="${p.id}">+</button></div></div>`).join('') : '<p class="muted">Your cart is empty.</p>'}
${it.length ? `<div class="pills"><button class="pill${st.ship === 'post' ? ' on' : ''}" data-a="ship" data-v="post">Egypt Post · ${fmt(60)}</button><button class="pill${st.ship === 'rep' ? ' on' : ''}" data-a="ship" data-v="rep">Representative · ${fmt(40)}</button></div>
<div class="row"><span>Subtotal</span><span>${fmt(sub)}</span></div><div class="row"><span>Delivery</span><span>${fmt(fee())}</span></div><div class="row"><b>Total</b><b>${fmt(sub + fee())}</b></div>
<button class="btn" data-a="order">Place order (cash on delivery)</button><p class="muted small">Demo only: nothing is sent anywhere.</p>` : ''}</aside>`;
};
const modal = () => st.login ? `<div class="modal" data-a="close"><div data-stop="1"><h2>Log in (demo)</h2><p class="muted">No real accounts here. In the real shop this is Supabase login, and the role comes from the database.</p><button class="btn" data-a="as" data-v="customer">Continue as customer</button> <button class="pill" data-a="as" data-v="admin">Continue as admin</button></div></div>` : '';

const render = () => {
  const v = st.view === 'cat' ? catView() : st.view === 'admin' ? admin() : home();
  $('#app').innerHTML = top() + `<main>${v}</main><footer><div class="in"><div><div class="logo">bareeq<i>.</i></div><span class="muted">Accessories for Egypt. Demo storefront.</span></div><div><b>Shop</b><br>${C.map(c => `<a href="#/c/${c.id}">${c.n}</a>`).join('<br>')}</div><div><b>Delivery</b><br><span class="muted">Egypt Post<br>Representative<br>Cash on delivery</span></div></div></footer>` + drawer() + modal();
};
const go = id => { const f = () => { const e = document.getElementById(id); e && e.scrollIntoView({behavior:'smooth'}); }; if (st.view !== 'home') { location.hash = '#/'; setTimeout(f, 80); } else f(); };
let tt; const toast = m => { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('show'), 2200); };
const route = () => {
  const h = location.hash, m = h.match(/^#\/c\/(\w+)/), prev = st.view;
  st.view = m && cat(m[1]) ? 'cat' : h === '#/admin' ? 'admin' : 'home';
  if (st.view === 'cat') st.cat = m[1]; else if (prev === 'cat') st.cat = 'all';
  render(); if (prev !== st.view) scrollTo(0, 0);
};
const order = () => {
  const ids = Object.keys(st.cart); if (!ids.length) return;
  if (!st.role) { st.login = true; st.drawer = false; return render(); }
  for (const id of ids) { const p = byId(id); if (st.cart[id] > p.s) return toast(`Only ${p.s} left of ${p.n}`); }
  let sub = 0; ids.forEach(id => { const p = byId(id), q = st.cart[id]; sub += fp(p) * q; p.s -= q; p.sold += q; });
  O.push({i:13, t: sub + fee(), d:false}); st.cart = {}; st.drawer = false; render(); toast('Order placed (demo): stock updated');
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-a],[data-s]'); if (!t) return;
  const a = t.dataset.a, id = t.dataset.id, v = t.dataset.v;
  if (t.dataset.s) { e.preventDefault(); return go(t.dataset.s); }
  if (a === 'close' && t.classList.contains('modal') && e.target.closest('[data-stop]')) return;
  if (a === 'theme') { const d = document.documentElement; d.dataset.theme = d.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('theme', d.dataset.theme); } catch (_) {} return; }
  if (a === 'cart') st.drawer = true;
  else if (a === 'close') { st.drawer = false; st.login = false; }
  else if (a === 'add') { const p = byId(id), q = (st.cart[id] || 0) + 1; if (q > p.s) return toast(`Only ${p.s} left in stock`); st.cart[id] = q; toast('Added: ' + p.n); }
  else if (a === 'dec') { if (--st.cart[id] <= 0) delete st.cart[id]; }
  else if (a === 'ship') st.ship = v;
  else if (a === 'order') return order();
  else if (a === 'login') { if (st.role) { st.role = null; if (st.view === 'admin') location.hash = '#/'; } else st.login = true; }
  else if (a === 'as') { st.role = v; st.login = false; if (v === 'admin') location.hash = '#/admin'; }
  else if (a === 'cat') st.cat = v;
  else if (a === 'stock') st.stock = !st.stock;
  render();
});
document.addEventListener('change', e => {
  const t = e.target; if (t.dataset.a !== 'stockin') return;
  const p = byId(t.dataset.id); p.s = Math.max(0, parseInt(t.value, 10) || 0); render(); toast('Stock updated: ' + p.n);
});
document.addEventListener('submit', e => {
  const f = e.target, k = f.dataset.f; if (!k) return; e.preventDefault();
  if (k === 'search') { st.q = f.q.value.trim(); if (st.view !== 'home') location.hash = '#/'; render(); go('browse'); }
  if (k === 'addp') {
    const n = f.n.value.trim(); if (!n) return; const c = f.c.value;
    P.push({id: Date.now(), c, n, p: +f.p.value || 0, d: Math.min(100, +f.d.value || 0), s: Math.max(0, parseInt(f.s.value, 10) || 0), sold: 0, m: KIND[c]});
    render(); toast('Product added');
  }
});
addEventListener('hashchange', route);
try { const s = localStorage.getItem('theme'); document.documentElement.dataset.theme = s || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (_) {}
route();
})();
