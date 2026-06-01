process.env.JWT_SECRET='test'
process.env.SUPABASE_URL='http://localhost:54321'
process.env.SUPABASE_KEY='test'
jest.mock('../repositories/userRepository')
const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const userRepo = require('../repositories/userRepository')
const requireAuth = require('../middleware/requireAuth')
const request = require('supertest');
const app = require('../app');

beforeEach(() => jest.resetAllMocks())

describe('POST /auth/register', () => {
  test('registers a new user successfully', async () => {

    userRepo.findByUsername.mockResolvedValue(null)
    userRepo.create.mockResolvedValue({id: 1, username: 'testuser', password: 'pass123', name: 'Test User' });

    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'testuser', password: 'pass123', name: 'Test User' });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.password).toBeUndefined();
    expect(typeof res.body.token).toBe('string');
  });

  test('returns 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'testuser' });

    expect(res.statusCode).toBe(400);
  });

  test('returns 409 when username is already taken', async () => {
    
    userRepo.findByUsername.mockResolvedValue({id: 1})
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'pass123', name: 'Alice Again' });

    expect(res.statusCode).toBe(409);
  });
});

describe('POST /auth/login', () => {
  let hashedPassword
  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('pass123', 10)
  })
  test('logs in with correct credentials', async () => {
    userRepo.findByUsername.mockResolvedValue({id: 1, username: 'alice', password: hashedPassword, name: 'Alice'})
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'pass123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user.password).toBeUndefined();
    expect(typeof res.body.token).toBe('string');
  });

  test('returns 401 with wrong password', async () => {
    userRepo.findByUsername.mockResolvedValue({id: 1, username: 'alice', password: hashedPassword, name: 'Alice'})
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
  });

  test('returns 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice' });

    expect(res.statusCode).toBe(400);
  });

  test('returns 401 with unknown username', async () => {
    userRepo.findByUsername.mockResolvedValue(null)
    const res = await request(app)
    .post('/auth/login')
    .send({username: 'uhhh', password: 'idk'})

    expect(res.statusCode).toBe(401);
  })
});

describe('requireAuth', () => {
  const testApp = express()
  const validToken = jwt.sign({id:42}, process.env.JWT_SECRET, {expiresIn: '7d'})
  testApp.get('/protected', requireAuth, (req, res) =>
  res.json({id: req.user.id}))

  test('returns 401 with wrong Bearer scheme', async () => {
    const res = await request(testApp).get('/protected').set('Authorization', 'Basic notbearer')
    
    expect(res.statusCode).toBe(401);
  })

  test('returns 401 with no Auth header', async () => {
    const res = await request(testApp).get('/protected')

    expect(res.statusCode).toBe(401);
  })

  test('returns 401 with invalid Bearer', async () => {
    const res = await request(testApp).get('/protected').set('Authorization', 'Bearer NOT.REAL.TOKEN')

    expect(res.statusCode).toBe(401);
  })
  
  test('returns 200 and sets user ID JWT', async () => {
    const res = await request(testApp).get('/protected').set('Authorization', `Bearer ${validToken}`)
    
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(42);
  })
})
