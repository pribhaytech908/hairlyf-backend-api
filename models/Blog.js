import mongoose from 'mongoose';
import slugify from 'slugify';

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        required: true,
        maxlength: 500
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    featuredImage: {
        url: String,
        alt: String,
        caption: String
    },
    category: {
        type: String,
        required: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    seo: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String],
        canonicalUrl: String
    },
    publishDate: {
        type: Date
    },
    relatedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    views: {
        type: Number,
        default: 0
    },
    readTime: Number, // in minutes
    isPromoted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Create slug from title
blogSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, {
            lower: true,
            strict: true
        });
    }
    
    // Calculate read time if content is modified
    if (this.isModified('content')) {
        const wordsPerMinute = 200;
        const wordCount = this.content.split(/\s+/).length;
        this.readTime = Math.ceil(wordCount / wordsPerMinute);
    }

    next();
});

// Virtual for comment count
blogSchema.virtual('commentCount').get(function() {
    return this.comments.length;
});

// Virtual for like count
blogSchema.virtual('likeCount').get(function() {
    return this.likes.length;
});

// Method to check if user has liked
blogSchema.methods.isLikedByUser = function(userId) {
    return this.likes.includes(userId);
};

// Indexes for better query performance
blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ status: 1 });
blogSchema.index({ publishDate: -1 });

export default mongoose.model('Blog', blogSchema); 