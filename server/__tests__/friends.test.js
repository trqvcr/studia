process.env.JWT_SECRET='test'
process.env.SUPABASE_URL='http://localhost:54321'
process.env.SUPABASE_KEY='test'
jest.mock('../repositories/userRepository')
jest.mock('../repositories/friendshipRepository')

const jwt = require('jsonwebtoken')
const request = require('supertest')
const app = require('../app')
const userRepo = require('../repositories/userRepository')
const friendshipRepo = require('../repositories/friendshipRepository')

const token1 = jwt.sign({id: 1}, process.env.JWT_SECRET)
const token2 = jwt.sign({id: 2}, process.env.JWT_SECRET)

beforeEach(() => jest.resetAllMocks())

describe('GET /friends/search', () => {
  test('finds users matching the search query', async () => {
    userRepo.searchByUsername.mockResolvedValue([
      { id: 2, username: 'alice', name: 'Alice' }
    ])

    const res = await request(app)
      .get('/friends/search?username=ali')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.users.length).toBeGreaterThan(0)
    expect(res.body.users[0].username).toBe('alice')
  })

  test('returns 400 when username param is missing', async () => {
    const res = await request(app)
      .get('/friends/search')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(400)
  })

  test('returns empty array when no users match', async () => {
    userRepo.searchByUsername.mockResolvedValue([])

    const res = await request(app)
      .get('/friends/search?username=zzznomatch')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.users).toHaveLength(0)
  })
})

describe('POST /friends/add', () => {
  test('adds a new friend successfully', async () => {
    userRepo.findById.mockResolvedValue({ id: 2, username: 'bob' })
    friendshipRepo.findByPair.mockResolvedValue(null)
    friendshipRepo.create.mockResolvedValue({ id: 1, status: 'pending' })

    const res = await request(app)
      .post('/friends/add')
      .set('Authorization', `Bearer ${token1}`)
      .send({ friendId: 2 })

    expect(res.statusCode).toBe(201)
    expect(res.body.message).toBe('Friend added')
  })

  test('returns 409 when request already pending', async () => {
    userRepo.findById.mockResolvedValue({ id: 2, username: 'bob' })
    friendshipRepo.findByPair.mockResolvedValue({ status: 'pending' })

    const res = await request(app)
      .post('/friends/add')
      .set('Authorization', `Bearer ${token1}`)
      .send({ friendId: 2 })

    expect(res.statusCode).toBe(409)
  })

  test('returns 400 when adding yourself', async () => {
    const res = await request(app)
      .post('/friends/add')
      .set('Authorization', `Bearer ${token1}`)
      .send({ friendId: 1 })

    expect(res.statusCode).toBe(400)
  })

  test('returns 404 when friend does not exist', async () => {
    userRepo.findById.mockResolvedValue(null)

    const res = await request(app)
      .post('/friends/add')
      .set('Authorization', `Bearer ${token1}`)
      .send({ friendId: 99999 })

    expect(res.statusCode).toBe(404)
  })
})

describe('POST /friends/accept', () => {
  test('accepts a pending friend request', async () => {
    friendshipRepo.findPendingByPair.mockResolvedValue({
      id: 1, status: 'pending', requester_id: 1
    })
    friendshipRepo.accept.mockResolvedValue({ id: 1, status: 'accepted' })

    const res = await request(app)
      .post('/friends/accept')
      .set('Authorization', `Bearer ${token2}`)
      .send({ friendId: 1 })

    expect(res.statusCode).toBe(200)
  })
})

describe('GET /friends/:userId', () => {
  test('returns friends list for a user', async () => {
    friendshipRepo.findAcceptedByUserId.mockResolvedValue([
      { user_id_low: 1, user_id_high: 2 }
    ])
    userRepo.findManyByIds.mockResolvedValue([
      { id: 2, username: 'bob', name: 'Bob' }
    ])

    const res = await request(app)
      .get('/friends/1')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body.friends)).toBe(true)
    expect(res.body.friends.length).toBeGreaterThan(0)
  })

  test('returns 403 when accessing another users friends', async () => {
    const res = await request(app)
      .get('/friends/2')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(403)
  })
})
