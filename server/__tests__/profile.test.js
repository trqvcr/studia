process.env.JWT_SECRET='test'
process.env.SUPABASE_URL='http://localhost:54321'
process.env.SUPABASE_KEY='test'
jest.mock('../repositories/userRepository')

const jwt = require('jsonwebtoken')
const request = require('supertest')
const app = require('../app')
const userRepo = require('../repositories/userRepository')

const token = jwt.sign({id: 1}, process.env.JWT_SECRET)

beforeEach(() => jest.resetAllMocks())

describe('GET /profile/classes', () => {
  test('returns classes array for user', async () => {
    userRepo.getClasses.mockResolvedValue(['CS 35L', 'Math 115A'])

    const res = await request(app)
      .get('/profile/classes')
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body.classes)).toBe(true)
  })

  test('returns 401 without token', async () => {
    const res = await request(app).get('/profile/classes')
    expect(res.statusCode).toBe(401)
  })
})

describe('PUT /profile/classes', () => {
  test('saves and returns classes', async () => {
    userRepo.setClasses.mockResolvedValue(['CS 35L', 'Math 115A'])

    const res = await request(app)
      .put('/profile/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ classes: ['CS 35L', 'Math 115A'] })

    expect(res.statusCode).toBe(200)
    expect(res.body.classes).toEqual(expect.arrayContaining(['CS 35L', 'Math 115A']))
  })

  test('deduplicates classes', async () => {
    userRepo.setClasses.mockResolvedValue(['CS 35L', 'Math 115A'])

    const res = await request(app)
      .put('/profile/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ classes: ['CS 35L', 'CS 35L', 'Math 115A'] })

    expect(res.statusCode).toBe(200)
    const count = res.body.classes.filter(c => c === 'CS 35L').length
    expect(count).toBe(1)
  })

  test('strips whitespace from class names', async () => {
    userRepo.setClasses.mockResolvedValue(['CS 35L', 'Math 115A'])

    const res = await request(app)
      .put('/profile/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ classes: ['  CS 35L  ', ' Math 115A '] })

    expect(res.statusCode).toBe(200)
    expect(res.body.classes).toContain('CS 35L')
    expect(res.body.classes).toContain('Math 115A')
  })

  test('returns 400 when classes is not an array', async () => {
    const res = await request(app)
      .put('/profile/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ classes: 'CS 35L' })

    expect(res.statusCode).toBe(400)
  })

  test('returns 401 without token', async () => {
    const res = await request(app)
      .put('/profile/classes')
      .send({ classes: ['CS 35L'] })

    expect(res.statusCode).toBe(401)
  })
})
