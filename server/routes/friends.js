const express = require('express');
const supabase = require('../db');
const router = express.Router();

// GET /friends/search?username=xxx
router.get('/search', async (req, res) => {
  console.log('GET /friends/search', req.query);
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username query param is required' });
  }

  const {data: results, error} = await supabase
    .from('users')
    .select()
    .ilike('username', `%${username}%`)

  if (error)
  {
    console.error(error);
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ users: results });
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

  const { data: friendExists, error } = await supabase
    .from('users')
    .select()
    .eq('id', friendId)
    .single();

  if (error && error.code !== 'PGRST116'){
    console.error(error);
    return res.status(500).json({ error: 'Database error' })
  }

  if (!friendExists) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { data: existingRequest, error: existingError } = await supabase
    .from('friendships')
    .select('status')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .single();

    if (existingError && existingError.code !== 'PGRST116'){
      console.error(existingError);
      return res.status(500).json({ error: 'Database error'})
    }

  if (existingRequest) {
    if (existingRequest.status === 'accepted'){
      return res.status(409).json({ error: 'Already friends' });
    }
    else
      return res.status(409).json({ error: 'Friend request already pending' })
  }

  const { data: friendship, error: insertError } = await supabase
    .from('friendships')
    .insert({user_id: userId, friend_id: friendId, status: 'pending'})
    .select()
    .single();

  if (insertError){
    console.error(insertError);
    return res.status(500).json({ error: 'Database error'})
  }

  res.status(201).json({ message: 'Friend added' , friendship: friendship });
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

  const { data: request, error: requestError} = await supabase
    .from('friendships')
    .select()
    .eq('user_id', friendId)
    .eq('friend_id', userId)
    .single()

  if (requestError && requestError.code !== 'PGRST116'){
    console.error(requestError);
    return res.status(500).json({ error: 'Database error' });
  }
  
  if (!request || request.status !== 'pending'){
    return res.status(404).json({ error: 'Pending request not found'});
  }
  
  const { data: friendship, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('user_id', friendId)
    .eq('friend_id', userId)
    .select()
    .single()

  if (error) {
    console.error(error)
    return res.status(500).json({ error: 'Database error' });
  }

  res.json({ friendship })
});

// GET /friends/:userId
router.get('/:userId', async (req, res) => {
  console.log('GET /friends/:userId', req.params.userId);
  const { userId } = req.params;

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted')

  if (error){
    console.error(error);
    return res.status(500).json({ error: 'Database error' })
  }

  const friendIds = friendships.map(f =>
    f.user_id === parseInt(userId) ? f.friend_id : f.user_id
  )

  const { data: friends, error: usersError } = await supabase
    .from('users')
    .select('id, username, name')
    .in('id', friendIds)

  if (usersError){
    console.error(usersError);
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ friends });
});

module.exports = router;
