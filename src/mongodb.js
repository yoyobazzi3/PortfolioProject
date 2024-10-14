const mongoose = require("mongoose");

// Correct the connection string to use 'mongodb:'
mongoose.connect("mongodb://localhost:27017/PortfolioDB", {
    useNewUrlParser: true, 
    useUnifiedTopology: true
})
.then(() => {
    console.log("MongoDB connected");
})
.catch((error) => {
    console.log("Failed to connect to MongoDB:", error);
});

// Define the schema
const LogInSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

// Create the model
const collection = mongoose.model("Collection1", LogInSchema);

module.exports = collection;
