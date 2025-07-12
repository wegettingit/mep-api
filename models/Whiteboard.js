// models/Whiteboard.js
const mongoose = require('mongoose');

const WhiteboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  todayPrep: { type: String, default: '' },
  tomorrowPrep: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Whiteboard', WhiteboardSchema);