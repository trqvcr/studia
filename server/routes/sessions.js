const express = require('express');
const router = express.Router();
const supabase = require('../db')

// POST /sessions/start
router.post('/start', async (req, res) => {
  console.log('POST /sessions/start', req.body);
  const { userId, subject } = req.body;

  if (!userId || !subject) {
    return res.status(400).json({ error: 'userId and subject are required' });
  }

  const {data: alreadyActive, error} = await supabase
    .from('sessions')
    .select()
    .eq('user_id', userId)
    .eq('active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(error)
    return res.status(500).json({ error: 'Database error' })
  }

  if (alreadyActive) {
    return res.status(409).json({ error: 'User already has an active session' });
  }

  const { data: newSession, error: insertError } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      subject,
      start_time: new Date().toISOString(),
      end_time: null,
      duration: null,
      active: true,
    })
    .select()
    .single()

  if (insertError) {
    console.error(insertError)
    return res.status(500).json({ error: 'Database error' })
  }

  res.status(201).json({ message: 'Session started', session: newSession });
});

// POST /sessions/stop
router.post('/stop', async (req, res) => {
  console.log('POST /sessions/stop', req.body);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const { data: session , error } = await supabase
    .from('sessions')
    .select()
    .eq('user_id', userId)
    .eq('active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error(error)
    return res.status(500).json({ error: 'Database error' })
  }

  if (!session) {
    console.error(error);
    return res.status(404).json({ error: 'No active session found for this user' });
  }

  const endTime = new Date().toISOString();
  const duration = Math.round((new Date(endTime) - new Date(session.start_time)) / 60000);

  const { data: updatedSession, error: updateError } = await supabase
    .from('sessions')
    .update({
      end_time: endTime,
      duration: duration,
      active: false
    })
    .eq('id', session.id)
    .select()
    .single()

  if (updateError){
    console.error(updateError);
    return res.status(500).json({ error: 'Database insertion error' });
  }
  res.json({ message: 'Session stopped', updatedSession });
});

// GET /sessions/:userId
router.get('/:userId', async (req, res) => {
  console.log('GET /sessions/:userId', req.params.userId);
  const { userId } = req.params;

  const { data: userSessions, error } = await supabase
    .from('sessions')
    .select()
    .eq('user_id', userId)
  
  if (error)
  {
    console.error(error);
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ sessions: userSessions });
});

module.exports = router;
