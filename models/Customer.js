const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'customer' },
  phone: { type: String, default: '' },
  zone: { type: String, default: 'Gulshan' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  totalSpent: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now }
});

CustomerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

CustomerSchema.methods.comparePassword = async function (candPassword) {
  return bcrypt.compare(candPassword, this.password);
};

module.exports = mongoose.model('Customer', CustomerSchema);
