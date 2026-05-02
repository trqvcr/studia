const request = require('supertest');
const app = require('../app');

describe('POST /auth/register', () => {
  test('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'testuser', password: 'pass123', name: 'Test User' });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.password).toBeUndefined();
  });

  test('returns 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'testuser' });

    expect(res.statusCode).toBe(400);
  });

  test('returns 409 when username is already taken', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: 'pass123', name: 'Alice Again' });

    expect(res.statusCode).toBe(409);
  });
});

describe('POST /auth/login', () => {
  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'pass123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('alice');
    expect(res.body.user.password).toBeUndefined();
  });

  test('returns 401 with wrong password', async () => {
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
});
