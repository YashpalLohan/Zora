const express = require('express')
const router = express.Router()
const Post = require('../models/post')
const Comment = require('../models/comment')
const { isLoggedIn } = require('./index')

// Get all posts
router.get('/', async (req, res) => {
    const posts = await Post.find().populate('author')

    // Fetch comments for all posts
    const postsWithComments = await Promise.all(
        posts.map(async (post) => {
            const comments = await Comment.find({ post: post._id })
                .populate('author')
                .sort({ createdAt: -1 })
            return {
                ...post.toObject(),
                comments
            }
        })
    )

    res.render('home', { posts: postsWithComments })
})

// Show create post form
router.get('/create', isLoggedIn, (req, res) => {
    res.render('create')
})

// Create a new post
router.post('/create', isLoggedIn, async (req, res) => {
    const { title, body, imageUrl } = req.body
    const post = new Post({
        title,
        body,
        imageUrl,
        author: req.user._id
    })
    await post.save()
    res.redirect('/posts')
})

// Show edit post form
router.get('/:id/edit', isLoggedIn, async (req, res) => {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).send('Post not found')
    if (!post.author.equals(req.user._id)) return res.status(403).send('Forbidden')
    res.render('edit', { post })
})

// Edit a post
router.post('/:id/edit', isLoggedIn, async (req, res) => {
    const { title, body, imageUrl } = req.body
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).send('Post not found')
    if (!post.author.equals(req.user._id)) return res.status(403).send('Forbidden')
    post.title = title
    post.body = body
    post.imageUrl = imageUrl
    await post.save()
    res.redirect('/posts')
})

// Delete a post
router.post('/:id/delete', isLoggedIn, async (req, res) => {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).send('Post not found')
    if (!post.author.equals(req.user._id)) return res.status(403).send('Forbidden')

    // Delete all comments associated with the post
    await Comment.deleteMany({ post: post._id })

    await post.deleteOne()
    res.redirect('/posts')
})

// Create a comment
router.post('/:id/comments', isLoggedIn, async (req, res) => {
    const { content } = req.body
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).send('Post not found')

    const comment = new Comment({
        content,
        author: req.user._id,
        post: post._id
    })
    await comment.save()
    res.redirect('/posts')
})

// Edit a comment
router.post('/:postId/comments/:commentId/edit', isLoggedIn, async (req, res) => {
    const { content } = req.body
    const comment = await Comment.findById(req.params.commentId)
    if (!comment) return res.status(404).send('Comment not found')
    if (!comment.author.equals(req.user._id)) return res.status(403).send('Forbidden')

    comment.content = content
    await comment.save()
    res.redirect('/posts')
})

// Delete a comment
router.post('/:postId/comments/:commentId/delete', isLoggedIn, async (req, res) => {
    const comment = await Comment.findById(req.params.commentId)
    if (!comment) return res.status(404).send('Comment not found')
    if (!comment.author.equals(req.user._id)) return res.status(403).send('Forbidden')

    await comment.deleteOne()
    res.redirect('/posts')
})

module.exports = router