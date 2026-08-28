/**
 * Proyojon — Comprehensive Bug-Finding Test Suite
 * 
 * Tests all API endpoints against the running server at http://localhost:5050
 * Run: node tests/run_tests.js
 */

const BASE = 'http://localhost:5050';

let passed = 0;
let failed = 0;
let warnings = 0;
const bugs = [];
const warningList = [];

function assert(condition, label, details) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    const msg = details ? `${label} — ${details}` : label;
    bugs.push(msg);
    console.log(`  ❌ ${label}${details ? ` — ${details}` : ''}`);
  }
}

function warn(label, details) {
  warnings++;
  warningList.push(details ? `${label}: ${details}` : label);
  console.log(`  ⚠️  ${label}${details ? ` — ${details}` : ''}`);
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, ok: res.ok };
}

// ─────────────────────────────────────────────────────────────
// 1. AUTH TESTS
// ─────────────────────────────────────────────────────────────
async function testAuth() {
  console.log('\n══════════════════════════════════════════════');
  console.log('1. AUTHENTICATION TESTS');
  console.log('══════════════════════════════════════════════');

  // 1a. Login with valid customer credentials
  const r1 = await req('POST', '/api/auth/login', {
    email: 'customer@proyojon.com',
    password: 'password',
    role: 'customer'
  });
  assert(r1.ok, 'Customer login with valid credentials', r1.ok ? '' : `Status: ${r1.status}`);
  assert(r1.data && r1.data.name, 'Login response contains user name');
  assert(r1.data && !r1.data.password, 'Login response does NOT leak password hash');

  // 1b. Login with wrong password
  const r2 = await req('POST', '/api/auth/login', {
    email: 'customer@proyojon.com',
    password: 'wrongpass',
    role: 'customer'
  });
  assert(r2.status === 400, 'Wrong password returns 400', `Got ${r2.status}`);

  // 1c. Login with non-existent email
  const r3 = await req('POST', '/api/auth/login', {
    email: 'nobody@example.com',
    password: 'password',
    role: 'customer'
  });
  assert(r3.status === 400, 'Non-existent email returns 400', `Got ${r3.status}`);

  // 1d. Login with invalid role
  const r4 = await req('POST', '/api/auth/login', {
    email: 'customer@proyojon.com',
    password: 'password',
    role: 'hacker'
  });
  assert(r4.status === 400, 'Invalid role returns 400', `Got ${r4.status}`);

  // 1e. Login with missing fields
  const r5 = await req('POST', '/api/auth/login', { email: '', password: '', role: '' });
  assert(!r5.ok, 'Login with empty fields is rejected', r5.ok ? 'ACCEPTED empty credentials!' : '');

  // 1f. Register with duplicate email
  const r6 = await req('POST', '/api/auth/register', {
    name: 'Dup Test',
    email: 'customer@proyojon.com',
    password: 'test123',
    role: 'customer',
    phone: '+880 1234'
  });
  assert(r6.status === 400, 'Duplicate email registration returns 400', `Got ${r6.status}`);

  // 1g. Register with missing name
  const r7 = await req('POST', '/api/auth/register', {
    email: `test_noname_${Date.now()}@test.com`,
    password: 'password',
    role: 'customer'
  });
  assert(!r7.ok, 'Registration without name is rejected', r7.ok ? 'ACCEPTED without name!' : '');

  // 1h. Register with invalid role
  const r8 = await req('POST', '/api/auth/register', {
    name: 'Bad Role',
    email: `badrole_${Date.now()}@test.com`,
    password: 'password',
    role: 'superadmin'
  });
  assert(r8.status === 400, 'Invalid role registration returns 400', `Got ${r8.status}`);

  // 1i. Login as moderator
  const r9 = await req('POST', '/api/auth/login', {
    email: 'admin@proyojon.com',
    password: 'password',
    role: 'moderator'
  });
  assert(r9.ok, 'Moderator login works', r9.ok ? '' : `Status: ${r9.status}`);

  // 1j. Login as provider
  const r10 = await req('POST', '/api/auth/login', {
    email: 'karim@proyojon.com',
    password: 'password',
    role: 'provider'
  });
  assert(r10.ok, 'Provider login works', r10.ok ? '' : `Status: ${r10.status}`);

  // 1k. SQL injection attempt in email
  const r11 = await req('POST', '/api/auth/login', {
    email: "' OR 1=1 --",
    password: 'password',
    role: 'customer'
  });
  assert(!r11.ok, 'SQL injection in email is rejected');

  // 1l. Password stored hashed (check seeded user)
  if (r1.data) {
    assert(r1.data.password === undefined, 'Password field is stripped from API response');
  }

  // 1m. Cross-role login attempt (customer email with provider role)
  const r12 = await req('POST', '/api/auth/login', {
    email: 'customer@proyojon.com',
    password: 'password',
    role: 'provider'
  });
  assert(!r12.ok, 'Cross-role login rejected (customer email + provider role)', r12.ok ? 'SECURITY BUG: Cross-role login accepted!' : '');

  return r1.data; // return customer session for later tests
}

// ─────────────────────────────────────────────────────────────
// 2. AREA TESTS
// ─────────────────────────────────────────────────────────────
async function testAreas() {
  console.log('\n══════════════════════════════════════════════');
  console.log('2. AREA & SERVICE TESTS');
  console.log('══════════════════════════════════════════════');

  const r1 = await req('GET', '/api/areas');
  assert(r1.ok, 'GET /api/areas returns 200');
  assert(Array.isArray(r1.data), 'Areas response is an array');
  assert(r1.data.length >= 6, `At least 6 areas seeded (got ${r1.data?.length || 0})`);

  // Check restricted areas are flagged
  const restricted = (r1.data || []).filter(a => a.isRestricted);
  assert(restricted.length >= 2, `At least 2 restricted areas exist (got ${restricted.length})`);

  // Services
  const r2 = await req('GET', '/api/services');
  assert(r2.ok, 'GET /api/services returns 200');
  assert(Array.isArray(r2.data), 'Services response is an array');
  assert(r2.data.length >= 10, `At least 10 services seeded (got ${r2.data?.length || 0})`);

  // Check service data integrity
  if (r2.data && r2.data.length) {
    const svc = r2.data[0];
    assert(svc.name && typeof svc.name === 'string', 'Service has a name field');
    assert(typeof svc.price === 'number' && svc.price > 0, 'Service has a positive price');
    assert(svc.cat && typeof svc.cat === 'string', 'Service has a category');
  }
}

// ─────────────────────────────────────────────────────────────
// 3. WORKER TESTS
// ─────────────────────────────────────────────────────────────
async function testWorkers() {
  console.log('\n══════════════════════════════════════════════');
  console.log('3. WORKER / PROVIDER TESTS');
  console.log('══════════════════════════════════════════════');

  const r1 = await req('GET', '/api/workers');
  assert(r1.ok, 'GET /api/workers returns 200');
  assert(Array.isArray(r1.data), 'Workers response is an array');
  assert(r1.data.length >= 4, `At least 4 workers seeded (got ${r1.data?.length || 0})`);

  if (r1.data && r1.data.length) {
    const w = r1.data[0];
    assert(w.name, 'Worker has name');
    assert(w.serviceCategory || w.skill, 'Worker has serviceCategory or skill');
    assert(w.coverageZones && Array.isArray(w.coverageZones), 'Worker has coverageZones array');
    assert(w.status === 'active' || w.status === 'inactive', `Worker status is valid enum (got "${w.status}")`);

    // Check password is NOT leaked
    assert(!w.password || w.password === undefined, 'Worker password NOT leaked in GET /api/workers',
      w.password ? 'SECURITY BUG: passwords exposed in /api/workers!' : '');
  }

  // Verify worker
  if (r1.data && r1.data.length) {
    const testWorker = r1.data[r1.data.length - 1];
    const wId = testWorker._id;

    // Test verification status update
    const r2 = await req('PATCH', `/api/workers/${wId}/verify`, { status: 'Verified' });
    assert(r2.ok, 'PATCH /api/workers/:id/verify returns 200');

    // Test invalid verification status
    const r3 = await req('PATCH', `/api/workers/${wId}/verify`, { status: 'SuperVerified' });
    // This might not validate since verifiedStatus uses enum
    if (r3.ok) {
      warn('Worker verification accepts invalid status "SuperVerified"',
        'verifiedStatus enum may not be validated server-side');
    }

    // Test status toggle
    const r4 = await req('PATCH', `/api/workers/${wId}/status`, { status: 'inactive' });
    assert(r4.ok, 'Worker status toggle to inactive works');

    // Reset back to active
    await req('PATCH', `/api/workers/${wId}/status`, { status: 'active' });
  }

  // Test non-existent worker ID
  const r5 = await req('PATCH', '/api/workers/000000000000000000000000/verify', { status: 'Verified' });
  assert(r5.status === 404, 'Non-existent worker returns 404', `Got ${r5.status}`);

  // Test invalid ObjectId
  const r6 = await req('PATCH', '/api/workers/invalid-id/verify', { status: 'Verified' });
  assert(!r6.ok, 'Invalid ObjectId format is rejected', r6.ok ? 'Accepted invalid ObjectId!' : '');

  return r1.data;
}

// ─────────────────────────────────────────────────────────────
// 4. BOOKING TESTS
// ─────────────────────────────────────────────────────────────
async function testBookings(customer, workers) {
  console.log('\n══════════════════════════════════════════════');
  console.log('4. BOOKING TESTS');
  console.log('══════════════════════════════════════════════');

  if (!customer) {
    console.log('  ⏭️ Skipping — no customer session available');
    return;
  }

  const custId = customer._id;
  const bookingId = `BK-TEST-${Date.now()}`;
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow

  // 4a. Create a valid booking
  const r1 = await req('POST', '/api/bookings', {
    id: bookingId,
    userId: custId,
    userName: customer.name,
    items: [
      { id: 1, name: 'AC Installation & Service', price: 800, cat: 'ac', icon: '❄️' },
      { id: 2, name: 'Deep Home Cleaning', price: 1200, cat: 'clean', icon: '🧹' }
    ],
    total: 2000,
    scheduledFor: futureDate,
    deliveryAddress: 'House 5, Road 12, Gulshan',
    deliveryZone: 'Gulshan',
    location: { lat: 23.7925, lng: 90.4078 }
  });
  assert(r1.status === 201, 'Create booking returns 201', `Got ${r1.status}: ${JSON.stringify(r1.data?.error)}`);
  assert(r1.data && r1.data.id === bookingId, 'Booking ID matches');
  assert(r1.data && r1.data.status === 'pending', 'New booking status is "pending"');

  // 4b. Create booking WITHOUT scheduledFor (should fail)
  const r2 = await req('POST', '/api/bookings', {
    id: `BK-TEST-NOSCHED-${Date.now()}`,
    userId: custId,
    userName: customer.name,
    items: [{ id: 1, name: 'AC Service', price: 800 }],
    total: 800
  });
  assert(r2.status === 400, 'Booking without scheduledFor returns 400', `Got ${r2.status}`);

  // 4c. Create booking with past date
  const pastDate = new Date(Date.now() - 86400000).toISOString();
  const r3 = await req('POST', '/api/bookings', {
    id: `BK-TEST-PAST-${Date.now()}`,
    userId: custId,
    userName: customer.name,
    items: [{ id: 1, name: 'AC Service', price: 800 }],
    total: 800,
    scheduledFor: pastDate
  });
  assert(r3.status === 400, 'Booking with past scheduledFor returns 400', `Got ${r3.status}`);

  // 4d. Create booking with invalid date string
  const r4 = await req('POST', '/api/bookings', {
    id: `BK-TEST-BADDATE-${Date.now()}`,
    userId: custId,
    userName: customer.name,
    items: [{ id: 1, name: 'AC Service', price: 800 }],
    total: 800,
    scheduledFor: 'not-a-date'
  });
  assert(r4.status === 400, 'Booking with invalid date returns 400', `Got ${r4.status}`);

  // 4e. Create duplicate booking ID
  const r5 = await req('POST', '/api/bookings', {
    id: bookingId,
    userId: custId,
    userName: customer.name,
    items: [{ id: 1, name: 'AC Service', price: 800 }],
    total: 800,
    scheduledFor: futureDate
  });
  assert(!r5.ok, 'Duplicate booking ID is rejected', r5.ok ? 'ACCEPTED duplicate booking!' : '');

  // 4f. Create booking with zero total
  const zeroId = `BK-TEST-ZERO-${Date.now()}`;
  const r5b = await req('POST', '/api/bookings', {
    id: zeroId,
    userId: custId,
    userName: customer.name,
    items: [{ id: 1, name: 'Free Service', price: 0 }],
    total: 0,
    scheduledFor: futureDate
  });
  if (r5b.ok) {
    warn('Booking with total=0 accepted', 'Should bookings with zero total be allowed?');
  }

  // 4g. Create booking with negative total
  const negId = `BK-TEST-NEG-${Date.now()}`;
  const r5c = await req('POST', '/api/bookings', {
    id: negId,
    userId: custId,
    userName: customer.name,
    items: [{ id: 1, name: 'Hack Service', price: -500 }],
    total: -500,
    scheduledFor: futureDate
  });
  if (r5c.ok) {
    warn('Booking with negative total accepted', 'No server-side validation for negative prices — potential financial exploit');
  }

  // 4h. Create booking with empty items
  const emptyId = `BK-TEST-EMPTY-${Date.now()}`;
  const r5d = await req('POST', '/api/bookings', {
    id: emptyId,
    userId: custId,
    userName: customer.name,
    items: [],
    total: 0,
    scheduledFor: futureDate
  });
  if (r5d.ok) {
    warn('Booking with empty items array accepted', 'Should be validated server-side');
  }

  // 4i. Get bookings list
  const r6 = await req('GET', '/api/bookings');
  assert(r6.ok, 'GET /api/bookings returns 200');
  assert(Array.isArray(r6.data), 'Bookings response is an array');

  // 4j. Get user-specific bookings
  const r7 = await req('GET', `/api/bookings/user/${custId}`);
  assert(r7.ok, 'GET /api/bookings/user/:id returns 200');
  const myBooking = (r7.data || []).find(b => b.id === bookingId);
  assert(!!myBooking, 'Created booking appears in user bookings');

  // 4k. Assign worker to booking
  if (workers && workers.length) {
    const workerId = workers[0]._id;
    const r8 = await req('PATCH', `/api/bookings/${bookingId}/assign`, {
      providerId: workerId
    });
    assert(r8.ok, 'Worker assignment returns 200');
    assert(r8.data && r8.data.status === 'confirmed', 'Assigned booking status becomes "confirmed"');
    assert(r8.data && r8.data.workerName, 'Assigned booking has workerName populated');
  }

  // 4l. Status transitions
  const r9 = await req('PATCH', `/api/bookings/${bookingId}/status`, { status: 'approved' });
  assert(r9.ok, 'Status update to "approved" works');

  const r10 = await req('PATCH', `/api/bookings/${bookingId}/status`, { status: 'done' });
  assert(r10.ok, 'Status update to "done" works');

  // 4m. Invalid status value
  const r11 = await req('PATCH', `/api/bookings/${bookingId}/status`, { status: 'hacked' });
  assert(!r11.ok, 'Invalid status value is rejected', r11.ok ? 'ACCEPTED invalid status "hacked"!' : '');

  // 4n. Non-existent booking status update
  const r12 = await req('PATCH', '/api/bookings/BK-NONEXISTENT/status', { status: 'done' });
  assert(r12.status === 404, 'Non-existent booking returns 404', `Got ${r12.status}`);

  // 4o. Cancel booking
  const cancelBookingId = `BK-TEST-CANCEL-${Date.now()}`;
  await req('POST', '/api/bookings', {
    id: cancelBookingId,
    userId: custId,
    userName: customer.name,
    items: [{ id: 1, name: 'AC Service', price: 800 }],
    total: 800,
    scheduledFor: futureDate
  });
  const r13 = await req('PATCH', `/api/bookings/${cancelBookingId}/status`, { status: 'cancelled' });
  assert(r13.ok, 'Booking cancellation works');
  assert(r13.data && r13.data.status === 'cancelled', 'Cancelled booking status is "cancelled"');

  return bookingId;
}

// ─────────────────────────────────────────────────────────────
// 5. COMBO BOOKING TESTS
// ─────────────────────────────────────────────────────────────
async function testComboBookings(customer, workers) {
  console.log('\n══════════════════════════════════════════════');
  console.log('5. COMBO BOOKING TESTS');
  console.log('══════════════════════════════════════════════');

  if (!customer || !workers || workers.length < 2) {
    console.log('  ⏭️ Skipping — need customer and 2+ workers');
    return;
  }

  const custId = customer._id;
  const comboId = `BK-COMBO-TEST-${Date.now()}`;
  const futureDate = new Date(Date.now() + 86400000).toISOString();

  // 5a. Create combo booking
  const r1 = await req('POST', '/api/bookings', {
    id: comboId,
    userId: custId,
    userName: customer.name,
    items: [
      { id: 2, name: 'Deep Home Cleaning', price: 1200, cat: 'clean' },
      { id: 6, name: 'Pest Control', price: 900, cat: 'pest' }
    ],
    total: 1900,
    isComboBooking: true,
    comboId: 'home-refresh',
    comboAssignments: [
      { serviceIdx: 0, serviceName: 'Deep Home Cleaning', serviceCategory: 'Cleaning Expert' },
      { serviceIdx: 1, serviceName: 'Pest Control', serviceCategory: 'Pest Control' }
    ],
    scheduledFor: futureDate,
    deliveryZone: 'Gulshan'
  });
  assert(r1.status === 201, 'Create combo booking returns 201', `Got ${r1.status}`);
  assert(r1.data && r1.data.isComboBooking === true, 'Combo booking flag is set');

  // 5b. Assign first provider to combo
  const r2 = await req('PATCH', `/api/bookings/${comboId}/assign-combo`, {
    serviceIdx: 0,
    providerId: workers[0]._id
  });
  assert(r2.ok, 'Combo assignment slot 0 works');
  assert(r2.data && r2.data.status === 'confirmed', 'Combo becomes confirmed after first assignment');

  // 5c. Assign second provider to combo
  const r3 = await req('PATCH', `/api/bookings/${comboId}/assign-combo`, {
    serviceIdx: 1,
    providerId: workers[1]._id
  });
  assert(r3.ok, 'Combo assignment slot 1 works');

  // 5d. Try to use /assign (non-combo) on a combo booking
  const r4 = await req('PATCH', `/api/bookings/${comboId}/assign`, {
    providerId: workers[0]._id
  });
  assert(r4.status === 400, 'Using /assign on combo booking returns 400', `Got ${r4.status}`);

  // 5e. Complete slot 0
  const r5 = await req('PATCH', `/api/bookings/${comboId}/complete-slot`, {
    providerId: workers[0]._id
  });
  assert(r5.ok, 'Complete combo slot 0 works');
  assert(r5.data && r5.data.status !== 'approved', 'Booking is NOT approved when only 1 slot is completed');

  // 5f. Complete slot 1 (should auto-approve)
  const r6 = await req('PATCH', `/api/bookings/${comboId}/complete-slot`, {
    providerId: workers[1]._id
  });
  assert(r6.ok, 'Complete combo slot 1 works');
  assert(r6.data && r6.data.status === 'approved', 'Booking auto-approved when ALL slots completed',
    `Status: ${r6.data?.status}`);

  // Clean up
  await req('PATCH', `/api/bookings/${comboId}/status`, { status: 'done' });
}

// ─────────────────────────────────────────────────────────────
// 6. REVIEW TESTS
// ─────────────────────────────────────────────────────────────
async function testReviews(customer, workers, bookingId) {
  console.log('\n══════════════════════════════════════════════');
  console.log('6. REVIEW TESTS');
  console.log('══════════════════════════════════════════════');

  if (!customer || !bookingId) {
    console.log('  ⏭️ Skipping — need customer and booking');
    return;
  }

  const custId = customer._id;
  const providerId = workers && workers.length ? workers[0]._id : '';

  // 6a. Submit a valid review
  const r1 = await req('POST', '/api/reviews', {
    bookingId: bookingId,
    customerId: custId,
    customerName: customer.name,
    providerId: providerId,
    providerName: workers?.[0]?.name || 'TestWorker',
    serviceNames: 'AC Installation & Service',
    rating: 5,
    comment: 'Excellent service! Very professional.',
    role: 'customer',
    reviewerName: customer.name,
    reviewerRole: 'customer'
  });
  assert(r1.status === 201, 'Submit review returns 201', `Got ${r1.status}: ${JSON.stringify(r1.data?.error)}`);

  // 6b. Duplicate review should fail
  const r2 = await req('POST', '/api/reviews', {
    bookingId: bookingId,
    customerId: custId,
    customerName: customer.name,
    rating: 4,
    comment: 'Second review.',
    role: 'customer',
    reviewerName: customer.name
  });
  assert(r2.status === 400, 'Duplicate review is rejected', `Got ${r2.status}`);

  // 6c. Review with missing required fields
  const r3 = await req('POST', '/api/reviews', {
    bookingId: bookingId,
    rating: 5,
    comment: 'Missing fields'
  });
  assert(!r3.ok, 'Review with missing fields is rejected');

  // 6d. Review with out-of-range rating
  const r4 = await req('POST', '/api/reviews', {
    bookingId: `BK-REVIEW-${Date.now()}`,
    customerId: custId,
    customerName: customer.name,
    rating: 10,
    comment: 'Too high rating',
    role: 'customer',
    reviewerName: customer.name
  });
  assert(!r4.ok, 'Rating > 5 is rejected', r4.ok ? 'ACCEPTED rating of 10!' : '');

  // 6e. Review with rating 0
  const r5 = await req('POST', '/api/reviews', {
    bookingId: `BK-REVIEW2-${Date.now()}`,
    customerId: custId,
    customerName: customer.name,
    rating: 0,
    comment: 'Zero rating',
    role: 'customer',
    reviewerName: customer.name
  });
  assert(!r5.ok, 'Rating of 0 is rejected', r5.ok ? 'ACCEPTED rating of 0!' : '');

  // 6f. Review with negative rating
  const r6 = await req('POST', '/api/reviews', {
    bookingId: `BK-REVIEW3-${Date.now()}`,
    customerId: custId,
    customerName: customer.name,
    rating: -1,
    comment: 'Negative rating',
    role: 'customer',
    reviewerName: customer.name
  });
  assert(!r6.ok, 'Negative rating is rejected');

  // 6g. GET all reviews
  const r7 = await req('GET', '/api/reviews');
  assert(r7.ok, 'GET /api/reviews returns 200');
  assert(Array.isArray(r7.data), 'Reviews response is an array');

  // 6h. GET reviews for specific booking
  const r8 = await req('GET', `/api/reviews/booking/${bookingId}`);
  assert(r8.ok, 'GET /api/reviews/booking/:id returns 200');
  assert(r8.data && r8.data.length >= 1, 'At least 1 review found for test booking');

  // 6i. Provider avgRating updated
  if (providerId) {
    const workerRes = await req('GET', '/api/workers');
    const updatedWorker = (workerRes.data || []).find(w => w._id === providerId);
    if (updatedWorker) {
      assert(typeof updatedWorker.avgRating === 'number', 'Provider avgRating is updated after review');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 7. COMPLAINT TESTS
// ─────────────────────────────────────────────────────────────
async function testComplaints(customer, workers, bookingId) {
  console.log('\n══════════════════════════════════════════════');
  console.log('7. COMPLAINT TESTS');
  console.log('══════════════════════════════════════════════');

  if (!customer || !bookingId || !workers || !workers.length) {
    console.log('  ⏭️ Skipping — need customer, workers, and booking');
    return;
  }

  const custId = customer._id;
  const providerId = workers[0]._id;

  // 7a. File a valid complaint
  const r1 = await req('POST', '/api/complaints', {
    bookingId: bookingId,
    complainantId: custId,
    complainantRole: 'customer',
    complainantName: customer.name,
    againstId: providerId,
    againstName: workers[0].name,
    againstRole: 'provider',
    serviceName: 'AC Installation',
    category: 'quality',
    description: 'Service was not up to standard.'
  });
  assert(r1.status === 201, 'File complaint returns 201', `Got ${r1.status}`);

  // 7b. Duplicate complaint should fail
  const r2 = await req('POST', '/api/complaints', {
    bookingId: bookingId,
    complainantId: custId,
    complainantRole: 'customer',
    complainantName: customer.name,
    againstId: providerId,
    againstName: workers[0].name,
    againstRole: 'provider',
    category: 'quality',
    description: 'Another complaint.'
  });
  assert(r2.status === 409, 'Duplicate complaint returns 409', `Got ${r2.status}`);

  // 7c. Complaint with missing fields
  const r3 = await req('POST', '/api/complaints', {
    bookingId: bookingId,
    description: 'Missing fields'
  });
  assert(!r3.ok, 'Complaint with missing fields is rejected');

  // 7d. Get complaints by user
  const r4 = await req('GET', `/api/complaints/user/${custId}`);
  assert(r4.ok, 'GET /api/complaints/user/:id returns 200');
  assert(r4.data && r4.data.length >= 1, 'User complaints found');

  // 7e. Get complaints against user
  const r5 = await req('GET', `/api/complaints/against/${providerId}`);
  assert(r5.ok, 'GET /api/complaints/against/:id returns 200');

  // 7f. Get all complaints (moderator)
  const r6 = await req('GET', '/api/complaints');
  assert(r6.ok, 'GET /api/complaints returns 200');

  // 7g. Update complaint status
  if (r1.data && r1.data._id) {
    const r7 = await req('PATCH', `/api/complaints/${r1.data._id}/status`, { status: 'reviewed' });
    assert(r7.ok, 'Complaint status update to "reviewed" works');

    const r8 = await req('PATCH', `/api/complaints/${r1.data._id}/status`, { status: 'resolved' });
    assert(r8.ok, 'Complaint status update to "resolved" works');

    // Invalid status
    const r9 = await req('PATCH', `/api/complaints/${r1.data._id}/status`, { status: 'hacked' });
    assert(r9.status === 400, 'Invalid complaint status is rejected', `Got ${r9.status}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 8. CHAT / MESSAGING TESTS
// ─────────────────────────────────────────────────────────────
async function testChat(bookingId) {
  console.log('\n══════════════════════════════════════════════');
  console.log('8. CHAT / MESSAGING TESTS');
  console.log('══════════════════════════════════════════════');

  if (!bookingId) {
    console.log('  ⏭️ Skipping — need booking');
    return;
  }

  // 8a. Send a message
  const r1 = await req('POST', `/api/chat/${bookingId}`, {
    sender: 'customer',
    senderName: 'Test Customer',
    text: 'Hello, when will you arrive?'
  });
  assert(r1.status === 201, 'Send chat message returns 201', `Got ${r1.status}`);

  // 8b. Send reply
  const r2 = await req('POST', `/api/chat/${bookingId}`, {
    sender: 'provider',
    senderName: 'Test Worker',
    text: 'I will be there in 30 minutes!'
  });
  assert(r2.status === 201, 'Provider reply returns 201');

  // 8c. Get messages
  const r3 = await req('GET', `/api/chat/${bookingId}`);
  assert(r3.ok, 'GET /api/chat/:bookingId returns 200');
  assert(r3.data && r3.data.length >= 2, `At least 2 messages found (got ${r3.data?.length || 0})`);

  // 8d. Messages are sorted chronologically
  if (r3.data && r3.data.length >= 2) {
    const times = r3.data.map(m => new Date(m.createdAt).getTime());
    const isSorted = times.every((t, i) => i === 0 || t >= times[i - 1]);
    assert(isSorted, 'Messages are sorted chronologically');
  }

  // 8e. Send message with missing fields
  const r4 = await req('POST', `/api/chat/${bookingId}`, {
    text: 'Missing sender fields'
  });
  assert(r4.status === 400, 'Message with missing sender rejected', `Got ${r4.status}`);

  // 8f. Send message with empty text
  const r5 = await req('POST', `/api/chat/${bookingId}`, {
    sender: 'customer',
    senderName: 'Test',
    text: ''
  });
  assert(!r5.ok, 'Message with empty text rejected', r5.ok ? 'ACCEPTED empty message!' : '');

  // 8g. Send message with whitespace-only text
  const r6 = await req('POST', `/api/chat/${bookingId}`, {
    sender: 'customer',
    senderName: 'Test',
    text: '   '
  });
  if (r6.ok) {
    warn('Message with whitespace-only text accepted', 'Text is trimmed to empty but saved — could flood chat with blank messages');
  }

  // 8h. XSS attempt in message
  const r7 = await req('POST', `/api/chat/${bookingId}`, {
    sender: 'customer',
    senderName: '<script>alert("xss")</script>',
    text: '<img onerror="alert(1)" src="x">'
  });
  if (r7.ok && r7.data) {
    if (r7.data.text && r7.data.text.includes('<img')) {
      warn('XSS content stored raw in database', 'HTML/JS in chat messages is not sanitized server-side — relies on frontend escaping');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 9. CUSTOMER MANAGEMENT TESTS
// ─────────────────────────────────────────────────────────────
async function testCustomerManagement() {
  console.log('\n══════════════════════════════════════════════');
  console.log('9. CUSTOMER MANAGEMENT TESTS');
  console.log('══════════════════════════════════════════════');

  // 9a. Get all customers
  const r1 = await req('GET', '/api/customers');
  assert(r1.ok, 'GET /api/customers returns 200');
  assert(Array.isArray(r1.data), 'Customers response is an array');

  if (r1.data && r1.data.length) {
    // Check password stripped
    assert(!r1.data[0].password, 'Customer passwords NOT leaked in GET /api/customers');

    // 9b. Suspend a customer
    const custId = r1.data[0]._id;
    const r2 = await req('PATCH', `/api/customers/${custId}/status`, { status: 'suspended' });
    assert(r2.ok, 'Suspend customer works');
    assert(r2.data && r2.data.status === 'suspended', 'Customer status is "suspended"');

    // 9c. Reactivate
    const r3 = await req('PATCH', `/api/customers/${custId}/status`, { status: 'active' });
    assert(r3.ok, 'Reactivate customer works');

    // 9d. Invalid status
    const r4 = await req('PATCH', `/api/customers/${custId}/status`, { status: 'banned' });
    assert(r4.status === 400, 'Invalid customer status rejected', `Got ${r4.status}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 10. PROFILE UPDATE TESTS
// ─────────────────────────────────────────────────────────────
async function testProfileUpdates(customer) {
  console.log('\n══════════════════════════════════════════════');
  console.log('10. PROFILE UPDATE TESTS');
  console.log('══════════════════════════════════════════════');

  if (!customer) {
    console.log('  ⏭️ Skipping — no customer');
    return;
  }

  // 10a. Update customer profile
  const r1 = await req('PATCH', '/api/auth/profile', {
    userId: customer._id,
    name: 'Md. Mubassir',
    phone: '+880 1711 111 222',
    zone: 'Bashundhara'
  });
  assert(r1.ok, 'Profile update works');
  assert(r1.data && !r1.data.password, 'Profile response does NOT leak password');

  // 10b. Update with non-existent user
  const r2 = await req('PATCH', '/api/auth/profile', {
    userId: '000000000000000000000000',
    name: 'Ghost'
  });
  assert(r2.status === 404, 'Non-existent user profile update returns 404', `Got ${r2.status}`);
}

// ─────────────────────────────────────────────────────────────
// 11. SECURITY & EDGE CASE TESTS
// ─────────────────────────────────────────────────────────────
async function testSecurity() {
  console.log('\n══════════════════════════════════════════════');
  console.log('11. SECURITY & EDGE CASE TESTS');
  console.log('══════════════════════════════════════════════');

  // 11a. No authentication middleware — all routes are publicly accessible
  const r1 = await req('GET', '/api/bookings');
  assert(r1.ok, '[INFO] GET /api/bookings is publicly accessible (no auth middleware)');
  warn('No authentication middleware on API routes',
    'All CRUD operations (/api/bookings, /api/workers, /api/complaints, etc.) are publicly accessible without login tokens');

  // 11b. Check if worker passwords are exposed
  const r2 = await req('GET', '/api/workers');
  if (r2.data && r2.data.length) {
    const hasPassword = r2.data.some(w => w.password);
    if (hasPassword) {
      assert(false, 'Worker passwords are leaked in GET /api/workers', 'CRITICAL SECURITY BUG');
    } else {
      warn('Worker passwords not stripped server-side',
        'GET /api/workers does not use .select("-password") — passwords may leak if virtuals or lean() are used');
    }
  }

  // 11c. Test CORS headers
  try {
    const res = await fetch(`${BASE}/api/areas`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://evil-site.com' }
    });
    if (res.headers.get('access-control-allow-origin') === '*') {
      warn('CORS allows all origins (*)', 'Any website can make API calls — fine for dev but risky in production');
    }
  } catch (e) { /* skip */ }

  // 11d. Large payload test
  const bigText = 'A'.repeat(100000);
  const r3 = await req('POST', '/api/chat/BK-TEST-BIGMSG', {
    sender: 'customer',
    senderName: 'Test',
    text: bigText
  });
  if (r3.ok) {
    warn('100KB message accepted', 'No request body size limit — potential DoS vector');
  }

  // 11e. Provider status enum mismatch
  const r4 = await req('GET', '/api/workers');
  if (r4.data && r4.data.length) {
    const w = r4.data[0];
    // Try to set provider status to 'suspended' via suspend route
    const r5 = await req('PATCH', `/api/workers/${w._id}/suspend`, { status: 'suspended' });
    if (r5.ok) {
      warn('Provider suspend route accepts "suspended" but Provider model enum is [active, inactive]',
        'Schema-route mismatch may cause validation errors or silent data corruption');
      // Restore
      await req('PATCH', `/api/workers/${w._id}/status`, { status: 'active' });
    } else {
      assert(true, 'Provider suspend correctly fails due to schema enum mismatch');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 12. STATIC FILE SERVING TESTS
// ─────────────────────────────────────────────────────────────
async function testStaticFiles() {
  console.log('\n══════════════════════════════════════════════');
  console.log('12. STATIC FILE & FRONTEND TESTS');
  console.log('══════════════════════════════════════════════');

  // 12a. Index.html served
  const res1 = await fetch(`${BASE}/`);
  assert(res1.ok, 'Root URL serves index.html');
  const html = await res1.text();
  assert(html.includes('<!DOCTYPE html') || html.includes('<html'), 'Root returns valid HTML');

  // 12b. CSS served
  const res2 = await fetch(`${BASE}/style.css`);
  assert(res2.ok, 'style.css is served');

  // 12c. JS served
  const res3 = await fetch(`${BASE}/app.js`);
  assert(res3.ok, 'app.js is served');

  // 12d. .env should NOT be served
  const res4 = await fetch(`${BASE}/.env`);
  const envContent = await res4.text();
  if (res4.ok && envContent.includes('MONGO_URI')) {
    assert(false, '.env file is publicly accessible!', 'CRITICAL: Database credentials, API keys exposed to anyone!');
  } else if (res4.ok) {
    if (envContent.includes('<!DOCTYPE html')) {
      assert(true, '.env returns index.html via wildcard (not actual .env content)');
    } else {
      warn('.env returns 200 with unknown content', 'Check what is being served');
    }
  } else {
    assert(true, '.env is blocked (returns non-200)');
  }

  // 12e. server.js should NOT be served (contains DB credentials too)
  const res5 = await fetch(`${BASE}/server.js`);
  if (res5.ok) {
    const content = await res5.text();
    if (content.includes('mongoose') || content.includes('require(')) {
      warn('server.js is publicly accessible',
        'Backend source code including DB connection logic is exposed. Use a separate public/ directory.');
    }
  }

  // 12f. package.json should not be served
  const res6 = await fetch(`${BASE}/package.json`);
  if (res6.ok) {
    const content = await res6.text();
    if (content.includes('"dependencies"')) {
      warn('package.json is publicly accessible', 'Dependency list exposed — reveals tech stack to attackers');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// CLEANUP: Delete test data
// ─────────────────────────────────────────────────────────────
async function cleanup(bookingId) {
  console.log('\n──────────────────────────────────────────────');
  console.log('CLEANUP');
  console.log('──────────────────────────────────────────────');

  const allBookings = await req('GET', '/api/bookings');
  if (allBookings.data) {
    const testBookings = allBookings.data.filter(b => b.id && b.id.startsWith('BK-TEST'));
    for (const b of testBookings) {
      await req('PATCH', `/api/bookings/${b.id}/status`, { status: 'cancelled' });
    }
    console.log(`  Cancelled ${testBookings.length} test bookings`);
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN RUNNER
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('======================================================');
  console.log('   PROYOJON — COMPREHENSIVE BUG TEST SUITE');
  console.log('   Target: http://localhost:5050');
  console.log('======================================================');
  console.log(`\nStarted at: ${new Date().toLocaleString()}`);

  try {
    const ping = await fetch(`${BASE}/api/areas`).catch(() => null);
    if (!ping || !ping.ok) {
      console.error('\n  Cannot reach server at http://localhost:5050');
      console.error('   Make sure "node server.js" is running.');
      process.exit(1);
    }

    const customer = await testAuth();
    await testAreas();
    const workers = await testWorkers();
    const bookingId = await testBookings(customer, workers);
    await testComboBookings(customer, workers);
    await testReviews(customer, workers, bookingId);
    await testComplaints(customer, workers, bookingId);
    await testChat(bookingId);
    await testCustomerManagement();
    await testProfileUpdates(customer);
    await testSecurity();
    await testStaticFiles();
    await cleanup(bookingId);

  } catch (err) {
    console.error('\n  Test suite crashed:', err.message);
    console.error(err.stack);
  }

  // ─── FINAL REPORT ──────────────────────────────────────
  console.log('\n======================================================');
  console.log('             FINAL TEST REPORT');
  console.log('======================================================');
  console.log(`\n  Passed:   ${passed}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Warnings: ${warnings}`);
  console.log(`  Total:    ${passed + failed}`);
  console.log(`  Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (bugs.length) {
    console.log('\n------------------------------------------------------');
    console.log('  BUGS FOUND:');
    console.log('------------------------------------------------------');
    bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  }

  if (warningList.length) {
    console.log('\n------------------------------------------------------');
    console.log('  WARNINGS / POTENTIAL ISSUES:');
    console.log('------------------------------------------------------');
    warningList.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  }

  if (!bugs.length && !warningList.length) {
    console.log('\n  All tests passed with no warnings!');
  }

  console.log(`\nFinished at: ${new Date().toLocaleString()}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
