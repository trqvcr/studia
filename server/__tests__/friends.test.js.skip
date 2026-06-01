const request = require('supertest');
const app = require('../app');

describe('GET /friends/search', () => {
  test('finds users matching the search query', async () => {
    const res = await request(app).get('/friends/search?username=ali');

    expect(res.statusCode).toBe(200);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body.users[0].username).toBe('alice');
  });

  test('returns 400 when username param is missing', async () => {
    const res = await request(app).get('/friends/search');

    expect(res.statusCode).toBe(400);
  });

  test('returns empty array when no users match', async () => {
    const res = await request(app).get('/friends/search?username=zzznomatch');

    expect(res.statusCode).toBe(200);
    expect(res.body.users).toHaveLength(0);
  });
});

describe('POST /friends/add', () => {
  test('adds a new friend successfully', async () => {
    const res = await request(app)
      .post('/friends/add')
      .send({ userId: '1', friendId: '3' });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Friend added');
  });

  test('returns 409 when already friends', async () => {
    const res = await request(app)
      .post('/friends/add')
      .send({ userId: '1', friendId: '2' });

    expect(res.statusCode).toBe(409);
  });

  test('returns 400 when adding yourself', async () => {
    const res = await request(app)
      .post('/friends/add')
      .send({ userId: '1', friendId: '1' });

    expect(res.statusCode).toBe(400);
  });

  test('returns 404 when friend does not exist', async () => {
    const res = await request(app)
      .post('/friends/add')
      .send({ userId: '1', friendId: '99' });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /friends/:userId', () => {
  test('returns friends list for a user', async () => {
    const res = await request(app).get('/friends/1');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.friends)).toBe(true);
    expect(res.body.friends.length).toBeGreaterThan(0);
  });

  test('returns empty array for user with no friends', async () => {
    const res = await request(app).get('/friends/3');

    expect(res.statusCode).toBe(200);
    expect(res.body.friends).toHaveLength(0);
  });
});
