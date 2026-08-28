// server.js  — Proyojon Backend (Node.js + Express + MongoDB)
// CONTENTS
// ───────────────────────────────────────────────────────────
//  1.  Dependencies & Imports .................... line  18
//  2.  App Config & Middleware ................... line  36
//  3.  Database Connection & Seeding ............. line  46
//  4.  Authentication Routes ..................... line 277
//  5.  Area Routes ............................... line 383
//  6.  Worker / Provider Routes .................. line 393
//  7.  Booking Routes ............................ line 473
//  8.  Service Routes ............................ line 688
//  9.  Gemini AI Chat Proxy ...................... line 698
// 10.  Chat Routes ............................... line 775
// 11.  Review Routes ............................. line 807
// 12.  Complaint Routes .......................... line 868
// 13.  Wildcard Fallback & Server Launch ......... line 985

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const Customer = require('./models/Customer');
const Provider = require('./models/Provider');
const Moderator = require('./models/Moderator');
const Booking = require('./models/Booking');
const Area = require('./models/Area');
const Service = require('./models/Service');
const Message = require('./models/Message');
const Review = require('./models/Review');
const Complaint = require('./models/Complaint');

const app = express();
const PORT = process.env.PORT || 5050;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/proyojon';
const FALLBACK_MONGO_URI = 'mongodb://127.0.0.1:27017/proyojon';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));// Serve frontend files directly

// ─── DATABASE CONNECTION & SEEDING ─────────────────────────────────────────────

async function connectDatabase() {
  const connectionTargets = [MONGO_URI];

  if (MONGO_URI !== FALLBACK_MONGO_URI) {
    connectionTargets.push(FALLBACK_MONGO_URI);
  }

  for (const uri of connectionTargets) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      console.log(` Connected to MongoDB at ${uri.startsWith('mongodb+srv://') ? 'Atlas' : 'local MongoDB'}`);
      return true;
    } catch (err) {
      console.error(` MongoDB connection failed for ${uri.startsWith('mongodb+srv://') ? 'Atlas' : 'local MongoDB'}:`, err.message);
    }
  }

  return false;
}

connectDatabase().then((connected) => {
  if (connected) {
    seedDatabase();
  } else {
    console.warn(' Server started without a database connection. Fix MongoDB access to enable data-backed routes.');
  }
});

async function seedDatabase() {
  try {
    // 1. Seed Areas
    const areaCount = await Area.countDocuments();
    if (areaCount === 0) {
      const AREAS = [
        { id: 'area_gulshan', name: 'Gulshan', isRestricted: false, postalCode: '1212', description: 'Upscale residential & commercial hub' },
        { id: 'area_banani', name: 'Banani', isRestricted: false, postalCode: '1213', description: 'Vibrant neighborhood with dining and shopping' },
        { id: 'area_dhanmondi', name: 'Dhanmondi', isRestricted: false, postalCode: '1209', description: 'Cultural and educational residential hub' },
        { id: 'area_bashundhara', name: 'Bashundhara', isRestricted: true, postalCode: '1229', description: 'Highly secure private residential area' },
        { id: 'area_mirpur', name: 'Mirpur', isRestricted: false, postalCode: '1216', description: 'Densely populated residential neighborhood' },
        { id: 'area_uttara', name: 'Uttara', isRestricted: false, postalCode: '1230', description: 'Well-planned residential suburb near airport' },
        { id: 'area_dohs', name: 'DOHS', isRestricted: true, postalCode: '1206', description: 'Secure military housing society' },
        { id: 'area_cantonment', name: 'Cantonment', isRestricted: true, postalCode: '1206', description: 'Highly secure restricted military area' }
      ];
      await Area.insertMany(AREAS);
      console.log('🌱 Seeded Area database');
    }

    // 2. Seed Default Users across separate collections
    const customerCount = await Customer.countDocuments();
    const providerCount = await Provider.countDocuments();
    const moderatorCount = await Moderator.countDocuments();

    if (customerCount === 0 && providerCount === 0 && moderatorCount === 0) {
      // Customer Seed
      const cust = new Customer({
        name: 'Md. Mubassir',
        email: 'customer@proyojon.com',
        password: 'password',
        role: 'customer',
        phone: '+880 1711 111 222',
        zone: 'Bashundhara',
        totalSpent: 0
      });
      await cust.save();

      // Moderator Seed
      const mod = new Moderator({
        name: 'Dr. Md Adnan Arefeen',
        email: 'admin@proyojon.com',
        password: 'password',
        role: 'moderator',
        assignedZone: 'Gulshan'
      });
      await mod.save();

      // Providers Seed
      const SEED_PROVIDERS = [
        {
          name: 'Karim Hossain',
          email: 'karim@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1533 461 586',
          serviceCategory: 'AC Technician',
          skill: 'AC Technician',
          verificationDocument: 'nid_karim.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Bashundhara', 'Gulshan'],
          zone: 'Bashundhara',
          area: 'Bashundhara',
          color: 'bg-red-500',
          initials: 'KH',
          status: 'active',
          avgRating: 4.9,
          completedCount: 12
        },
        {
          name: 'Rahim Mia',
          email: 'rahim@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1711 999 888',
          serviceCategory: 'Plumber',
          skill: 'Plumber',
          verificationDocument: 'nid_rahim.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Banani', 'Gulshan'],
          zone: 'Banani',
          area: 'Banani',
          color: 'bg-teal-500',
          initials: 'RM',
          status: 'active',
          avgRating: 4.7,
          completedCount: 8
        },
        {
          name: 'Nayan Das',
          email: 'nayan@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1811 777 666',
          serviceCategory: 'Electrician',
          skill: 'Electrician',
          verificationDocument: 'nid_nayan.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Dhanmondi'],
          zone: 'Dhanmondi',
          area: 'Dhanmondi',
          color: 'bg-yellow-500',
          initials: 'ND',
          status: 'active',
          avgRating: 4.8,
          completedCount: 15
        },
        {
          name: 'Sumi Akter',
          email: 'sumi@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1911 555 444',
          serviceCategory: 'Cleaning Expert',
          skill: 'Cleaning Expert',
          verificationDocument: 'nid_sumi.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Gulshan', 'Banani'],
          zone: 'Gulshan',
          area: 'Gulshan',
          color: 'bg-pink-500',
          initials: 'SA',
          status: 'active',
          avgRating: 4.9,
          completedCount: 22
        },
        {
          name: 'Niloy Barua',
          email: 'niloy@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1611 333 222',
          serviceCategory: 'Painter',
          skill: 'Painter',
          verificationDocument: 'nid_niloy.pdf',
          verifiedStatus: 'Verified',
          coverageZones: ['Mirpur', 'Uttara'],
          zone: 'Mirpur',
          area: 'Mirpur',
          color: 'bg-indigo-500',
          initials: 'NB',
          status: 'active',
          avgRating: 4.6,
          completedCount: 4
        },
        {
          name: 'Navid Hasan',
          email: 'navid@proyojon.com',
          password: 'password',
          role: 'provider',
          phone: '+880 1511 222 111',
          serviceCategory: 'Moving Specialist',
          skill: 'Moving Specialist',
          verificationDocument: 'nid_navid.pdf',
          verifiedStatus: 'Pending',
          coverageZones: ['Mirpur'],
          zone: 'Mirpur',
          area: 'Mirpur',
          color: 'bg-green-600',
          initials: 'NH',
          status: 'active',
          avgRating: 4.5,
          completedCount: 0
        }
      ];

      for (const p of SEED_PROVIDERS) {
        const newProv = new Provider(p);
        await newProv.save();
      }

      console.log('🌱 Seeded role-specific collections in Atlas database');
    }

    // 3. Seed Services
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      const SERVICES = [
        { id: 1, name: 'AC Installation & Service', price: 800, cat: 'ac', icon: '❄️', rating: 4.9, desc: 'Full AC servicing, gas refilling, installation & repair.' },
        { id: 2, name: 'Deep Home Cleaning', price: 1200, cat: 'clean', icon: '🧹', rating: 4.8, desc: 'Top-to-bottom professional home deep clean.' },
        { id: 3, name: 'Plumbing Repair', price: 500, cat: 'plumb', icon: '🔧', rating: 4.7, desc: 'Leak fixes, pipe fitting, drainage unclogging.' },
        { id: 4, name: 'Electrical Wiring', price: 600, cat: 'elect', icon: '⚡', rating: 4.8, desc: 'Safe wiring, socket installation, load upgrades.' },
        { id: 5, name: 'Wall Painting', price: 3500, cat: 'paint', icon: '🎨', rating: 4.9, desc: 'Interior & exterior painting, premium finishes.' },
        { id: 6, name: 'Pest Control', price: 900, cat: 'pest', icon: '🐛', rating: 4.6, desc: 'Chemical-free & conventional pest elimination.' },
        { id: 7, name: 'Water Tank Cleaning', price: 700, cat: 'water', icon: '💧', rating: 4.7, desc: 'Rooftop & underground tank hygiene service.' },
        { id: 8, name: 'Fridge & Appliance Repair', price: 1000, cat: 'appliance', icon: '🛠️', rating: 4.7, desc: 'All brands, fridge, washing machine, oven.' },
        { id: 9, name: 'Wood Furniture Fix', price: 1500, cat: 'carpentry', icon: '🪚', rating: 4.8, desc: 'Repair, polish & custom carpentry work.' },
        { id: 10, name: 'Laundry Service', price: 400, cat: 'laundry', icon: '👕', rating: 4.5, desc: 'Wash, dry & fold same-day laundry service.' },
        { id: 11, name: 'House Shifting', price: 3000, cat: 'moving', icon: '🚚', rating: 4.6, desc: 'Full packing, moving & unpacking service.' },
        { id: 12, name: 'CCTV Installation', price: 2500, cat: 'security', icon: '🔒', rating: 4.8, desc: 'HD camera setup, NVR configuration & testing.' },
        { id: 13, name: 'WiFi & IT Setup', price: 800, cat: 'it', icon: '💻', rating: 4.7, desc: 'Router config, networking, smart home setup.' },
      ];
      await Service.insertMany(SERVICES);
      console.log(' Seeded Service database in Atlas');
    }
  } catch (err) {
    console.error(' Seeding Database failed:', err);
  }
}

// ─── API ROUTES ────────────────────────────────────────────────────────────────

// 1. Authentication

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, zone, assignedZone, serviceCategory, verificationDocument, coverageZones, color, initials } = req.body;

    // Check duplicate emails across all three collections
    const existsCustomer = await Customer.findOne({ email: email.toLowerCase() });
    const existsProvider = await Provider.findOne({ email: email.toLowerCase() });
    const existsModerator = await Moderator.findOne({ email: email.toLowerCase() });

    if (existsCustomer || existsProvider || existsModerator) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    let newUser;
    if (role === 'customer') {
      newUser = new Customer({ name, email, password, role, phone, zone, totalSpent: 0 });
    } else if (role === 'moderator') {
      newUser = new Moderator({ name, email, password, role, assignedZone });
    } else if (role === 'provider') {
      newUser = new Provider({
        name, email, password, role, phone,
        serviceCategory, skill: serviceCategory,
        verificationDocument, coverageZones,
        zone: coverageZones[0] || 'Gulshan',
        area: coverageZones[0] || 'Gulshan',
        color, initials, status: 'active',
        avgRating: 4.5, completedCount: 0, verifiedStatus: 'Pending'
      });
    } else {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    await newUser.save();

    const returnedUser = newUser.toObject();
    delete returnedUser.password;

    res.status(201).json(returnedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let user;
    if (role === 'customer') {
      user = await Customer.findOne({ email: email.toLowerCase() });
    } else if (role === 'provider') {
      user = await Provider.findOne({ email: email.toLowerCase() });
    } else if (role === 'moderator') {
      user = await Moderator.findOne({ email: email.toLowerCase() });
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!user) {
      return res.status(400).json({ error: 'No account found with this email' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    const returnedUser = user.toObject();
    delete returnedUser.password;

    res.json(returnedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Save Profile changes
app.patch('/api/auth/profile', async (req, res) => {
  try {
    const { userId, name, phone, zone } = req.body;

    let updated = await Customer.findByIdAndUpdate(userId, { name, phone, zone }, { new: true });
    if (!updated) {
      updated = await Provider.findByIdAndUpdate(userId, { name, phone, zone }, { new: true });
    }
    if (!updated) {
      updated = await Moderator.findByIdAndUpdate(userId, { name, phone }, { new: true });
    }

    if (!updated) return res.status(404).json({ error: 'User not found' });

    const returnedUser = updated.toObject();
    delete returnedUser.password;
    res.json(returnedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// 2. Areas
app.get('/api/areas', async (req, res) => {
  try {
    const areas = await Area.find();
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve areas' });
  }
});

// 3. Workers
app.get('/api/workers', async (req, res) => {
  try {
    const workers = await Provider.find();
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve workers' });
  }
});

// Verification status
app.patch('/api/workers/:id/verify', async (req, res) => {
  try {
    const { status } = req.body;
    const worker = await Provider.findByIdAndUpdate(
      req.params.id,
      { verifiedStatus: status },
      { new: true }
    );
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify worker' });
  }
});

// Active status toggle
app.patch('/api/workers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const worker = await Provider.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// Remove worker
app.delete('/api/workers/:id', async (req, res) => {
  try {
    const removed = await Provider.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Worker not found' });
    res.json({ message: 'Worker removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove worker' });
  }
});

// Worker self-profile update (name, phone, skill, zones)
app.patch('/api/workers/:id/profile', async (req, res) => {
  try {
    const { name, phone, serviceCategory, coverageZones } = req.body;
    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (serviceCategory) { updateFields.serviceCategory = serviceCategory; updateFields.skill = serviceCategory; }
    if (coverageZones) { updateFields.coverageZones = coverageZones; updateFields.zone = coverageZones[0] || ''; }
    if (name) updateFields.initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const worker = await Provider.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const returned = worker.toObject();
    delete returned.password;
    res.json(returned);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// 4. Bookings

// List all (Moderator)
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bookings' });
  }
});

// List bookings for specific user
app.get('/api/bookings/user/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Build query based on user type
    const provider = await Provider.findById(id);
    let query = {};
    if (provider) {
      // Provider sees bookings where they are assigned (either field, or in a combo assignment slot)
      query = { $or: [{ providerId: id }, { assignedWorkerId: id }, { 'comboAssignments.providerId': id }] };
    } else {
      // Customer sees their own bookings
      query = { $or: [{ userId: id }, { customerId: id }] };
    }

    const bookings = await Booking.find(query);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user bookings' });
  }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { id, userId, userName, items, total, isComboBooking, comboId, comboAssignments, deliveryAddress, deliveryZone, location, scheduledFor } = req.body;

    let scheduledDate = null;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate < new Date()) {
        return res.status(400).json({ error: 'Scheduled time must be a valid date in the future' });
      }
    } else {
      return res.status(400).json({ error: 'Please select a date and time for your service' });
    }

    const bookingData = {
      id,
      userId,
      userName,
      items,
      total,
      status: 'pending',
      scheduledFor: scheduledDate,
      deliveryAddress: deliveryAddress || '',
      deliveryZone: deliveryZone || '',
      location: location || { lat: 23.7925, lng: 90.4078 }
    };
    if (isComboBooking) {
      bookingData.isComboBooking = true;
      bookingData.comboId = comboId || '';
      bookingData.comboAssignments = comboAssignments || [];
    }
    const newBooking = new Booking(bookingData);
    await newBooking.save();
    res.status(201).json(newBooking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking status
app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { id: req.params.id },
      { status },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (status === 'done') {
      if (booking.providerId) {
        await Provider.findByIdAndUpdate(booking.providerId, { $inc: { completedCount: 1 } });
      }
      await Customer.findByIdAndUpdate(booking.userId, { $inc: { totalSpent: booking.total } });
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Assign worker (single — for non-combo bookings)
app.patch('/api/bookings/:id/assign', async (req, res) => {
  try {
    const { providerId } = req.body;
    const status = providerId ? 'confirmed' : 'pending';

    // Look up worker name and customer name to store in booking for chat display
    let workerName = '';
    let customerName = '';
    let assignedWorkerId = providerId || '';
    let customerId = '';

    if (providerId) {
      const worker = await Provider.findById(providerId);
      if (worker) workerName = worker.name;
    }

    // Find the existing booking to get userId
    const existingBooking = await Booking.findOne({ id: req.params.id });
    if (!existingBooking) return res.status(404).json({ error: 'Booking not found' });
    if (existingBooking.isComboBooking) {
      return res.status(400).json({ error: 'Use /assign-combo for combo bookings' });
    }
    if (existingBooking.userId) {
      customerId = existingBooking.userId;
      const customer = await Customer.findById(existingBooking.userId);
      if (customer) customerName = customer.name;
      else customerName = existingBooking.userName || '';
    }

    const booking = await Booking.findOneAndUpdate(
      { id: req.params.id },
      { providerId, assignedWorkerId, workerName, customerId, customerName, status },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign worker' });
  }
});

// Assign providers to a combo booking (one provider per service slot)
app.patch('/api/bookings/:id/assign-combo', async (req, res) => {
  try {
    const { serviceIdx, providerId } = req.body;  // serviceIdx: 0 or 1
    if (serviceIdx === undefined || !providerId) {
      return res.status(400).json({ error: 'serviceIdx and providerId required' });
    }

    const existingBooking = await Booking.findOne({ id: req.params.id });
    if (!existingBooking) return res.status(404).json({ error: 'Booking not found' });
    if (!existingBooking.isComboBooking) {
      return res.status(400).json({ error: 'This booking is not a combo booking' });
    }

    const worker = await Provider.findById(providerId);
    if (!worker) return res.status(404).json({ error: 'Provider not found' });

    // Update the specific slot in comboAssignments
    const assignments = existingBooking.comboAssignments.map(a => a.toObject ? a.toObject() : a);
    const slot = assignments.find(a => a.serviceIdx === serviceIdx);
    if (slot) {
      slot.providerId = providerId;
      slot.providerName = worker.name;
    } else {
      assignments.push({ serviceIdx, providerId, providerName: worker.name });
    }

    // Mark booking confirmed. Do NOT mark 'approved' yet — providers must complete the work first.
    const newStatus = 'confirmed';

    // For backwards-compat: store first assigned provider in top-level fields too
    const firstAssignment = assignments.find(a => a.providerId);
    const updateData = {
      comboAssignments: assignments,
      status: newStatus,
      providerId: firstAssignment ? firstAssignment.providerId : existingBooking.providerId,
      workerName: assignments.map(a => a.providerName).filter(Boolean).join(' + ') || existingBooking.workerName,
    };

    // Resolve customer name if not yet set
    if (!existingBooking.customerId && existingBooking.userId) {
      const customer = await Customer.findById(existingBooking.userId);
      if (customer) {
        updateData.customerId = existingBooking.userId;
        updateData.customerName = customer.name;
      }
    }

    const updated = await Booking.findOneAndUpdate(
      { id: req.params.id }, updateData, { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign combo providers' });
  }
});

// Combo Booking: Provider marks their specific slot as completed
app.patch('/api/bookings/:id/complete-slot', async (req, res) => {
  try {
    const { providerId } = req.body;
    if (!providerId) return res.status(400).json({ error: 'providerId required' });

    const booking = await Booking.findOne({ id: req.params.id });
    if (!booking || !booking.isComboBooking) {
      return res.status(404).json({ error: 'Combo booking not found' });
    }

    const assignments = booking.comboAssignments.map(a => a.toObject ? a.toObject() : a);
    const slot = assignments.find(a => a.providerId === providerId);
    if (!slot) return res.status(404).json({ error: 'Provider not assigned to this combo' });

    slot.completed = true;

    // Check if ALL assigned slots are completed
    const allCompleted = assignments.every(a => a.completed);

    // If all completed, update booking status to 'approved' (awaiting customer confirmation)
    const updateData = { comboAssignments: assignments };
    if (allCompleted) {
      updateData.status = 'approved';
    }

    const updated = await Booking.findOneAndUpdate(
      { id: req.params.id }, updateData, { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark combo slot as complete' });
  }
});

// 5. Services
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
});

// 9. Gemini AI Chat Proxy — keeps API key secure on the server
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'paste_gemini_api_key_here') {
      return res.status(500).json({ error: 'Gemini API key not configured in .env' });
    }

    const AI_SYSTEM_PROMPT = `You are Proyojon AI, the smart virtual assistant for "Proyojon" (প্রয়োজন), Dhaka's premier home services marketplace.
Your goal is to help users find services, learn about pricing, check coverage zones, and guide them on how to book.

Here are the key details about Proyojon:
1. Services Offered & Pricing:
   - AC Installation & Service: 800৳ (Full servicing, gas refilling, repair)
   - Deep Home Cleaning: 1200৳ (Top-to-bottom deep clean)
   - Plumbing Repair: 500৳ (Leaks, pipe fitting, unclogging)
   - Electrical Wiring: 600৳ (Safe wiring, socket install)
   - Wall Painting: 3500৳ (Interior & exterior painting)
   - Pest Control: 900৳ (Chemical-free & conventional)
   - Water Tank Cleaning: 700৳ (Rooftop & underground)
   - Fridge & Appliance Repair: 1000৳ (Fridges, washing machines, ovens)
   - Wood Furniture Fix: 1500৳ (Repair, polish, custom carpentry)
   - Laundry Service: 400৳ (Wash, dry, fold same-day)
   - House Shifting: 3000৳ (Packing, moving, unpacking)
   - CCTV Installation: 2500৳ (HD camera setup, NVR config)
   - WiFi & IT Setup: 800৳ (Router, networking, smart home)

2. Coverage Zones: Gulshan, Banani, Dhanmondi, Bashundhara, Mirpur, Uttara.

3. How to Book: Go to "Marketplace" tab, click "Add" on any service card, open Cart, click "Order Confirmed".

4. Platform Features: 25+ years of excellence, 50,000+ homes restored, 100% verified artisans.

Guidance: Keep answers helpful, friendly, and concise (1-3 sentences). Do not mention API details or internal configs.`;

    // Build Gemini contents array from history
    const contents = [];
    (history || []).forEach(h => {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    });
    contents.push({ role: 'user', parts: [{ text: message }] });

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errData = await geminiResponse.json();
      return res.status(geminiResponse.status).json({ error: errData?.error?.message || 'Gemini API error' });
    }

    const data = await geminiResponse.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    res.json({ reply });

  } catch (err) {
    console.error('AI Chat error:', err);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});



// 10. Chat Routes

// GET  /api/chat/:bookingId — fetch all messages for a booking
app.get('/api/chat/:bookingId', async (req, res) => {
  try {
    const messages = await Message.find({ bookingId: req.params.bookingId })
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/chat/:bookingId — save a new message
app.post('/api/chat/:bookingId', async (req, res) => {
  try {
    const { sender, senderName, text } = req.body;
    if (!sender || !senderName || !text) {
      return res.status(400).json({ error: 'sender, senderName and text are required' });
    }
    const msg = await Message.create({
      bookingId: req.params.bookingId,
      sender,
      senderName,
      text: text.trim()
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// 11. Review Routes

// GET /api/reviews — all reviews (for Story page)
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(50);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/booking/:bookingId — reviews for a specific booking
app.get('/api/reviews/booking/:bookingId', async (req, res) => {
  try {
    const reviews = await Review.find({ bookingId: req.params.bookingId });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking reviews' });
  }
});

// POST /api/reviews — submit a new review
app.post('/api/reviews', async (req, res) => {
  try {
    const { bookingId, customerId, customerName, providerId, providerName,
      serviceNames, rating, comment, role, reviewerName, reviewerRole } = req.body;

    if (!bookingId || !customerId || !rating || !comment || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Prevent duplicate: one review per role per booking
    const existing = await Review.findOne({ bookingId, customerId, role });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this booking' });
    }

    const review = await Review.create({
      bookingId,
      customerId,
      customerName: customerName || 'Customer',
      providerId: providerId || '',
      providerName: providerName || '',
      serviceNames: serviceNames || '',
      rating,
      comment,
      role,
      reviewerName: reviewerName || customerName || providerName || 'Anonymous',
      reviewerRole: reviewerRole || role
    });

    // If it's a customer review, update the provider's avgRating
    if (role === 'customer' && providerId && mongoose.Types.ObjectId.isValid(providerId)) {
      const allProviderReviews = await Review.find({ providerId, role: 'customer' });
      if (allProviderReviews.length > 0) {
        const avg = allProviderReviews.reduce((s, r) => s + r.rating, 0) / allProviderReviews.length;
        await Provider.findByIdAndUpdate(providerId, { avgRating: Math.round(avg * 10) / 10 });
      }
    }

    res.status(201).json(review);
  } catch (err) {
    console.error('Review submit error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// 13. Complaint Routes

// POST /api/complaints — file a new complaint
app.post('/api/complaints', async (req, res) => {
  try {
    const { bookingId, complainantId, complainantRole, complainantName,
      againstId, againstName, againstRole, serviceName, category, description } = req.body;
    if (!bookingId || !complainantId || !category || !description) {
      return res.status(400).json({ error: 'bookingId, complainantId, category and description are required' });
    }
    // Prevent duplicate complaint for same booking by same person
    const existing = await Complaint.findOne({ bookingId, complainantId });
    if (existing) {
      return res.status(409).json({ error: 'You have already filed a complaint for this booking' });
    }
    const complaint = await Complaint.create({
      bookingId, complainantId, complainantRole, complainantName,
      againstId, againstName, againstRole, serviceName, category, description
    });
    res.status(201).json(complaint);
  } catch (err) {
    console.error('Complaint create error:', err);
    res.status(500).json({ error: 'Failed to file complaint' });
  }
});

// GET /api/complaints/user/:id — complaints filed BY this user
app.get('/api/complaints/user/:id', async (req, res) => {
  try {
    const complaints = await Complaint.find({ complainantId: req.params.id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/against/:id — complaints filed AGAINST this user
app.get('/api/complaints/against/:id', async (req, res) => {
  try {
    const complaints = await Complaint.find({ againstId: req.params.id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints — moderator: all complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// PATCH /api/complaints/:id/status — moderator updates status
app.patch('/api/complaints/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
});

// GET /api/customers — moderator: all customers
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find().select('-password').sort({ joinedAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// PATCH /api/customers/:id/status — moderator suspends / reactivates a customer
app.patch('/api/customers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const customer = await Customer.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).select('-password');
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer status' });
  }
});

// PATCH /api/workers/:id/suspend — moderator suspends / reactivates a provider (alias for status route)
app.patch('/api/workers/:id/suspend', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const worker = await Provider.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).select('-password');
    if (!worker) return res.status(404).json({ error: 'Provider not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update provider status' });
  }
});

// 13. Wildcard fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Launch server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
