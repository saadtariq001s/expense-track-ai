// File: app.js
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Expense Schema
const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  category: { type: String },
  rawCategory: { type: String } // Original category before processing
});

const Expense = mongoose.model('Expense', expenseSchema);

// Passport Local Strategy
passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return done(null, false, { message: 'Incorrect email.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Function to categorize expenses based on keywords
function categorizeExpense(description, amount) {
  description = description.toLowerCase();
  
  // Define keywords for each category
  const categories = {
    Food: ['food', 'grocery', 'restaurant', 'lunch', 'dinner', 'breakfast', 'meal', 'pizza', 'burger', 'coffee', 'cafe', 'eat'],
    Transportation: ['gas', 'fuel', 'car', 'bus', 'train', 'taxi', 'uber', 'lyft', 'transport', 'fare', 'ticket', 'subway', 'metro', 'commute'],
    Housing: ['rent', 'mortgage', 'house', 'apartment', 'property', 'housing', 'maintenance', 'repair', 'furniture'],
    Utilities: ['electricity', 'water', 'gas', 'internet', 'phone', 'bill', 'utility', 'cable', 'subscription'],
    Entertainment: ['movie', 'game', 'concert', 'show', 'entertainment', 'theater', 'park', 'music', 'streaming', 'netflix', 'disney', 'hulu'],
    Shopping: ['clothes', 'shoes', 'accessory', 'shopping', 'mall', 'store', 'amazon', 'online', 'retail'],
    Health: ['doctor', 'medical', 'medicine', 'drug', 'prescription', 'health', 'hospital', 'clinic', 'dental', 'healthcare', 'gym', 'fitness'],
    Education: ['book', 'course', 'class', 'tuition', 'school', 'college', 'university', 'education', 'learning', 'training', 'tutorial'],
    Travel: ['hotel', 'flight', 'vacation', 'travel', 'trip', 'booking', 'airbnb', 'holiday', 'tourism'],
    Other: []
  };
  
  // Check if description contains keywords for each category
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        return category;
      }
    }
  }
  
  // Default category if no keywords match
  return 'Other';
}

// Routes
// Authentication Routes
app.post('/auth/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send('User already exists with this email');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      name
    });
    
    await user.save();
    
    // Log in the user
    req.login(user, (err) => {
      if (err) {
        return res.status(500).send('Error logging in after registration');
      }
      return res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Error during registration');
  }
});

app.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Ensure authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// App Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
    res.render('dashboard', { user: req.user, expenses });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Expense API Endpoints
app.post('/api/expenses', ensureAuthenticated, async (req, res) => {
  try {
    const { amount, description, date, rawCategory } = req.body;
    
    // Categorize the expense using the local function
    const category = categorizeExpense(description, amount);
    
    const expense = new Expense({
      userId: req.user._id,
      amount,
      description,
      date: date || Date.now(),
      category,
      rawCategory
    });
    
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

app.get('/api/expenses', ensureAuthenticated, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.get('/api/expenses/summary', ensureAuthenticated, async (req, res) => {
  try {
    const pipeline = [
      { $match: { userId: mongoose.Types.ObjectId(req.user._id) } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ];
    
    const summary = await Expense.aggregate(pipeline);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
});

app.put('/api/expenses/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { amount, description, date, rawCategory } = req.body;
    
    // Recategorize if description changed
    let category = req.body.category;
    if (description) {
      category = categorizeExpense(description, amount);
    }
    
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { amount, description, date, category, rawCategory },
      { new: true }
    );
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', ensureAuthenticated, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});