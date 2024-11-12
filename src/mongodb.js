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

// Define the schema
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
    caption: {
        type: String,
        default: '' // Field to store the caption
    },
    profileFile: {
        type: String,
        default: '' // Field to store the uploaded file path
    },
    summary: {
        type: String,
        default: '' // Field to store the summary
    },
    timeline: {
        type: String,
        default: '' // Field to store the career timeline
    }
});

const collection = mongoose.model('Collection1', LogInSchema);
module.exports = collection;
