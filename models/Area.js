const mongoose = require('mongoose');

const AreaSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  isRestricted: {
    type: Boolean,
    default: false
  },
  postalCode: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('Area', AreaSchema);
