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
    }
});

// Create the model and export it
const collection = mongoose.model('Collection1', LogInSchema);
module.exports = collection;
