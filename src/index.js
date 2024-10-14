const express = require('express');
const app = express();
const path = require('path');
const collection = require("./mongodb"); // Assuming this is a valid MongoDB connection

const templatePath = path.join(__dirname, '../templates');
const publicPath = path.join(__dirname, '../public');
const port = 3000;

// Middleware to parse JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files (CSS, images, etc.) from the public directory
app.use(express.static(publicPath));

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(templatePath, 'login.html')); // Send login.html file
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(templatePath, 'signup.html')); // Send signup.html file
});

app.post("/signup", async (req, res) => {
    const data = {
        name: req.body.name,
        password: req.body.password
    };

    // Insert user data into the collection
    await collection.insertMany([data]);

    // Send home.html after signup
    res.sendFile(path.join(templatePath, 'home.html'));
});
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ name: req.body.name });
        if (check && check.password === req.body.password) {
            res.sendFile(path.join(templatePath, 'home.html'));
        } else {
            // Redirect back to login with error
            res.redirect('/?error=true');
        }
    } catch {
        res.redirect('/?error=true');
    }
});



// Start the server
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
