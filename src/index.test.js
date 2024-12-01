const request = require('supertest');
const app = require('./index');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt'); // Added bcrypt import
const { Collection, Post } = require('./mongodb');

jest.mock('./mongodb'); // Mock MongoDB models

describe('Express App Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET Routes', () => {
        it('should load the login page', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toContain('text/html');
        });

        it('should load the signup page', async () => {
            const res = await request(app).get('/signup');
            expect(res.statusCode).toBe(200);
            expect(res.header['content-type']).toContain('text/html');
        });

        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/unknown');
            expect(res.statusCode).toBe(404);
        });
    });

    describe('Authentication Routes', () => {
        it('should sign up a user', async () => {
            Collection.mockImplementation(() => ({
                save: jest.fn().mockResolvedValueOnce(),
            }));

            const mockFilePath = path.join(__dirname, 'mockProfile.jpg');
            fs.writeFileSync(mockFilePath, ''); // Mock a file

            const res = await request(app)
                .post('/signup')
                .field('name', 'testUser')
                .field('email', 'test@example.com')
                .field('password', 'password123')
                .attach('profileFile', mockFilePath);

            fs.unlinkSync(mockFilePath); // Cleanup mock file

            expect(res.statusCode).toBe(302); // Redirect status
            expect(res.headers.location).toContain('/portfolio?name=testUser');
        });

        it('should log in a user with valid credentials', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            Collection.findOne.mockResolvedValue({
                name: 'testUser',
                password: hashedPassword,
            });

            const res = await request(app)
                .post('/login')
                .send({ name: 'testUser', password: 'password123' });

            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toContain('/portfolio?name=testUser');
        });

        it('should return an error for invalid login credentials', async () => {
            Collection.findOne.mockResolvedValue(null);

            const res = await request(app)
                .post('/login')
                .send({ name: 'wrongUser', password: 'password123' });

            expect(res.statusCode).toBe(302);
            expect(res.headers.location).toContain('/?error=true');
        });
    });

    describe('API Routes', () => {
        it('should fetch user data', async () => {
            Collection.findOne.mockResolvedValue({
                caption: 'Test Caption',
                profileFile: 'test.jpg',
            });

            const res = await request(app).get('/api/userdata').query({ name: 'testUser' });

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                caption: 'Test Caption',
                profileFile: 'test.jpg',
            });
        });

        it('should return 404 for nonexistent user data', async () => {
            Collection.findOne.mockResolvedValue(null);

            const res = await request(app).get('/api/userdata').query({ name: 'unknownUser' });

            expect(res.statusCode).toBe(404);
            expect(res.body).toEqual({ error: 'User not found' });
        });

        it('should save resume data', async () => {
            Collection.updateOne.mockResolvedValue();

            const res = await request(app)
                .post('/api/saveresume')
                .send({
                    username: 'testUser',
                    education: JSON.stringify([{ degree: 'BS' }]),
                    experience: JSON.stringify([{ company: 'Test Company' }]),
                    skills: JSON.stringify(['JavaScript']),
                    certifications: JSON.stringify(['Cert1']),
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ success: true });
        });

        it('should upload a resume file', async () => {
            Collection.findOneAndUpdate.mockResolvedValue();

            const mockFilePath = path.join(__dirname, 'mockResume.pdf');
            fs.writeFileSync(mockFilePath, ''); // Mock a file

            const res = await request(app)
                .post('/api/uploadresume')
                .field('username', 'testUser')
                .attach('resume', mockFilePath);

            fs.unlinkSync(mockFilePath); // Cleanup mock file

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    
});
