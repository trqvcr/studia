const supabase = require('../db')

async function findActiveByUserId(userId) {
  const { data, error } = await supabase
    .from('sessions').select().eq('user_id', userId).eq('active', true).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function create({ userId, subject, startTime }) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, subject, start_time: startTime, end_time: null, duration: null, active: true })
    .select().single()
  if (error) throw error
  return data
}

async function stop(id, endTime, duration) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ end_time: endTime, duration, active: false })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

async function findAllByUserId(userId) {
  const { data, error } = await supabase
    .from('sessions').select().eq('user_id', userId)
  if (error) throw error
  return data
}

module.exports = { findActiveByUserId, create, stop, findAllByUserId }
