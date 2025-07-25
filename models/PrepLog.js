const mongoose = require('mongoose');

const PrepLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  items: [
    {
      name: { type: String, required: true },
      qty: { type: Number, required: true },
      note: { type: String, default: '' }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('PrepLog', PrepLogSchema);