const supabase = require('../db')

function lowBeforeHigh(lo, hi){
  return Number(lo) < Number(hi) ? [lo, hi] : [hi, lo];
}

async function findByPair(userId, friendId) {
  const [low_id, high_id] = lowBeforeHigh(userId, friendId);
  const { data, error } = await supabase
    .from('friendships').select('status, requester_id').eq('user_id_low', low_id).eq('user_id_high', high_id).single();
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function findPendingByPair(userId, friendId) {
  const [low_id, high_id] = lowBeforeHigh(userId, friendId);
  const { data, error } = await supabase
    .from('friendships').select().eq('user_id_low', low_id).eq('user_id_high', high_id).single();
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function create(requesterId, friendId) {
  const [low_id, high_id] = lowBeforeHigh(requesterId, friendId);
  const { data, error } = await supabase
    .from('friendships').insert({ user_id_low: low_id, user_id_high: high_id, status: 'pending', requester_id: requesterId }).select().single();
  if (error) throw error
  return data
}

async function accept(userId, friendId) {
  const [low_id, high_id] = lowBeforeHigh(userId, friendId);
  const { data, error } = await supabase
    .from('friendships').update({ status: 'accepted' }).eq('user_id_low', low_id).eq('user_id_high', high_id).select().single();
  if (error) throw error
  return data
}

async function findAcceptedByUserId(userId) {
  const { data: low, error: e1 } = await supabase
    .from('friendships').select('user_id_low, user_id_high').eq('user_id_low', Number(userId)).eq('status', 'accepted')
  if (e1) throw e1

  const { data: high, error: e2 } = await supabase
    .from('friendships').select('user_id_low, user_id_high').eq('user_id_high', Number(userId)).eq('status', 'accepted')
  if (e2) throw e2

  return [...low, ...high]
}

module.exports = { findByPair, findPendingByPair, create, accept, findAcceptedByUserId }
