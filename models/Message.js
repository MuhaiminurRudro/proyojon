// models/Message.js — Proyojon Chat Message Schema
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  bookingId  : { type: String, required: true, index: true },
  sender     : { type: String, required: true },   // 'customer' | 'provider'
  senderName : { type: String, required: true },
  text       : { type: String, required: true },
  createdAt  : { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
