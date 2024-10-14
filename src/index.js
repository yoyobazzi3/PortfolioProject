const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
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
    try {
        // Hash the user's password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create the user data with the email and hashed password
        const data = {
            name: req.body.name,
            email: req.body.email, 
            password: hashedPassword
        };

        // Insert the user data into the MongoDB collection
        await collection.insertMany([data]);

        // Send the user to the home page after signup
        res.sendFile(path.join(templatePath, 'login.html'));

    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).send("Error signing up. Please try again later.");
    }
});



app.post("/login", async (req, res) => {
    try {
        const user = await collection.findOne({ name: req.body.name });

        if (user) {
            // Use bcrypt.compare() to compare the hashed password with the plain-text password
            const passwordMatch = await bcrypt.compare(req.body.password, user.password);

            if (passwordMatch) {
                // If password matches, send the user to the home page
                res.sendFile(path.join(templatePath, 'home.html'));
            } else {
                // If password doesn't match, redirect with error
                res.redirect('/?error=true');
            }
        } else {
            // If user not found, redirect with error
            res.redirect('/?error=true');
        }
    } catch (error) {
        console.error("Error during login:", error); // Log the actual error
        res.redirect('/?error=true');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
