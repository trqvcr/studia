const request = require('supertest');
const app = require('../app');

describe('POST /sessions/start', () => {
  test('starts a session for a user with no active session', async () => {
    const res = await request(app)
      .post('/sessions/start')
      .send({ userId: '1', subject: 'Chemistry' });

    expect(res.statusCode).toBe(201);
    expect(res.body.session.active).toBe(true);
    expect(res.body.session.subject).toBe('Chemistry');
  });

  test('returns 409 when user already has an active session', async () => {
    const res = await request(app)
      .post('/sessions/start')
      .send({ userId: '2', subject: 'Biology' });

    expect(res.statusCode).toBe(409);
  });

  test('returns 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/sessions/start')
      .send({ userId: '1' });

    expect(res.statusCode).toBe(400);
  });
});

describe('POST /sessions/stop', () => {
  test('stops an active session', async () => {
    const res = await request(app)
      .post('/sessions/stop')
      .send({ userId: '2' });

    expect(res.statusCode).toBe(200);
    expect(res.body.session.active).toBe(false);
    expect(res.body.session.endTime).not.toBeNull();
  });

  test('returns 404 when user has no active session', async () => {
    const res = await request(app)
      .post('/sessions/stop')
      .send({ userId: '99' });

    expect(res.statusCode).toBe(404);
  });

  test('returns 400 when userId is missing', async () => {
    const res = await request(app)
      .post('/sessions/stop')
      .send({});

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /sessions/:userId', () => {
  test('returns sessions for a user', async () => {
    const res = await request(app).get('/sessions/1');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });

  test('returns empty array for user with no sessions', async () => {
    const res = await request(app).get('/sessions/99');

    expect(res.statusCode).toBe(200);
    expect(res.body.sessions).toHaveLength(0);
  });
});
