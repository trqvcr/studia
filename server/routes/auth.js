const express = require('express');
const router = express.Router();

const supabase = require('../db')

// POST /auth/register
router.post('/register', async (req, res) => {
  console.log('POST /auth/register', req.body);
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'username, password, and name are required' });
  }

  const { data: existing, error } = await supabase
  .from('users')
  .select()
  .eq('username', username)
  .single()

  if (error && error.code !== 'PGRST116') {
    console.error(error)
    return res.status(500).json({ error: 'Database error' })
  }

  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ username, password, name })
    .select()
    .single()

  if (insertError) {
    console.error(insertError)
    return res.status(500).json({ error: 'Database error' })
  }

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ message: 'User registered', user: safeUser });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  console.log('POST /auth/login', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select()
    .eq('username', username)
    .eq('password', password)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error(error);
    return res.status(500).json({ error: 'Database error' })
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { password: _, ...safeUser } = user;
  res.json({ message: 'Login successful', user: safeUser });
});

module.exports = router;
