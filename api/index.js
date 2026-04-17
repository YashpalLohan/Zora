const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const User = require('../models/users')
const { ensureAdminUser } = require('../models/users');

// Import routes
const indexRouter = require('../routes/index');
const postRouter = require('../routes/posts');

const app = express()

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blog'

// Cached connection for serverless
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
            console.log('Successfully connected to MongoDB.');
            // Run ensureAdminUser only once after connection
            ensureAdminUser().catch(err => console.error('Error creating admin user:', err));
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('Database connection failed:', err);
        res.status(500).render('error', {
            error: { message: 'Database connection failed' }
        });
    }
});

// View Engine Setup
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '../public')))
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'ejs')

const JWT_SECRET = process.env.JWT_SECRET || 'set-a-secure-jwt-secret'
const TOKEN_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'token'
const isProduction = process.env.NODE_ENV === 'production'

app.use(cookieParser())

app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    const cookieToken = req.cookies ? req.cookies[TOKEN_COOKIE_NAME] : null
    const token = bearerToken || cookieToken

    if (!token) {
        req.user = null
        res.locals.currentUser = null
        res.locals.isAdmin = false
        return next()
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET)
        const user = await User.findById(payload.id)
        if (!user) {
            throw new Error('User not found')
        }
        req.user = user
        res.locals.currentUser = user
        res.locals.isAdmin = user.isAdminUser()
    } catch (err) {
        console.warn('JWT validation failed:', err.message)
        req.user = null
        res.locals.currentUser = null
        res.locals.isAdmin = false

        // clear invalid cookie token
        if (cookieToken) {
            res.clearCookie(TOKEN_COOKIE_NAME, {
                httpOnly: true,
                sameSite: 'lax',
                secure: isProduction
            })
        }
    }
    next()
});

app.use('/', indexRouter);
app.use('/posts', postRouter);

app.use((err, req, res, next) => {
    if (err.name === 'ValidationError') {
        return res.status(400).render('error', {
            error: { message: 'Validation Error: ' + err.message }
        });
    }
    if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(400).render('error', {
            error: { message: 'Username already exists' }
        });
    }
    res.status(err.status || 500).render('error', {
        error: {
            message: err.message || 'Something went wrong!',
            status: err.status || 500
        }
    });
});

app.use((req, res) => {
    res.status(404).render('error', {
        error: {
            message: 'Page not found',
            status: 404
        }
    });
});

module.exports = app; 