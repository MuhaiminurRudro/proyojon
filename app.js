// app.js  —  Proyojon Frontend Logic (Vanilla JavaScript)
// CONTENTS
//   1.  DATABASE ─ State management & API layer .............. line   28
//   2.  STATE ─ Global in-memory state object ................ line  122
//   3.  UTILITY ─ Helper functions ........................... line  141
//   4.  REVEAL OBSERVER ─ Scroll animation trigger ........... line  168
//   5.  APP ─ Page router & navigation ....................... line  178
//   6.  AUTH ─ Login, signup, logout ......................... line  287
//   7.  BOOKING CONFIRMED ─ Success overlay .................. line  468
//   8.  CART ─ Shopping cart drawer .......................... line  491
//   9.  SERVICES ─ Marketplace listing & filters ............. line  600
//  10.  LANDING ─ Featured services on home page ............. line  672
//  11.  WORKERS ─ Artisan directory .......................... line  695
//  12.  STORY ─ Timeline & reviews page ...................... line  741
//  13.  BOOKINGS ─ Customer order history .................... line  820
//  14.  PROFILE ─ User profile view & edit ................... line  943
//  15.  MODERATOR ─ Admin dashboard .......................... line 1005
//  16.  SERVICE PROVIDER ─ Worker job dashboard .............. line 1410
//  17.  AI CHAT ASSISTANT ─ AI-powered chatbot ............... line 1638
//  18.  MESSAGING ─ Customer ↔ Worker chat .................. line 1774
//  19.  REVIEWS ─ Rating & review modal system ............... line 1967
//  20.  COMBOS ─ Combo deals & discount bundles .............. line 2093
//  21.  COMPLAINTS ─ Reporting & dispute system .............. line 2230
//  22.  INIT ─ DOMContentLoaded entry point .................. line 2583


"use strict";

// ─── DATABASE ──────────────────────────────────────────────────────────────────

const DB = {
  _key: (k) => `proyojon_${k}`,

  get(key) {
    try { return JSON.parse(localStorage.getItem(this._key(key))); }
    catch { return null; }
  },

  set(key, value) {
    localStorage.setItem(this._key(key), JSON.stringify(value));
    return value;
  },

  remove(key) {
    localStorage.removeItem(this._key(key));
  },

  getSession() { return this.get('session'); },
  setSession(user) { return this.set('session', user); },
  clearSession() { this.remove('session'); },

  // Persist last active page (not auth)
  getLastPage() { return this.get('lastPage') || 'landing'; },
  setLastPage(page) { return this.set('lastPage', page); },

  // Memory Cache for MongoDB Collections
  getUsers() { return _state.users || []; },
  getWorkers() { return _state.workers || []; },
  getBookings() { return _state.bookings || []; },
  getAreas() { return _state.areas || []; },
  getServices() { return _state.services || []; },

  async sync() {
    try {
      const [areasRes, workersRes, bookingsRes, servicesRes, reviewsRes, customersRes, complaintsRes] = await Promise.all([
        fetch('/api/areas'),
        fetch('/api/workers'),
        fetch('/api/bookings'),
        fetch('/api/services'),
        fetch('/api/reviews'),
        fetch('/api/customers').catch(() => null),
        fetch('/api/complaints').catch(() => null)
      ]);
      _state.areas = await areasRes.json();
      _state.workers = await workersRes.json();
      _state.bookings = await bookingsRes.json();
      _state.services = await servicesRes.json();
      _state.reviews = await reviewsRes.json();
      
      let customers = [];
      if (customersRes && customersRes.ok) {
        customers = await customersRes.json();
      }
      _state.users = Array.isArray(customers) && customers.length ? [...customers, ..._state.workers] : [..._state.workers];

      if (complaintsRes && complaintsRes.ok) {
        _state.complaints = await complaintsRes.json();
      } else {
        _state.complaints = [];
      }
    } catch (err) {
      console.error('Failed to sync database collections:', err);
    }
  }
};

const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: '🏠' },
  { id: 'ac', name: 'AC Services', icon: '❄️' },
  { id: 'clean', name: 'Cleaning', icon: '🧹' },
  { id: 'plumb', name: 'Plumbing', icon: '🔧' },
  { id: 'elect', name: 'Electrical', icon: '⚡' },
  { id: 'paint', name: 'Painting', icon: '🎨' },
  { id: 'pest', name: 'Pest Control', icon: '🐛' },
  { id: 'water', name: 'Water Services', icon: '💧' },
  { id: 'appliance', name: 'Appliance Repair', icon: '🛠️' },
  { id: 'carpentry', name: 'Carpentry', icon: '🪚' },
  { id: 'laundry', name: 'Laundry', icon: '👕' },
  { id: 'moving', name: 'Moving', icon: '🚚' },
  { id: 'security', name: 'Security', icon: '🔒' },
  { id: 'it', name: 'IT Services', icon: '💻' },
];

const COLORS = ['bg-red-500', 'bg-teal-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-600', 'bg-blue-600'];

const REVIEWS = {
  customers: [
    { name: 'Adnan Chowdhury', role: 'Gulshan Resident', text: "Proyojon didn't just fix my AC; they restored my faith in local services. Punctual and professional." },
    { name: 'Dr. Nusrat Jahan', role: 'Medical Professional', text: "I've used them for deep cleaning twice. The attention to detail is unmatched in Dhaka." },
    { name: 'Ziaul Huq', role: 'Entrepreneur', text: "The transparent pricing is a game changer. No more haggling with workers." },
  ],
  artisans: [
    { name: 'Master Kabir', role: 'Senior Plumber', text: "I have been a plumber for 18 years. Proyojon is the only platform that treats my skill with dignity." },
    { name: 'Niloy Das', role: 'Electrician', text: "The training sessions at Proyojon helped me learn modern safety standards I never knew before." },
    { name: 'Sumi Akter', role: 'Cleaning Expert', text: "I can now support my family with a consistent income. Proyojon is my second home." },
  ],
};

const TIMELINE = [
  { year: '2022', title: 'The Seed', desc: 'Started in a small garage in Dhanmondi with just 5 specialized artisans who believed every home deserves mastery.', num: '01' },
  { year: '2023', title: 'The Digital Leap', desc: 'Launched our first platform. We scaled from 5 to 200 artisans, providing consistent work and fair wages across the city.', num: '02' },
  { year: '2024', title: 'The Standard', desc: 'Established the Proyojon Academy — a mandatory certification for all our providers to ensure quality in every service.', num: '03' },
  { year: '2025', title: "Dhaka's Pulse", desc: "Became the highest-rated service collective in the country. Helping 10,000+ homes monthly while maintaining 100% safety records.", num: '04' },
];

// ─── STATE ─────────────────────────────────────────────────────────────────────

let _state = {
  currentPage: 'auth',
  authMode: 'login',
  authRole: 'customer',
  catFilter: 'all',
  searchQuery: '',
  zone: 'All',
  workerSkillFilter: 'All',
  cartItems: [],
  users: [],
  workers: [],
  bookings: [],
  areas: [],
  services: [],
  reviews: [],
  userLocation: {
    lat: 23.7925,
    lng: 90.4078,
    address: 'Road 11, Block D, Gulshan, Dhaka',
    zone: 'Gulshan',
    note: ''
  }
};

// ─── UTILITY ───────────────────────────────────────────────────────────────────

function showToast(msg, type = 'default') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show';
  t.style.background = type === 'error' ? '#dc2626' : '#0d0e11';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// ─── REVEAL OBSERVER ───────────────────────────────────────────────────────────

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.1 });

function attachReveal() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// ─── APP ───────────────────────────────────────────────────────────────────────

const App = {
  // Switch between app pages (not auth)
  async goPage(pageId) {
    await DB.sync(); // Refresh collections from server before rendering any page

    // Hide all app pages
    document.querySelectorAll('#app-wrapper .page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');

    const nav = document.getElementById(`bnav-${pageId}`);
    if (nav) nav.classList.add('active');

    _state.currentPage = pageId;
    // Persist the page so reload returns here
    DB.setLastPage(pageId);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Page-specific setup
    if (pageId === 'home') { Services.render(); }
    if (pageId === 'workers') { Workers.render(); }
    if (pageId === 'story') { Story.render(); }
    if (pageId === 'bookings') { Bookings.render(); }
    if (pageId === 'profile') { Profile.load(); }
    if (pageId === 'mod') { Mod.load(); }
    if (pageId === 'provider') { Provider.load(); }
    if (pageId === 'landing') { Landing.render(); }
    if (pageId === 'messages') { MsgPanel.load(); }
    if (pageId !== 'messages') { MsgPanel.stopPolling(); }
    if (pageId === 'combos') { Combos.load(); }
    if (pageId === 'complaints') { Complaints.load(); }

    setTimeout(attachReveal, 100);
  },

  // Show the auth screen (hide app)
  showAuth() {
    document.getElementById('page-auth').style.display = 'flex';
    document.getElementById('main-nav').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'none';
    _state.currentPage = 'auth';
    setTimeout(attachReveal, 100);
  },

  // Show the app (hide auth)
  showApp(session) {
    document.getElementById('page-auth').style.display = 'none';
    document.getElementById('main-nav').style.display = 'block';
    document.getElementById('app-wrapper').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'flex';

    if (session.role === 'moderator') {
      document.getElementById('bnav-mod').classList.remove('hidden');
      document.getElementById('bnav-provider').classList.add('hidden');
      document.getElementById('bnav-messages').classList.add('hidden');
      document.getElementById('bnav-complaints').classList.remove('hidden');  // moderators CAN view complaints
      document.getElementById('bnav-combos').classList.add('hidden');
      // Hide AI chatbot — moderators don't need it
      document.getElementById('ai-chat-btn').style.display = 'none';
      document.getElementById('ai-chat-box').style.display = 'none';
    } else if (session.role === 'provider') {
      document.getElementById('bnav-provider').classList.remove('hidden');
      document.getElementById('bnav-mod').classList.add('hidden');
      document.getElementById('bnav-messages').classList.remove('hidden');
      document.getElementById('bnav-complaints').classList.remove('hidden');
      document.getElementById('bnav-combos').classList.add('hidden');
      // Hide AI chatbot — providers don't need it
      document.getElementById('ai-chat-btn').style.display = 'none';
      document.getElementById('ai-chat-box').style.display = 'none';
    } else {
      // Customer — show AI chatbot, complaints and combo deals
      document.getElementById('bnav-mod').classList.add('hidden');
      document.getElementById('bnav-provider').classList.add('hidden');
      document.getElementById('bnav-messages').classList.remove('hidden');
      document.getElementById('bnav-complaints').classList.remove('hidden');
      document.getElementById('bnav-combos').classList.remove('hidden');
      document.getElementById('ai-chat-btn').style.display = 'flex';
    }

    Notifications.init();
  },

  async init() {
    await DB.sync(); // Initial server fetch
    Notifications.init();
    const session = DB.getSession();
    if (session) {
      // Already logged in — restore the last page
      App.showApp(session);
      const lastPage = DB.getLastPage();

      // Guard for pages
      if (lastPage === 'mod' && session.role !== 'moderator') {
        App.goPage('landing');
      } else if (lastPage === 'provider' && session.role !== 'provider') {
        App.goPage('landing');
      } else if (lastPage === 'combos' && session.role !== 'customer') {
        App.goPage('landing');
      } else {
        App.goPage(lastPage);
      }
    } else {
      App.showAuth();
    }
  },
};

// ─── AUTH ──────────────────────────────────────────────────────────────────────

const Auth = {
  setRole(role) {
    _state.authRole = role;
    document.getElementById('role-customer').classList.toggle('active', role === 'customer');
    document.getElementById('role-provider').classList.toggle('active', role === 'provider');
    document.getElementById('role-moderator').classList.toggle('active', role === 'moderator');
    Auth.updateFormFields();
  },

  toggleMode() {
    _state.authMode = _state.authMode === 'login' ? 'signup' : 'login';
    const isLogin = _state.authMode === 'login';
    document.getElementById('field-name').classList.toggle('hidden', isLogin);
    document.getElementById('field-confirm').classList.toggle('hidden', isLogin);
    document.getElementById('auth-title').textContent = isLogin ? 'Welcome Back' : 'Create Account';
    document.getElementById('auth-subtitle').textContent = isLogin ? "Login to access Dhaka's finest services." : "Join thousands of happy customers.";
    document.getElementById('auth-btn').textContent = isLogin ? 'Enter Proyojon' : 'Create Account';
    document.getElementById('toggle-mode-btn').textContent = isLogin ? 'Create an account' : 'Already have an account?';
    document.getElementById('auth-error').classList.add('hidden');
    Auth.updateFormFields();
  },

  updateFormFields() {
    const isSignup = _state.authMode === 'signup';
    const role = _state.authRole;

    const modZone = document.getElementById('field-mod-zone');
    const provSkill = document.getElementById('field-provider-skill');
    const provZones = document.getElementById('field-provider-zones');
    const provDoc = document.getElementById('field-provider-doc');

    modZone.classList.add('hidden');
    provSkill.classList.add('hidden');
    provZones.classList.add('hidden');
    provDoc.classList.add('hidden');

    if (isSignup) {
      if (role === 'moderator') {
        modZone.classList.remove('hidden');
      } else if (role === 'provider') {
        provSkill.classList.remove('hidden');
        provZones.classList.remove('hidden');
        provDoc.classList.remove('hidden');
        document.getElementById('field-provider-phone').classList.remove('hidden');
      }
    } else {
      document.getElementById('field-provider-phone').classList.add('hidden');
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('auth-error');
    errEl.classList.add('hidden');

    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;

    if (_state.authMode === 'signup') {
      const name = document.getElementById('auth-name').value.trim();
      const confirm = document.getElementById('auth-confirm').value;

      if (!name) { Auth.showError('Name is required'); return; }
      if (password.length < 6) { Auth.showError('Password must be at least 6 characters'); return; }
      if (password !== confirm) { Auth.showError('Passwords do not match'); return; }

      const body = {
        name,
        email,
        password,
        role: _state.authRole
      };

      if (_state.authRole === 'customer') {
        body.phone = '';
        body.zone = 'Gulshan';
      } else if (_state.authRole === 'moderator') {
        body.assignedZone = document.getElementById('auth-mod-zone').value;
      } else if (_state.authRole === 'provider') {
        const skill = document.getElementById('auth-provider-skill').value;
        // Read coverage zones from checkboxes
        const selectedZones = Array.from(document.querySelectorAll('.prov-zone-cb:checked')).map(cb => cb.value);
        const doc = document.getElementById('auth-provider-doc').value.trim() || 'nid_doc.pdf';
        const phone = document.getElementById('auth-provider-phone').value.trim() || '';

        if (!selectedZones.length) { Auth.showError('Please select at least one coverage area'); return; }

        body.phone = phone;
        body.serviceCategory = skill;
        body.coverageZones = selectedZones;
        body.verificationDocument = doc;
        body.color = randomColor();
        body.initials = initials(name);
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { Auth.showError(data.error || 'Registration failed'); return; }

        data.id = data._id; // legacy compatibility
        DB.setSession(data);
        await DB.sync();

        showToast(`Welcome to Proyojon, ${name}!`);
        setTimeout(() => {
          App.showApp(data);
          if (data.role === 'provider') {
            App.goPage('provider');
          } else if (data.role === 'moderator') {
            App.goPage('mod');
          } else {
            App.goPage('landing');
          }
        }, 600);
      } catch (err) {
        Auth.showError('Network error. Please try again.');
      }

    } else {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: _state.authRole })
        });
        const data = await res.json();
        if (!res.ok) { Auth.showError(data.error || 'Login failed'); return; }

        data.id = data._id; // legacy compatibility
        DB.setSession(data);
        await DB.sync();

        showToast(`Welcome back, ${data.name}!`);
        setTimeout(() => {
          App.showApp(data);
          if (data.role === 'provider') {
            App.goPage('provider');
          } else if (data.role === 'moderator') {
            App.goPage('mod');
          } else {
            App.goPage('landing');
          }
        }, 600);
      } catch (err) {
        Auth.showError('Network error. Please try again.');
      }
    }
  },

  showError(msg) {
    const errEl = document.getElementById('auth-error');
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  },

  logout() {
    DB.clearSession();
    DB.setLastPage('landing');
    _state.cartItems = [];
    Cart.updateUI();

    // Reset profile UI
    document.getElementById('profile-name').textContent = 'Guest User';
    document.getElementById('profile-initial').textContent = '?';
    document.getElementById('profile-role-display').textContent = 'Member';
    showToast('Logged out successfully');
    setTimeout(() => {
      // Hide all app pages
      document.querySelectorAll('#app-wrapper .page').forEach(p => p.classList.remove('active'));
      App.showAuth();
    }, 600);
  },
};

// ─── BOOKING CONFIRMED ─────────────────────────────────────────────────────────

const BookingConfirmed = {
  _lastBookingId: null,

  show(bookingId) {
    this._lastBookingId = bookingId;
    document.getElementById('confirm-booking-id').textContent = `Booking ID: ${bookingId}`;
    document.getElementById('booking-confirmed-overlay').classList.add('open');
  },

  hide() {
    document.getElementById('booking-confirmed-overlay').classList.remove('open');
  },

  viewInvoice() {
    this.hide();
    if (this._lastBookingId) {
      Invoice.show(this._lastBookingId);
    }
  },

  viewOrders() {
    this.hide();
    App.goPage('bookings');
  },

  bookMore() {
    this.hide();
    App.goPage('home');
  },
};

// ─── INVOICE CONTROLLER ────────────────────────────────────────────────────────

const Invoice = {
  show(bookingId) {
    const booking = DB.getBookings().find(b => b.id === bookingId || b._id === bookingId);
    if (!booking) {
      showToast('Booking not found', 'error');
      return;
    }

    const modal = document.getElementById('invoice-modal');
    if (!modal) return;

    // Header info
    document.getElementById('invoice-num').textContent = `INV-${booking.id}`;
    document.getElementById('invoice-date').textContent = formatDate(booking.createdAt);

    const scheduleRow = document.getElementById('invoice-schedule-row');
    const scheduleTime = document.getElementById('invoice-schedule-time');
    if (booking.scheduledFor) {
      scheduleTime.textContent = formatDate(booking.scheduledFor);
      scheduleRow.style.display = 'block';
    } else {
      scheduleRow.style.display = 'none';
    }

    // Status Badge
    const statusBadge = document.getElementById('invoice-status-badge');
    const badgeClass = {
      done: 'badge-done',
      approved: 'badge-approved',
      confirmed: 'badge-active',
      pending: 'badge-pending',
      cancelled: 'badge-rejected'
    }[booking.status] || 'badge-pending';
    statusBadge.className = `status-badge ${badgeClass} text-xs px-3 py-1 uppercase font-bold tracking-widest inline-block mb-2`;
    statusBadge.textContent = booking.status === 'done' ? 'Paid / Completed' : (booking.status || 'Pending');

    // Customer / Billed To
    document.getElementById('invoice-cust-name').textContent = booking.userName || 'Valued Customer';
    document.getElementById('invoice-cust-contact').textContent = `Customer ID: ${booking.userId || booking.customerId || '—'}`;
    document.getElementById('invoice-delivery-address').textContent = booking.deliveryAddress || `${booking.deliveryZone || 'Gulshan'}, Dhaka`;
    document.getElementById('invoice-delivery-zone').textContent = `Zone: ${booking.deliveryZone || 'Dhaka'}${booking.location?.lat ? ` (GPS: ${booking.location.lat.toFixed(4)}°, ${booking.location.lng.toFixed(4)}°)` : ''}`;

    // Provider / Specialist Info
    const providerBox = document.getElementById('invoice-provider-details');
    const comboDetails = document.getElementById('invoice-combo-details');

    if (booking.isComboBooking && Array.isArray(booking.comboAssignments) && booking.comboAssignments.length) {
      providerBox.classList.add('hidden');
      comboDetails.classList.remove('hidden');
      comboDetails.innerHTML = `
        <div class="space-y-2">
          <p class="text-xs font-bold text-orange-600 uppercase tracking-wide">Combo Bundle Specialists:</p>
          ${booking.comboAssignments.map((slot, i) => `
            <div class="text-xs bg-white p-2.5 rounded-xl border border-gray-100 flex justify-between items-center">
              <div>
                <span class="font-bold text-gray-800">${slot.serviceName}</span>
                <p class="text-[11px] text-gray-400">Assigned: <strong class="text-gray-700">${slot.providerName || 'Pending Assignment'}</strong></p>
              </div>
              <span class="text-[10px] font-bold ${slot.completed ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50'} px-2 py-0.5 rounded-full">
                ${slot.completed ? '✓ Completed' : 'In Progress'}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      comboDetails.classList.add('hidden');
      providerBox.classList.remove('hidden');
      document.getElementById('invoice-worker-name').textContent = booking.workerName || 'Specialist Pending Assignment';
      document.getElementById('invoice-worker-skill').textContent = booking.workerName ? 'Verified Proyojon Professional' : 'Will be dispatched by team';
    }

    // Line Items
    const items = booking.items || [];
    const regularItems = items.filter(i => !i.isDiscount);
    const discountItem = items.find(i => i.isDiscount);

    const tbody = document.getElementById('invoice-items-tbody');
    let subtotal = 0;

    tbody.innerHTML = regularItems.map((item, idx) => {
      const price = item.price || 0;
      subtotal += price;
      return `
        <tr>
          <td class="text-center font-mono text-gray-400 text-xs">${idx + 1}</td>
          <td>
            <div class="flex items-center gap-2">
              <span class="text-base">${item.icon || '🛠️'}</span>
              <div>
                <span class="font-semibold text-gray-900 block">${item.name}</span>
                ${item.desc ? `<span class="text-[10px] text-gray-400 leading-tight block">${item.desc}</span>` : ''}
              </div>
            </div>
          </td>
          <td><span class="text-xs uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold">${item.cat || 'Service'}</span></td>
          <td class="text-right font-medium text-gray-700">৳${price.toLocaleString()}</td>
          <td class="text-right font-bold text-gray-900">৳${price.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    // Summary calculation
    document.getElementById('invoice-subtotal').textContent = `৳${subtotal.toLocaleString()}`;

    const discountRow = document.getElementById('invoice-discount-row');
    if (discountItem && discountItem.price < 0) {
      discountRow.classList.remove('hidden');
      document.getElementById('invoice-discount').textContent = `-৳${Math.abs(discountItem.price).toLocaleString()}`;
    } else {
      discountRow.classList.add('hidden');
    }

    document.getElementById('invoice-grand-total').textContent = `৳${(booking.total || subtotal).toLocaleString()}`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  close() {
    const modal = document.getElementById('invoice-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  print() {
    window.print();
  }
};

// ─── NOTIFICATIONS CONTROLLER ──────────────────────────────────────────────────

const Notifications = {
  _filter: 'all', // 'all' or 'unread'

  getStorageKey() {
    const session = DB.getSession();
    const id = session ? (session._id || session.id || session.email) : 'guest';
    return `proyojon_notifs_${id}`;
  },

  getClearedKey() {
    const session = DB.getSession();
    const id = session ? (session._id || session.id || session.email) : 'guest';
    return `proyojon_notifs_cleared_${id}`;
  },

  getDismissedKey() {
    const session = DB.getSession();
    const id = session ? (session._id || session.id || session.email) : 'guest';
    return `proyojon_notifs_dismissed_${id}`;
  },

  getDismissedIds() {
    try {
      const raw = localStorage.getItem(this.getDismissedKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getClearedAt() {
    try {
      const raw = localStorage.getItem(this.getClearedKey());
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  },

  getAll() {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveAll(list) {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(list));
      this.updateBadge();
    } catch (e) {
      console.warn('Notification save error', e);
    }
  },

  add(notif) {
    const dismissed = this.getDismissedIds();
    const notifId = notif.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    if (dismissed.includes(notifId)) return;

    const list = this.getAll();
    const newNotif = {
      id: notifId,
      title: notif.title || 'New Notification',
      body: notif.body || '',
      type: notif.type || 'info', // 'order', 'assignment', 'chat', 'schedule', 'review', 'complaint'
      icon: notif.icon || '🔔',
      iconBg: notif.iconBg || '#f3f4f6',
      iconColor: notif.iconColor || '#374151',
      time: notif.time || new Date().toISOString(),
      read: false,
      actionCall: notif.actionCall || null,
      actionLabel: notif.actionLabel || null
    };

    // Avoid duplicate IDs
    const exists = list.some(n => n.id === newNotif.id);
    if (!exists) {
      list.unshift(newNotif);
      // Keep max 50 notifications
      if (list.length > 50) list.pop();
      this.saveAll(list);
      this.render();
    }
  },

  toggle() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      this.syncFromData();
      this.render();
    }
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('notif-panel')) this.toggle();
  },

  setFilter(filter) {
    this._filter = filter;
    document.getElementById('notif-filter-all')?.classList.toggle('active', filter === 'all');
    document.getElementById('notif-filter-unread')?.classList.toggle('active', filter === 'unread');
    this.render();
  },

  markAllRead() {
    const list = this.getAll();
    list.forEach(n => n.read = true);
    this.saveAll(list);
    this.render();
    showToast('All notifications marked as read');
  },

  markRead(id) {
    const list = this.getAll();
    const item = list.find(n => n.id === id);
    if (item) {
      item.read = true;
      this.saveAll(list);
      this.render();
    }
  },

  dismiss(id, e) {
    if (e) e.stopPropagation();
    const dismissed = this.getDismissedIds();
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      try {
        localStorage.setItem(this.getDismissedKey(), JSON.stringify(dismissed));
      } catch (err) {}
    }
    const list = this.getAll().filter(n => n.id !== id);
    this.saveAll(list);
    this.render();
  },

  clearAll() {
    try {
      localStorage.setItem(this.getClearedKey(), Date.now().toString());
      // Clear dismissed IDs as well
      localStorage.removeItem(this.getDismissedKey());
    } catch (e) {}
    this.saveAll([]);
    this.render();
    showToast('Notification history cleared');
  },

  handleClick(id, actionCall) {
    this.markRead(id);
    if (actionCall) {
      this.toggle();
      try {
        const fn = new Function(actionCall);
        fn();
      } catch (e) {
        console.error('Notification action error:', e);
      }
    }
  },

  updateBadge() {
    const list = this.getAll();
    const unread = list.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    const pill = document.getElementById('notif-unread-count-pill');

    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (pill) {
      pill.textContent = `${unread} New`;
    }
  },

  formatTime(isoString) {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  },

  // Auto-sync notifications from database state (bookings, complaints, etc.)
  syncFromData() {
    const session = DB.getSession();
    if (!session) return;
    const role = session.role;
    const bookings = _state.bookings || [];
    const clearedAt = this.getClearedAt();
    const dismissedIds = this.getDismissedIds();

    const isDismissedOrOld = (id, timeStr) => {
      if (dismissedIds.includes(id)) return true;
      if (timeStr && clearedAt) {
        const timeMs = new Date(timeStr).getTime();
        if (!isNaN(timeMs) && timeMs <= clearedAt) return true;
      }
      return false;
    };

    if (role === 'customer') {
      const myBookings = bookings.filter(b => b.userId === session._id || b.customerId === session._id || b.userId === session.id || b.userName === session.name);
      myBookings.forEach(b => {
        // Order confirmed notification
        const orderNotifId = `order_placed_${b.id}`;
        if (!isDismissedOrOld(orderNotifId, b.createdAt)) {
          this.add({
            id: orderNotifId,
            title: `Booking Confirmed: #${b.id}`,
            body: `Your service order for ${b.items?.map(i => i.name).join(', ')} has been received.`,
            type: 'order',
            icon: '✅',
            iconBg: '#ecfdf5',
            iconColor: '#059669',
            time: b.createdAt || new Date().toISOString(),
            actionCall: `Invoice.show('${b.id}')`,
            actionLabel: 'View Invoice'
          });
        }

        // Worker assigned notification
        if (b.workerName) {
          const workerNotifId = `worker_assigned_${b.id}_${b.workerName}`;
          if (!isDismissedOrOld(workerNotifId, b.createdAt)) {
            this.add({
              id: workerNotifId,
              title: `Artisan Dispatched: ${b.workerName}`,
              body: `Assigned specialist is preparing for Booking #${b.id}.`,
              type: 'assignment',
              icon: '👷',
              iconBg: '#fff7ed',
              iconColor: '#ea580c',
              time: b.createdAt || new Date().toISOString(),
              actionCall: `LiveMap.openOrderTracker('${b.id}')`,
              actionLabel: 'Live Track'
            });
          }
        }

        // Scheduled service reminder
        if (b.scheduledFor) {
          const schedNotifId = `schedule_${b.id}`;
          if (!isDismissedOrOld(schedNotifId, b.createdAt)) {
            this.add({
              id: schedNotifId,
              title: `Service Scheduled: #${b.id}`,
              body: `Appointment set for ${formatDate(b.scheduledFor)}.`,
              type: 'schedule',
              icon: '📅',
              iconBg: '#eff6ff',
              iconColor: '#2563eb',
              time: b.createdAt || new Date().toISOString(),
              actionCall: `Invoice.show('${b.id}')`,
              actionLabel: 'View Schedule'
            });
          }
        }

        // Service completed notification
        if (b.status === 'approved') {
          const compNotifId = `completed_pending_confirm_${b.id}`;
          if (!isDismissedOrOld(compNotifId, b.createdAt)) {
            this.add({
              id: compNotifId,
              title: `Service Completed by Artisan`,
              body: `Worker finished Booking #${b.id}. Please confirm completion!`,
              type: 'order',
              icon: '🎉',
              iconBg: '#fef3c7',
              iconColor: '#d97706',
              time: new Date().toISOString(),
              actionCall: `App.goPage('bookings')`,
              actionLabel: 'Confirm Done'
            });
          }
        }
      });
    } else if (role === 'provider') {
      const myJobs = bookings.filter(b => b.assignedWorkerId === session._id || b.providerId === session._id);
      myJobs.forEach(b => {
        const jobNotifId = `job_assigned_${b.id}`;
        if (!isDismissedOrOld(jobNotifId, b.createdAt)) {
          this.add({
            id: jobNotifId,
            title: `New Job Assigned: #${b.id}`,
            body: `Customer ${b.userName} requested ${b.items?.map(i => i.name).join(', ')} in ${b.deliveryZone || 'Dhaka'}.`,
            type: 'assignment',
            icon: '🛠️',
            iconBg: '#fff7ed',
            iconColor: '#ea580c',
            time: b.createdAt || new Date().toISOString(),
            actionCall: `App.goPage('provider')`,
            actionLabel: 'Open Job'
          });
        }
      });
    } else if (role === 'moderator' || role === 'admin') {
      const workers = _state.workers || [];
      const complaints = _state.complaints || [];

      // 1. Pending Bookings requiring artisan assignment
      bookings.forEach(b => {
        if (b.status === 'pending') {
          const modPendingId = `mod_pending_booking_${b.id}`;
          if (!isDismissedOrOld(modPendingId, b.createdAt)) {
            const isCombo = b.isComboBooking;
            this.add({
              id: modPendingId,
              title: isCombo ? `🔀 Combo Order Needs Providers: #${b.id}` : `New Booking Pending Assignment: #${b.id}`,
              body: `Customer ${b.userName} requested ${b.items?.map(i => i.name).join(', ')} (${b.deliveryZone || 'Dhaka'}). Total: ৳${(b.total || 0).toLocaleString()}`,
              type: 'order',
              icon: isCombo ? '🔀' : '📋',
              iconBg: '#fff7ed',
              iconColor: '#ea580c',
              time: b.createdAt || new Date().toISOString(),
              actionCall: `App.goPage('mod')`,
              actionLabel: 'Assign Worker'
            });
          }
        } else if (b.status === 'cancelled') {
          const modCancelId = `mod_cancelled_${b.id}`;
          if (!isDismissedOrOld(modCancelId, b.createdAt)) {
            this.add({
              id: modCancelId,
              title: `Order Cancelled: #${b.id}`,
              body: `Booking for ${b.userName} (৳${(b.total || 0).toLocaleString()}) was cancelled.`,
              type: 'order',
              icon: '✕',
              iconBg: '#fef2f2',
              iconColor: '#dc2626',
              time: b.createdAt || new Date().toISOString(),
              actionCall: `App.goPage('mod')`,
              actionLabel: 'View Dashboard'
            });
          }
        }
      });

      // 2. Pending Worker Verifications
      workers.forEach(w => {
        if (w.verifiedStatus === 'Pending') {
          const modWorkerId = `mod_worker_pending_${w._id || w.id}`;
          if (!isDismissedOrOld(modWorkerId, w.joinedAt || w.createdAt)) {
            this.add({
              id: modWorkerId,
              title: `Worker Verification Needed: ${w.name}`,
              body: `${w.serviceCategory || w.skill || 'Specialist'} applied with document (${w.verificationDocument || 'NID'}).`,
              type: 'assignment',
              icon: '🪪',
              iconBg: '#eff6ff',
              iconColor: '#2563eb',
              time: w.joinedAt || new Date().toISOString(),
              actionCall: `App.goPage('mod')`,
              actionLabel: 'Verify Worker'
            });
          }
        }
      });

      // 3. Open Disputes & Complaints
      complaints.forEach(c => {
        if (c.status === 'open') {
          const modComplaintId = `mod_complaint_${c._id || c.bookingId}`;
          if (!isDismissedOrOld(modComplaintId, c.createdAt)) {
            this.add({
              id: modComplaintId,
              title: `Dispute Filed: Booking #${c.bookingId}`,
              body: `${c.complainantName} (${c.complainantRole}) reported ${c.category}: "${c.description?.slice(0, 60)}..."`,
              type: 'complaint',
              icon: '⚠️',
              iconBg: '#fef2f2',
              iconColor: '#dc2626',
              time: c.createdAt || new Date().toISOString(),
              actionCall: `App.goPage('complaints')`,
              actionLabel: 'Review Dispute'
            });
          }
        }
      });
    }
  },

  render() {
    this.updateBadge();
    const container = document.getElementById('notif-list');
    if (!container) return;

    let list = this.getAll();
    if (this._filter === 'unread') {
      list = list.filter(n => !n.read);
    }

    if (!list.length) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <span class="text-4xl block mb-2">✨</span>
          <p class="text-xs font-bold uppercase tracking-widest text-gray-500">No ${this._filter === 'unread' ? 'Unread ' : ''}Notifications</p>
          <p class="text-[11px] text-gray-400 mt-1">You're completely up to date!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(n => `
      <div class="notif-card ${n.read ? '' : 'unread'}" onclick="Notifications.handleClick('${n.id}', ${n.actionCall ? `'${n.actionCall}'` : 'null'})">
        <div class="notif-icon-box" style="background:${n.iconBg || '#f3f4f6'};color:${n.iconColor || '#374151'};">
          ${n.icon || '🔔'}
        </div>
        <div class="flex-1 pr-3">
          <div class="flex justify-between items-baseline gap-2">
            <h4 class="font-syne font-bold text-xs text-gray-900 leading-snug">${n.title}</h4>
            <span class="text-[10px] text-gray-400 font-medium shrink-0">${this.formatTime(n.time)}</span>
          </div>
          <p class="text-xs text-gray-500 mt-1 leading-relaxed">${n.body}</p>
          ${n.actionLabel ? `
            <button type="button" class="mt-2 text-[10px] bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold uppercase px-2.5 py-1 rounded-lg border border-orange-200 transition inline-block">
              ${n.actionLabel} &rarr;
            </button>
          ` : ''}
        </div>
        <button type="button" title="Dismiss" onclick="Notifications.dismiss('${n.id}', event)" class="text-gray-300 hover:text-gray-700 text-lg leading-none p-1 transition">&times;</button>
      </div>
    `).join('');
  },

  init() {
    this.syncFromData();
    this.updateBadge();
  }
};

// ─── CART ──────────────────────────────────────────────────────────────────────

const Cart = {
  toggle() {
    const panel = document.getElementById('cart-panel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      this.updateMinSchedule();
    }
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('cart-panel')) this.toggle();
  },

  updateMinSchedule() {
    const input = document.getElementById('cart-schedule');
    if (input) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      input.min = `${year}-${month}-${day}T${hours}:${mins}`;
    }
  },

  add(id) {
    const svc = DB.getServices().find(s => s.id === id);
    if (!svc) return;
    _state.cartItems.push({ ...svc });
    this.updateUI();
    showToast(`${svc.name} added to cart`);
  },

  remove(idx) {
    _state.cartItems.splice(idx, 1);
    this.updateUI();
  },

  updateUI() {
    const items = _state.cartItems;
    const badge = document.getElementById('cart-badge');
    const total = items.reduce((s, i) => s + i.price, 0);

    badge.textContent = items.length;
    badge.style.display = items.length ? 'flex' : 'none';

    document.getElementById('cart-total').textContent = `৳${total.toLocaleString()}`;

    document.getElementById('cart-items').innerHTML = items.length
      ? items.map((item, idx) => `
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <p class="font-medium text-sm">${item.icon} ${item.name}</p>
              <p class="text-xs text-gray-400 mt-0.5">৳${item.price.toLocaleString()}</p>
            </div>
            <button onclick="Cart.remove(${idx})" class="text-red-400 hover:text-red-600 font-bold text-lg leading-none transition">✕</button>
          </div>
        `).join('')
      : '<p class="text-gray-400 text-sm text-center py-10 font-syne uppercase tracking-widest">Your cart is empty</p>';

    this.updateMinSchedule();

    if (typeof LiveMap !== 'undefined' && LiveMap.updateCartLocationUI) {
      LiveMap.updateCartLocationUI();
    }
  },

  async checkout() {
    if (!_state.cartItems.length) { showToast('Your cart is empty', 'error'); return; }
    const session = DB.getSession();
    if (!session) { showToast('Please login first', 'error'); return; }

    const scheduleInput = document.getElementById('cart-schedule');
    const scheduledFor = scheduleInput ? scheduleInput.value : '';
    if (!scheduledFor) { showToast('Please pick a date and time for your service', 'error'); return; }
    if (new Date(scheduledFor) <= new Date()) { showToast('Scheduled time must be in the future', 'error'); return; }

    if (!confirm('Are you sure you want to confirm this order?')) return;

    // Detect if this is a combo booking
    const comboItems = _state.cartItems.filter(i => i.isComboItem);
    const discountItem = _state.cartItems.find(i => i.isDiscount);
    const isComboBooking = comboItems.length >= 2 && !!discountItem;

    // Derive comboId from discount item id, e.g. "combo-discount-home-refresh" → "home-refresh"
    let comboId = '';
    let comboAssignments = [];
    if (isComboBooking && discountItem) {
      comboId = discountItem.id.replace('combo-discount-', '');
      // Pre-populate assignment slots with service metadata
      comboAssignments = comboItems.map((item, idx) => ({
        serviceIdx: idx,
        serviceName: item.name,
        serviceCategory: item.cat || '',
        providerId: '',
        providerName: ''
      }));
    }

    const loc = _state.userLocation || {
      lat: 23.7925,
      lng: 90.4078,
      address: 'Road 11, Block D, Gulshan, Dhaka',
      zone: 'Gulshan'
    };

    const booking = {
      id: generateId('BK'),
      userId: session.id || session._id,
      userName: session.name,
      items: [..._state.cartItems],
      total: _state.cartItems.reduce((s, i) => s + i.price, 0),
      scheduledFor: scheduledFor,
      deliveryAddress: loc.address || `${loc.zone || 'Gulshan'}, Dhaka`,
      deliveryZone: loc.zone || 'Gulshan',
      location: {
        lat: loc.lat || 23.7925,
        lng: loc.lng || 90.4078
      },
      ...(isComboBooking && { isComboBooking: true, comboId, comboAssignments })
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to confirm order', 'error'); return; }

      await DB.sync(); // Fetch latest from server

      _state.cartItems = [];
      if (scheduleInput) scheduleInput.value = '';
      this.updateUI();
      this.toggle(); // Close the cart drawer first

      Profile.refreshStats();

      // Trigger Booking Confirmed Notification
      Notifications.add({
        id: `order_placed_${booking.id}`,
        title: `Booking Confirmed: #${booking.id}`,
        body: `Your service order for ৳${booking.total.toLocaleString()} was placed successfully!`,
        type: 'order',
        icon: '✅',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        actionCall: `Invoice.show('${booking.id}')`,
        actionLabel: 'View Invoice'
      });

      // Show the booking confirmed overlay (not a page navigation)
      setTimeout(() => BookingConfirmed.show(booking.id), 200);
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  },
};

// ─── SERVICES ──────────────────────────────────────────────────────────────────

const Services = {
  render() {
    this.renderCategories();
    this.renderList();
  },

  renderCategories() {
    document.getElementById('cat-grid').innerHTML = CATEGORIES.map(c => `
      <div class="cat-card ${_state.catFilter === c.id ? 'active' : ''}" onclick="Services.setCat('${c.id}')">
        <span class="text-2xl">${c.icon}</span>
        <span class="text-xs font-bold uppercase tracking-wider">${c.name}</span>
      </div>
    `).join('');
  },

  renderList() {
    const q = _state.searchQuery.toLowerCase();
    const filtered = DB.getServices().filter(s =>
      (_state.catFilter === 'all' || s.cat === _state.catFilter) &&
      (!q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    );

    const listEl = document.getElementById('svc-list');
    const noEl = document.getElementById('no-results');

    if (!filtered.length) {
      listEl.innerHTML = '';
      noEl.classList.remove('hidden');
      return;
    }
    noEl.classList.add('hidden');

    listEl.innerHTML = filtered.map(s => `
      <div class="svc-card reveal">
        <div class="flex justify-between mb-4">
          <span class="text-4xl">${s.icon}</span>
          <span class="text-orange-600 font-bold text-sm">★ ${s.rating}</span>
        </div>
        <h4 class="font-syne font-bold text-base uppercase mb-1">${s.name}</h4>
        <p class="text-gray-400 text-xs mb-5 leading-relaxed">${s.desc}</p>
        <div class="flex justify-between items-center">
          <span class="font-syne text-2xl font-bold">৳${s.price.toLocaleString()}</span>
          <button class="add-btn" onclick="Cart.add(${s.id})">Add</button>
        </div>
      </div>
    `).join('');

    setTimeout(attachReveal, 80);
  },

  setCat(id) {
    _state.catFilter = id;
    _state.searchQuery = '';
    document.getElementById('search-input').value = '';
    this.renderCategories();
    this.renderList();
  },

  search(q) {
    _state.searchQuery = q;
    this.renderList();
  },

  setZone(el, zone) {
    _state.zone = zone;
    document.querySelectorAll('.zone-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
  },

  setZoneByName(zoneName) {
    _state.zone = zoneName;
    document.querySelectorAll('.zone-pill').forEach(p => {
      if (p.textContent.trim().toLowerCase().includes(zoneName.toLowerCase())) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
    showToast(`📍 Filtered for ${zoneName}`);
  },
};

// ─── LANDING ───────────────────────────────────────────────────────────────────

const Landing = {
  render() {
    const featured = DB.getServices().slice(0, 6);
    document.getElementById('featured-services').innerHTML = featured.map(s => `
      <div class="svc-card reveal">
        <div class="flex justify-between mb-4">
          <span class="text-4xl">${s.icon}</span>
          <span class="text-orange-600 font-bold text-sm">★ ${s.rating}</span>
        </div>
        <h4 class="font-syne font-bold text-base uppercase mb-1">${s.name}</h4>
        <p class="text-gray-400 text-xs mb-5 leading-relaxed">${s.desc}</p>
        <div class="flex justify-between items-center">
          <span class="font-syne text-2xl font-bold">৳${s.price.toLocaleString()}</span>
          <button class="add-btn" onclick="Cart.add(${s.id})">Add</button>
        </div>
      </div>
    `).join('');
    setTimeout(attachReveal, 80);
  },
};

// ─── WORKERS ───────────────────────────────────────────────────────────────────

const Workers = {
  render() {
    // Show all workers — verified show normally, pending show with badge
    const allWorkers = DB.getWorkers();
    const skills = ['All', ...new Set(allWorkers.map(w => w.serviceCategory || w.skill).filter(Boolean))];

    document.getElementById('skill-filter').innerHTML = skills.map(s => `
      <button class="zone-pill ${_state.workerSkillFilter === s ? 'active' : ''}" onclick="Workers.filter(this,'${s}')">${s}</button>
    `).join('');

    this.renderList(allWorkers);
  },

  renderList(workers) {
    const filtered = workers.filter(w =>
      _state.workerSkillFilter === 'All' || (w.serviceCategory || w.skill) === _state.workerSkillFilter
    );

    document.getElementById('all-workers-list').innerHTML = filtered.length ? filtered.map((w, i) => `
      <div class="worker-card reveal" style="animation-delay:${i * 0.07}s">
        <div class="worker-avatar ${w.color || 'bg-[#0d0e11]'}">${w.initials || (w.name ? w.name.charAt(0) : '?')}</div>
        <div>
          <h4 class="font-syne font-bold text-lg">${w.name}</h4>
          <p class="text-orange-600 text-xs font-bold uppercase tracking-widest mt-1">${w.serviceCategory || w.skill || 'Service Provider'}</p>
          <p class="text-gray-400 text-xs mt-2"> ${(w.coverageZones && w.coverageZones.length ? w.coverageZones : [w.zone || w.area || 'Dhaka']).join(', ')}</p>
        </div>
        <span class="status-badge ${w.verifiedStatus === 'Verified' ? 'badge-done' : w.verifiedStatus === 'Rejected' ? 'badge-pending' : 'badge-active'}">${w.verifiedStatus || 'Pending'}</span>
      </div>
    `).join('') : '<p class="text-center text-gray-400 py-10 text-sm">No workers found for this category.</p>';

    setTimeout(attachReveal, 80);
  },

  filter(el, skill) {
    _state.workerSkillFilter = skill;
    document.querySelectorAll('#skill-filter .zone-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');

    // Show all workers filtered by skill
    const allWorkers = DB.getWorkers();
    this.renderList(allWorkers);
  },
};

// ─── STORY ─────────────────────────────────────────────────────────────────────

const Story = {
  render() {
    document.getElementById('timeline-items').innerHTML = TIMELINE.map((t, i) => `
      <div class="relative flex gap-8 mb-16 reveal">
        <div class="flex flex-col items-center">
          <div class="timeline-dot">${t.num}</div>
          ${i < TIMELINE.length - 1 ? '<div class="flex-1 w-0.5 bg-gray-200 mt-2"></div>' : ''}
        </div>
        <div class="pb-4">
          <h3 class="font-syne text-3xl font-bold text-orange-600">${t.year}</h3>
          <h4 class="font-syne text-xl font-bold uppercase mt-1">${t.title}</h4>
          <p class="text-gray-500 mt-3 leading-relaxed">${t.desc}</p>
        </div>
      </div>
    `).join('');

    // Use live reviews from DB; fall back to hardcoded if none exist yet
    const liveReviews = _state.reviews || [];
    const customerReviews = liveReviews.filter(r => r.role === 'customer');
    const providerReviews = liveReviews.filter(r => r.role === 'provider');

    function starRow(rating) {
      return Array.from({ length: 5 }, (_, i) =>
        `<span style="color:${i < rating ? '#e8390e' : '#e5e7eb'};font-size:1rem;">★</span>`
      ).join('');
    }

    if (customerReviews.length) {
      document.getElementById('customer-reviews').innerHTML = customerReviews.slice(0, 6).map(r => `
        <div class="review-card reveal">
          <div class="mb-2">${starRow(r.rating)}</div>
          <p class="font-corm italic text-xl mb-4">"${r.comment}"</p>
          <div>
            <p class="font-syne font-bold text-xs uppercase tracking-widest">— ${r.reviewerName}</p>
            <p class="text-gray-400 text-xs mt-1">${r.serviceNames || 'Home Service'}</p>
          </div>
        </div>
      `).join('');
    } else {
      document.getElementById('customer-reviews').innerHTML = REVIEWS.customers.map(r => `
        <div class="review-card reveal">
          <p class="font-corm italic text-xl mb-4">"${r.text}"</p>
          <div>
            <p class="font-syne font-bold text-xs uppercase tracking-widest">— ${r.name}</p>
            <p class="text-gray-400 text-xs mt-1">${r.role}</p>
          </div>
        </div>
      `).join('');
    }

    if (providerReviews.length) {
      document.getElementById('provider-reviews').innerHTML = providerReviews.slice(0, 6).map(r => `
        <div class="review-card dark reveal">
          <div class="mb-2">${starRow(r.rating)}</div>
          <p class="font-corm italic text-xl mb-4">"${r.comment}"</p>
          <div>
            <p class="font-syne font-bold text-xs uppercase tracking-widest text-orange-400">— ${r.reviewerName}</p>
            <p class="text-gray-500 text-xs mt-1">${r.serviceNames || 'Home Service'}</p>
          </div>
        </div>
      `).join('');
    } else {
      document.getElementById('provider-reviews').innerHTML = REVIEWS.artisans.map(r => `
        <div class="review-card dark reveal">
          <p class="font-corm italic text-xl mb-4">"${r.text}"</p>
          <div>
            <p class="font-syne font-bold text-xs uppercase tracking-widest text-orange-400">— ${r.name}</p>
            <p class="text-gray-500 text-xs mt-1">${r.role}</p>
          </div>
        </div>
      `).join('');
    }

    setTimeout(attachReveal, 80);
  },
};

// ─── BOOKINGS ──────────────────────────────────────────────────────────────────

const Bookings = {
  _filter: 'all',

  render() {
    const session = DB.getSession();
    if (!session) return;

    const all = DB.getBookings().filter(b => b.userId === session.id).reverse();
    this.renderList(all);
  },

  renderList(bookings) {
    const filtered = this._filter === 'all' ? bookings : bookings.filter(b => b.status === this._filter);
    const el = document.getElementById('bookings-list');
    const session = DB.getSession();

    ['all', 'pending', 'approved', 'done'].forEach(f => {
      document.getElementById(`btab-${f}`)?.classList.toggle('active', this._filter === f);
    });

    if (!filtered.length) {
      el.innerHTML = `<div class="text-center py-20 bg-white rounded-3xl border">
        <p class="font-syne uppercase tracking-widest text-gray-400 text-sm">No bookings found</p>
      </div>`;
      return;
    }

    el.innerHTML = filtered.map(b => {
      // Status badge class
      const badgeClass = {
        done: 'badge-done',
        approved: 'badge-approved',
        confirmed: 'badge-active',
        pending: 'badge-pending',
        cancelled: 'badge-rejected'
      }[b.status] || 'badge-pending';

      // Check if user already submitted a review for this booking
      const alreadyReviewed = (session && _state.reviews)
        ? _state.reviews.some(r => r.bookingId === b.id && r.customerId === (session._id || session.id) && r.role === session.role)
        : false;

      // Approve button — only shown to customer on 'approved' bookings
      const approveBtn = b.status === 'approved' && session?.role === 'customer'
        ? `<button onclick="Bookings.approve('${b.id}')" class="mt-3 review-btn" style="border-color:#166534;color:#166534;">✓ Confirm Completion</button>`
        : '';

      const reviewBtn = b.status === 'done'
        ? (alreadyReviewed
          ? `<span class="mt-3 inline-block text-xs text-green-600 font-bold uppercase tracking-widest">✅ Reviewed</span>`
          : `<button onclick="Reviews.openModal('${b.id}')" class="mt-3 review-btn">⭐ Leave Review</button>`)
        : '';

      return `
      <div class="booking-row">
        <div class="flex justify-between items-start mb-3">
          <div>
            <p class="font-syne font-bold uppercase tracking-wider text-sm">${b.id}</p>
            <p class="text-xs text-gray-400 mt-1">Booked ${formatDate(b.createdAt)}</p>
            ${b.scheduledFor ? `<p class="text-xs text-orange-600 font-bold mt-0.5">📅 Scheduled for ${formatDate(b.scheduledFor)}</p>` : ''}
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold text-orange-600">৳${b.total.toLocaleString()}</span>
            <span class="status-badge ${badgeClass}">${b.status}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          ${b.items.map(i => `<span class="text-xs bg-gray-100 px-3 py-1 rounded-full">${i.icon} ${i.name}</span>`).join('')}
        </div>
        ${b.workerName ? `<p class="text-xs text-gray-500 mt-2">👷 Assigned: <strong>${b.workerName}</strong></p>` : ''}
        ${b.deliveryAddress ? `<p class="text-xs text-gray-500 mt-1">📍 Destination: <span class="font-medium text-gray-700">${b.deliveryAddress}</span> (${b.deliveryZone || 'Dhaka'})</p>` : ''}
        ${b.status === 'approved' ? `<p class="text-xs text-blue-600 font-bold mt-2">⏳ Worker has completed this job — please confirm to mark as done.</p>` : ''}
        <div class="flex items-center gap-3 flex-wrap mt-2">
          <button onclick="Invoice.show('${b.id}')" class="mt-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm">
            <span>🧾</span> Invoice
          </button>
          ${b.status === 'pending' ? `<button onclick="Bookings.cancel('${b.id}')" class="mt-2 text-xs text-red-400 hover:text-red-600 font-bold uppercase tracking-widest transition">Cancel Order</button>` : ''}
          <button onclick="LiveMap.openOrderTracker('${b.id}')" class="mt-2 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm">
            <span class="live-dot-pulse"></span> 🗺️ Live Map Tracking
          </button>
          ${approveBtn}
          ${reviewBtn}
        </div>
      </div>
    `}).join('');
  },

  async approve(id) {
    if (!confirm('Confirm that the job is complete?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      if (!res.ok) { showToast('Failed to confirm completion', 'error'); return; }
      await DB.sync();
      showToast(' Job confirmed as done!');
      
      Notifications.add({
        id: `approved_confirmed_${id}`,
        title: `Service Finalized: #${id}`,
        body: `You confirmed completion for Booking #${id}. Thank you!`,
        type: 'order',
        icon: '⭐',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        actionCall: `Reviews.openModal('${id}')`,
        actionLabel: 'Leave Review'
      });

      this.render();
      Profile.refreshStats();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  filter(f) {
    this._filter = f;
    this.render();
  },

  async cancel(id) {
    if (!confirm('Cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (!res.ok) { showToast('Failed to cancel booking', 'error'); return; }
      await DB.sync();
      showToast('Booking cancelled');

      Notifications.add({
        id: `cancelled_${id}`,
        title: `Booking Cancelled: #${id}`,
        body: `Order #${id} has been cancelled.`,
        type: 'order',
        icon: '✕',
        iconBg: '#fef2f2',
        iconColor: '#dc2626'
      });

      this.render();
      Profile.refreshStats();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },
};

// ─── PROFILE ───────────────────────────────────────────────────────────────────

const Profile = {
  load() {
    const user = DB.getSession();
    if (!user) return;

    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-initial').textContent = initials(user.name);
    document.getElementById('profile-role-display').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('profile-email-display').textContent = user.email;

    document.getElementById('profile-edit-name').value = user.name;
    document.getElementById('profile-edit-phone').value = user.phone || '';
    document.getElementById('profile-edit-zone').value = user.zone || 'Gulshan';

    this.refreshStats();
  },

  refreshStats() {
    const user = DB.getSession();
    if (!user) return;
    const bookings = DB.getBookings().filter(b => b.userId === user.id && b.status !== 'cancelled');
    const spent = bookings.reduce((s, b) => s + b.total, 0);

    document.getElementById('stat-bookings').textContent = bookings.length;
    document.getElementById('stat-spent').textContent = `৳${spent.toLocaleString()}`;
  },

  async save(e) {
    e.preventDefault();
    const user = DB.getSession();
    if (!user) return;

    const name = document.getElementById('profile-edit-name').value.trim();
    const phone = document.getElementById('profile-edit-phone').value.trim();
    const zone = document.getElementById('profile-edit-zone').value;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id || user._id, name, phone, zone })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Profile update failed', 'error'); return; }

      data.id = data._id; // legacy compatibility
      DB.setSession(data);
      await DB.sync();

      document.getElementById('profile-name').textContent = name;
      document.getElementById('profile-initial').textContent = initials(name);

      showToast('Profile updated successfully');
      this.load();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  },
};

// ─── MODERATOR ─────────────────────────────────────────────────────────────────

const Mod = {
  load() {
    const now = new Date();
    document.getElementById('mod-date').textContent = now.toLocaleDateString('en-BD', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const bookings = DB.getBookings();
    const users = DB.getUsers();
    const workers = DB.getWorkers();
    const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.total, 0);

    document.getElementById('mod-stat-bookings').textContent = bookings.length;
    document.getElementById('mod-stat-revenue').textContent = `৳${revenue.toLocaleString()}`;
    document.getElementById('mod-stat-users').textContent = users.length;
    document.getElementById('mod-stat-workers').textContent = workers.filter(w => w.status === 'active').length;

    this.renderBookings(bookings);
    this.renderWorkers(workers);
    this.renderCharts(bookings);
    this.loadComplaints();
    Notifications.init();
  },

  _charts: {},

  renderCharts(bookings) {
    const active = bookings.filter(b => b.status !== 'cancelled');

    // ── 1. Revenue trend, last 14 days (Line Chart) ──
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const dayLabels = days.map(d => d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short' }));
    const dayKeys = days.map(d => d.toDateString());
    const revenueByDay = dayKeys.map(key =>
      active.filter(b => new Date(b.createdAt).toDateString() === key)
            .reduce((s, b) => s + (b.total || 0), 0)
    );

    this.drawChart('chart-revenue', 'line', {
      labels: dayLabels,
      datasets: [{
        label: 'Revenue (৳)',
        data: revenueByDay,
        borderColor: '#ea580c',
        backgroundColor: 'rgba(234, 88, 12, 0.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#ea580c',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    }, {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Revenue: ৳${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `৳${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`
          },
          grid: { color: 'rgba(0,0,0,0.04)' }
        },
        x: {
          grid: { display: false }
        }
      }
    });

    // ── 2. Bookings by status (Doughnut Chart) ──
    const statuses = ['pending', 'confirmed', 'done', 'cancelled'];
    const statusCounts = statuses.map(s => bookings.filter(b => b.status === s).length);

    this.drawChart('chart-status', 'doughnut', {
      labels: statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: [{
        data: statusCounts,
        backgroundColor: ['#fbbf24', '#3b82f6', '#16a34a', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    }, {
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11, family: "'DM Sans', sans-serif" } }
        }
      },
      cutout: '65%'
    });

    // ── 3. Top 5 services booked (Horizontal Bar Chart) ──
    const serviceCounts = {};
    active.forEach(b => (b.items || []).forEach(i => {
      if (!i.isDiscount && i.name) {
        serviceCounts[i.name] = (serviceCounts[i.name] || 0) + (i.qty || 1);
      }
    }));
    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const finalLabels = topServices.length
      ? topServices.map(([name]) => name)
      : ['AC Master Service', 'Deep Kitchen Cleaning', 'Bathroom Plumbing', 'Electrical Repair', 'Pest Control'];
    const finalCounts = topServices.length
      ? topServices.map(([, count]) => count)
      : [0, 0, 0, 0, 0];

    this.drawChart('chart-services', 'bar', {
      labels: finalLabels,
      datasets: [{
        label: 'Times Booked',
        data: finalCounts,
        backgroundColor: '#0d0e11',
        hoverBackgroundColor: '#ea580c',
        borderRadius: 6
      }]
    }, {
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(0,0,0,0.04)' }
        },
        y: {
          grid: { display: false }
        }
      }
    });
  },

  drawChart(canvasId, type, data, extraOptions = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    if (this._charts[canvasId]) {
      this._charts[canvasId].destroy();
      this._charts[canvasId] = null;
    }

    this._charts[canvasId] = new Chart(canvas, {
      type,
      data,
      options: Object.assign({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 }
      }, extraOptions)
    });
  },

  async loadComplaints() {
    try {
      const res = await fetch('/api/complaints');
      const complaints = await res.json();
      this.renderComplaints(complaints);
    } catch (err) {
      console.error('Failed to load complaints for mod dashboard', err);
    }
  },

  renderComplaints(complaints) {
    const tbody = document.getElementById('mod-complaints-tbody');
    if (!Array.isArray(complaints) || complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-400 py-10 text-sm">No complaints found</td></tr>`;
      return;
    }

    const statusColors = { open: 'bg-red-100 text-red-700', reviewed: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700' };

    tbody.innerHTML = complaints.map(c => `
      <tr>
        <td class="text-xs text-gray-500">${new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
        <td class="text-xs font-bold text-orange-600">${c.category}</td>
        <td>
          <span class="block font-medium">${c.complainantName}</span>
          <span class="text-[10px] uppercase tracking-widest text-gray-400">${c.complainantRole}</span>
        </td>
        <td>
          <span class="block font-medium">${c.againstName}</span>
          <span class="text-[10px] uppercase tracking-widest text-gray-400">${c.againstRole}</span>
        </td>
        <td class="text-xs italic text-gray-500 max-w-[200px] truncate" title="${c.description}">${c.description}</td>
        <td>
          <select onchange="Mod.updateComplaintStatus('${c._id}', this.value)" 
                  class="text-xs font-bold rounded-full px-3 py-1 border-none outline-none ${statusColors[c.status] || statusColors.open}">
            <option value="open" ${c.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="reviewed" ${c.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
            <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </td>
        <td>
          <button onclick="alert('Booking: ${c.bookingId}\\nService: ${c.serviceName}\\n\\nDescription:\\n${c.description.replace(/'/g, "\\'")}')" 
                  class="text-xs font-bold text-gray-400 hover:text-orange-600 hover:underline">View Details</button>
        </td>
      </tr>
    `).join('');
  },

  async updateComplaintStatus(id, status) {
    try {
      const res = await fetch(`/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        showToast('Failed to update status', 'error');
        this.loadComplaints(); // reload to revert select
        return;
      }
      showToast('Complaint status updated', 'success');
      
      Notifications.add({
        id: `mod_complaint_status_${id}_${Date.now()}`,
        title: `Dispute Marked as ${status.toUpperCase()}`,
        body: `Complaint record #${id} updated to ${status}.`,
        type: 'complaint',
        icon: status === 'resolved' ? '✅' : '⚖️',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        actionCall: `App.goPage('mod')`,
        actionLabel: 'Dashboard'
      });

      this.loadComplaints();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  renderBookings(bookings) {
    const tbody = document.getElementById('mod-bookings-tbody');
    if (!bookings.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-gray-400 py-10 text-sm">No bookings yet</td></tr>`;
      return;
    }

    tbody.innerHTML = [...bookings].reverse().map(b => {
      const allWorkers = DB.getWorkers().filter(w => w.verifiedStatus === 'Verified');
      let assignmentHtml = '';

      if (b.isComboBooking && Array.isArray(b.comboAssignments) && b.comboAssignments.length) {
        // ── COMBO BOOKING: two assignment dropdowns, one per service ──────────
        const bothAssigned = b.comboAssignments.every(s => s.providerId);

        assignmentHtml = `
          <div style="border:1.5px solid #fb923c;border-radius:10px;padding:8px 10px;background:#fff7ed;min-width:220px;">
            <div style="font-size:10px;font-weight:800;color:#ea580c;letter-spacing:.08em;margin-bottom:6px;text-transform:uppercase;">
              🔀 Combo — Assign 2 Providers ${bothAssigned ? '<span style="color:#16a34a">✓ Both Assigned</span>' : ''}
            </div>
            ${b.comboAssignments.map(slot => {
          // Show workers matching the slot's category first, then the rest
          const svcCatLower = (slot.serviceCategory || '').toLowerCase();
          const sortedWorkers = [...allWorkers].sort((a, b) => {
            const aSkill = (a.serviceCategory || a.skill || '').toLowerCase();
            const bSkill = (b.serviceCategory || b.skill || '').toLowerCase();
            const aMatch = svcCatLower && (aSkill.includes(svcCatLower) || svcCatLower.includes(aSkill));
            const bMatch = svcCatLower && (bSkill.includes(svcCatLower) || svcCatLower.includes(bSkill));
            return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
          });

          const opts = sortedWorkers.map(w =>
            `<option value="${w._id || w.id}" ${slot.providerId === (w._id || w.id) ? 'selected' : ''}>${w.name} — ${w.serviceCategory || w.skill || 'General'}</option>`
          ).join('');

          const isAssigned = !!slot.providerId;
          return `
                <div style="margin-bottom:${slot.serviceIdx === 0 ? '8px' : '0'};">
                  <div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:2px;">
                    ${isAssigned
              ? `<span style="color:#16a34a;">✓ Assigned:</span>`
              : `<span style="color:#6b7280;">⬦ Assign worker for:</span>`}
                    <span style="color:#1f2937;"> ${slot.serviceName || `Service ${slot.serviceIdx + 1}`}</span>
                  </div>
                  ${isAssigned
              ? `<div style="font-size:11px;font-weight:600;color:#15803d;background:#dcfce7;padding:2px 8px;border-radius:6px;display:inline-block;margin-bottom:3px;">${slot.providerName}</div><br>`
              : ''}
                  <select onchange="Mod.assignComboProvider('${b.id}', ${slot.serviceIdx}, this.value)"
                    style="font-size:11px;border:1px solid ${isAssigned ? '#86efac' : '#d1d5db'};border-radius:6px;padding:3px 6px;background:white;width:100%;outline:none;">
                    <option value="">-- Select Provider --</option>
                    ${opts}
                  </select>
                </div>`;
        }).join('')}
          </div>`;
      } else {
        // ── REGULAR BOOKING: single dropdown ────────────────────────────────
        const options = allWorkers.map(w =>
          `<option value="${w._id || w.id}" ${b.providerId === (w._id || w.id) ? 'selected' : ''}>${w.name} (${w.serviceCategory || w.skill})</option>`
        ).join('');
        assignmentHtml = `
          <select onchange="Mod.assignWorker('${b.id}', this.value)" class="text-xs border rounded p-1 bg-white" style="min-width:160px;">
            <option value="">-- Assign Worker --</option>
            ${options}
          </select>`;
      }

      return `
        <tr>
          <td class="font-mono text-xs">
            ${b.id}
            ${b.isComboBooking ? '<br><span style="font-size:9px;background:#fed7aa;color:#c2410c;border-radius:4px;padding:1px 5px;font-weight:800;letter-spacing:.05em;">COMBO</span>' : ''}
          </td>
          <td>${b.userName}</td>
          <td class="text-xs text-gray-500">${b.items.filter(i => !i.isDiscount).map(i => i.name).join(', ')}</td>
          <td class="font-bold">৳${b.total.toLocaleString()}</td>
          <td class="text-xs text-gray-400">${formatDate(b.createdAt)}</td>
          <td class="text-xs font-bold text-orange-600">${b.scheduledFor ? formatDate(b.scheduledFor) : '—'}</td>
          <td><span class="status-badge ${b.status === 'done' ? 'badge-done' :
          b.status === 'approved' ? 'badge-approved' :
            b.status === 'confirmed' ? 'badge-active' :
              b.status === 'cancelled' ? 'badge-rejected' : 'badge-pending'
        }">${b.status}</span></td>
          <td>
            <div class="flex flex-col gap-1.5">
              ${assignmentHtml}
              <button onclick="Invoice.show('${b.id}')" class="text-xs font-bold text-gray-500 hover:text-orange-600 hover:underline text-left mt-0.5">🧾 View Invoice</button>
              ${b.status === 'approved' ? `<button onclick="Mod.markDone('${b.id}')" class="text-xs font-bold text-green-600 hover:underline text-left mt-1">✓ Finalize Done</button>` : ''}
              ${b.status === 'pending' || b.status === 'confirmed' ? `<button onclick="Mod.markDone('${b.id}')" class="text-xs font-bold text-gray-400 hover:text-green-600 hover:underline text-left mt-1">Force Mark Done</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },


  renderWorkers(workers) {
    const tbody = document.getElementById('mod-workers-tbody');
    tbody.innerHTML = workers.map(w => {
      let verificationMarkup = '';
      if (w.verifiedStatus === 'Pending') {
        verificationMarkup = `
          <button onclick="Mod.verifyWorker('${w._id || w.id}', 'Verified')" class="text-xs font-bold text-green-600 hover:underline">Verify</button>
          <button onclick="Mod.verifyWorker('${w._id || w.id}', 'Rejected')" class="ml-2 text-xs font-bold text-red-500 hover:underline">Reject</button>
        `;
      } else {
        verificationMarkup = `<span class="status-badge ${w.verifiedStatus === 'Verified' ? 'badge-done' : 'badge-rejected'}">${w.verifiedStatus || 'Pending'}</span>`;
      }

      return `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 ${w.color || 'bg-[#0d0e11]'} rounded-full flex items-center justify-center text-white text-xs font-bold">${w.initials}</div>
              <div>
                <span class="font-medium block">${w.name}</span>
                <span class="text-[10px] text-gray-400 font-mono">${w.email}</span>
              </div>
            </div>
          </td>
          <td>${w.serviceCategory || w.skill}</td>
          <td class="text-gray-500 text-xs">${(w.coverageZones || [w.zone || 'Gulshan']).join(', ')}</td>
          <td><span class="status-badge ${w.status === 'active' ? 'badge-active' : 'badge-pending'}">${w.status}</span></td>
          <td>
            <div class="flex items-center gap-2">
              ${verificationMarkup}
              <button onclick="Mod.toggleWorkerStatus('${w._id || w.id}', '${w.status === 'active' ? 'inactive' : 'active'}')" class="ml-2 text-xs font-bold text-gray-500 hover:text-orange-600 transition">${w.status === 'active' ? 'Deactivate' : 'Activate'}</button>
              <button onclick="Mod.removeWorker('${w._id || w.id}')" class="text-xs font-bold text-red-400 hover:text-red-600 transition">Remove</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async verifyWorker(id, status) {
    try {
      const res = await fetch(`/api/workers/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) { showToast('Verification update failed', 'error'); return; }

      await DB.sync();
      showToast(`Worker verification set to: ${status}`);

      const worker = DB.getWorkers().find(w => (w._id || w.id) === id);
      const workerName = worker ? worker.name : 'Worker';
      Notifications.add({
        id: `mod_worker_verified_${id}_${Date.now()}`,
        title: `Worker Verification: ${workerName}`,
        body: `Status set to "${status}". Credentials updated in system.`,
        type: 'assignment',
        icon: status === 'Verified' ? '✅' : '❌',
        iconBg: status === 'Verified' ? '#ecfdf5' : '#fef2f2',
        iconColor: status === 'Verified' ? '#059669' : '#dc2626',
        actionCall: `App.goPage('mod')`,
        actionLabel: 'View Workers'
      });

      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async assignWorker(bookingId, workerId) {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: workerId })
      });
      if (!res.ok) { showToast('Assignment failed', 'error'); return; }

      await DB.sync();
      showToast('Worker assigned to booking');

      const worker = DB.getWorkers().find(w => (w._id || w.id) === workerId);
      const workerName = worker ? worker.name : 'Specialist';
      Notifications.add({
        id: `mod_action_assigned_${bookingId}_${workerId}_${Date.now()}`,
        title: `Artisan Dispatched: ${workerName}`,
        body: `Assigned to Booking #${bookingId}. Live tracking enabled.`,
        type: 'assignment',
        icon: '👷',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        actionCall: `LiveMap.openOrderTracker('${bookingId}')`,
        actionLabel: 'Live Track'
      });

      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async assignComboProvider(bookingId, serviceIdx, providerId) {
    if (!providerId) return; // User selected the placeholder option
    try {
      const res = await fetch(`/api/bookings/${bookingId}/assign-combo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIdx, providerId })
      });
      if (!res.ok) { showToast('Combo assignment failed', 'error'); return; }

      await DB.sync();
      const data = await res.clone().json().catch(() => ({}));
      const filled = (data.comboAssignments || []).filter(a => a.providerId).length;
      const total = (data.comboAssignments || []).length;
      if (filled >= total) {
        showToast('Both providers assigned — booking approved!', 'success');
      } else {
        showToast(`Provider assigned (${filled}/${total} slots filled)`);
      }

      const worker = DB.getWorkers().find(w => (w._id || w.id) === providerId);
      const workerName = worker ? worker.name : 'Provider';
      Notifications.add({
        id: `mod_combo_assigned_${bookingId}_${serviceIdx}_${Date.now()}`,
        title: `Combo Specialist Assigned: ${workerName}`,
        body: `Assigned to slot ${serviceIdx + 1} for Combo Booking #${bookingId} (${filled}/${total} filled).`,
        type: 'assignment',
        icon: '🔀',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        actionCall: `App.goPage('mod')`,
        actionLabel: 'View Booking'
      });

      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async markDone(id) {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      if (!res.ok) { showToast('Status update failed', 'error'); return; }

      await DB.sync();
      showToast('Booking marked as done');

      Notifications.add({
        id: `mod_markdone_${id}_${Date.now()}`,
        title: `Order #${id} Finalized`,
        body: `Booking marked as Done. Revenue and records updated.`,
        type: 'order',
        icon: '✅',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        actionCall: `Invoice.show('${id}')`,
        actionLabel: 'View Invoice'
      });

      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async toggleWorkerStatus(id, newStatus) {
    try {
      const res = await fetch(`/api/workers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) { showToast('Status toggle failed', 'error'); return; }

      await DB.sync();
      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  async removeWorker(id) {
    if (!confirm('Remove this worker?')) return;
    try {
      const res = await fetch(`/api/workers/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) { showToast('Remove worker failed', 'error'); return; }

      await DB.sync();
      this.load();
      showToast('Worker removed');
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  openAddWorker() {
    document.getElementById('worker-modal').classList.remove('hidden');
  },

  closeWorkerModal() {
    document.getElementById('worker-modal').classList.add('hidden');
    document.getElementById('wm-name').value = '';
    document.getElementById('wm-skill').value = '';
  },

  async submitWorker(e) {
    e.preventDefault();
    const name = document.getElementById('wm-name').value.trim();
    const skill = document.getElementById('wm-skill').value.trim();
    const area = document.getElementById('wm-area').value;

    const body = {
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '')}@proyojon.com`,
      password: 'password',
      role: 'provider',
      phone: '+880 1500 000 000',
      serviceCategory: skill,
      verificationDocument: 'nid_manual.pdf',
      coverageZones: [area],
      initials: initials(name),
      color: randomColor()
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) { showToast('Add worker failed', 'error'); return; }

      const data = await res.json();
      await fetch(`/api/workers/${data._id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Verified' })
      });

      await DB.sync();
      this.closeWorkerModal();
      this.load();
      showToast(`${name} added as worker`);
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  exportCSV() {
    const bookings = DB.getBookings();
    if (!bookings.length) { showToast('No data to export', 'error'); return; }

    const rows = [
      ['Booking ID', 'Customer', 'Services', 'Total', 'Status', 'Date', 'Scheduled For'],
      ...bookings.map(b => [b.id, b.userName, b.items.map(i => i.name).join(' | '), b.total, b.status, formatDate(b.createdAt), b.scheduledFor ? formatDate(b.scheduledFor) : '—']),
    ];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proyojon_bookings_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  },
};

// ─── SERVICE PROVIDER ──────────────────────────────────────────────────────────

const Provider = {
  load() {
    const user = DB.getSession();
    if (!user || user.role !== 'provider') return;

    const zones = user.coverageZones || (user.zone ? [user.zone] : []);

    document.getElementById('provider-name').textContent = user.name;
    document.getElementById('provider-avatar').textContent = initials(user.name);
    document.getElementById('provider-skill-display').textContent = user.serviceCategory || user.skill || 'Worker';
    document.getElementById('provider-zones-display').textContent = zones.join(', ') || '—';
    document.getElementById('provider-phone-display').textContent = user.phone || '—';
    document.getElementById('provider-completed-count').textContent = user.completedCount || 0;
    document.getElementById('provider-rating-display').textContent = (user.avgRating || 4.5).toFixed(1);

    // Pending/active jobs count
    const bookings = DB.getBookings();
    const myId = user._id || user.id;
    const activeJobs = bookings.filter(b =>
      (b.assignedWorkerId === myId || b.providerId === myId) &&
      (b.status === 'confirmed' || b.status === 'approved')
    ).length;
    document.getElementById('provider-pending-count').textContent = activeJobs;

    // Verification badge
    const badge = document.getElementById('provider-status-badge');
    badge.textContent = user.verifiedStatus || 'Pending';
    badge.className = 'status-badge';
    badge.classList.add(
      user.verifiedStatus === 'Verified' ? 'badge-done' :
        user.verifiedStatus === 'Rejected' ? 'badge-rejected' : 'badge-pending'
    );

    // Prefill edit form
    document.getElementById('provider-edit-name').value = user.name || '';
    document.getElementById('provider-edit-phone').value = user.phone || '';
    const skillSelect = document.getElementById('provider-edit-skill');
    const currentSkill = user.serviceCategory || user.skill || '';
    [...skillSelect.options].forEach(o => { o.selected = o.value === currentSkill; });

    // Zone checkboxes
    const ZONES = ['Gulshan', 'Banani', 'Dhanmondi', 'Bashundhara', 'Mirpur', 'Uttara', 'Mohammadpur', 'Rampura'];
    const zoneBox = document.getElementById('provider-zone-checkboxes');
    if (zoneBox) {
      zoneBox.innerHTML = ZONES.map(z => `
        <label class="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input type="checkbox" value="${z}" ${zones.includes(z) ? 'checked' : ''} class="rounded accent-orange-600">
          ${z}
        </label>
      `).join('');
    }

    this.renderJobs();
    this.renderReviews();
  },

  async save(e) {
    e.preventDefault();
    const user = DB.getSession();
    if (!user) return;

    const name = document.getElementById('provider-edit-name').value.trim();
    const phone = document.getElementById('provider-edit-phone').value.trim();
    const serviceCategory = document.getElementById('provider-edit-skill').value;
    const coverageZones = [...document.querySelectorAll('#provider-zone-checkboxes input:checked')].map(c => c.value);

    if (!name) { showToast('Name is required', 'error'); return; }
    if (!coverageZones.length) { showToast('Select at least one zone', 'error'); return; }

    try {
      const res = await fetch(`/api/workers/${user._id || user.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, serviceCategory, coverageZones })
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Update failed', 'error'); return; }

      data.id = data._id;
      DB.setSession(data);
      await DB.sync();

      showToast('Profile updated successfully!');
      this.load();
    } catch (err) {
      showToast('Network error', 'error');
    }
  },

  renderReviews() {
    const user = DB.getSession();
    if (!user) return;
    const myId = user._id || user.id;
    const reviews = (_state.reviews || []).filter(r => r.providerId === myId);
    const el = document.getElementById('provider-reviews-list');
    if (!el) return;

    if (!reviews.length) {
      el.innerHTML = `<p class="text-gray-400 text-sm">No reviews yet. Complete jobs to earn ratings!</p>`;
      return;
    }

    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    el.innerHTML = [...reviews].reverse().map(r => `
      <div class="border border-gray-100 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-orange-500 font-bold text-sm tracking-wider">${stars(r.rating)}</span>
          <span class="text-[10px] text-gray-400">${formatDate(r.createdAt)}</span>
        </div>
        ${r.comment ? `<p class="text-sm text-gray-700 italic mb-2">"${r.comment}"</p>` : ''}
        <p class="text-[11px] font-bold text-gray-500 uppercase tracking-widest">— ${r.reviewerName || 'Customer'}</p>
        ${r.serviceNames ? `<p class="text-[10px] text-gray-400 mt-1">${r.serviceNames}</p>` : ''}
      </div>
    `).join('');
  },


  renderJobs() {
    const user = DB.getSession();
    const bookings = DB.getBookings();

    // Filter bookings assigned to this worker — check both field names and combo assignments
    const assignedJobs = bookings.filter(b =>
      b.assignedWorkerId === user._id || b.assignedWorkerId === user.id ||
      b.providerId === user._id || b.providerId === user.id ||
      (b.isComboBooking && Array.isArray(b.comboAssignments) && b.comboAssignments.some(a => a.providerId === user._id || a.providerId === user.id))
    );
    const tbody = document.getElementById('provider-jobs-tbody');

    if (!assignedJobs.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-gray-400 py-10 text-sm">No jobs assigned yet</td></tr>`;
      return;
    }

    tbody.innerHTML = [...assignedJobs].reverse().map(b => {
      let assignedServiceName = b.items.filter(i => !i.isDiscount).map(i => i.name).join(', ');
      let comboBadge = '';

      if (b.isComboBooking && Array.isArray(b.comboAssignments)) {
        const slot = b.comboAssignments.find(a => a.providerId === user._id || a.providerId === user.id);
        if (slot) {
          assignedServiceName = `<span class="text-orange-600 font-bold">${slot.serviceName}</span> (Part of Combo)`;
          comboBadge = '<br><span style="font-size:9px;background:#fed7aa;color:#c2410c;border-radius:4px;padding:1px 5px;font-weight:800;letter-spacing:.05em;">COMBO</span>';
        }
      }

      return `
        <tr>
          <td class="font-mono text-xs">${b.id}${comboBadge}</td>
          <td>${b.userName}</td>
          <td class="text-xs text-gray-500">${assignedServiceName}</td>
          <td class="font-bold">৳${b.total.toLocaleString()}</td>
          <td class="text-xs text-gray-400">${formatDate(b.createdAt)}</td>
          <td class="text-xs font-bold text-orange-600">${b.scheduledFor ? formatDate(b.scheduledFor) : '—'}</td>
          <td><span class="status-badge ${b.status === 'done' ? 'badge-done' :
          b.status === 'approved' ? 'badge-approved' :
            b.status === 'cancelled' ? 'badge-rejected' : 'badge-active'
        }">${b.status}</span></td>
          <td>
            ${(() => {
          if (b.isComboBooking && Array.isArray(b.comboAssignments)) {
            const slot = b.comboAssignments.find(a => a.providerId === user._id || a.providerId === user.id);
            if (slot && slot.completed) {
              return `<span class="text-xs text-blue-500 font-bold">⏳ Awaiting customer</span>`;
            }
            if (b.status === 'confirmed') {
              return `<button onclick="Provider.completeJob('${b.id}')" class="text-xs font-bold text-green-600 hover:underline">Mark Complete</button>`;
            }
            return '—';
          } else {
            if (b.status === 'confirmed') {
              return `<button onclick="Provider.completeJob('${b.id}')" class="text-xs font-bold text-green-600 hover:underline">Mark Complete</button>`;
            } else if (b.status === 'approved') {
              return `<span class="text-xs text-blue-500 font-bold">⏳ Awaiting customer</span>`;
            }
            return '—';
          }
        })()}
          </td>
        </tr>
      `;
    }).join('');
  },

  async completeJob(id) {
    try {
      const session = DB.getSession();
      const booking = DB.getBookings().find(b => b.id === id);
      if (!booking) return;

      let res;
      if (booking.isComboBooking) {
        // Combo booking: Provider marks their specific slot as completed
        res = await fetch(`/api/bookings/${id}/complete-slot`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId: session._id || session.id })
        });
      } else {
        // Regular booking: Worker marks job as 'approved' (customer still needs to confirm)
        res = await fetch(`/api/bookings/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        });
      }

      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to complete job', 'error'); return; }

      await DB.sync();

      // Also refresh the session details since worker completedCount might have changed
      const updatedUser = DB.getWorkers().find(w => w._id === session._id || w.id === session.id);
      if (updatedUser) {
        updatedUser.id = updatedUser._id;
        DB.setSession(updatedUser);
      }

      showToast('Job marked as completed! Awaiting customer confirmation.');

      Notifications.add({
        id: `worker_finished_${id}`,
        title: `Service Marked Completed`,
        body: `Job #${id} has been marked complete and submitted for customer confirmation.`,
        type: 'order',
        icon: '👷',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        actionCall: `App.goPage('provider')`,
        actionLabel: 'View Job'
      });

      this.load();
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  }
};

// ─── AI CHAT ASSISTANT ──────────────────────────────────────────────────────────

const AIChat = {
  history: [],
  initialized: false,

  toggle() {
    const box = document.getElementById('ai-chat-box');
    const isOpening = !box.classList.contains('active');
    box.classList.toggle('active');
    if (isOpening) {
      this.initChatMessages();
      document.getElementById('ai-input').focus();
    }
  },

  initChatMessages() {
    if (this.initialized) return;
    this.initialized = true;
    const welcomeMsg = "Hi there! I'm your Proyojon AI Assistant. 🏠 How can I help you with your home service needs in Dhaka today?";
    this.renderMessage(welcomeMsg, 'assistant');
    this.renderQuickReplies([
      "Show all services",
      "How to book a service?",
      "Which areas do you cover?"
    ]);
  },

  renderMessage(text, role) {
    const msgsContainer = document.getElementById('ai-messages');
    const typing = document.getElementById('ai-typing-indicator');
    if (typing) typing.remove();

    const bubble = document.createElement('div');
    bubble.className = `ai-msg-bubble ${role}`;
    bubble.textContent = text;
    msgsContainer.appendChild(bubble);
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  },

  renderError(text) {
    const msgsContainer = document.getElementById('ai-messages');
    const typing = document.getElementById('ai-typing-indicator');
    if (typing) typing.remove();

    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble error';
    bubble.textContent = text;
    msgsContainer.appendChild(bubble);
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  },

  renderQuickReplies(options) {
    const msgsContainer = document.getElementById('ai-messages');
    const repliesContainer = document.createElement('div');
    repliesContainer.className = 'flex flex-wrap gap-2 mt-2 replies-container';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full hover:border-orange-500 hover:text-orange-500 transition font-medium';
      btn.textContent = opt;
      btn.onclick = () => { repliesContainer.remove(); this.handleUserQuery(opt); };
      repliesContainer.appendChild(btn);
    });
    msgsContainer.appendChild(repliesContainer);
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  },

  showTypingIndicator() {
    const msgsContainer = document.getElementById('ai-messages');
    const existing = document.getElementById('ai-typing-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.id = 'ai-typing-indicator';
    indicator.className = 'ai-msg-bubble assistant flex items-center gap-1 py-3 px-4';
    indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    msgsContainer.appendChild(indicator);
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  },

  submitMessage(e) {
    e.preventDefault();
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    document.querySelectorAll('.replies-container').forEach(el => el.remove());
    this.handleUserQuery(text);
  },

  async handleUserQuery(text) {
    this.renderMessage(text, 'user');
    this.showTypingIndicator();

    try {
      // Call the secure server-side Groq proxy
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: this.history
        })
      });

      const data = await res.json();

      if (!res.ok) {
        this.renderError(` ${data.error || 'Failed to get AI response.'}`);
        return;
      }

      const responseText = data.reply;
      this.renderMessage(responseText, 'assistant');

      // Keep conversation history (last 12 messages = 6 turns)
      this.history.push({ role: 'user', content: text });
      this.history.push({ role: 'assistant', content: responseText });
      if (this.history.length > 12) {
        this.history.splice(0, this.history.length - 12);
      }
    } catch (err) {
      console.error(err);
      this.renderError(' Network error. Please check your connection and try again.');
    }
  },

  init() {
    // Nothing to load — no user-configurable settings anymore
  }
};

// ─── MESSAGING ───────────────

const MsgPanel = {
  activeChatId: null,   // bookingId currently open
  pollTimer: null,   // polling interval reference
  knownCount: 0,      // message count, for badge update

  // Called when navigating to #page-messages
  load() {
    const session = DB.getSession();
    if (!session) return;

    const bookings = _state.bookings || [];
    const role = session.role;

    // Filter only confirmed bookings relevant to this user
    let chats = [];
    if (role === 'customer') {
      // Customer: match by userId (original field) or customerId (new field)
      chats = bookings.filter(b =>
        b.status === 'confirmed' &&
        (b.userId === session._id || b.customerId === session._id)
      );
    } else if (role === 'provider') {
      // Provider: match by assignedWorkerId (new) or providerId (legacy)
      chats = bookings.filter(b =>
        b.status === 'confirmed' &&
        (b.assignedWorkerId === session._id || b.providerId === session._id)
      );
    }

    MsgPanel.renderList(chats, session);
  },

  // Render the left-side person list
  renderList(chats, session) {
    const list = document.getElementById('msg-person-list');
    const empty = document.getElementById('msg-no-chats');

    // Clear existing rows (keep the empty-state element)
    Array.from(list.children).forEach(c => {
      if (c.id !== 'msg-no-chats') c.remove();
    });

    if (!chats.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    chats.forEach(b => {
      // Determine the other party's name
      const isCustomer = session.role === 'customer';
      const otherName = isCustomer
        ? (b.workerName || 'Worker')       // customer sees worker name
        : (b.customerName || 'Customer');  // worker sees customer name
      const otherInitial = otherName.charAt(0).toUpperCase();

      // Service label (first item or fallback)
      const serviceLabel = b.items && b.items.length
        ? b.items[0].name
        : (b.service || 'Booking');

      const row = document.createElement('div');
      row.className = 'msg-person-row';
      row.dataset.bookingId = b._id;
      if (b._id === MsgPanel.activeChatId) row.classList.add('active');

      row.innerHTML = `
        <div class="msg-person-avatar">${otherInitial}</div>
        <div class="msg-person-info">
          <p class="msg-person-name">${otherName}</p>
          <p class="msg-person-service">${serviceLabel} &middot; <span class="text-[10px] text-gray-300">#${String(b._id).slice(-5)}</span></p>
        </div>
      `;
      row.addEventListener('click', () => MsgPanel.openChat(b, session));
      list.appendChild(row);
    });
  },

  // Open a specific chat
  openChat(booking, session) {
    MsgPanel.activeChatId = booking._id;

    // Highlight active row
    document.querySelectorAll('.msg-person-row').forEach(r => r.classList.remove('active'));
    const activeRow = document.querySelector(`[data-booking-id="${booking._id}"]`);
    if (activeRow) activeRow.classList.add('active');

    // Determine other party
    const isCustomer = session.role === 'customer';
    const otherName = isCustomer
      ? (booking.workerName || 'Worker')
      : (booking.customerName || 'Customer');
    const otherInitial = otherName.charAt(0).toUpperCase();
    const serviceLabel = booking.items && booking.items.length
      ? booking.items[0].name
      : (booking.service || 'Booking');

    // Set chat header
    document.getElementById('msg-chat-avatar').textContent = otherInitial;
    document.getElementById('msg-chat-name').textContent = otherName;
    document.getElementById('msg-chat-sub').textContent =
      `${serviceLabel} · Booking #${String(booking._id).slice(-5)}`;

    // Show chat view, hide empty state
    document.getElementById('msg-empty-state').style.display = 'none';
    document.getElementById('msg-chat-view').style.display = 'flex';

    // Load messages immediately then start polling
    MsgPanel.loadMessages();
    MsgPanel.startPolling();
  },

  // Fetch messages from server and render
  async loadMessages() {
    if (!MsgPanel.activeChatId) return;
    try {
      const res = await fetch(`/api/chat/${MsgPanel.activeChatId}`);
      const msgs = await res.json();
      if (!Array.isArray(msgs)) return;

      const session = DB.getSession();
      const area = document.getElementById('msg-chat-messages');
      area.innerHTML = '';

      if (!msgs.length) {
        area.innerHTML = '<p style="text-align:center;color:#d1d5db;font-size:.8rem;margin-top:2rem;">No messages yet. Say hello! 👋</p>';
        return;
      }

      msgs.forEach(msg => {
        const isMe = msg.sender === session.role;
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble ' + (isMe ? 'msg-bubble-me' : 'msg-bubble-them');
        bubble.innerHTML = `
          ${!isMe ? `<span class="msg-bubble-name">${msg.senderName}</span>` : ''}
          <div class="msg-bubble-text">${msg.text}</div>
          <span class="msg-bubble-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        area.appendChild(bubble);

        // If message is from other party and recent, add a notification
        if (!isMe) {
          Notifications.add({
            id: `chat_msg_${msg._id || msg.createdAt}`,
            title: `💬 New Message from ${msg.senderName || 'Worker'}`,
            body: msg.text,
            type: 'chat',
            icon: '💬',
            iconBg: '#eff6ff',
            iconColor: '#2563eb',
            time: msg.createdAt,
            actionCall: `App.goPage('messages')`,
            actionLabel: 'Open Chat'
          });
        }
      });

      // Scroll to bottom
      area.scrollTop = area.scrollHeight;
    } catch (err) {
      console.error('Message load error:', err);
    }
  },

  // Send a message
  async send(e) {
    e.preventDefault();
    const input = document.getElementById('msg-chat-input');
    const text = input.value.trim();
    if (!text || !MsgPanel.activeChatId) return;

    const session = DB.getSession();
    input.value = '';

    try {
      await fetch(`/api/chat/${MsgPanel.activeChatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: session.role,
          senderName: session.name || session.email,
          text
        })
      });
      MsgPanel.loadMessages();
    } catch (err) {
      console.error('Send error:', err);
    }
  },

  startPolling() {
    MsgPanel.stopPolling();
    MsgPanel.pollTimer = setInterval(MsgPanel.loadMessages, 4000);
  },

  stopPolling() {
    if (MsgPanel.pollTimer) {
      clearInterval(MsgPanel.pollTimer);
      MsgPanel.pollTimer = null;
    }
  },

  init() {
    // Nothing on load — runs when page is navigated to
  }
};

// ─── REVIEWS ───────────────────────────────────────────────────────────────────

const Reviews = {
  _currentBookingId: null,
  _selectedRating: 0,

  openModal(bookingId) {
    const session = DB.getSession();
    if (!session) { showToast('Please login first', 'error'); return; }

    // Find the booking details
    const booking = DB.getBookings().find(b => b.id === bookingId);
    if (!booking) { showToast('Booking not found', 'error'); return; }

    this._currentBookingId = bookingId;
    this._selectedRating = 0;

    // Populate modal info
    const workerLabel = booking.workerName || 'Your Service Provider';
    const serviceLabel = booking.items ? booking.items.map(i => i.name).join(', ') : 'Home Service';

    document.getElementById('review-worker-name').textContent = workerLabel;
    document.getElementById('review-service-name').textContent = serviceLabel;
    document.getElementById('review-booking-id').textContent = `Booking: ${bookingId}`;
    document.getElementById('review-comment').value = '';
    document.getElementById('review-error').classList.add('hidden');
    this.setRating(0); // Reset stars

    document.getElementById('review-modal').classList.remove('hidden');
    document.getElementById('review-modal').classList.add('flex');
  },

  closeModal() {
    document.getElementById('review-modal').classList.add('hidden');
    document.getElementById('review-modal').classList.remove('flex');
    this._currentBookingId = null;
    this._selectedRating = 0;
  },

  setRating(n) {
    this._selectedRating = n;
    document.querySelectorAll('.star-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i < n);
    });
    const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];
    const labelEl = document.getElementById('review-star-label');
    if (labelEl) labelEl.textContent = n ? `${labels[n]} (${n}/5)` : 'Click to rate';
  },

  _hoverStar(n) {
    document.querySelectorAll('.star-btn').forEach((btn, i) => {
      btn.classList.toggle('hover', i < n);
    });
  },

  _resetHover() {
    document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('hover'));
  },

  async submit(e) {
    e.preventDefault();
    const session = DB.getSession();
    const errEl = document.getElementById('review-error');
    const comment = document.getElementById('review-comment').value.trim();
    errEl.classList.add('hidden');

    if (!this._selectedRating) {
      errEl.textContent = 'Please select a star rating.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!comment) {
      errEl.textContent = 'Please write a comment.';
      errEl.classList.remove('hidden');
      return;
    }

    const booking = DB.getBookings().find(b => b.id === this._currentBookingId);

    const body = {
      bookingId: this._currentBookingId,
      customerId: session._id || session.id,
      customerName: session.name,
      providerId: booking?.providerId || booking?.assignedWorkerId || '',
      providerName: booking?.workerName || '',
      serviceNames: booking?.items ? booking.items.map(i => i.name).join(', ') : '',
      rating: this._selectedRating,
      comment,
      role: session.role,
      reviewerName: session.name,
      reviewerRole: session.role === 'provider' ? (session.serviceCategory || session.skill || 'Service Provider') : (session.zone || 'Customer')
    };

    try {
      const submitBtn = document.getElementById('review-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data.error || 'Failed to submit review.';
        errEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
        return;
      }

      await DB.sync();
      this.closeModal();
      Bookings.render();
      showToast('⭐ Review submitted! Thank you.');

      Notifications.add({
        id: `review_submitted_${Date.now()}`,
        title: `⭐ Review Published`,
        body: `Thank you for rating ${this._selectedRating}/5 stars! Your review is now live.`,
        type: 'review',
        icon: '⭐',
        iconBg: '#fef9c3',
        iconColor: '#ca8a04'
      });
    } catch (err) {
      errEl.textContent = 'Network error. Please try again.';
      errEl.classList.remove('hidden');
      document.getElementById('review-submit-btn').disabled = false;
      document.getElementById('review-submit-btn').textContent = 'Submit Review';
    }
  },
};

// ─── COMBOS ────────────────────────────────────────────────────────────────────

const Combos = {
  // Static combo definitions
  list: [
    {
      id: 'home-refresh',
      name: 'Home Refresh Pack',
      emoji: '🏠',
      services: ['Deep Home Cleaning', 'Pest Control'],
      prices: [1200, 900],
      discount: 200
    },
    {
      id: 'ac-care',
      name: 'AC Care Pack',
      emoji: '❄️',
      services: ['AC Installation & Service', 'Electrical Wiring'],
      prices: [800, 600],
      discount: 200
    },
    {
      id: 'fix-it',
      name: 'Fix-It Pack',
      emoji: '🔧',
      services: ['Plumbing Repair', 'Water Tank Cleaning'],
      prices: [500, 700],
      discount: 200
    },
    {
      id: 'smart-home',
      name: 'Smart Home Pack',
      emoji: '🖥️',
      services: ['WiFi & IT Setup', 'CCTV Installation'],
      prices: [800, 2500],
      discount: 200
    },
    {
      id: 'furniture',
      name: 'Furniture Pack',
      emoji: '🪑',
      services: ['Wood Furniture Fix', 'Wall Painting'],
      prices: [1500, 3500],
      discount: 200
    },
    {
      id: 'laundry-clean',
      name: 'Clean & Fresh Pack',
      emoji: '🧺',
      services: ['Laundry Service', 'Deep Home Cleaning'],
      prices: [400, 1200],
      discount: 200
    },
  ],

  load() {
    const grid = document.getElementById('combos-grid');
    if (!grid) return;
    grid.innerHTML = Combos.list.map(combo => {
      const original = combo.prices[0] + combo.prices[1];
      const final = original - combo.discount;
      return `
        <div class="combo-card">
          <div class="combo-card-emoji">${combo.emoji}</div>
          <h3 class="combo-card-title">${combo.name}</h3>
          <div class="combo-services-list">
            <span class="combo-service-tag">✔ ${combo.services[0]}</span>
            <span class="combo-service-tag">✔ ${combo.services[1]}</span>
          </div>
          <div class="combo-pricing">
            <span class="combo-original-price">৳${original.toLocaleString()}</span>
            <span class="combo-final-price">৳${final.toLocaleString()}</span>
          </div>
          <div class="combo-badge">🏷️ ৳${combo.discount} OFF</div>
          <button onclick="Combos.addToCart('${combo.id}')"
            class="combo-add-btn">Add Combo to Cart 🛒</button>
        </div>
      `;
    }).join('');
  },

  addToCart(comboId) {
    const session = DB.getSession();
    if (!session) { showToast('Please login first', 'error'); return; }
    if (session.role !== 'customer') { showToast('Only customers can add to cart', 'error'); return; }

    const combo = Combos.list.find(c => c.id === comboId);
    if (!combo) return;

    const allServices = DB.getServices();
    let added = 0;

    combo.services.forEach((svcName, idx) => {
      // Try to match by name from the services list
      const svc = allServices.find(s => s.name === svcName);
      if (svc) {
        // Tag with combo metadata so checkout & moderator assignment can detect it
        _state.cartItems.push({
          ...svc,
          isComboItem: true,
          comboId,
          serviceIdx: idx
        });
        added++;
      } else {
        // Fallback: create an item from combo definition
        _state.cartItems.push({
          id: `${comboId}-${idx}`,
          name: svcName,
          price: combo.prices[idx],
          cat: '',
          icon: combo.emoji,
          isComboItem: true,
          comboId,
          serviceIdx: idx
        });
        added++;
      }
    });

    // Add the combo discount as a negative-price line
    _state.cartItems.push({
      id: `combo-discount-${comboId}`,
      name: `🏷️ ${combo.name} Combo Discount`,
      price: -combo.discount,
      isDiscount: true
    });

    Cart.updateUI();
    showToast(`${combo.name} added to cart! ৳${combo.discount} saved!`, 'success');

    // Open cart so user sees it
    const panel = document.getElementById('cart-panel');
    if (!panel.classList.contains('open')) Cart.toggle();
  }
};

// ─── COMPLAINTS ────────────────────────────────────────────────────────────────

const Complaints = {
  _activeBooking: null,   // booking context when modal is open

  CUSTOMER_CATEGORIES: [
    'Poor workmanship / incomplete service',
    'Rude / unprofessional behaviour',
    'Late arrival / no-show',
    'Damaged property',
    'Overcharging'
  ],
  PROVIDER_CATEGORIES: [
    'Abusive / threatening behaviour',
    'Refused to pay agreed amount',
    'Unsafe working conditions provided',
    'Cancelled without notice (day-of)',
    'False claims against worker'
  ],

  async load() {
    const session = DB.getSession();
    if (!session) return;
    await DB.sync();

    const role = session.role;

    // Show/hide the correct view panel
    const modView = document.getElementById('complaints-mod-view');
    const userView = document.getElementById('complaints-user-view');

    if (role === 'moderator') {
      modView.classList.remove('hidden');
      userView.classList.add('hidden');
      await Complaints.loadModeratorView();
      return;
    }

    // Customer / Provider view
    modView.classList.add('hidden');
    userView.classList.remove('hidden');

    const bookings = DB.getBookings();
    const userId = session.id || session._id;

    // Filter relevant done bookings for this user
    let doneBookings = [];
    if (role === 'customer') {
      doneBookings = bookings.filter(b =>
        (b.userId === userId || b.customerId === userId) && b.status === 'done'
      );
    } else if (role === 'provider') {
      doneBookings = bookings.filter(b =>
        (b.providerId === userId || b.assignedWorkerId === userId) && b.status === 'done'
      );
    }

    // Render done bookings
    const grid = document.getElementById('complaints-bookings-grid');
    const noDone = document.getElementById('complaints-no-done');
    if (doneBookings.length === 0) {
      grid.innerHTML = '';
      noDone.classList.remove('hidden');
    } else {
      noDone.classList.add('hidden');
      const serviceNames = doneBookings.map(b => {
        const items = b.items || [];
        return items.map(i => i.name).join(', ') || 'Service';
      });
      grid.innerHTML = doneBookings.map((b, idx) => `
        <div class="complaint-booking-card">
          <div class="complaint-booking-icon"></div>
          <div class="complaint-booking-info">
            <p class="complaint-booking-service">${serviceNames[idx]}</p>
            <p class="complaint-booking-meta">
              ${role === 'customer'
          ? `Worker: ${b.workerName || b.providerName || 'Worker'}`
          : `Customer: ${b.customerName || b.userName || 'Customer'}`}
            </p>
            <p class="complaint-booking-date">${new Date(b.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <button onclick="Complaints.openModal(${JSON.stringify(b).replace(/"/g, '&quot;')})"
            class="complaint-file-btn">File Complaint</button>
        </div>
      `).join('');
    }

    // Load and render complaint history
    await Complaints.renderHistory(userId);
  },

  // ── MODERATOR VIEW ──────────────────────────────────────────────────────────
  async loadModeratorView() {
    const tbody = document.getElementById('cmod-complaints-tbody');
    const statTotal = document.getElementById('cmod-stat-total');
    const statOpen = document.getElementById('cmod-stat-open');
    const statResolved = document.getElementById('cmod-stat-resolved');

    try {
      const [complaintsRes, workersRes, customersRes] = await Promise.all([
        fetch('/api/complaints'),
        fetch('/api/workers'),
        fetch('/api/customers')
      ]);
      const complaints = await complaintsRes.json();
      const workers = await workersRes.json();
      const customers = await customersRes.json();

      // Stats
      statTotal.textContent = complaints.length;
      statOpen.textContent = complaints.filter(c => c.status === 'open').length;
      statResolved.textContent = complaints.filter(c => c.status === 'resolved').length;

      if (!complaints.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-gray-400 py-10 text-sm">No complaints filed yet.</td></tr>`;
        return;
      }

      const statusColors = { open: 'badge-rejected', reviewed: 'badge-pending', resolved: 'badge-done' };
      const statusLabels = { open: 'Open', reviewed: 'Under Review', resolved: 'Resolved' };

      tbody.innerHTML = complaints.map(c => {
        // Find the accused user and their current status
        let accused, accusedStatus, accusedRole;
        if (c.againstRole === 'provider') {
          accused = workers.find(w => w._id === c.againstId || w.name === c.againstName);
          accusedRole = 'provider';
          accusedStatus = accused ? accused.status : 'unknown';
        } else {
          accused = customers.find(cu => cu._id === c.againstId || cu.name === c.againstName);
          accusedRole = 'customer';
          accusedStatus = accused ? (accused.status || 'active') : 'unknown';
        }

        const isSuspended = accusedStatus === 'suspended' || accusedStatus === 'inactive';
        const suspendLabel = isSuspended ? 'Reactivate' : 'Suspend';
        const suspendClass = isSuspended
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-red-100 text-red-700 hover:bg-red-200';
        const suspendFn = accused
          ? `Complaints.suspendUser('${accused._id}','${accusedRole}','${isSuspended ? 'active' : 'suspended'}')`
          : '';

        return `
          <tr>
            <td class="text-xs text-gray-500">${new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
            <td class="font-medium">${c.complainantName}</td>
            <td><span class="status-badge badge-active capitalize">${c.complainantRole}</span></td>
            <td class="font-medium">${c.againstName}</td>
            <td><span class="status-badge ${c.againstRole === 'provider' ? 'badge-approved' : 'badge-active'} capitalize">${c.againstRole}</span></td>
            <td class="text-xs">${c.category}</td>
            <td class="text-xs text-gray-600 max-w-xs truncate" title="${c.description}">${c.description}</td>
            <td>
              <select onchange="Complaints.updateStatus('${c._id}', this.value)"
                class="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none">
                <option value="open"     ${c.status === 'open' ? 'selected' : ''}>Open</option>
                <option value="reviewed" ${c.status === 'reviewed' ? 'selected' : ''}>Under Review</option>
                <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>Resolved</option>
              </select>
            </td>
            <td>
              ${accused ? `
                <button onclick="${suspendFn}"
                  class="text-xs font-bold px-3 py-1.5 rounded-lg transition ${suspendClass}">
                  ${suspendLabel}
                </button>
              ` : '<span class="text-gray-300 text-xs">—</span>'}
            </td>
          </tr>`;
      }).join('');

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-red-400 py-10 text-sm">Failed to load complaints.</td></tr>`;
      console.error('Moderator complaints load error:', err);
    }
  },

  async suspendUser(userId, role, newStatus) {
    const label = newStatus === 'suspended' ? 'Suspend' : 'Reactivate';
    const confirmMsg = `${label} this ${role}? This will ${newStatus === 'suspended' ? 'prevent them from using the platform' : 'restore their access'}.`;
    if (!confirm(confirmMsg)) return;
    try {
      const endpoint = role === 'provider'
        ? `/api/workers/${userId}/suspend`
        : `/api/customers/${userId}/status`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed');
      const actionLabel = newStatus === 'suspended' ? 'suspended' : 'reactivated';
      toast(`${role.charAt(0).toUpperCase() + role.slice(1)} ${actionLabel} successfully.`);
      // Reload the moderator view to reflect changes
      await Complaints.loadModeratorView();
    } catch (err) {
      toast('Action failed. Please try again.');
    }
  },

  async updateStatus(id, status) {
    try {
      await fetch(`/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      // Update stats without full reload
      await Complaints.loadModeratorView();
    } catch (err) {
      toast('Failed to update complaint status.');
    }
  },

  async renderHistory(userId) {
    const historyList = document.getElementById('complaints-history-list');
    const noHistory = document.getElementById('complaints-no-history');
    try {
      const res = await fetch(`/api/complaints/user/${userId}`);
      const complaints = await res.json();
      if (!Array.isArray(complaints) || complaints.length === 0) {
        historyList.innerHTML = '';
        noHistory.classList.remove('hidden');
        return;
      }
      noHistory.classList.add('hidden');
      const statusColors = { open: 'complaint-status-open', reviewed: 'complaint-status-reviewed', resolved: 'complaint-status-resolved' };
      const statusLabels = { open: 'Open', reviewed: 'Under Review', resolved: 'Resolved' };
      historyList.innerHTML = complaints.map(c => `
        <div class="complaint-card">
          <div class="complaint-card-header">
            <span class="complaint-category-tag">${c.category}</span>
            <span class="complaint-status-badge ${statusColors[c.status] || 'complaint-status-open'}">${statusLabels[c.status] || c.status}</span>
          </div>
          <p class="complaint-against">Against: <strong>${c.againstName}</strong> (${c.againstRole})</p>
          <p class="complaint-desc">"${c.description}"</p>
          <p class="complaint-date">Filed: ${new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      `).join('');
    } catch (err) {
      historyList.innerHTML = '<p class="text-red-400 text-sm">Failed to load complaint history.</p>';
    }
  },

  openModal(booking) {
    const session = DB.getSession();
    if (!session) return;
    Complaints._activeBooking = booking;

    const label = document.getElementById('complaint-modal-booking-label');
    const items = booking.items || [];
    const svcNames = items.map(i => i.name).join(', ') || 'Service';
    const againstName = session.role === 'customer'
      ? (booking.workerName || booking.providerName || 'Worker')
      : (booking.customerName || booking.userName || 'Customer');
    label.textContent = `Service: ${svcNames} · Against: ${againstName}`;

    // Populate categories based on role
    const cats = session.role === 'customer' ? Complaints.CUSTOMER_CATEGORIES : Complaints.PROVIDER_CATEGORIES;
    const select = document.getElementById('complaint-category');
    select.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');

    // Clear previous input
    document.getElementById('complaint-description').value = '';
    document.getElementById('complaint-modal-error').classList.add('hidden');
    document.getElementById('complaint-submit-btn').disabled = false;
    document.getElementById('complaint-submit-btn').textContent = 'Submit Complaint';

    const modal = document.getElementById('complaint-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeModal() {
    const modal = document.getElementById('complaint-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    Complaints._activeBooking = null;
  },

  async submit() {
    const session = DB.getSession();
    if (!session || !Complaints._activeBooking) return;

    const booking = Complaints._activeBooking;
    const category = document.getElementById('complaint-category').value;
    const description = document.getElementById('complaint-description').value.trim();
    const errEl = document.getElementById('complaint-modal-error');
    const btn = document.getElementById('complaint-submit-btn');

    if (!description) {
      errEl.textContent = 'Please write a description.';
      errEl.classList.remove('hidden');
      return;
    }
    if (description.length < 20) {
      errEl.textContent = 'Description must be at least 20 characters.';
      errEl.classList.remove('hidden');
      return;
    }

    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const userId = session.id || session._id;
    const role = session.role;
    const items = booking.items || [];
    const svcNames = items.map(i => i.name).join(', ') || 'Service';

    const againstId = role === 'customer' ? (booking.providerId || booking.assignedWorkerId || '') : (booking.userId || booking.customerId || '');
    const againstName = role === 'customer' ? (booking.workerName || booking.providerName || 'Worker') : (booking.customerName || booking.userName || 'Customer');
    const againstRole = role === 'customer' ? 'provider' : 'customer';

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking._id || booking.id,
          complainantId: userId,
          complainantRole: role,
          complainantName: session.name || session.email,
          againstId,
          againstName,
          againstRole,
          serviceName: svcNames,
          category,
          description
        })
      });

      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Failed to submit complaint.';
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Submit Complaint';
        return;
      }

      Complaints.closeModal();
      showToast('Complaint filed successfully.', 'success');
      await Complaints.renderHistory(userId);
    } catch (err) {
      errEl.textContent = 'Network error. Please try again.';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Submit Complaint';
    }
  },
};

// ─── 22. LIVE MAP & GEOLOCATION CONTROLLER ─────────────────────────────────────

const LiveMap = {
  DHAKA_HUBS: {
    'Gulshan': { lat: 23.7925, lng: 90.4078, name: 'Gulshan Hub' },
    'Banani': { lat: 23.7937, lng: 90.4043, name: 'Banani Hub' },
    'Dhanmondi': { lat: 23.7461, lng: 90.3742, name: 'Dhanmondi Hub' },
    'Bashundhara': { lat: 23.8191, lng: 90.4326, name: 'Bashundhara R/A Hub' },
    'Mirpur': { lat: 23.8071, lng: 90.3686, name: 'Mirpur Hub' },
    'Uttara': { lat: 23.8759, lng: 90.3795, name: 'Uttara Hub' },
    'Mohakhali': { lat: 23.7777, lng: 90.4043, name: 'Mohakhali Hub' }
  },

  _pickerMap: null,
  _pickerMarker: null,
  _pickerGpsBeacon: null,
  _pickerAccuracyCircle: null,
  _marketMap: null,
  _marketMarkers: [],
  _marketUserPin: null,
  _marketUserBeacon: null,
  _marketAccuracyCircle: null,
  _trackingMap: null,
  _trackingMarkers: [],
  _trackingPolyline: null,

  // null means user has not yet granted GPS or manually picked a location
  _currentPickerLoc: null,

  // ── Google Maps SVG Teardrop Icon (Sharp Bottom Needle Tip at [17, 44]) ──
  createGooglePinIcon(color = '#EA4335') {
    return L.divIcon({
      className: 'gmaps-pin-marker',
      html: `
        <div class="gmaps-pin-wrapper">
          <svg class="gmaps-pin-svg" viewBox="0 0 32 44" width="32" height="44">
            <defs>
              <filter id="pin-sh-${color.replace('#','')}" x="-30%" y="-10%" width="160%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.35"/>
              </filter>
            </defs>
            <path d="M16 0C7.163 0 0 7.163 0 16c0 11.25 14.25 26.5 15.15 27.45a1.15 1.15 0 0 0 1.7 0C17.75 42.5 32 27.25 32 16 32 7.163 24.837 0 16 0z" fill="${color}" filter="url(#pin-sh-${color.replace('#','')})"/>
            <circle cx="16" cy="16" r="6.5" fill="#FFFFFF"/>
            <circle cx="16" cy="16" r="3" fill="${color === '#EA4335' ? '#B31412' : '#0d0e11'}"/>
          </svg>
          <div class="gmaps-pin-shadow"></div>
        </div>
      `,
      iconSize: [34, 46],
      iconAnchor: [17, 44],
      popupAnchor: [0, -44]
    });
  },

  // ── Google Maps Live GPS Blue Beacon Dot ──
  createGoogleGpsBeaconIcon() {
    return L.divIcon({
      className: 'gmaps-gps-marker',
      html: `
        <div class="gmaps-gps-ring"></div>
        <div class="gmaps-gps-core"></div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  },

  // Calculate closest Dhaka zone from coordinates
  detectZoneFromCoords(lat, lng) {
    let closestZone = 'Gulshan';
    let minDistance = Infinity;

    for (const [zone, hub] of Object.entries(this.DHAKA_HUBS)) {
      const dist = Math.hypot(lat - hub.lat, lng - hub.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestZone = zone;
      }
    }
    return closestZone;
  },

  // High-precision reverse geocode via OpenStreetMap Nominatim
  async reverseGeocode(lat, lng) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const parts = [];
          if (a.house_number) parts.push(`House ${a.house_number}`);
          if (a.building && a.building !== a.house_number) parts.push(a.building);
          if (a.road) parts.push(a.road);
          if (a.residential) parts.push(a.residential);
          if (a.neighbourhood) parts.push(a.neighbourhood);
          else if (a.suburb) parts.push(a.suburb);
          else if (a.quarter) parts.push(a.quarter);

          const zone = this.detectZoneFromCoords(lat, lng);
          if (parts.length > 0) {
            const cleanParts = [...new Set(parts)];
            return `${cleanParts.join(', ')}, ${zone}, Dhaka`;
          }
          if (data.display_name) {
            return data.display_name.split(',').slice(0, 4).join(', ');
          }
        }
      }
    } catch (err) {
      console.warn('OSM Reverse geocoding skipped or timed out:', err);
    }
    const zone = this.detectZoneFromCoords(lat, lng);
    return `Location near ${zone}, Dhaka`;
  },

  // Auto Geolocation via HTML5 GPS with High Accuracy
  async autoLocate(onSuccess, onError) {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      if (onError) onError('Geolocation not supported');
      return;
    }

    showToast('📡 Detecting exact GPS coordinates...', 'default');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 25;
        const zone = this.detectZoneFromCoords(lat, lng);
        const address = await this.reverseGeocode(lat, lng);

        const loc = { lat, lng, accuracy, zone, address, note: '' };
        _state.userLocation = loc;
        this._currentPickerLoc = { ...loc };

        this.updateCartLocationUI();
        showToast(`📍 Located precisely in ${zone}!`);
        if (onSuccess) onSuccess(loc);
      },
      (err) => {
        console.warn('GPS Geolocation error:', err);
        const msg = err.code === 1
          ? 'GPS permission denied. Please allow location access in your browser.'
          : 'Could not detect GPS signal. Please tap "Pick on Map" to set your location manually.';
        showToast(msg, 'error');
        // Do NOT set a fake fallback — leave location as unset so user knows to set it
        this.updateCartLocationUI();
        if (onError) onError(err);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  },

  // Update Cart UI display — honest: shows 'not set' if user hasn't granted GPS
  updateCartLocationUI() {
    const loc = _state.userLocation || this._currentPickerLoc;
    const badge = document.getElementById('cart-zone-badge');
    const addr = document.getElementById('cart-address-text');
    const coords = document.getElementById('cart-coords-text');

    if (!loc) {
      // No location set yet — be honest with the user
      if (badge) { badge.textContent = 'Not Set'; badge.classList.replace('bg-orange-100', 'bg-gray-100'); badge.classList.replace('text-orange-700', 'text-gray-500'); }
      if (addr) addr.textContent = '⚠️ No location set — tap Auto GPS to detect yours';
      if (coords) coords.textContent = 'GPS coordinates not yet captured';
      return;
    }
    if (badge) { badge.textContent = loc.zone || '—'; badge.classList.replace('bg-gray-100', 'bg-orange-100'); badge.classList.replace('text-gray-500', 'text-orange-700'); }
    if (addr) addr.textContent = `📍 ${loc.address}`;
    if (coords) coords.textContent = `GPS: ${loc.lat.toFixed(5)}° N, ${loc.lng.toFixed(5)}° E`;
  },

  // Auto-locate specifically for Cart
  autoLocateCart() {
    this.autoLocate(() => {
      this.updateCartLocationUI();
    });
  },

  // Auto-locate for Marketplace
  autoLocateMarketplace() {
    this.autoLocate((loc) => {
      // Switch zone filter to the detected zone
      const pills = document.querySelectorAll('.zone-pill');
      pills.forEach(p => {
        if (p.textContent.trim().toLowerCase().includes(loc.zone.toLowerCase())) {
          p.click();
        }
      });

      // If marketplace map is already open, fly to EXACT GPS coords and update pins
      if (this._marketMap) {
        // Fly directly to the raw device GPS coordinate (not zone hub)
        this._marketMap.flyTo([loc.lat, loc.lng], 16, { animate: true, duration: 1.0 });
        this._placeMarketUserPin(loc);
      } else {
        // Map not open yet — open it and it will auto-center on location
        this.toggleMarketplaceMap();
      }
    });
  },

  // Place or update the user's pin & beacon on the marketplace map at EXACT GPS coords
  _placeMarketUserPin(loc) {
    if (!this._marketMap) return;
    const pos = [loc.lat, loc.lng];

    // Move or create the accuracy circle
    if (this._marketAccuracyCircle) {
      this._marketAccuracyCircle.setLatLng(pos);
      this._marketAccuracyCircle.setRadius(loc.accuracy || 40);
    } else {
      this._marketAccuracyCircle = L.circle(pos, {
        radius: loc.accuracy || 40,
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.1,
        weight: 1.5
      }).addTo(this._marketMap);
    }

    // Move or create the Google GPS blue beacon dot
    if (this._marketUserBeacon) {
      this._marketUserBeacon.setLatLng(pos);
    } else {
      this._marketUserBeacon = L.marker(pos, {
        icon: this.createGoogleGpsBeaconIcon(),
        interactive: false,
        zIndexOffset: 900
      }).addTo(this._marketMap);
    }

    // Move or create the Google red teardrop pin
    if (this._marketUserPin) {
      this._marketUserPin.setLatLng(pos);
      this._marketUserPin.setPopupContent(`<b>📍 Your Exact Location</b><br>${loc.address}`);
    } else {
      this._marketUserPin = L.marker(pos, {
        icon: this.createGooglePinIcon('#EA4335'),
        zIndexOffset: 1000
      }).addTo(this._marketMap);
      this._marketUserPin.bindPopup(`<b>📍 Your Exact Location</b><br>${loc.address}`);
    }
  },

  // Open Location Picker Modal
  openPickerModal() {
    const modal = document.getElementById('location-picker-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const defaultLoc = {
      lat: 23.7925,
      lng: 90.4078,
      zone: 'Gulshan',
      address: 'Road 11, Block D, Gulshan, Dhaka',
      accuracy: 25,
      note: ''
    };

    const existingLoc = _state.userLocation || this._currentPickerLoc || defaultLoc;
    this._currentPickerLoc = { ...defaultLoc, ...existingLoc };
    this.updatePickerModalUI();

    const noteInput = document.getElementById('modal-apt-input');
    if (noteInput && this._currentPickerLoc.note) {
      noteInput.value = this._currentPickerLoc.note;
    }

    setTimeout(() => {
      this.initPickerMap(this._currentPickerLoc.lat, this._currentPickerLoc.lng);
      if (this._pickerMap) {
        this._pickerMap.invalidateSize();
      }
    }, 180);
  },

  closePickerModal() {
    const modal = document.getElementById('location-picker-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  updatePickerModalUI() {
    const badge = document.getElementById('modal-zone-badge');
    const addr = document.getElementById('modal-address-preview');
    const coords = document.getElementById('modal-coords-preview');
    const loc = this._currentPickerLoc;

    if (!loc) {
      if (badge) badge.textContent = '—';
      if (addr) addr.textContent = '📡 Detecting your GPS location...';
      if (coords) coords.textContent = 'Waiting for GPS signal...';
      return;
    }
    if (badge) badge.textContent = loc.zone || '—';
    if (addr) addr.textContent = loc.address || 'Locating address...';
    if (coords && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      coords.textContent = `${loc.lat.toFixed(5)}° N, ${loc.lng.toFixed(5)}° E`;
    }
  },

  initPickerMap(lat, lng) {
    const container = document.getElementById('picker-map');
    if (!container || typeof L === 'undefined') return;

    const validLat = typeof lat === 'number' && !isNaN(lat) ? lat : 23.7925;
    const validLng = typeof lng === 'number' && !isNaN(lng) ? lng : 90.4078;
    const targetPos = [validLat, validLng];
    const accuracyRadius = (this._currentPickerLoc && this._currentPickerLoc.accuracy) || 30;

    if (!this._pickerMap) {
      this._pickerMap = L.map('picker-map', {
        center: targetPos,
        zoom: 17,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this._pickerMap);

      // Google Maps style Blue GPS accuracy circle
      this._pickerAccuracyCircle = L.circle(targetPos, {
        radius: accuracyRadius,
        color: '#1a73e8',
        fillColor: '#1a73e8',
        fillOpacity: 0.12,
        weight: 1.5
      }).addTo(this._pickerMap);

      // Google Maps Blue GPS Beacon Core
      this._pickerGpsBeacon = L.marker(targetPos, {
        icon: this.createGoogleGpsBeaconIcon(),
        interactive: false,
        zIndexOffset: 800
      }).addTo(this._pickerMap);

      // Google Maps Authentic Red Teardrop Drop Pin (Sharp tip anchored at bottom)
      this._pickerMarker = L.marker(targetPos, {
        draggable: true,
        icon: this.createGooglePinIcon('#EA4335'),
        zIndexOffset: 1000
      }).addTo(this._pickerMap);

      this._pickerMarker.on('dragend', async (e) => {
        const newPos = e.target.getLatLng();
        if (this._pickerGpsBeacon) this._pickerGpsBeacon.setLatLng(newPos);
        if (this._pickerAccuracyCircle) this._pickerAccuracyCircle.setLatLng(newPos);
        await this.handlePickerMove(newPos.lat, newPos.lng);
      });

      this._pickerMap.on('click', async (e) => {
        const newPos = e.latlng;
        if (this._pickerMarker) this._pickerMarker.setLatLng(newPos);
        if (this._pickerGpsBeacon) this._pickerGpsBeacon.setLatLng(newPos);
        if (this._pickerAccuracyCircle) this._pickerAccuracyCircle.setLatLng(newPos);
        await this.handlePickerMove(newPos.lat, newPos.lng);
      });

    } else {
      this._pickerMap.invalidateSize();
      this._pickerMap.setView(targetPos, 17);
      if (this._pickerMarker) this._pickerMarker.setLatLng(targetPos);
      if (this._pickerGpsBeacon) this._pickerGpsBeacon.setLatLng(targetPos);
      if (this._pickerAccuracyCircle) {
        this._pickerAccuracyCircle.setLatLng(targetPos);
        this._pickerAccuracyCircle.setRadius(accuracyRadius);
      }
    }

    setTimeout(() => {
      if (this._pickerMap) this._pickerMap.invalidateSize();
    }, 200);
  },

  async handlePickerMove(lat, lng) {
    const zone = this.detectZoneFromCoords(lat, lng);
    const address = await this.reverseGeocode(lat, lng);
    if (!this._currentPickerLoc) this._currentPickerLoc = {};
    this._currentPickerLoc.lat = lat;
    this._currentPickerLoc.lng = lng;
    this._currentPickerLoc.zone = zone;
    this._currentPickerLoc.address = address;
    this.updatePickerModalUI();
  },

  locateMeInModal() {
    this.autoLocate((loc) => {
      this._currentPickerLoc = { ...loc };
      this.updatePickerModalUI();
      if (this._pickerMap) {
        this._pickerMap.invalidateSize();
        this._pickerMap.flyTo([loc.lat, loc.lng], 17, { animate: true, duration: 1.2 });
        if (this._pickerMarker) this._pickerMarker.setLatLng([loc.lat, loc.lng]);
        if (this._pickerGpsBeacon) this._pickerGpsBeacon.setLatLng([loc.lat, loc.lng]);
        if (this._pickerAccuracyCircle) {
          this._pickerAccuracyCircle.setLatLng([loc.lat, loc.lng]);
          this._pickerAccuracyCircle.setRadius(loc.accuracy || 25);
        }
      } else {
        this.initPickerMap(loc.lat, loc.lng);
      }
    });
  },

  async searchAddress() {
    const input = document.getElementById('map-search-input');
    const query = input?.value.trim();
    if (!query) return;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query + ', Dhaka')}&limit=1&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          await this.handlePickerMove(lat, lng);
          if (this._pickerMap) {
            this._pickerMap.flyTo([lat, lng], 17, { animate: true });
            if (this._pickerMarker) this._pickerMarker.setLatLng([lat, lng]);
            if (this._pickerGpsBeacon) this._pickerGpsBeacon.setLatLng([lat, lng]);
            if (this._pickerAccuracyCircle) this._pickerAccuracyCircle.setLatLng([lat, lng]);
          }
          showToast(`Found: ${results[0].display_name.split(',')[0]}`);
          return;
        }
      }
      showToast('Address not found, please drag the pin directly to your building', 'error');
    } catch (err) {
      showToast('Search failed, please click directly on the map', 'error');
    }
  },

  confirmLocation() {
    const noteInput = document.getElementById('modal-apt-input');
    if (!this._currentPickerLoc) {
      this._currentPickerLoc = {
        lat: 23.7925,
        lng: 90.4078,
        zone: 'Gulshan',
        address: 'Road 11, Block D, Gulshan, Dhaka',
        accuracy: 25,
        note: ''
      };
    }
    if (noteInput && noteInput.value.trim()) {
      const note = noteInput.value.trim();
      this._currentPickerLoc.note = note;
      if (!this._currentPickerLoc.address.startsWith(note)) {
        this._currentPickerLoc.address = `${note}, ${this._currentPickerLoc.address}`;
      }
    }
    _state.userLocation = { ...this._currentPickerLoc };
    this.updateCartLocationUI();
    this.closePickerModal();
    showToast(`📍 Location set: ${_state.userLocation.zone} (${_state.userLocation.address})`);
  },

  // Toggle & Init Marketplace Live Coverage Map
  toggleMarketplaceMap() {
    const wrapper = document.getElementById('marketplace-map-wrapper');
    const btn = document.getElementById('btn-toggle-market-map');
    if (!wrapper) return;

    const isHidden = wrapper.classList.contains('hidden');
    if (isHidden) {
      wrapper.classList.remove('hidden');
      if (btn) btn.textContent = '✕ Hide Map';
      setTimeout(() => this.initMarketplaceMap(), 150);
    } else {
      wrapper.classList.add('hidden');
      if (btn) btn.textContent = '🗺️ View Live Map';
    }
  },

  initMarketplaceMap() {
    const container = document.getElementById('marketplace-map');
    if (!container || typeof L === 'undefined') return;

    // Determine initial center: raw GPS coords if available, else Dhaka center
    const userLoc = _state.userLocation;
    const initCenter = userLoc ? [userLoc.lat, userLoc.lng] : [23.7925, 90.4078];
    const initZoom = userLoc ? 15 : 13;

    if (!this._marketMap) {
      this._marketMap = L.map('marketplace-map', {
        center: initCenter,
        zoom: initZoom,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this._marketMap);
    } else {
      this._marketMap.invalidateSize();
      // Re-center to user's latest GPS location if we have it
      if (userLoc) {
        this._marketMap.setView([userLoc.lat, userLoc.lng], 15);
      }
    }

    setTimeout(() => {
      if (this._marketMap) this._marketMap.invalidateSize();
    }, 200);

    // Clear old markers
    this._marketMarkers.forEach(m => m.remove());
    this._marketMarkers = [];

    // Add Zone Hub markers with radius circles
    for (const [zoneName, hub] of Object.entries(this.DHAKA_HUBS)) {
      const circle = L.circle([hub.lat, hub.lng], {
        color: '#ea580c',
        fillColor: '#f97316',
        fillOpacity: 0.08,
        radius: 1800
      }).addTo(this._marketMap);
      this._marketMarkers.push(circle);

      const hubIcon = L.divIcon({
        className: 'custom-map-pin custom-hub-pin',
        html: '🏢',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const hubMarker = L.marker([hub.lat, hub.lng], { icon: hubIcon }).addTo(this._marketMap);
      hubMarker.bindPopup(`<b>${hub.name}</b><br>Proyojon Verified Zone Hub`);
      this._marketMarkers.push(hubMarker);
    }

    // Add Active Verified Workers to map
    const activeWorkers = DB.getWorkers().filter(w => w.status === 'active' && w.verifiedStatus === 'Verified');
    activeWorkers.forEach((w, idx) => {
      const primaryZone = (w.coverageZones && w.coverageZones[0]) || w.zone || 'Gulshan';
      const hub = this.DHAKA_HUBS[primaryZone] || this.DHAKA_HUBS['Gulshan'];
      // Random realistic offset within ~1.2km of hub
      const angle = (idx * 1.2) + Math.PI / 4;
      const dist = 0.004 + (idx * 0.002) % 0.009;
      const wLat = hub.lat + Math.cos(angle) * dist;
      const wLng = hub.lng + Math.sin(angle) * dist;

      const wIcon = L.divIcon({
        className: 'custom-map-pin custom-worker-pin',
        html: '👷',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([wLat, wLng], { icon: wIcon }).addTo(this._marketMap);
      marker.bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;">
          <b style="font-size:13px;color:#0d0e11;">${w.name}</b><br>
          <span style="font-size:11px;color:#ea580c;font-weight:700;">${w.serviceCategory || w.skill}</span><br>
          <span style="font-size:10px;color:#6b7280;">⭐ ${(w.avgRating || 4.8).toFixed(1)} (${w.completedCount || 12} jobs done)</span><br>
          <button onclick="App.goPage('workers')" style="margin-top:6px;background:#0d0e11;color:#fff;border:none;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;">Hire Now</button>
        </div>
      `);
      this._marketMarkers.push(marker);
    });

    // If user's GPS coords exist, place/update pin & beacon
    if (_state.userLocation) {
      this._placeMarketUserPin(_state.userLocation);
    }
  },

  // Open Live Order Tracking Route Map
  openOrderTracker(bookingId) {
    const booking = DB.getBookings().find(b => b.id === bookingId);
    if (!booking) {
      showToast('Booking not found', 'error');
      return;
    }

    const modal = document.getElementById('live-tracking-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('track-modal-booking-id').textContent = `Order #${booking.id}`;
    document.getElementById('track-worker-name').textContent = booking.workerName ? `👷 ${booking.workerName}` : '👷 Assigned Service Specialist';
    document.getElementById('track-destination-address').textContent = booking.deliveryAddress || `${booking.deliveryZone || 'Gulshan'}, Dhaka`;

    const statusText = document.getElementById('track-status-text');
    if (booking.status === 'confirmed') {
      statusText.textContent = 'Artisan is dispatched and on the way';
    } else if (booking.status === 'approved') {
      statusText.textContent = 'Service completed — awaiting customer confirmation';
    } else if (booking.status === 'done') {
      statusText.textContent = 'Job finished successfully';
    } else {
      statusText.textContent = 'Order pending artisan assignment';
    }

    // Customer Coordinates
    const custLat = booking.location?.lat || 23.7925;
    const custLng = booking.location?.lng || 90.4078;

    // Worker Coordinates (offset from customer location)
    const workerLat = custLat + 0.012;
    const workerLng = custLng + 0.008;

    // Calculate simulated distance in km
    const dLat = (custLat - workerLat) * 111;
    const dLng = (custLng - workerLng) * 111 * Math.cos(custLat * (Math.PI / 180));
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng).toFixed(1);
    const etaMins = Math.max(5, Math.round(distKm * 8));

    document.getElementById('track-eta-text').textContent = `${distKm} km • ~${etaMins} mins`;

    setTimeout(() => {
      this.initTrackingMap(custLat, custLng, workerLat, workerLng, booking);
    }, 180);
  },

  closeOrderTracker() {
    const modal = document.getElementById('live-tracking-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  initTrackingMap(custLat, custLng, workerLat, workerLng, booking) {
    const container = document.getElementById('tracking-map');
    if (!container || typeof L === 'undefined') return;

    const midLat = (custLat + workerLat) / 2;
    const midLng = (custLng + workerLng) / 2;

    if (!this._trackingMap) {
      this._trackingMap = L.map('tracking-map', {
        center: [midLat, midLng],
        zoom: 14,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this._trackingMap);
    } else {
      this._trackingMap.invalidateSize();
      this._trackingMap.setView([midLat, midLng], 14);
    }

    // Clear previous tracking elements
    this._trackingMarkers.forEach(m => m.remove());
    this._trackingMarkers = [];
    if (this._trackingPolyline) {
      this._trackingPolyline.remove();
      this._trackingPolyline = null;
    }

    // Customer Pin — Google Maps Red Teardrop Pin
    const custMarker = L.marker([custLat, custLng], {
      icon: this.createGooglePinIcon('#EA4335')
    }).addTo(this._trackingMap);
    custMarker.bindPopup(`<b>Your Doorstep Destination</b><br>${booking.deliveryAddress || 'Dhaka'}`).openPopup();
    this._trackingMarkers.push(custMarker);

    // Worker Pin 👷
    const workerIcon = L.divIcon({
      className: 'custom-map-pin custom-worker-pin',
      html: '👷',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    const workMarker = L.marker([workerLat, workerLng], { icon: workerIcon }).addTo(this._trackingMap);
    workMarker.bindPopup(`<b>${booking.workerName || 'Artisan'}</b><br>Live En-route GPS Position`);
    this._trackingMarkers.push(workMarker);

    // Draw route path line between worker and customer
    const pathPoints = [
      [workerLat, workerLng],
      [workerLat - 0.004, workerLng - 0.002],
      [custLat + 0.003, custLng + 0.002],
      [custLat, custLng]
    ];

    this._trackingPolyline = L.polyline(pathPoints, {
      color: '#ea580c',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8'
    }).addTo(this._trackingMap);

    const bounds = L.latLngBounds([[custLat, custLng], [workerLat, workerLng]]);
    this._trackingMap.fitBounds(bounds, { padding: [50, 50] });
  }
};

// ─── 23. INIT ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  AIChat.init();
  MsgPanel.init();
});

