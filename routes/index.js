const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userModel = require('../models/users');
const postModel = require('../models/post');
const commentModel = require('../models/comment');

const JWT_SECRET = process.env.JWT_SECRET || 'set-a-secure-jwt-secret';
const TOKEN_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'token';
const COOKIE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

function issueAuthToken(res, user) {
    const token = jwt.sign(
        {
            id: user._id.toString(),
            username: user.username,
            isAdmin: user.isAdminUser()
        },
        JWT_SECRET,
        { expiresIn: '14d' }
    );

    res.cookie(TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: COOKIE_MAX_AGE
    });

    return token;
}

function isLoggedIn(req, res, next) {
    if (req.user) return next();
    res.redirect('/login');
}

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.user && req.user.isAdminUser()) return next();
    res.status(403).render('error', {
        error: { message: 'Access denied. Admin privileges required.' }
    });
}

// Redirect if already logged in
function redirectIfLoggedIn(req, res, next) {
    if (req.user) return res.redirect('/home');
    next();
}

// Home page
router.get('/', redirectIfLoggedIn, function (req, res) {
    res.render('index', {
        title: 'ZORA',
        currentUser: req.user,
        isAdmin: res.locals.isAdmin
    });
});

// Register user using passport-local-mongoose
router.post('/register', redirectIfLoggedIn, function (req, res, next) {
    console.log('=== Registration Attempt ===');
    console.log('Request body:', req.body);

    const { username, name, password } = req.body;

    if (!username || !name || !password) {
        console.log('Missing required fields');
        return res.status(400).send('Missing required fields');
    }

    console.log('Creating new user with:', { username, name });
    const newUser = new userModel({ username, name });

    console.log('Attempting to register user...');
    userModel.register(newUser, password, function (err, user) {
        if (err) {
            console.log('Registration error:', err);
            return res.status(500).send('Registration failed: ' + err.message);
        }

        console.log('User registered successfully:', user);
        console.log('Generating JWT for user...');
        issueAuthToken(res, user);
        res.redirect('/home');
    });
});

// Signup page
router.get('/signup', redirectIfLoggedIn, (req, res) => {
    res.render('signup');
});

// Login page
router.get('/login', redirectIfLoggedIn, (req, res) => {
    res.render('login');
});

// About page
router.get('/about', (req, res) => {
    res.render('about', { currentUser: req.user, isAdmin: res.locals.isAdmin });
});

// Contact page
router.get('/contact', (req, res) => {
    res.render('contact', { currentUser: req.user, isAdmin: res.locals.isAdmin });
});

// Full Archive page
router.get('/archive', isLoggedIn, async (req, res) => {
    try {
        const posts = await postModel.find().populate('author').sort({ createdAt: -1 });
        res.render('archive', {
            posts,
            currentUser: req.user,
            isAdmin: res.locals.isAdmin
        });
    } catch (err) {
        console.error('Error loading archive:', err);
        res.status(500).render('error', { error: { message: 'Error loading the archive' } });
    }
});

// Legal routes
router.get('/privacy', (req, res) => {
    res.render('legal', { title: 'PRIVACY POLICY', currentUser: req.user, isAdmin: res.locals.isAdmin });
});

router.get('/terms', (req, res) => {
    res.render('legal', { title: 'TERMS OF SERVICE', currentUser: req.user, isAdmin: res.locals.isAdmin });
});

router.get('/accessibility', (req, res) => {
    res.render('legal', { title: 'ACCESSIBILITY STATEMENT', currentUser: req.user, isAdmin: res.locals.isAdmin });
});

// Logout route
router.get('/logout', (req, res, next) => {
    res.clearCookie(TOKEN_COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction
    });
    res.redirect('/login');
});

// Home page - fetch and display posts with pagination, search, sort, and filter
router.get('/home', isLoggedIn, async (req, res) => {
    try {
        // Update the specific post that has null author
        const postId = '68416f1fa09c58f82556ccce';
        const post = await postModel.findById(postId);
        if (post && !post.author) {
            console.log('Updating post author...');
            post.author = req.user._id;
            await post.save();
            console.log('Post author updated successfully');
        }

        // Extract query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder || 'desc';
        const authorFilter = req.query.author || '';

        // Build query object for filtering
        let query = {};

        // Search functionality - search in title and body
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { body: { $regex: search, $options: 'i' } }
            ];
        }

        // Author filter
        if (authorFilter) {
            query.author = authorFilter;
        }

        // Build sort object
        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalPosts = await postModel.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / limit);

        // Fetch posts with filters, sorting, and pagination
        const posts = await postModel.find(query)
            .populate('author')
            .sort(sortObj)
            .skip(skip)
            .limit(limit);

        // Fetch comments for all posts
        const postsWithComments = await Promise.all(
            posts.map(async (post) => {
                const comments = await commentModel.find({ post: post._id })
                    .populate('author')
                    .sort({ createdAt: -1 });
                return {
                    ...post.toObject(),
                    comments
                };
            })
        );

        // Fetch all users for author filter dropdown
        const allUsers = await userModel.find().select('_id username name');

        res.render('home', {
            posts: postsWithComments || [],
            currentUser: req.user,
            isAdmin: res.locals.isAdmin,
            pagination: {
                page,
                limit,
                totalPages,
                totalPosts,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            filters: {
                search,
                sortBy,
                sortOrder,
                author: authorFilter
            },
            allUsers
        });
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).render('error', {
            error: { message: 'Error loading posts' }
        });
    }
});

// Create post page
router.get('/home/create', isLoggedIn, (req, res) => {
    const isAdmin = req.user.isAdminUser();
    res.render('create', {
        currentUser: req.user,
        isAdmin: isAdmin
    });
});

// Create post action
router.post('/home/create', isLoggedIn, async (req, res) => {
    try {
        console.log('Creating post with data:', req.body);
        const { title, body, imageUrl, tags } = req.body;

        if (!title || !body) {
            console.log('Missing required fields');
            return res.status(400).render('error', {
                error: { message: 'Title and body are required' }
            });
        }

        const newPost = new postModel({
            title,
            body,
            imageUrl,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            author: req.user._id
        });

        await newPost.save();

        // Redirect to home page after successful creation
        res.redirect('/home');
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).render('error', {
            error: { message: 'Error creating post: ' + err.message }
        });
    }
});

// Individual post view
router.get('/home/:id', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id).populate('author');
        if (!post) {
            return res.status(404).render('error', {
                error: { message: 'Story not found in archive' }
            });
        }
        res.render('show', {
            post,
            currentUser: req.user,
            isAdmin: res.locals.isAdmin
        });
    } catch (err) {
        console.error('Error fetching post:', err);
        res.status(500).render('error', {
            error: { message: 'Error loading story' }
        });
    }
});

// Edit post page
router.get('/home/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).render('error', {
                error: { message: 'Post not found' }
            });
        }
        // Allow edit if user is admin, post author, or if it's the specific post with null author
        if (req.user.isAdminUser() ||
            (post._id.toString() === '68416f1fa09c58f82556ccce' && !post.author) ||
            (post.author && post.author.toString() === req.user._id.toString())) {
            res.render('edit', {
                post,
                currentUser: req.user,
                isAdmin: res.locals.isAdmin
            });
        } else {
            res.status(403).render('error', {
                error: { message: 'Not authorized to edit this post' }
            });
        }
    } catch (err) {
        console.error('Error fetching post for edit:', err);
        res.status(500).render('error', {
            error: { message: 'Error loading post' }
        });
    }
});

// Update post action
router.post('/home/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const { title, body, imageUrl, tags } = req.body;
        const post = await postModel.findById(req.params.id);

        if (!post) {
            return res.status(404).render('error', {
                error: { message: 'Post not found' }
            });
        }

        // Allow update if user is admin, post author, or if it's the specific post with null author
        if (req.user.isAdminUser() ||
            (post._id.toString() === '68416f1fa09c58f82556ccce' && !post.author) ||
            (post.author && post.author.toString() === req.user._id.toString())) {
            post.title = title;
            post.body = body;
            post.imageUrl = imageUrl;
            post.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];

            // If this is the post with null author, set the author to current user
            if (post._id.toString() === '68416f1fa09c58f82556ccce' && !post.author) {
                post.author = req.user._id;
            }

            await post.save();

            // Redirect to home page after successful update
            res.redirect('/home');
        } else {
            res.status(403).render('error', {
                error: { message: 'Not authorized to edit this post' }
            });
        }
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(500).render('error', {
            error: { message: 'Error updating post: ' + err.message }
        });
    }
});

// Delete post action
router.post('/home/:id/delete', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);

        if (!post) {
            return res.status(404).render('error', {
                error: { message: 'Post not found' }
            });
        }

        // Allow delete if user is admin, post author, or if it's the specific post with null author
        if (req.user.isAdminUser() ||
            (post._id.toString() === '68416f1fa09c58f82556ccce' && !post.author) ||
            (post.author && post.author.toString() === req.user._id.toString())) {
            await postModel.findByIdAndDelete(req.params.id);

            // Redirect to home page after successful deletion
            res.redirect('/home');
        } else {
            res.status(403).render('error', {
                error: { message: 'Not authorized to delete this post' }
            });
        }
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).render('error', {
            error: { message: 'Error deleting post: ' + err.message }
        });
    }
});

// Admin dashboard route
router.get('/admin', isAdmin, async (req, res) => {
    try {
        const posts = await postModel.find().populate('author');
        const users = await userModel.find();
        res.render('admin', {
            posts,
            users,
            currentUser: req.user
        });
    } catch (err) {
        console.error('Error loading admin dashboard:', err);
        res.status(500).render('error', {
            error: { message: 'Error loading admin dashboard' }
        });
    }
});

// Login authentication
router.post('/auth', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).render('error', { error: { message: 'Username and password are required.' } });
    }

    const authenticate = userModel.authenticate();
    authenticate(username, password, (err, user, info) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).render('error', { error: { message: 'Internal server error during login.' } });
        }
        if (!user) {
            console.warn('Login failed: Invalid username or password.', info);
            return res.status(401).render('error', { error: { message: 'Invalid username or password.' } });
        }

        issueAuthToken(res, user);
        res.redirect('/home');
    });
});

// Create a comment
router.post('/home/:id/comments', isLoggedIn, async (req, res) => {
    try {
        const { content } = req.body;
        const post = await postModel.findById(req.params.id);

        if (!post) {
            return res.status(404).render('error', {
                error: { message: 'Post not found' }
            });
        }

        const comment = new commentModel({
            content,
            author: req.user._id,
            post: post._id
        });

        await comment.save();
        res.redirect('/home');
    } catch (err) {
        console.error('Error creating comment:', err);
        res.status(500).render('error', {
            error: { message: 'Error creating comment' }
        });
    }
});

// Edit a comment
router.post('/home/:postId/comments/:commentId/edit', isLoggedIn, async (req, res) => {
    try {
        const { content } = req.body;
        const comment = await commentModel.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).render('error', {
                error: { message: 'Comment not found' }
            });
        }

        // Allow edit if user is admin or comment author
        if (req.user.isAdminUser() || comment.author.equals(req.user._id)) {
            comment.content = content;
            await comment.save();
            res.redirect('/home');
        } else {
            res.status(403).render('error', {
                error: { message: 'Not authorized to edit this comment' }
            });
        }
    } catch (err) {
        console.error('Error editing comment:', err);
        res.status(500).render('error', {
            error: { message: 'Error editing comment' }
        });
    }
});

// Delete a comment
router.post('/home/:postId/comments/:commentId/delete', isLoggedIn, async (req, res) => {
    try {
        const comment = await commentModel.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).render('error', {
                error: { message: 'Comment not found' }
            });
        }

        // Allow delete if user is admin or comment author
        if (req.user.isAdminUser() || comment.author.equals(req.user._id)) {
            await comment.deleteOne();
            res.redirect('/home');
        } else {
            res.status(403).render('error', {
                error: { message: 'Not authorized to delete this comment' }
            });
        }
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).render('error', {
            error: { message: 'Error deleting comment' }
        });
    }
});

module.exports = router;
module.exports.isLoggedIn = isLoggedIn;
module.exports.isAdmin = isAdmin;