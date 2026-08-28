const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  cat: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 4.5
  },
  desc: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('Service', ServiceSchema);
