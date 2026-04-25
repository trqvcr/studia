const express = require('express');
const router = express.Router();

const users = [
  { id: '1', username: 'alice', password: 'pass123', name: 'Alice' },
  { id: '2', username: 'bob', password: 'pass456', name: 'Bob' },
];
let nextUserId = 3;

// POST /auth/register
router.post('/register', (req, res) => {
  console.log('POST /auth/register', req.body);
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'username, password, and name are required' });
  }

  const existing = users.find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const newUser = { id: String(nextUserId++), username, password, name };
  users.push(newUser);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ message: 'User registered', user: safeUser });
});

// POST /auth/login
router.post('/login', (req, res) => {
  console.log('POST /auth/login', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { password: _, ...safeUser } = user;
  res.json({ message: 'Login successful', user: safeUser });
});

module.exports = router;
