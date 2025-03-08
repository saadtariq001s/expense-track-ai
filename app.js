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
  currency: { type: String, default: 'PKR' }, // Added currency field
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

// Expense API Endpoints
app.post('/api/expenses', ensureAuthenticated, async (req, res) => {
  try {
    const { amount, currency, description, date, rawCategory } = req.body;
    
    // Categorize the expense using the local function
    const category = categorizeExpense(description, amount);
    
    const expense = new Expense({
      userId: req.user._id,
      amount,
      currency: currency || 'PKR', // Use PKR as default if not provided
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

app.get('/api/expenses/summary', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Convert the string ID to a MongoDB ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const pipeline = [
      { $match: { userId: userObjectId } },
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
    const { amount, currency, description, date, rawCategory } = req.body;
    
    // Recategorize if description changed
    let category = req.body.category;
    if (description) {
      category = categorizeExpense(description, amount);
    }
    
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 
        amount, 
        currency: currency || 'PKR', // Use PKR as default if not provided
        description, 
        date, 
        category, 
        rawCategory 
      },
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


app.get('/api/expenses/insights', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get all expenses for calculations
    const expenses = await Expense.find({ userId: userObjectId }).sort({ date: -1 });
    
    // If no expenses, return empty insights
    if (expenses.length === 0) {
      return res.json({
        totalSpent: 0,
        insights: ["No expenses found. Add your first expense to see insights!"]
      });
    }
    
    // Calculate total spent
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Group by category
    const categorySums = {};
    const categoryCount = {};
    expenses.forEach(expense => {
      const cat = expense.category || 'Other';
      if (!categorySums[cat]) {
        categorySums[cat] = 0;
        categoryCount[cat] = 0;
      }
      categorySums[cat] += expense.amount;
      categoryCount[cat]++;
    });
    
    // Find top categories
    const categories = Object.keys(categorySums);
    categories.sort((a, b) => categorySums[b] - categorySums[a]);
    const topCategory = categories[0];
    const topCategoryPercentage = ((categorySums[topCategory] / totalSpent) * 100).toFixed(1);
    
    // Calculate month-over-month trends
    const monthlyData = {};
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = 0;
      }
      monthlyData[monthYear] += expense.amount;
    });
    
    // Convert to array and sort
    const monthlySpending = Object.entries(monthlyData)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Calculate month-over-month growth if we have at least 2 months of data
    let monthOverMonthGrowth = null;
    if (monthlySpending.length >= 2) {
      const lastMonth = monthlySpending[monthlySpending.length - 1];
      const previousMonth = monthlySpending[monthlySpending.length - 2];
      monthOverMonthGrowth = ((lastMonth.amount - previousMonth.amount) / previousMonth.amount) * 100;
    }
    
    // Calculate average transaction size
    const avgTransactionSize = totalSpent / expenses.length;
    
    // Generate insights
    const insights = [];
    
    // Top spending category
    insights.push(`Your top spending category is "${topCategory}" at ${topCategoryPercentage}% of total expenses.`);
    
    // Month-over-month growth insight
    if (monthOverMonthGrowth !== null) {
      if (monthOverMonthGrowth > 0) {
        insights.push(`Your spending increased by ${monthOverMonthGrowth.toFixed(1)}% compared to the previous month.`);
      } else if (monthOverMonthGrowth < 0) {
        insights.push(`Your spending decreased by ${Math.abs(monthOverMonthGrowth).toFixed(1)}% compared to the previous month.`);
      } else {
        insights.push(`Your spending is the same as the previous month.`);
      }
    }
    
    // Average transaction size
    insights.push(`Your average expense amount is ${avgTransactionSize.toFixed(2)}.`);
    
    // Recent trend
    if (monthlySpending.length >= 3) {
      const last3Months = monthlySpending.slice(-3);
      const isIncreasing = last3Months[0].amount < last3Months[1].amount && last3Months[1].amount < last3Months[2].amount;
      const isDecreasing = last3Months[0].amount > last3Months[1].amount && last3Months[1].amount > last3Months[2].amount;
      
      if (isIncreasing) {
        insights.push(`Your spending has been consistently increasing over the last 3 months.`);
      } else if (isDecreasing) {
        insights.push(`Your spending has been consistently decreasing over the last 3 months.`);
      } else {
        insights.push(`Your spending pattern has fluctuated over the last 3 months.`);
      }
    }
    
    // Category frequency
    const mostFrequentCategory = Object.keys(categoryCount).reduce((a, b) => 
      categoryCount[a] > categoryCount[b] ? a : b
    );
    
    if (mostFrequentCategory !== topCategory) {
      insights.push(`You make expenses in "${mostFrequentCategory}" most frequently, but spend more in total on "${topCategory}".`);
    }
    
    // Return insights data
    res.json({
      totalSpent,
      topCategory,
      topCategoryPercentage,
      avgTransactionSize: avgTransactionSize.toFixed(2),
      monthOverMonthGrowth: monthOverMonthGrowth ? monthOverMonthGrowth.toFixed(1) : null,
      insights
    });
    
  } catch (error) {
    console.error('Error generating expense insights:', error);
    res.status(500).json({ error: 'Failed to generate expense insights' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


