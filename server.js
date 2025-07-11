// Updated server.js with full admin and role-based permissions
require('dotenv').config({ path: '/etc/secrets/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// 👮 Admin Middleware
function requireAdmin(req, res, next) {
  if (req.user.username !== 'JohnE') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
}

// 🔌 MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('🧠 Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// 📋 Schemas & Models
const RecipeSchema = new mongoose.Schema({
  name: String,
  steps: [String],
  station: String
}, { timestamps: true });
const Recipe = mongoose.model('Recipe', RecipeSchema);

const WhiteboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  todayPrep: String,
  tomorrowPrep: String
}, { timestamps: true });
const Whiteboard = mongoose.model('Whiteboard', WhiteboardSchema);

const CleaningTaskSchema = new mongoose.Schema({
  title: String,
  description: String
}, { timestamps: true });
const CleaningTask = mongoose.model('CleaningTask', CleaningTaskSchema);

// 📝 Secure Register Route
app.post('/register', async (req, res) => {
  const { username, password, accessKey } = req.body;

  if (accessKey !== process.env.REGISTER_SECRET) {
    return res.status(403).json({ message: 'Unauthorized registration' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

const adminUsernames = ['JohnE', 'admin'];
const role = adminUsernames.includes(username) ? 'admin' : 'user';

const newUser = new User({ username, password, role }); // password stays raw
await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// 🔐 Secure Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// 📋 Recipe Routes
app.post('/recipes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, steps, station } = req.body;
    if (!name || !steps || !station) {
      return res.status(400).json({ message: 'Missing recipe fields (name, steps, station)' });
    }
    const recipe = new Recipe({ name, steps, station });
    await recipe.save();
    res.json({ message: 'Recipe saved to memory', recipe });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/recipes', authenticateToken, async (req, res) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/recipes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Recipe not found' });
    res.json({ message: 'Recipe deleted', deleted });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 🧠 Whiteboard Routes
app.get('/whiteboard', authenticateToken, async (req, res) => {
  try {
    const whiteboard = await Whiteboard.findOne().sort({ updatedAt: -1 });
    res.json(whiteboard || { todayPrep: '', tomorrowPrep: '' });
  } catch (err) {
    res.status(500).json({ message: 'Error loading whiteboard', error: err.message });
  }
});

app.post('/whiteboard', authenticateToken, async (req, res) => {
  try {
    const { todayPrep, tomorrowPrep } = req.body;
    if (typeof todayPrep !== 'string' || typeof tomorrowPrep !== 'string') {
      return res.status(400).json({ message: 'Invalid data: todayPrep and tomorrowPrep must be strings' });
    }
    const existing = await Whiteboard.findOne().sort({ updatedAt: -1 });
    if (existing) {
      existing.todayPrep = todayPrep;
      existing.tomorrowPrep = tomorrowPrep;
      await existing.save();
      res.json({ message: 'Whiteboard updated', whiteboard: existing });
    } else {
      const newBoard = new Whiteboard({ todayPrep, tomorrowPrep, userId: req.user.id });
      await newBoard.save();
      res.json({ message: 'Whiteboard created', whiteboard: newBoard });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error saving whiteboard', error: err.message });
  }
});

// 🧽 Cleaning Task Routes
app.post('/cleaning', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'Missing title or description' });
    }
    const task = new CleaningTask({ title, description });
    await task.save();
    res.json({ message: 'Cleaning task saved', task });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/cleaning', authenticateToken, async (req, res) => {
  try {
    const tasks = await CleaningTask.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/cleaning/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await CleaningTask.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Cleaning task not found' });
    res.json({ message: 'Cleaning task deleted', deleted });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
