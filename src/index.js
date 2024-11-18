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

// Serve static files from the public and uploads directories
app.use(express.static(publicPath));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware to parse JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(templatePath, 'login.html'))); // Serve login page
app.get('/signup', (req, res) => res.sendFile(path.join(templatePath, 'signup.html'))); // Serve signup page
app.get('/portfolio', (req, res) => res.sendFile(path.join(templatePath, 'portfolio.html'))); // Serve portfolio page
app.get('/about', (req, res) => res.sendFile(path.join(templatePath, 'about.html'))); // Serve about page

// POST /signup route
app.post('/signup', upload.single('profileFile'), async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create user data with hashed password and profile file
        const data = {
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            profileFile: req.file ? req.file.filename : null,
            caption: req.body.caption || ''
        };

        // Insert user data into MongoDB
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
        // Find the user by their name
        const user = await collection.findOne({ name: req.body.name });

        if (user && await bcrypt.compare(req.body.password, user.password)) {
            res.redirect(`/portfolio?name=${user.name}`);
        } else {
            console.log('Invalid credentials');
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
        const updateData = {
            profileFile: req.file ? req.file.filename : null,
            caption: req.body.caption || ''
        };

        await collection.updateOne({ name: req.body.username }, { $set: updateData });

        // Fetch and return the updated user data
        const updatedUser = await collection.findOne({ name: req.body.username });
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

app.get('/api/userdata', async (req, res) => {
    const username = req.query.name;
    try {
        const user = await collection.findOne({ name: username });
        if (user) {
            res.json({
                caption: user.caption,
                profileFile: user.profileFile
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Error fetching user data' });
    }
});


// GET /api/userabout route to fetch about page data
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
app.post('/api/saveabout', async (req, res) => {
    const { username, summary, timeline } = req.body;
    try {
        await collection.updateOne(
            { name: username },
            { $set: { summary, timeline: JSON.parse(timeline) } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving about data:', error);
        res.status(500).json({ success: false, error: 'Error saving data' });
    }
});

// POST /api/save route to save or update portfolio caption and profile image
app.post('/api/save', upload.single('profileFile'), async (req, res) => {
    try {
        const updateData = { caption: req.body.caption || '' };
        if (req.file) {
            updateData.profileFile = req.file.filename;
        }

        await collection.updateOne({ name: req.body.username }, { $set: updateData });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ success: false, error: 'Error saving data' });
    }
});

// POST /api/saveabout route to save or update summary and timeline for the user
app.post('/api/saveabout', async (req, res) => {
    try {
        const username = req.body.username;

        // Parse the timeline as JSON array
        const timeline = req.body.timeline ? JSON.parse(req.body.timeline) : [];

        // Prepare data to update
        const updateData = {
            summary: req.body.summary || '',
            timeline: timeline
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
