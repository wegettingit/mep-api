// server.js
require('dotenv').config({ path: '/etc/secrets/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const User = require('./models/User');
const Recipe = require('./models/Recipe');
const Whiteboard = require('./models/Whiteboard');
const CleaningTask = require('./models/CleaningTask');
const AccessRequest = require('./models/AccessRequest');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('🧠 Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Register Route
app.post('/register', async (req, res) => {
  const { username, password, accessKey, station } = req.body;

  if (accessKey !== process.env.REGISTER_SECRET) {
    return res.status(403).json({ message: 'Unauthorized registration' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(409).json({ message: 'Username already exists' });

    const adminUsernames = ['JohnE', 'admin'];
    const role = adminUsernames.includes(username) ? 'admin' : 'user';

    const newUser = new User({ username, password, role, station });
    await newUser.save(); // Hook hashes password

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, station: user.station },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, station: user.station });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

// Recipe Routes
app.post('/recipes', authenticateToken, async (req, res) => {
  try {
    console.log('JohnE:', req.user.id);

    const { name, steps, station } = req.body;
    if (!name || !steps || !station) return res.status(400).json({ message: 'Missing fields' });

    const recipe = new Recipe({ userId: req.user.id, name, steps, station });
    await recipe.save();
    res.json({ message: 'Recipe saved', recipe });
  } catch (err) {
    res.status(500).json({ message: 'Error saving recipe', error: err.message });
  }
});

app.get('/recipes', authenticateToken, async (req, res) => {
  try {
    const recipes = await Recipe.find(); // Shows ALL recipes
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching recipes', error: err.message });
  }
});


app.delete('/recipes/:id', authenticateToken, async (req, res) => {
  const ADMIN_ID = 'JohnE';

  try {
    if (req.user.id !== ADMIN_ID) {
      return res.status(403).json({ message: 'Only the admin can delete recipes' });
    }

    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Recipe not found' });

    res.json({ message: 'Recipe deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting recipe', error: err.message });
  }
});


// Whiteboard Routes
app.get('/whiteboard', authenticateToken, async (req, res) => {
  try {
    const whiteboard = await Whiteboard.findOne({ userId: req.user.id });
    res.json(whiteboard || { todayPrep: '', tomorrowPrep: '' });
  } catch (err) {
    res.status(500).json({ message: 'Error loading whiteboard', error: err.message });
  }
});

app.post('/whiteboard', authenticateToken, async (req, res) => {
  try {
    const { todayPrep, tomorrowPrep } = req.body;
    if (typeof todayPrep !== 'string' || typeof tomorrowPrep !== 'string') {
      return res.status(400).json({ message: 'Invalid data: must be strings' });
    }

    const updated = await Whiteboard.findOneAndUpdate(
      { userId: req.user.id },
      { todayPrep, tomorrowPrep },
      { upsert: true, new: true }
    );
    res.json({ message: 'Whiteboard saved', whiteboard: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error saving whiteboard', error: err.message });
  }
});

// Cleaning Task Routes
app.post('/cleaning', authenticateToken, async (req, res) => {
  try {
    const { task, assignedTo } = req.body;
    if (!task || !assignedTo) return res.status(400).json({ message: 'Missing fields' });

    const cleaningTask = new CleaningTask({ userId: req.user.id, task, assignedTo });
    await cleaningTask.save();
    res.json({ message: 'Cleaning task saved', task: cleaningTask });
  } catch (err) {
    res.status(500).json({ message: 'Error saving task', error: err.message });
  }
});

app.get('/cleaning', authenticateToken, async (req, res) => {
  try {
    const tasks = await CleaningTask.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tasks', error: err.message });
  }
});

app.post('/request-access', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newRequest = new AccessRequest({ name, email, message });
    await newRequest.save();

    res.json({ message: 'Access request received. We’ll be in touch soon.' });
  } catch (err) {
    res.status(500).json({ message: 'Error saving request', error: err.message });
  }
});

app.delete('/cleaning/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await CleaningTask.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting task', error: err.message });
  }
});

//  Random Chef Quote
app.get('/quote', (req, res) => {
  const quotes = [
    "Keep your station tight, your mind tighter. – Anonymous Chef",
    "You don’t rise to the occasion. You fall to your level of preparation. – Archilochus (and every chef ever)",
    "Sharp knife, clear mind.",
    "Mise en place is a way of life, not a checklist.",
    "Clean as you go or cry when you don't.",
    "Burned once, learn twice.",
    "Calm is contagious. So is chaos.",
    "We prep in peace so we don’t bleed in service.",
    "The board is your battlefield. Don’t show up unarmed.",
    "Sweat in prep so you don’t bleed on the line."
  ];

  const random = quotes[Math.floor(Math.random() * quotes.length)];
  res.json({ quote: random });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
