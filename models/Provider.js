const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ProviderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'provider' },
  phone: { type: String, default: '' },
  serviceCategory: { type: String, default: '' },
  skill: { type: String, default: '' },
  verificationDocument: { type: String, default: '' },
  verifiedStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
  coverageZones: { type: [String], default: [] },
  zone: { type: String, default: '' },
  area: { type: String, default: '' },
  color: { type: String, default: 'bg-dark' },
  initials: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  avgRating: { type: Number, default: 4.5 },
  completedCount: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now }
});

ProviderSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

ProviderSchema.methods.comparePassword = async function (candPassword) {
  return bcrypt.compare(candPassword, this.password);
};

module.exports = mongoose.model('Provider', ProviderSchema);
