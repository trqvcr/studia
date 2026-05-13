const express = require('express');
const router = express.Router();
const userRepo = require('../repositories/userRepository')
const friendshipRepo = require('../repositories/friendshipRepository')

// GET /friends/search?username=xxx
router.get('/search', async (req, res) => {
  console.log('GET /friends/search', req.query);
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username query param is required' });
  }

  try {
    const results = await userRepo.searchByUsername(username)
    res.json({ users: results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

// POST /friends/add
router.post('/add', async (req, res) => {
  console.log('POST /friends/add', req.body);
  const { userId, friendId } = req.body;

  if (!userId || !friendId) {
    return res.status(400).json({ error: 'userId and friendId are required' });
  }

  if (userId === friendId) {
    return res.status(400).json({ error: 'Cannot add yourself as a friend' });
  }

  try {
    const friendExists = await userRepo.findById(friendId)
    if (!friendExists) return res.status(404).json({ error: 'User not found' })

    const existingRequest = await friendshipRepo.findByPair(userId, friendId)
    if (existingRequest) {
      if (existingRequest.status === 'accepted') return res.status(409).json({ error: 'Already friends' })
      return res.status(409).json({ error: 'Friend request already pending' })
    }

    const friendship = await friendshipRepo.create(userId, friendId)
    res.status(201).json({ message: 'Friend added', friendship })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

// POST /friends/accept
router.post('/accept', async (req, res) => {
  const { userId, friendId } = req.body;

  if (!userId || !friendId) {
    return res.status(400).json({ error: 'userId and friendId are required' });
  }

  if (userId === friendId) {
    return res.status(400).json({ error: 'Cannot accept your own request' });
  }

  try {
    const request = await friendshipRepo.findPendingByPair(friendId, userId)
    if (!request || request.status !== 'pending') return res.status(404).json({ error: 'Pending request not found' })

    const friendship = await friendshipRepo.accept(friendId, userId)
    res.json({ friendship })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

// GET /friends/:userId
router.get('/:userId', async (req, res) => {
  console.log('GET /friends/:userId', req.params.userId);
  const { userId } = req.params;

  try {
    const friendships = await friendshipRepo.findAcceptedByUserId(userId)
    const friendIds = friendships.map(f =>
      f.user_id === parseInt(userId) ? f.friend_id : f.user_id
    )
    const friends = await userRepo.findManyByIds(friendIds)
    res.json({ friends })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
});

module.exports = router;
