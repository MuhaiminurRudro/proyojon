const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true
  },
  customerId: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  providerId: {
    type: String,
    default: ''
  },
  providerName: {
    type: String,
    default: ''
  },
  serviceNames: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    maxlength: 500
  },
  // 'customer' = customer reviewed the service/worker
  // 'provider' = provider reviewed the experience
  role: {
    type: String,
    enum: ['customer', 'provider'],
    required: true
  },
  reviewerName: {
    type: String,
    required: true
  },
  reviewerRole: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Review', ReviewSchema);
