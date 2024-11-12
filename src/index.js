const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const collection = require('./mongodb'); // Import MongoDB model

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
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Paths
const templatePath = path.join(__dirname, '../templates'); // Path to your HTML templates
const publicPath = path.join(__dirname, '../public'); // Path to your public directory

// Serve static files from the public directory
app.use(express.static(publicPath));

// Middleware to parse JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(templatePath, 'login.html')); // Serve login page
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(templatePath, 'signup.html')); // Serve signup page
});

app.get('/portfolio', (req, res) => {
    res.sendFile(path.join(templatePath, 'portfolio.html')); // Serve portfolio page
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
            profileFile: req.file ? req.file.filename : null, // Save the filename in the database
            caption: req.body.caption || '' // Save initial caption if provided
        };

        // Insert the user data into the MongoDB collection
        await collection.insertMany([data]);

        // Redirect the user to the portfolio page
        res.redirect(`/portfolio?name=${req.body.name}`);
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
                // Redirect to portfolio.html with the username as a query parameter
                res.redirect(`/portfolio?name=${user.name}`);
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

// POST /upload route for updating profile file and caption
app.post('/upload', upload.single('profileFile'), async (req, res) => {
    try {
        const username = req.body.username;

        const updateData = {
            profileFile: req.file ? req.file.filename : null,
            caption: req.body.caption || '' // Save the caption
        };

        // Update the user in the database with the new file and caption
        await collection.updateOne({ name: username }, { $set: updateData });

        // Fetch the updated user data
        const updatedUser = await collection.findOne({ name: username });

        // Send updated user data as JSON
        res.json({
            name: updatedUser.name,
            profileFile: updatedUser.profileFile,
            caption: updatedUser.caption
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('Error uploading file. Please try again later.');
    }
});

// GET /api/userdata route to fetch user data for portfolio page
app.get('/api/userdata', async (req, res) => {
    const username = req.query.name;
    
    try {
        const user = await collection.findOne({ name: username });
        
        if (user) {
            res.json({
                name: user.name,
                profileFile: user.profileFile,
                caption: user.caption
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Error fetching user data' });
    }
});

// GET /about route
app.get('/about', (req, res) => {
    res.sendFile(path.join(templatePath, 'about.html')); // Serve the About page
});
app.get('/portfolio', (req, res) => {
    res.sendFile(path.join(templatePath, 'about.html')); // Serve the About page
});
// POST /api/save route to save or update caption and profile image
app.post('/api/save', upload.single('profileFile'), async (req, res) => {
    try {
        const username = req.body.username;

        // Prepare data to update
        const updateData = {
            caption: req.body.caption || ''
        };

        // If a new profile image is uploaded, add it to the update data
        if (req.file) {
            updateData.profileFile = req.file.filename;
        }

        // Update the user record in MongoDB
        await collection.updateOne({ name: username }, { $set: updateData });

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ success: false, error: 'Error saving data' });
    }
});
// GET /api/userabout route to fetch summary and timeline for the user
app.get('/api/userabout', async (req, res) => {
    const username = req.query.name;
    
    try {
        const user = await collection.findOne({ name: username });
        
        if (user) {
            res.json({
                summary: user.summary || '',
                timeline: user.timeline || []
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user about data:', error);
        res.status(500).json({ error: 'Error fetching user data' });
    }
});

// POST /api/saveabout route to save or update summary and timeline for the user
app.post('/api/saveabout', async (req, res) => {
    try {
        const username = req.body.username;

        // Parse the timeline as JSON
        const timeline = JSON.parse(req.body.timeline);

        // Prepare data to update
        const updateData = {
            summary: req.body.summary || '',
            timeline: timeline || []
        };

        // Update the user record in MongoDB
        await collection.updateOne({ name: username }, { $set: updateData });

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving about data:', error);
        res.status(500).json({ success: false, error: 'Error saving data' });
    }
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
