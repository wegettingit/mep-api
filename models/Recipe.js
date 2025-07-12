// models/Recipe.js
const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  steps: { type: String, required: true }, // Changed to String for multi-line/markdown
  station: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Recipe', RecipeSchema);