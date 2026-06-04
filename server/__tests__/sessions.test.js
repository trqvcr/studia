process.env.JWT_SECRET='test'
process.env.SUPABASE_URL='http://localhost:54321'
process.env.SUPABASE_KEY='test'
jest.mock('../repositories/sessionRepository')
jest.mock('../repositories/userRepository')

const jwt = require('jsonwebtoken')
const request = require('supertest')
const app = require('../app')
const sessionRepo = require('../repositories/sessionRepository')
const userRepo = require('../repositories/userRepository')

const token1 = jwt.sign({id: 1}, process.env.JWT_SECRET)
const token2 = jwt.sign({id: 2}, process.env.JWT_SECRET)

beforeEach(() => jest.resetAllMocks())

describe('POST /sessions/start', () => {
  test('starts a session for a user with no active session', async () => {
    userRepo.getClasses.mockResolvedValue(['Chemistry'])
    sessionRepo.findActiveByUserId.mockResolvedValue(null)
    sessionRepo.create.mockResolvedValue({
      id: 1, userId: 1, subject: 'Chemistry',
      startTime: new Date().toISOString(), active: true
    })

    const res = await request(app)
      .post('/sessions/start')
      .set('Authorization', `Bearer ${token1}`)
      .send({ subject: 'Chemistry' })

    expect(res.statusCode).toBe(201)
    expect(res.body.session.active).toBe(true)
    expect(res.body.session.subject).toBe('Chemistry')
  })

  test('returns 409 when user already has an active session', async () => {
    userRepo.getClasses.mockResolvedValue(['Chemistry'])
    sessionRepo.findActiveByUserId.mockResolvedValue({ id: 5, active: true })

    const res = await request(app)
      .post('/sessions/start')
      .set('Authorization', `Bearer ${token1}`)
      .send({ subject: 'Chemistry' })

    expect(res.statusCode).toBe(409)
  })

  test('returns 400 when subject is missing', async () => {
    const res = await request(app)
      .post('/sessions/start')
      .set('Authorization', `Bearer ${token1}`)
      .send({})

    expect(res.statusCode).toBe(400)
  })

  test('returns 400 when subject is not in users classes', async () => {
    userRepo.getClasses.mockResolvedValue(['Math'])

    const res = await request(app)
      .post('/sessions/start')
      .set('Authorization', `Bearer ${token1}`)
      .send({ subject: 'Chemistry' })

    expect(res.statusCode).toBe(400)
  })
})

describe('POST /sessions/stop', () => {
  test('stops an active session', async () => {
    const startTime = new Date(Date.now() - 60000).toISOString()
    sessionRepo.findActiveByUserId.mockResolvedValue({
      id: 1, userId: 1, subject: 'Chemistry', startTime, active: true
    })
    sessionRepo.stop.mockResolvedValue({
      id: 1, userId: 1, subject: 'Chemistry',
      startTime, endTime: new Date().toISOString(),
      duration: 60, active: false
    })

    const res = await request(app)
      .post('/sessions/stop')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.updatedSession.active).toBe(false)
    expect(res.body.updatedSession.endTime).not.toBeNull()
    expect(typeof res.body.updatedSession.duration).toBe('number')
  })

  test('returns 404 when user has no active session', async () => {
    sessionRepo.findActiveByUserId.mockResolvedValue(null)

    const res = await request(app)
      .post('/sessions/stop')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /sessions/:userId', () => {
  test('returns sessions for a user', async () => {
    sessionRepo.findAllByUserId.mockResolvedValue([
      { id: 1, userId: 1, subject: 'Chemistry', active: false }
    ])

    const res = await request(app)
      .get('/sessions/1')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body.sessions)).toBe(true)
    expect(res.body.sessions.length).toBeGreaterThan(0)
  })

  test('returns 403 when accessing another users sessions', async () => {
    const res = await request(app)
      .get('/sessions/2')
      .set('Authorization', `Bearer ${token1}`)

    expect(res.statusCode).toBe(403)
  })
})
