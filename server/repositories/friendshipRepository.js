const supabase = require('../db')

async function findByPair(userId, friendId) {
  const { data, error } = await supabase
    .from('friendships').select('status').eq('user_id', userId).eq('friend_id', friendId).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function findPendingByPair(userId, friendId) {
  const { data, error } = await supabase
    .from('friendships').select().eq('user_id', userId).eq('friend_id', friendId).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function create(userId, friendId) {
  const { data, error } = await supabase
    .from('friendships').insert({ user_id: userId, friend_id: friendId, status: 'pending' }).select().single()
  if (error) throw error
  return data
}

async function accept(userId, friendId) {
  const { data, error } = await supabase
    .from('friendships').update({ status: 'accepted' }).eq('user_id', userId).eq('friend_id', friendId).select().single()
  if (error) throw error
  return data
}

async function findAcceptedByUserId(userId) {
  const { data, error } = await supabase
    .from('friendships').select('user_id, friend_id').or(`user_id.eq.${userId},friend_id.eq.${userId}`).eq('status', 'accepted')
  if (error) throw error
  return data
}

module.exports = { findByPair, findPendingByPair, create, accept, findAcceptedByUserId }
