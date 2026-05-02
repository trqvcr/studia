const express = require('express');
const router = express.Router();

const users = [
  { id: '1', username: 'alice', name: 'Alice' },
  { id: '2', username: 'bob', name: 'Bob' },
  { id: '3', username: 'carol', name: 'Carol' },
];

const friendships = [
  { userId: '1', friendId: '2' },
];

// GET /friends/search?username=xxx
router.get('/search', (req, res) => {
  console.log('GET /friends/search', req.query);
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username query param is required' });
  }

  const results = users.filter(u =>
    u.username.toLowerCase().includes(username.toLowerCase())
  );

  res.json({ users: results });
});

// POST /friends/add
router.post('/add', (req, res) => {
  console.log('POST /friends/add', req.body);
  const { userId, friendId } = req.body;

  if (!userId || !friendId) {
    return res.status(400).json({ error: 'userId and friendId are required' });
  }

  if (userId === friendId) {
    return res.status(400).json({ error: 'Cannot add yourself as a friend' });
  }

  const friendExists = users.find(u => u.id === friendId);
  if (!friendExists) {
    return res.status(404).json({ error: 'User not found' });
  }

  const alreadyFriends = friendships.find(
    f => f.userId === userId && f.friendId === friendId
  );
  if (alreadyFriends) {
    return res.status(409).json({ error: 'Already friends' });
  }

  friendships.push({ userId, friendId });
  res.status(201).json({ message: 'Friend added' });
});

// GET /friends/:userId
router.get('/:userId', (req, res) => {
  console.log('GET /friends/:userId', req.params.userId);
  const { userId } = req.params;

  const friendIds = friendships
    .filter(f => f.userId === userId)
    .map(f => f.friendId);

  const friends = users.filter(u => friendIds.includes(u.id));
  res.json({ friends });
});

module.exports = router;
