const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  items: [
    {
      id: mongoose.Schema.Types.Mixed,
      name: String,
      price: Number,
      cat: String,
      icon: String,
      desc: String
    }
  ],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'approved', 'done', 'cancelled'],
    default: 'pending'
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  providerId: {
    type: String,
    default: ''
  },
  assignedWorkerId: {
    type: String,
    default: ''
  },
  workerName: {
    type: String,
    default: ''
  },
  customerId: {
    type: String,
    default: ''
  },
  customerName: {
    type: String,
    default: ''
  },


  // Combo booking support — 2 providers assigned to 2 services
  isComboBooking: {
    type: Boolean,
    default: false
  },
  comboId: {
    type: String,
    default: ''
  },
  comboAssignments: [
    {
      serviceIdx: Number,
      serviceName: String,
      serviceCategory: String,
      providerId: { type: String, default: '' },
      providerName: { type: String, default: '' },
      completed: { type: Boolean, default: false }
    }
  ],
  // Delivery Location & Auto GPS details
  deliveryAddress: {
    type: String,
    default: ''
  },
  deliveryZone: {
    type: String,
    default: ''
  },
  location: {
    lat: { type: Number, default: 23.7925 },
    lng: { type: Number, default: 90.4078 }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', BookingSchema);
