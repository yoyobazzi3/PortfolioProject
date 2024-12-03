const mongoose = require('mongoose');

// Connect to the MongoDB database
mongoose.connect('mongodb://localhost:27017/PortfolioDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connected');
})
.catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
});

const LogInSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profileFile: {
        type: String,
        default: ''
    },
    caption: {
        type: String,
        default: ''
    },
    summary: {
        type: String,
        default: ''
    },
    timeline: {
        type: [{
            date: String,
            title: String,
            description: String
        }],
        default: []
    },
    resume: {
        fileName: {
            type: String,
            default: ''
        },
        originalName: {
            type: String,
            default: ''
        },
        filePath: {
            type: String,
            default: ''
        },
        uploadDate: {
            type: Date,
            default: null
        },
        fileSize: {
            type: Number,
            default: 0
        },
        fileType: {
            type: String,
            default: ''
        }
    },
        education: {
        type: [{
            school: String,
            degree: String,
            year: String
        }],
        default: []
    },
    experience: {
        type: [{
            company: String,
            position: String,
            duration: String,
            description: String
        }],
        default: []
    },
    skills: {
        type: [{
            name: String,
            level: String
        }],
        default: []
    },
    certifications: {
        type: [{
            name: String,
            issuer: String,
            year: String
        }],
        default: []
    }
});

// Blog post schema
const postSchema = new mongoose.Schema({
    author: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    likes: {
        type: Number,
        default: 0
    },
    comments: [{
        author: String,
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
});

// Create models
const Collection = mongoose.model('Collection1', LogInSchema);
const Post = mongoose.model('Post', postSchema);

// Export both models
module.exports = { Collection, Post };