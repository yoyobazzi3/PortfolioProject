const express = require('express');
const app = express();
module.exports = app;
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const { Collection, Post } = require('./mongodb');

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
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Create uploads directory if it doesn't exist
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Paths setup
const templatePath = path.join(__dirname, '../templates');
const publicPath = path.join(__dirname, '../public');

// Middleware
app.use(express.static(publicPath));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic Routes
app.get('/', (req, res) => res.sendFile(path.join(templatePath, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(templatePath, 'signup.html')));
app.get('/login', (req, res) => res.sendFile(path.join(templatePath, 'login.html')));
app.get('/portfolio', (req, res) => res.sendFile(path.join(templatePath, 'portfolio.html')));
app.get('/about', (req, res) => res.sendFile(path.join(templatePath, 'about.html')));
app.get('/resume', (req, res) => res.sendFile(path.join(templatePath, 'resume.html')));
app.get('/blog', (req, res) => res.sendFile(path.join(templatePath, 'blog.html')));

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
        const newUser = new Collection(data);
        await newUser.save();
        res.redirect(`/portfolio?name=${req.body.name}`);
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Error signing up. Please try again later.');
    }
});

app.post('/login', async (req, res) => {
    try {
        const user = await Collection.findOne({ name: req.body.name });
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
        await Collection.updateOne({ name: req.body.username }, { $set: updateData });
        const updatedUser = await Collection.findOne({ name: req.body.username });
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
        const user = await Collection.findOne({ name: username });
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
        const user = await Collection.findOne({ name: username });
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
        await Collection.updateOne(
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
        await Collection.updateOne({ name: req.body.username }, { $set: updateData });
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
        const user = await Collection.findOne({ name: username });
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

// Resume Save Route
app.post('/api/saveresume', async (req, res) => {
    try {
        const { username, education, experience, skills, certifications } = req.body;
        const updateData = {
            education: JSON.parse(education || '[]'),
            experience: JSON.parse(experience || '[]'),
            skills: JSON.parse(skills || '[]'),
            certifications: JSON.parse(certifications || '[]')
        };
        await Collection.updateOne(
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

        await Collection.findOneAndUpdate(
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

// Blog Routes
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching posts' });
    }
});

app.post('/api/posts', async (req, res) => {
    try {
        const { author, title, content } = req.body;
        const post = new Post({
            author,
            title,
            content
        });
        await post.save();
        res.json({ success: true, post });
    } catch (error) {
        res.status(500).json({ error: 'Error creating post' });
    }
});

app.post('/api/posts/:postId/comments', async (req, res) => {
    try {
        const { author, content } = req.body;
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.comments.push({ author, content });
        await post.save();
        res.json({ success: true, post });
    } catch (error) {
        res.status(500).json({ error: 'Error adding comment' });
    }
});

app.post('/api/posts/:postId/like', async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        post.likes += 1;
        await post.save();
        res.json({ success: true, likes: post.likes });
    } catch (error) {
        res.status(500).json({ error: 'Error liking post' });
    }
});

// Delete post
app.delete('/api/posts/:postId', async (req, res) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting post' });
    }
});

// Delete comment
app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        post.comments = post.comments.filter(
            comment => comment._id.toString() !== req.params.commentId
        );
        
        await post.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting comment' });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});