const express = require('express');
const router = express.Router();
const sessionRepo = require('../repositories/sessionRepository')
const userRepo = require('../repositories/userRepository')
// POST /sessions/start
router.post('/start', async (req, res) => {
  console.log('POST /sessions/start', req.body);
  const userId = req.user.id;
  const {subject} = req.body;

  if (!subject) {
    return res.status(400).json({ error: 'subject is required' });
  }
  const userClasses=await userRepo.getClasses(userId)
  if(!userClasses.includes(subject)){
    return res.status(400).json({error: 'subject must be one of your classes'})
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
  const userId = req.user.id;

  try {
    const session = await sessionRepo.findActiveByUserId(userId)
    if (!session) return res.status(404).json({ error: 'No active session found for this user' })

    const endTime = new Date().toISOString()
    const duration = Math.floor(
      (new Date(endTime) - new Date(session.startTime)) / 1000
    );
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
if (parseInt(userId) !== req.user.id) {
  return res.status(403).json({error: "Cannot view another user's sessions"});
}
  try {
    const userSessions = await sessionRepo.findAllByUserId(userId)
    res.json({ sessions: userSessions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

module.exports = router;
