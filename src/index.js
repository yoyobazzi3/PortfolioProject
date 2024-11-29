const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const collection = require('./mongodb');

// Configure multer for profile uploads
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${req.body.name}-${Date.now()}-${file.originalname}`);
    }
});

// Configure multer for resume uploads
const resumeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create directory if it doesn't exist
        const dir = './public/uploads/resumes';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for resumes
const resumeFileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
};

// Initialize uploads
const profileUpload = multer({ storage: profileStorage });
const resumeUpload = multer({
    storage: resumeStorage,
    fileFilter: resumeFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Create uploads directory if it doesn't exist
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Paths setup
const templatePath = path.join(__dirname, '../templates');
const publicPath = path.join(__dirname, '../public');

// Static file serving
app.use(express.static(publicPath));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic Routes
app.get('/', (req, res) => res.sendFile(path.join(templatePath, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(templatePath, 'signup.html')));
app.get('/login', (req, res) => res.sendFile(path.join(templatePath, 'login.html')));
app.get('/portfolio', (req, res) => res.sendFile(path.join(templatePath, 'portfolio.html')));
app.get('/about', (req, res) => res.sendFile(path.join(templatePath, 'about.html')));
app.get('/resume', (req, res) => res.sendFile(path.join(templatePath, 'resume.html')));

// Authentication Routes
app.post('/signup', profileUpload.single('profileFile'), async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const data = {
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            profileFile: req.file ? req.file.filename : null,
            caption: req.body.caption || ''
        };
        await collection.insertMany([data]);
        res.redirect(`/portfolio?name=${req.body.name}`);
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Error signing up. Please try again later.');
    }
});

app.post('/login', async (req, res) => {
    try {
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

// Profile Routes
app.post('/upload', profileUpload.single('profileFile'), async (req, res) => {
    try {
        const updateData = {
            profileFile: req.file ? req.file.filename : null,
            caption: req.body.caption || ''
        };
        await collection.updateOne({ name: req.body.username }, { $set: updateData });
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

// About Page Routes
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
    try {
        const { username, summary, timeline } = req.body;
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

// Portfolio Save Route
app.post('/api/save', profileUpload.single('profileFile'), async (req, res) => {
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

// Resume Routes
app.get('/api/userresume', async (req, res) => {
    const username = req.query.name;
    try {
        const user = await collection.findOne({ name: username });
        if (user) {
            res.json({
                education: user.education || [],
                experience: user.experience || [],
                skills: user.skills || [],
                certifications: user.certifications || [],
                resume: user.resume || {}
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user resume data:', error);
        res.status(500).json({ error: 'Error fetching user data' });
    }
});

app.post('/api/saveresume', async (req, res) => {
    try {
        const { username, education, experience, skills, certifications } = req.body;
        const updateData = {
            education: JSON.parse(education || '[]'),
            experience: JSON.parse(experience || '[]'),
            skills: JSON.parse(skills || '[]'),
            certifications: JSON.parse(certifications || '[]')
        };
        await collection.updateOne(
            { name: username },
            { $set: updateData },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving resume data:', error);
        res.status(500).json({ success: false, error: 'Error saving data' });
    }
});

// Resume File Upload Routes
app.post('/api/uploadresume', resumeUpload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const username = req.body.username;
        const filePath = `/uploads/resumes/${req.file.filename}`;

        await collection.findOneAndUpdate(
            { name: username },
            {
                $set: {
                    'resume.fileName': req.file.filename,
                    'resume.originalName': req.file.originalname,
                    'resume.filePath': filePath,
                    'resume.uploadDate': new Date(),
                    'resume.fileSize': req.file.size,
                    'resume.fileType': path.extname(req.file.originalname).toLowerCase()
                }
            },
            { new: true }
        );

        res.json({
            success: true,
            fileUrl: filePath,
            fileName: req.file.originalname
        });
    } catch (error) {
        console.error('Error uploading resume:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

app.get('/api/getresume/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const user = await collection.findOne({ name: username });
        
        if (!user || !user.resume?.fileName) {
            return res.status(404).json({ error: 'No resume found' });
        }

        res.json({
            success: true,
            resumePath: user.resume.filePath,
            originalName: user.resume.originalName,
            uploadDate: user.resume.uploadDate
        });
    } catch (error) {
        console.error('Error retrieving resume:', error);
        res.status(500).json({ error: 'Error retrieving resume' });
    }
});

app.delete('/api/deleteresume/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const user = await collection.findOne({ name: username });
        
        if (!user || !user.resume?.fileName) {
            return res.status(404).json({ error: 'No resume found' });
        }

        const filePath = path.join(__dirname, '../public', user.resume.filePath);
        await fs.promises.unlink(filePath);

        await collection.findOneAndUpdate(
            { name: username },
            {
                $set: {
                    'resume.fileName': '',
                    'resume.originalName': '',
                    'resume.filePath': '',
                    'resume.uploadDate': null,
                    'resume.fileSize': 0,
                    'resume.fileType': ''
                }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting resume:', error);
        res.status(500).json({ error: 'Error deleting resume' });
    }
});

// Start server
const port = 3000;
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});