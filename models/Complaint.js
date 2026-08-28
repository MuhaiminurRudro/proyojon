// models/Complaint.js — Proyojon Complaint Schema
const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  bookingId      : { type: String, required: true, index: true },
  complainantId  : { type: String, required: true },
  complainantRole: { type: String, required: true },  // 'customer' | 'provider'
  complainantName: { type: String, required: true },
  againstId      : { type: String, required: true },
  againstName    : { type: String, required: true },
  againstRole    : { type: String, required: true },  // 'customer' | 'provider'
  serviceName    : { type: String, default: '' },
  category       : { type: String, required: true },
  description    : { type: String, required: true },
  status         : { type: String, default: 'open' }, // 'open' | 'reviewed' | 'resolved'
  createdAt      : { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
