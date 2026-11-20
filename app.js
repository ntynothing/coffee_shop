const $ = s => document.querySelector(s);
const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Number(n).toLocaleString('ru-RU') + ' ₽';
const page = document.body.dataset.page;
let products, posts, users, orders, stickers;
let tab = 'p', editId = 0, q = '', cat = 'Все';

function seed() {
  if (get('seeded', 0)) return;
  const ps = [
    { id: 1, name: 'Эспрессо', cat: 'Кофе', price: 150, desc: 'Крепкий классический шот' },
    { id: 2, name: 'Американо', cat: 'Кофе', price: 170, desc: 'Эспрессо с горячей водой' },
    { id: 3, name: 'Капучино', cat: 'Кофе', price: 230, desc: 'Эспрессо и молочная пена' },
    { id: 4, name: 'Латте', cat: 'Кофе', price: 250, desc: 'Нежный кофе с молоком' },
    { id: 5, name: 'Чёрный чай', cat: 'Чай', price: 140, desc: 'Классический чай с лимоном' },
    { id: 6, name: 'Зелёный чай', cat: 'Чай', price: 140, desc: 'Лёгкий и свежий' },
    { id: 7, name: 'Круассан', cat: 'Десерты', price: 130, desc: 'Свежая выпечка' },
    { id: 8, name: 'Чизкейк', cat: 'Десерты', price: 260, desc: 'Классический чизкейк' }
  ];
  set('products', ps);
  set('posts', [
    { id: 1, title: 'Как выбрать зерно', text: 'Арабика мягче и ароматнее, робуста крепче и горче. Для молочных напитков чаще берут смесь.', date: new Date().toISOString() },
    { id: 2, title: 'Секрет идеального капучино', text: 'Температура молока около 60 градусов и плотная мелкая пена дают нежный вкус.', date: new Date().toISOString() },
    { id: 3, title: 'Чай или кофе утром', text: 'Кофе бодрит быстрее, чай действует мягче и дольше. Выбор зависит от привычек.', date: new Date().toISOString() }
  ]);
  set('users', [{ name: 'Администратор', email: 'admin@coffee.ru', pass: 'admin123', role: 'admin' }]);
  const os = []; let id = 1;
  for (let d = 6; d >= 0; d--) {
    for (let k = 0; k <= d % 3 + 1; k++) {
      const a = ps[(d + k) % 8], b = ps[(d * 2 + k + 3) % 8];
      const items = [{ id: a.id, name: a.name, price: a.price, qty: k + 1 }, { id: b.id, name: b.name, price: b.price, qty: 1 }];
      os.push({ id: id++, date: new Date(Date.now() - d * 864e5 - k * 36e5).toISOString(), user: 'demo@coffee.ru', items, total: items.reduce((s, i) => s + i.price * i.qty, 0) });
    }
  }
  set('orders', os);
  set('seeded', 1);
}
function load() {
  products = get('products', []); posts = get('posts', []); users = get('users', []);
  orders = get('orders', []); stickers = get('stickers', []);
}
const session = () => get('session', null);
const isAdmin = () => { const u = session(); return !!u && u.role === 'admin'; };
const cart = () => get('cart', []);

function header() {
  const u = session();
  const cnt = cart().reduce((a, c) => a + c.qty, 0);
  const L = [['index.html', 'Главная'], ['catalog.html', 'Каталог'], ['blog.html', 'Блог'], ['cart.html', 'Корзина (' + cnt + ')']];
  if (isAdmin()) L.push(['admin.html', 'Админ'], ['stats.html', 'Статистика']);
  const cur = location.pathname.split('/').pop() || 'index.html';
  let h = '<a class="logo" href="index.html">Кофейня</a><nav>' + L.map(l => `<a href="${l[0]}" class="${cur === l[0] ? 'on' : ''}">${l[1]}</a>`).join('');
  h += u ? `<button data-act="logout">Выйти (${esc(u.name)})</button>` : '<a href="login.html" class="' + (cur === 'login.html' ? 'on' : '') + '">Вход</a>';
  return h + '</nav>';
}
function deny() {
  $('#app').innerHTML = '<h1>Доступ закрыт</h1><p>Войдите как администратор.</p><a class="btn" href="login.html">Войти</a>';
}
function card(p) {
  return `<div class="card"><h3>${esc(p.name)}</h3><span class="muted">${esc(p.cat)}</span><span>${esc(p.desc)}</span><span class="price">${money(p.price)}</span><button class="btn" data-act="add" data-id="${p.id}">В корзину</button></div>`;
}
function home() {
  $('#app').innerHTML = `<div class="hero"><h1>Кофейня</h1><p>Свежий кофе, чай и десерты каждый день.</p><a class="btn" href="catalog.html">Открыть каталог</a> <a class="btn alt" href="blog.html">Читать блог</a></div><h2>Популярное</h2><div class="grid">${products.slice(0, 4).map(card).join('')}</div>`;
}
function catalog() {
  const cats = ['Все'].concat([...new Set(products.map(p => p.cat))]);
  $('#app').innerHTML = `<h1>Каталог</h1><div class="bar-tools"><input id="q" placeholder="Поиск" value="${esc(q)}"><select id="cat">${cats.map(c => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div><div class="grid" id="list"></div>`;
  const draw = () => {
    const r = products.filter(p => (cat === 'Все' || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
    $('#list').innerHTML = r.length ? r.map(card).join('') : '<p>Ничего не найдено</p>';
  };
  $('#q').oninput = e => { q = e.target.value; draw(); };
  $('#cat').onchange = e => { cat = e.target.value; draw(); };
  draw();
}
function cartPage() {
  const c = cart();
  if (!c.length) { $('#app').innerHTML = '<h1>Корзина</h1><p>Корзина пуста.</p><a class="btn" href="catalog.html">В каталог</a>'; return; }
  const total = c.reduce((s, i) => s + i.price * i.qty, 0);
  $('#app').innerHTML = '<h1>Корзина</h1>' + c.map(i => `<div class="row"><div><b>${esc(i.name)}</b><br><span class="muted">${money(i.price)}</span></div><div class="qty"><button data-act="dec" data-id="${i.id}">−</button><span>${i.qty}</span><button data-act="inc" data-id="${i.id}">+</button></div><b>${money(i.price * i.qty)}</b><button class="btn red" data-act="rm" data-id="${i.id}">Удалить</button></div>`).join('') + `<p class="total">Итого: ${money(total)}</p><button class="btn" data-act="checkout">Оформить заказ</button>`;
}
function blog() {
  $('#app').innerHTML = '<h1>Блог</h1>' + (posts.length ? posts.slice().reverse().map(p => `<div class="card" style="margin-bottom:12px"><h3>${esc(p.title)}</h3><span class="muted">${new Date(p.date).toLocaleDateString('ru-RU')}</span><p>${esc(p.text)}</p></div>`).join('') : '<p>Записей пока нет</p>');
}
function login() {
  $('#app').innerHTML = `<h1>Вход и регистрация</h1><p class="msg" id="msg"></p><div class="two"><form class="stack" data-form="login"><h2>Вход</h2><input name="email" type="email" placeholder="Почта" required><input name="pass" type="password" placeholder="Пароль" required><button class="btn">Войти</button><span class="muted">Админ: admin@coffee.ru / admin123</span></form><form class="stack" data-form="reg"><h2>Регистрация</h2><input name="name" placeholder="Имя" required><input name="email" type="email" placeholder="Почта" required><input name="pass" type="password" placeholder="Пароль (от 4 символов)" minlength="4" required><button class="btn">Создать аккаунт</button></form></div>`;
}
function bars(d) {
  const m = Math.max(1, ...d.map(x => x[1]));
  return '<div class="bars">' + d.map(x => `<div class="bar"><span>${money(x[1])}</span><i style="height:${Math.round(x[1] / m * 70)}%"></i><span>${esc(x[0])}</span></div>`).join('') + '</div>';
}
function hbars(d) {
  const m = Math.max(1, ...d.map(x => x[1]));
  return d.map(x => `<div class="hb"><span>${esc(x[0])}</span><i style="width:${Math.round(x[1] / m * 100)}%"></i><span>${x[1]} шт.</span></div>`).join('');
}
function stats() {
  if (!isAdmin()) return deny();
  const rev = orders.reduce((s, o) => s + o.total, 0);
  const qty = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const k = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days.push([k.slice(8, 10) + '.' + k.slice(5, 7), orders.filter(o => o.date.slice(0, 10) === k).reduce((s, o) => s + o.total, 0)]);
  }
  const by = {};
  orders.forEach(o => o.items.forEach(i => { by[i.name] = (by[i.name] || 0) + i.qty; }));
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 6);
  $('#app').innerHTML = `<h1>Статистика и аналитика</h1><div class="stats"><div class="card stat"><span class="muted">Выручка</span><b>${money(rev)}</b></div><div class="card stat"><span class="muted">Заказов</span><b>${orders.length}</b></div><div class="card stat"><span class="muted">Средний чек</span><b>${money(orders.length ? Math.round(rev / orders.length) : 0)}</b></div><div class="card stat"><span class="muted">Продано позиций</span><b>${qty}</b></div></div><h2>Продажи за 7 дней</h2>${bars(days)}<h2>Топ товаров</h2>${hbars(top)}<h2>Последние заказы</h2><div class="wrap"><table><tr><th>№</th><th>Дата</th><th>Покупатель</th><th>Сумма</th></tr>${orders.slice(-10).reverse().map(o => `<tr><td>${o.id}</td><td>${new Date(o.date).toLocaleDateString('ru-RU')}</td><td>${esc(o.user)}</td><td>${money(o.total)}</td></tr>`).join('')}</table></div>`;
}
function admin() {
  if (!isAdmin()) return deny();
  const T = [['p', 'Товары'], ['b', 'Блог'], ['o', 'Заказы'], ['s', 'Стикеры']];
  let h = '<h1>Панель администратора</h1><div class="tabs">' + T.map(t => `<button class="tab ${tab === t[0] ? 'on' : ''}" data-act="tab" data-id="${t[0]}">${t[1]}</button>`).join('') + '</div>';
  if (tab === 'p') {
    const e = products.find(p => p.id === editId) || { name: '', cat: '', price: '', desc: '' };
    h += `<form class="stack" data-form="product"><h2>${editId ? 'Изменить товар' : 'Новый товар'}</h2><input name="name" placeholder="Название" value="${esc(e.name)}" required><input name="cat" placeholder="Категория" value="${esc(e.cat)}" required><input name="price" type="number" min="1" placeholder="Цена" value="${esc(e.price)}" required><input name="desc" placeholder="Описание" value="${esc(e.desc)}"><button class="btn">${editId ? 'Сохранить' : 'Добавить'}</button></form><h2>Список товаров</h2>` + products.map(p => `<div class="row"><div><b>${esc(p.name)}</b> <span class="muted">${esc(p.cat)}</span></div><b>${money(p.price)}</b><div><button class="btn alt" data-act="pedit" data-id="${p.id}">Изменить</button> <button class="btn red" data-act="pdel" data-id="${p.id}">Удалить</button></div></div>`).join('');
  }
  if (tab === 'b') {
    h += `<form class="stack" data-form="post"><h2>Новая запись</h2><input name="title" placeholder="Заголовок" required><textarea name="text" placeholder="Текст" required></textarea><button class="btn">Опубликовать</button></form><h2>Записи</h2>` + posts.map(p => `<div class="row"><b>${esc(p.title)}</b><button class="btn red" data-act="postdel" data-id="${p.id}">Удалить</button></div>`).join('');
  }
  if (tab === 'o') {
    h += `<div class="wrap"><table><tr><th>№</th><th>Дата</th><th>Покупатель</th><th>Сумма</th><th></th></tr>${orders.slice().reverse().map(o => `<tr><td>${o.id}</td><td>${new Date(o.date).toLocaleDateString('ru-RU')}</td><td>${esc(o.user)}</td><td>${money(o.total)}</td><td><button class="btn alt" data-act="receipt" data-id="${o.id}">Чек</button></td></tr>`).join('')}</table></div>`;
  }
  if (tab === 's') {
    h += `<form class="bar-tools" data-form="sticker"><input name="text" placeholder="Текст стикера" required><button class="btn">Добавить стикер</button></form><p class="muted">Перетаскивайте стикеры мышью или пальцем.</p><div class="board" id="board">${stickers.map(s => `<div class="sticker" data-sid="${s.id}" style="left:${s.x}px;top:${s.y}px;background:${s.color}">${esc(s.text)}<button data-act="sdel" data-id="${s.id}">×</button></div>`).join('')}</div>`;
  }
  $('#app').innerHTML = h;
}
function receiptHTML(o) {
  return `<div class="receipt" id="receipt"><h3>Кофейня</h3><p>Чек № ${o.id}<br>${new Date(o.date).toLocaleString('ru-RU')}<br>Покупатель: ${esc(o.user)}</p><table>${o.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty} × ${money(i.price)}</td><td>${money(i.qty * i.price)}</td></tr>`).join('')}</table><p class="total">Итого: ${money(o.total)}</p><div class="noprint"><button class="btn" data-act="print">Печать</button> <button class="btn alt" data-act="dl" data-id="${o.id}">Скачать</button> <button class="btn alt" data-act="close">Закрыть</button></div></div>`;
}
function modal(html) {
  closeModal();
  const m = document.createElement('div');
  m.className = 'modal'; m.id = 'modal';
  m.innerHTML = '<div>' + html + '</div>';
  document.body.appendChild(m);
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); }
function refresh() { load(); $('#hdr').innerHTML = header(); ({ home, catalog, cart: cartPage, blog, login, admin, stats }[page])(); }
const nextId = a => Math.max(0, ...a.map(x => x.id)) + 1;
function change(id, d) {
  let c = cart(); const i = c.find(x => x.id === id);
  if (!i) return;
  i.qty += d; c = c.filter(x => x.qty > 0);
  set('cart', c); refresh();
}
const acts = {
  logout() { localStorage.removeItem('session'); location.href = 'index.html'; },
  add(id) {
    const p = products.find(x => x.id === id); if (!p) return;
    const c = cart(); const i = c.find(x => x.id === id);
    if (i) i.qty++; else c.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
    set('cart', c); $('#hdr').innerHTML = header();
  },
  inc(id) { change(id, 1); },
  dec(id) { change(id, -1); },
  rm(id) { set('cart', cart().filter(x => x.id !== id)); refresh(); },
  checkout() {
    const u = session();
    if (!u) { location.href = 'login.html'; return; }
    const c = cart(); if (!c.length) return;
    const o = { id: nextId(orders), date: new Date().toISOString(), user: u.email, items: c, total: c.reduce((s, i) => s + i.price * i.qty, 0) };
    orders.push(o); set('orders', orders); set('cart', []);
    refresh(); modal(receiptHTML(o));
  },
  receipt(id) { const o = orders.find(x => x.id === id); if (o) modal(receiptHTML(o)); },
  print() { window.print(); },
  close() { closeModal(); },
  dl(id) {
    const o = orders.find(x => x.id === id); if (!o) return;
    const t = ['КОФЕЙНЯ', 'Чек № ' + o.id, new Date(o.date).toLocaleString('ru-RU'), 'Покупатель: ' + o.user, ''].concat(o.items.map(i => i.name + ' ' + i.qty + ' x ' + i.price + ' = ' + i.qty * i.price), ['', 'Итого: ' + o.total + ' руб.']).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' }));
    a.download = 'check-' + o.id + '.txt'; a.click();
  },
  tab(id, b) { tab = b.dataset.id; editId = 0; admin(); },
  pedit(id) { editId = id; admin(); },
  pdel(id) { products = products.filter(p => p.id !== id); set('products', products); if (editId === id) editId = 0; admin(); },
  postdel(id) { posts = posts.filter(p => p.id !== id); set('posts', posts); admin(); },
  sdel(id) { stickers = stickers.filter(s => s.id !== id); set('stickers', stickers); admin(); }
};
const forms = {
  login(f) {
    const e = f.email.value.trim().toLowerCase();
    const u = users.find(x => x.email === e && x.pass === f.pass.value);
    if (!u) { $('#msg').textContent = 'Неверная почта или пароль'; return; }
    set('session', { name: u.name, email: u.email, role: u.role });
    location.href = u.role === 'admin' ? 'admin.html' : 'catalog.html';
  },
  reg(f) {
    const e = f.email.value.trim().toLowerCase();
    if (users.some(x => x.email === e)) { $('#msg').textContent = 'Эта почта уже зарегистрирована'; return; }
    const u = { name: f.name.value.trim(), email: e, pass: f.pass.value, role: 'user' };
    users.push(u); set('users', users);
    set('session', { name: u.name, email: u.email, role: u.role });
    location.href = 'catalog.html';
  },
  product(f) {
    const d = { name: f.name.value.trim(), cat: f.cat.value.trim(), price: +f.price.value, desc: f.desc.value.trim() };
    if (editId) products = products.map(p => p.id === editId ? Object.assign(p, d) : p);
    else products.push(Object.assign({ id: nextId(products) }, d));
    set('products', products); editId = 0; admin();
  },
  post(f) {
    posts.push({ id: nextId(posts), title: f.title.value.trim(), text: f.text.value.trim(), date: new Date().toISOString() });
    set('posts', posts); admin();
  },
  sticker(f) {
    const C = ['#fff2a8', '#ffd6e0', '#cdeac0', '#cfe3ff'];
    stickers.push({ id: nextId(stickers), text: f.text.value.trim(), x: 20 + stickers.length * 25 % 300, y: 20 + stickers.length * 30 % 200, color: C[stickers.length % 4] });
    set('stickers', stickers); admin();
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const f = acts[b.dataset.act]; if (f) f(+b.dataset.id, b);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); forms[f.dataset.form](f);
});
let drag = null;
document.addEventListener('pointerdown', e => {
  const s = e.target.closest('.sticker'); if (!s || e.target.closest('button')) return;
  drag = { s, dx: e.clientX - s.offsetLeft, dy: e.clientY - s.offsetTop };
  s.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const b = $('#board');
  const x = Math.min(Math.max(0, e.clientX - drag.dx), b.clientWidth - drag.s.offsetWidth);
  const y = Math.min(Math.max(0, e.clientY - drag.dy), b.clientHeight - drag.s.offsetHeight);
  drag.s.style.left = x + 'px'; drag.s.style.top = y + 'px';
});
document.addEventListener('pointerup', () => {
  if (!drag) return;
  const st = stickers.find(x => x.id === +drag.s.dataset.sid);
  if (st) { st.x = drag.s.offsetLeft; st.y = drag.s.offsetTop; set('stickers', stickers); }
  drag = null;
});
seed();
refresh();
