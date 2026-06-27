const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Daily Deal helper
function getDailyDeal() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = seed % products.length;
  return { product: products[idx], discount: 0.20 };
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  express.static(path.join(__dirname, 'public'))(req, res, next);
});
app.use(session({
  secret: 'claw-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// In-memory data
const users = [
  { id: 1, email: 'steven@example.com', password: 'welkom123', name: 'Steven' },
  { id: 2, email: 'test@example.com', password: 'test123', name: 'Testgebruiker' }
];

const products = [
  { id: 1, name: 'Laptop Hoesje', price: 29.99, image: '💻', description: 'Beschermend hoezen voor je laptop.' },
  { id: 2, name: 'Draadloze Mouse', price: 24.99, image: '🖱️', description: 'Ergonomische draadloze muis.' },
  { id: 3, name: 'USB-C Hub', price: 39.99, image: '🔌', description: '7-in-1 USB-C hub met HDMI.' },
  { id: 4, name: 'Toetsenbord', price: 59.99, image: '⌨️', description: 'Mechanisch toetsenbord met RGB.' },
  { id: 5, name: 'Webcam HD', price: 44.99, image: '📷', description: '1080p HD webcam voor video calls.' },
  { id: 6, name: 'USB-C Kabel', price: 12.99, image: '🔋', description: '2m USB-C snellaadkabel.' }
];

// In-memory ratings data
const ratings = {};

// In-memory order history per user
const orderHistory = {};

// Cart helper
function getCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

// ============ API ROUTES ============

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, error: 'Ongeldige inloggegevens' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth
app.get('/api/me', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Add daily deal to cart (with discount applied) — MUST be before /api/cart/add
app.post('/api/cart/add-deal', (req, res) => {
  const deal = getDailyDeal();
  const cart = getCart(req);
  const dealPrice = Math.round(deal.product.price * (1 - deal.discount) * 100) / 100;
  const existing = cart.find(item => item.productId === deal.product.id && item.isDeal);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: deal.product.id,
      name: deal.product.name + ' (Daily Deal -20%)',
      price: dealPrice,
      quantity: 1,
      isDeal: true
    });
  }
  res.json({ success: true, cart });
});

// Add to cart
app.post('/api/cart/add', (req, res) => {
  const { productId, quantity } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product niet gevonden' });

  const cart = getCart(req);
  const existing = cart.find(item => item.productId === productId);
  if (existing) {
    existing.quantity += quantity || 1;
  } else {
    cart.push({ productId: product.id, name: product.name, price: product.price, quantity: quantity || 1 });
  }
  res.json({ success: true, cart });
});

// Get cart
app.get('/api/cart', (req, res) => {
  const cart = getCart(req);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ cart, total: Math.round(total * 100) / 100 });
});

// Remove from cart
app.post('/api/cart/remove', (req, res) => {
  const { productId } = req.body;
  const cart = getCart(req);
  const idx = cart.findIndex(item => item.productId === productId);
  if (idx !== -1) cart.splice(idx, 1);
  res.json({ success: true, cart });
});

// Checkout
app.post('/api/checkout', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Je moet ingelogd zijn om af te rekenen' });
  }
  const cart = getCart(req);
  if (cart.length === 0) {
    return res.status(400).json({ error: 'Je winkelwagen is leeg' });
  }
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = {
    id: Date.now(),
    items: [...cart],
    total: Math.round(total * 100) / 100,
    customer: req.session.user.name,
    date: new Date().toISOString()
  };
  // Save to order history
  if (!orderHistory[req.session.user.id]) orderHistory[req.session.user.id] = [];
  orderHistory[req.session.user.id].unshift(order);
  if (orderHistory[req.session.user.id].length > 50) {
    orderHistory[req.session.user.id] = orderHistory[req.session.user.id].slice(0, 50);
  }
  req.session.cart = [];
  res.json({ success: true, order });
});

// Contact form
const CONTACT_FILE = path.join(__dirname, 'data', 'contacts.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing contacts
function loadContacts() {
  try {
    if (fs.existsSync(CONTACT_FILE)) {
      return JSON.parse(fs.readFileSync(CONTACT_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading contacts:', e);
  }
  return [];
}

// Save contacts (max 100)
function saveContacts(contacts) {
  const trimmed = contacts.slice(-100);
  fs.writeFileSync(CONTACT_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
}

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Alle velden zijn verplicht' });
  }
  const contacts = loadContacts();
  const newContact = {
    id: Date.now(),
    name,
    email,
    subject,
    message,
    date: new Date().toISOString()
  };
  contacts.push(newContact);
  saveContacts(contacts);
  console.log(`📧 Nieuw contactformulier van ${name} (${email}): ${subject}`);
  res.json({ success: true, message: 'Bericht verzonden! We nemen zo snel mogelijk contact met je op.' });
});

// Get all contacts as JSON (API)
app.get('/api/contacts/json', (req, res) => {
  const contacts = loadContacts();
  res.json(contacts);
});

// Get all contacts as HTML page
app.get('/api/contacts', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'contacts.html');
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Fout bij laden pagina');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });
});

// ============ RATINGS ============

app.post('/api/rating', (req, res) => {
  const { productId, rating } = req.body;
  if (!productId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Geef een productId en rating tussen 1-5' });
  }
  const key = String(productId);
  if (!ratings[key]) ratings[key] = [];
  ratings[key].push(rating);
  const avg = ratings[key].reduce((a, b) => a + b, 0) / ratings[key].length;
  res.json({ success: true, average: Math.round(avg * 10) / 10, count: ratings[key].length });
});

app.get('/api/ratings', (req, res) => {
  const result = products.map(p => {
    const r = ratings[String(p.id)];
    const avg = r && r.length ? Math.round((r.reduce((a,b) => a+b, 0) / r.length) * 10) / 10 : 0;
    const count = r ? r.length : 0;
    return { productId: p.id, average: avg, count };
  });
  res.json(result);
});

// ============ DAILY DEAL ============

app.get('/api/daily-deal', (req, res) => {
  const deal = getDailyDeal();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const msLeft = tomorrow - now;
  const hours = Math.floor(msLeft / 3600000);
  const minutes = Math.floor((msLeft % 3600000) / 60000);
  const seconds = Math.floor((msLeft % 60000) / 1000);
  res.json({
    product: deal.product,
    discount: deal.discount,
    originalPrice: deal.product.price,
    dealPrice: Math.round(deal.product.price * (1 - deal.discount) * 100) / 100,
    countdown: { hours, minutes, seconds }
  });
});

// ============ ORDER HISTORY ============

app.post('/api/order-history', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Niet ingelogd' });
  const order = {
    id: Date.now(),
    items: [...req.session.cart || []],
    total: (req.session.cart || []).reduce((s, i) => s + i.price * i.quantity, 0),
    customer: req.session.user.name,
    date: new Date().toISOString()
  };
  order.total = Math.round(order.total * 100) / 100;
  if (!orderHistory[req.session.user.id]) orderHistory[req.session.user.id] = [];
  orderHistory[req.session.user.id].unshift(order);
  // Keep max 50 orders per user
  if (orderHistory[req.session.user.id].length > 50) {
    orderHistory[req.session.user.id] = orderHistory[req.session.user.id].slice(0, 50);
  }
  req.session.cart = [];
  res.json({ success: true, order });
});

app.get('/api/order-history', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Niet ingelogd' });
  const orders = orderHistory[req.session.user.id] || [];
  res.json(orders);
});

// ============ ERROR HANDLING & GRACEFUL SHUTDOWN ============

// Catch uncaught exceptions — log but don't crash
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  console.error(err.stack);
  // Keep running — don't exit
});

// Catch unhandled promise rejections — log but don't crash
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep running — don't exit
});

// Graceful shutdown on SIGTERM/SIGINT
function gracefulShutdown(signal) {
  console.log(`\n🛑 Ontvangen: ${signal}. Server wordt netjes afgesloten...`);
  server.close(() => {
    console.log('✅ Server gestopt.');
    process.exit(0);
  });
  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('⚠️  Force exit na timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============ START ============
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛒 Webshop draait op http://localhost:${PORT}`);
});

// Handle server-level errors (e.g. port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️  Poort ${PORT} is al in gebruik. Probeer opnieuw...`);
  } else {
    console.error('💥 Server error:', err.message);
  }
});
