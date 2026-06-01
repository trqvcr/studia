const express = require('express');
const router = express.Router();
const userRepo = require('../repositories/userRepository')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
// POST /auth/register
router.post('/register', async (req, res) => {
  console.log('POST /auth/register', req.body);
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'username, password, and name are required' });
  }

  try {
    const existing = await userRepo.findByUsername(username)
    if (existing) return res.status(409).json({ error: 'Username already taken' })

    const newUser = await userRepo.create({ username, password, name })
    const { password: _, ...safeUser } = newUser
    const token = jwt.sign({id: newUser.id}, process.env.JWT_SECRET, {expiresIn: '7d'})
    res.status(201).json({ message: 'User registered', user: safeUser, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});


// POST /auth/login
router.post('/login', async (req, res) => {
  console.log('POST /auth/login', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const user = await userRepo.findByUsername(username)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const passwordMatches = await bcrypt.compare(password, user.password)
    if (!passwordMatches) return res.status(401).json({error: 'Invalid credentials'})
    const { password: _, ...safeUser } = user
    const token = jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: '7d'})
    res.json({ message: 'Login successful', user: safeUser, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

module.exports = router;
