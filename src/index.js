const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const collection = require('./mongodb'); // Import MongoDB model
const multer = require('multer');
const fs = require('fs');

// Set up multer storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Files will be saved in the "uploads" folder
    },
    filename: function (req, file, cb) {
        cb(null, `${req.body.name}-${Date.now()}-${file.originalname}`); // Unique filename
    }
});

// Initialize upload
const upload = multer({ storage: storage });

// Create an "uploads" directory if it doesn't exist
const dir = './uploads';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

// Paths
const templatePath = path.join(__dirname, '../templates');  // Path to your HTML templates
const publicPath = path.join(__dirname, '../public');  // Path to your public directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../templates'));  // Adjust path if necessary

// Serve static files from the public directory
app.use(express.static(publicPath));

// Middleware to parse JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(templatePath, 'login.html')); // Serve login page
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(templatePath, 'signup.html')); // Serve signup page
});

// POST /signup route
app.post('/signup', upload.single('profileFile'), async (req, res) => {
    try {
        console.log('Signup request body:', req.body);

        // Hash the user's password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create the user data with the email, hashed password, and uploaded file
        const data = {
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            profileFile: req.file ? req.file.filename : null  // Save the filename in the database
        };

        // Insert the user data into the MongoDB collection
        await collection.insertMany([data]);

        // Redirect the user to their unique portfolio page
        res.redirect(`/portfolio/${req.body.name}`);

    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Error signing up. Please try again later.');
    }
});

// POST /login route
app.post('/login', async (req, res) => {
    try {
        console.log('Login request body:', req.body);

        // Find the user by their name in MongoDB
        const user = await collection.findOne({ name: req.body.name });

        if (user) {
            // Compare the plain-text password with the stored hashed password
            const passwordMatch = await bcrypt.compare(req.body.password, user.password);

            if (passwordMatch) {
                // If password matches, render the portfolio page with the username and file
                res.render('portfolio', { username: user.name, profileFile: user.profileFile });
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
        console.error('Error during login:', error);
        res.redirect('/?error=true');
    }
});
// POST /upload route for uploading a new file after login
app.post('/upload', upload.single('profileFile'), async (req, res) => {
    try {
        const username = req.body.username;

        // Update the user in the database with the new file
        await collection.updateOne({ name: username }, { $set: { profileFile: req.file.filename } });

        // Fetch the updated user data
        const updatedUser = await collection.findOne({ name: username });

        // Re-render the portfolio page with updated user data (file included)
        res.render('portfolio', { username: updatedUser.name, profileFile: updatedUser.profileFile });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('Error uploading file. Please try again later.');
    }
});



// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
