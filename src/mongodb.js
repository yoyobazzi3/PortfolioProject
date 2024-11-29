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
    // Add resume related fields
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
    }
});

const collection = mongoose.model('Collection1', LogInSchema);
module.exports = collection;