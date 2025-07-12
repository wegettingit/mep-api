// models/CleaningTask.js
const mongoose = require('mongoose');

const CleaningTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  task: { type: String, required: true }, // Matched to screenshots
  assignedTo: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('CleaningTask', CleaningTaskSchema);