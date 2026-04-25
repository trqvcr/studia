const express = require('express');
const router = express.Router();

const sessions = [
  { id: '1', userId: '1', subject: 'Math', startTime: '2026-04-24T10:00:00Z', endTime: '2026-04-24T11:30:00Z', duration: 90, active: false },
  { id: '2', userId: '2', subject: 'History', startTime: '2026-04-24T14:00:00Z', endTime: null, duration: null, active: true },
];
let nextSessionId = 3;

// POST /sessions/start
router.post('/start', (req, res) => {
  console.log('POST /sessions/start', req.body);
  const { userId, subject } = req.body;

  if (!userId || !subject) {
    return res.status(400).json({ error: 'userId and subject are required' });
  }

  const alreadyActive = sessions.find(s => s.userId === userId && s.active);
  if (alreadyActive) {
    return res.status(409).json({ error: 'User already has an active session' });
  }

  const newSession = {
    id: String(nextSessionId++),
    userId,
    subject,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: null,
    active: true,
  };
  sessions.push(newSession);

  res.status(201).json({ message: 'Session started', session: newSession });
});

// POST /sessions/stop
router.post('/stop', (req, res) => {
  console.log('POST /sessions/stop', req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const session = sessions.find(s => s.userId === userId && s.active);
  if (!session) {
    return res.status(404).json({ error: 'No active session found for this user' });
  }

  session.endTime = new Date().toISOString();
  session.duration = Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000);
  session.active = false;

  res.json({ message: 'Session stopped', session });
});

// GET /sessions/:userId
router.get('/:userId', (req, res) => {
  console.log('GET /sessions/:userId', req.params.userId);
  const { userId } = req.params;

  const userSessions = sessions.filter(s => s.userId === userId);
  res.json({ sessions: userSessions });
});

module.exports = router;
