import Blog from '../models/Blog.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';

// Get all published blog posts
export const getAllPosts = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { status: 'published' };
    if (req.query.category) query.category = req.query.category;
    if (req.query.tag) query.tags = req.query.tag;

    const posts = await Blog.find(query)
        .populate('author', 'name email')
        .sort('-publishDate')
        .skip(skip)
        .limit(limit);

    const total = await Blog.countDocuments(query);

    res.status(200).json({
        status: 'success',
        data: posts,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// Get single blog post
export const getPost = catchAsync(async (req, res) => {
    const post = await Blog.findOne({
        slug: req.params.slug,
        status: 'published'
    }).populate('author', 'name email');

    if (!post) {
        throw new AppError('No blog post found with that slug', 404);
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.status(200).json({
        status: 'success',
        data: post
    });
});

// Create blog post
export const createPost = catchAsync(async (req, res) => {
    const post = await Blog.create({
        ...req.body,
        author: req.user._id
    });

    res.status(201).json({
        status: 'success',
        data: post
    });
});

// Update blog post
export const updatePost = catchAsync(async (req, res) => {
    const post = await Blog.findById(req.params.id);

    if (!post) {
        throw new AppError('No blog post found with that ID', 404);
    }

    // Check if user is author or admin
    if (post.author.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
        throw new AppError('You do not have permission to edit this post', 403);
    }

    Object.assign(post, req.body);
    await post.save();

    res.status(200).json({
        status: 'success',
        data: post
    });
});

// Delete blog post
export const deletePost = catchAsync(async (req, res) => {
    const post = await Blog.findById(req.params.id);

    if (!post) {
        throw new AppError('No blog post found with that ID', 404);
    }

    // Check if user is author or admin
    if (post.author.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
        throw new AppError('You do not have permission to delete this post', 403);
    }

    await post.remove();

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Add comment
export const addComment = catchAsync(async (req, res) => {
    const post = await Blog.findById(req.params.id);

    if (!post) {
        throw new AppError('No blog post found with that ID', 404);
    }

    post.comments.push({
        user: req.user._id,
        content: req.body.content
    });

    await post.save();

    res.status(201).json({
        status: 'success',
        data: post.comments[post.comments.length - 1]
    });
});

// Toggle like
export const toggleLike = catchAsync(async (req, res) => {
    const post = await Blog.findById(req.params.id);

    if (!post) {
        throw new AppError('No blog post found with that ID', 404);
    }

    const userIndex = post.likes.indexOf(req.user._id);

    if (userIndex === -1) {
        post.likes.push(req.user._id);
    } else {
        post.likes.splice(userIndex, 1);
    }

    await post.save();

    res.status(200).json({
        status: 'success',
        data: {
            likes: post.likes.length,
            isLiked: userIndex === -1
        }
    });
});

// Get related posts
export const getRelatedPosts = catchAsync(async (req, res) => {
    const post = await Blog.findById(req.params.id);

    if (!post) {
        throw new AppError('No blog post found with that ID', 404);
    }

    const relatedPosts = await Blog.find({
        _id: { $ne: post._id },
        status: 'published',
        $or: [
            { category: post.category },
            { tags: { $in: post.tags } }
        ]
    })
    .limit(3)
    .select('title slug excerpt featuredImage');

    res.status(200).json({
        status: 'success',
        data: relatedPosts
    });
}); 