const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ModeratorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'moderator' },
  assignedZone: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now }
});

ModeratorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

ModeratorSchema.methods.comparePassword = async function (candPassword) {
  return bcrypt.compare(candPassword, this.password);
};

module.exports = mongoose.model('Moderator', ModeratorSchema);
