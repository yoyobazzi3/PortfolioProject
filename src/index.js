const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const collection = require('./mongodb'); // Import MongoDB model

// Paths
const templatePath = path.join(__dirname, '../templates');  // Path to your HTML templates
const publicPath = path.join(__dirname, '../public');  // Path to your public directory

// Serve static files from the public directory
app.use(express.static(publicPath));

// Middleware to parse JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(templatePath, 'login.html')); // Serve login page
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(templatePath, 'signup.html')); // Serve signup page
});

// POST /signup route
app.post('/signup', async (req, res) => {
    try {
        // Log the incoming request body for debugging
        console.log('Signup request body:', req.body);

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

        // Send the user back to the login page after signup
        res.sendFile(path.join(templatePath, 'login.html'));

    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Error signing up. Please try again later.');
    }
});

// POST /login route
app.post('/login', async (req, res) => {
    try {
        // Log the incoming request body for debugging
        console.log('Login request body:', req.body);

        // Find the user by their name in MongoDB
        const user = await collection.findOne({ name: req.body.name });

        if (user) {
            // Compare the plain-text password with the stored hashed password
            const passwordMatch = await bcrypt.compare(req.body.password, user.password);

            if (passwordMatch) {
                // If password matches, send the user to the home page
                res.sendFile(path.join(templatePath, 'home.html'));
            } else {
                // If password doesn't match, redirect with error
                console.log('Password mismatch');
                res.redirect('/?error=true');
            }
        } else {
            // If user not found, redirect with error
            console.log('User not found');
            res.redirect('/?error=true');
        }
    } catch (error) {
        console.error('Error during login:', error); // Log the actual error
        res.redirect('/?error=true');
    }
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
