# Daily Expense Tracker Application

A full-stack web application for tracking daily expenses with automatic categorization using Google's Gemini AI API.

## Features

- **User Authentication**: Sign up/login with email or Google account
- **Expense Tracking**: Add, edit, and delete expense records
- **AI Categorization**: Automatically categorize expenses using Gemini API
- **Data Visualization**: View expense breakdowns by category and month
- **Responsive Design**: Works on mobile and desktop devices

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Frontend**: HTML, CSS, JavaScript
- **Authentication**: Passport.js with Google OAuth
- **AI**: Google Gemini API for expense categorization
- **Data Visualization**: Chart.js

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Google Cloud Platform account (for Google OAuth and Gemini API)

## Installation

### Clone the repository
```sh
git clone https://github.com/yourusername/expense-tracker.git
cd expense-tracker
```

### Install dependencies
```sh
npm install
```

### Set up environment variables
Create a `.env` file in the root directory with the following variables:
```sh
# Application
PORT=3000
SESSION_SECRET=your_session_secret

# MongoDB
MONGODB_URI=mongodb://localhost:27017/expense-tracker

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Gemini AI API
GEMINI_API_KEY=your_gemini_api_key
```


### Start the application
```sh
npm start
```

### Access the application
Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure
```
expense-tracker/
├── app.js                # Main application file
├── public/               # Static files
│   ├── css/              # CSS styles
│   │   └── styles.css    # Main stylesheet
│   └── js/               # Client-side JavaScript
│       └── dashboard.js  # Dashboard functionality
├── views/                # EJS templates
│   ├── index.ejs         # Landing page
│   ├── login.ejs         # Login page
│   ├── register.ejs      # Registration page
│   └── dashboard.ejs     # Main dashboard
└── README.md             # Project documentation
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/login` - Login with email/password
- `POST /auth/register` - Register new user
- `GET /logout` - Logout user

### Expenses
- `GET /api/expenses` - Get all expenses for the logged-in user
- `POST /api/expenses` - Create a new expense
- `PUT /api/expenses/:id` - Update an existing expense
- `DELETE /api/expenses/:id` - Delete an expense
- `GET /api/expenses/summary` - Get expense summary for charts

## How to Use

1. **Register/Login**: Create an account or sign in with Google
2. **Add Expenses**: Fill out the form to add a new expense
3. **View Analytics**: See your spending patterns in the charts
4. **Manage Expenses**: Edit or delete expenses as needed

## License

MIT

## Acknowledgements

- **Google Gemini API** for AI-powered expense categorization
- **Chart.js** for data visualization
- **Bootstrap** for UI components
- **Passport.js** for authentication

