const express = require('express');
const router = express.Router();
const sessionRepo = require('../repositories/sessionRepository')

// POST /sessions/start
router.post('/start', async (req, res) => {
  console.log('POST /sessions/start', req.body);
  const { userId, subject } = req.body;

  if (!userId || !subject) {
    return res.status(400).json({ error: 'userId and subject are required' });
  }

  try {
    const alreadyActive = await sessionRepo.findActiveByUserId(userId)
    if (alreadyActive) return res.status(409).json({ error: 'User already has an active session' })

    const newSession = await sessionRepo.create({ userId, subject, startTime: new Date().toISOString() })
    res.status(201).json({ message: 'Session started', session: newSession })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

// POST /sessions/stop
router.post('/stop', async (req, res) => {
  console.log('POST /sessions/stop', req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const session = await sessionRepo.findActiveByUserId(userId)
    if (!session) return res.status(404).json({ error: 'No active session found for this user' })

    const endTime = new Date().toISOString()
    const duration = Math.round((new Date(endTime) - new Date(session.start_time)) / 60000)
    const updatedSession = await sessionRepo.stop(session.id, endTime, duration)
    res.json({ message: 'Session stopped', updatedSession })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

// GET /sessions/:userId
router.get('/:userId', async (req, res) => {
  console.log('GET /sessions/:userId', req.params.userId);
  const { userId } = req.params;

  try {
    const userSessions = await sessionRepo.findAllByUserId(userId)
    res.json({ sessions: userSessions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

module.exports = router;
