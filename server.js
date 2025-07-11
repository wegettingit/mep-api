require('dotenv').config({ path: '/etc/secrets/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 🔐 JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Incoming token:', token); // ✅ Log the token

  if (!token) return res.status(401).json({ message: 'Missing token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('⛔ Invalid token'); // ✅ Token failure
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// 🔌 MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('🧠 Connected to MongoDB Atlas'))
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

module.exports = mongoose.model('Whiteboard', WhiteboardSchema);

const CleaningTaskSchema = new mongoose.Schema({
  title: String,
  description: String
}, { timestamps: true });
const CleaningTask = mongoose.model('CleaningTask', CleaningTaskSchema);

// 🔐 Secure Login Route
app.post('/login', (req, res) => {
const User = require('./models/User'); 

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

});

// 📋 Recipe Routes
app.post('/recipes', authenticateToken, async (req, res) => {
  try {
    const { name, steps, station } = req.body;
    if (!name || !steps || !station) {
      return res.status(400).json({ message: 'Missing recipe fields (name, steps, station)' });
    }
    const recipe = new Recipe({ name, steps, station });
    await recipe.save();
    res.json({ message: 'Recipe saved to memory', recipe });
  } catch (err) {
    console.error('❌ Error saving recipe:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/recipes', authenticateToken, async (req, res) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (err) {
    console.error('❌ Error fetching recipes:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/recipes/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Recipe.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Recipe not found' });
    res.json({ message: 'Recipe deleted', deleted });
  } catch (err) {
    console.error('❌ Error deleting recipe:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 🧠 Whiteboard Routes
app.get('/whiteboard', authenticateToken, async (req, res) => {
  try {
    const whiteboard = await Whiteboard.findOne().sort({ updatedAt: -1 });
    res.json(whiteboard || { todayPrep: '', tomorrowPrep: '' });
  } catch (err) {
    console.error('❌ Error loading whiteboard:', err);
    res.status(500).json({ message: 'Error loading whiteboard', error: err.message });
  }
});

app.post('/whiteboard', authenticateToken, async (req, res) => {
  console.log('📥 Whiteboard POST received');
  console.log('📦 Full req.body:', req.body);
  console.log('📥 Incoming Whiteboard POST Body (outside try):', req.body);


  try {
    const { todayPrep, tomorrowPrep } = req.body;

    if (typeof todayPrep !== 'string' || typeof tomorrowPrep !== 'string') {
      console.warn('⚠️ Invalid types:', {
        todayPrepType: typeof todayPrep,
        tomorrowPrepType: typeof tomorrowPrep
      });
      return res.status(400).json({
        message: 'Invalid data: todayPrep and tomorrowPrep must be strings'
      });
    }

    const existing = await Whiteboard.findOne().sort({ updatedAt: -1 });

    if (existing) {
      existing.todayPrep = todayPrep;
      existing.tomorrowPrep = tomorrowPrep;
      await existing.save();
      res.json({ message: 'Whiteboard updated', whiteboard: existing });
    } else {
      const newBoard = new Whiteboard({ todayPrep, tomorrowPrep });
      await newBoard.save();
      res.json({ message: 'Whiteboard created', whiteboard: newBoard });
    }
  } catch (err) {
    console.error('❌ Error saving whiteboard:', err);
    res.status(500).json({ message: 'Error saving whiteboard', error: err.message });
  }
});


// 🔍 Optional Debug: Get All Whiteboards
app.get('/whiteboard/debug', async (req, res) => {
  const allBoards = await Whiteboard.find().sort({ updatedAt: -1 });
  res.json(allBoards);
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
    console.error('❌ Error saving cleaning task:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/cleaning', authenticateToken, async (req, res) => {
  try {
    const tasks = await CleaningTask.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error('❌ Error fetching cleaning tasks:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/cleaning/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await CleaningTask.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Cleaning task not found' });
    res.json({ message: 'Cleaning task deleted', deleted });
  } catch (err) {
    console.error('❌ Error deleting cleaning task:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
